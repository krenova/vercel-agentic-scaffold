# agenticJS — WhatsApp Personal Assistant

A TypeScript agentic framework built iteratively on **Vercel AI SDK v4** to help manage WhatsApp messages for the user, acting like a Personal Assistant.

---

## Tech Stack

| Package | Role |
|---|---|
| `ai` (Vercel AI SDK v4) | LLM calls, tool calling loop, message history |
| `@ai-sdk/anthropic` | Anthropic-compatible provider adapter |
| `@langfuse/otel` + `@opentelemetry/sdk-node` | Automatic tracing of all LLM calls and tool invocations |
| `zod` | Tool parameter schema validation |
| `dotenv` | Environment variable loading |
| `tsx` | Run TypeScript directly without compiling |

**LLM:** Minimax (`MiniMax-M2.7`) via Anthropic-compatible API at `https://api.minimax.io/anthropic/v1`.
**Observability:** Self-hosted Langfuse at `http://192.168.1.3:2999`.

---

## Setup

```bash
pnpm install
cp .env.example .env   # fill in real API keys (see .env.example for all required vars)
pnpm property          # start the property agent REPL (main entry point)
```

All entry points are interactive REPLs — see the **pnpm scripts** table below.
Required `.env` values are documented in `.env.example`.

---

## Source Structure

```
src/
├── core/
│   ├── Agent.ts                   # Abstract base class — all agents extend this
│   ├── Skill.ts                   # Skill type definition
│   ├── SkillAgent.ts              # Agent variant with dynamic skill loading
│   └── SkillLoader.ts             # Loads skills from the skills/ directory
├── agents/
│   ├── OrchestratorAgent.ts       # Planner — routes to specialists, calls composeReply
│   ├── SynthesizerAgent.ts        # Writer — blends specialist results into WhatsApp reply
│   ├── PropertyAgentAssistant.ts  # Property data fetcher (listings, availability, travel time)
│   ├── ResearchAgent.ts           # General web researcher (Brave Search + page fetch)
│   ├── SchedulingAgent.ts         # Viewing appointment manager (scaffold)
│   ├── ComplianceAgent.ts         # SG property regulations specialist
│   ├── MarketAnalysisAgent.ts     # Price trends and market analysis (scaffold)
│   ├── LeadQualificationAgent.ts  # Lead screening — reserved for future workflow
│   └── ListingWriterAgent.ts      # Listing copywriter — reserved for future workflow
├── tools/
│   ├── braveSearch.ts             # Brave Search API
│   ├── fetchPage.ts               # Web page fetcher with Readability extraction
│   ├── travelTime.ts              # OneMap API — drive + PT travel time between two SG locations
│   ├── createSkill.ts             # Create a new skill file
│   └── updateSkill.ts             # Update an existing skill file
├── store/
│   ├── SessionStore.ts            # Interface: load / save / delete by sessionId
│   ├── InMemoryStore.ts           # Map-based implementation (default)
│   └── RedisStore.ts              # ioredis stub (activate with pnpm add ioredis)
├── repl/
│   ├── lib.ts                     # Shared REPL setup utilities
│   ├── replProperty.ts            # Interactive REPL for PropertyAgentAssistant
│   ├── replOrchestrator.ts        # Interactive REPL for OrchestratorAgent
│   ├── replResearch.ts            # Interactive REPL for ResearchAgent
│   ├── replSkillAgent.ts          # Interactive REPL for SkillAgent
│   └── replTravelTime.ts          # Interactive REPL for travel time tool
├── logger/
│   └── conversationLogger.ts      # Writes client ↔ agent turns to JSONL files
├── tools.ts                       # Mock property tools: lookupProperty, checkAvailability
├── provider.ts                    # Minimax LLM client
└── instrumentation.ts             # OpenTelemetry + Langfuse setup

skills/                            # User-created skill SOPs (plain .md files)
├── property-portal-navigation.md  # Steps for navigating a property listing portal
├── client-communication-guidelines.md  # WhatsApp tone and format rules
└── bing-search-bypass.md          # Search strategy for paywalled sites
```

### pnpm scripts

| Script | Entry point | Purpose |
|---|---|---|
| `pnpm property` | `src/repl/replProperty.ts` | REPL for PropertyAgentAssistant |
| `pnpm orchestrator` | `src/repl/replOrchestrator.ts` | REPL for full orchestrator pipeline |
| `pnpm research` | `src/repl/replResearch.ts` | REPL for ResearchAgent |
| `pnpm skills` | `src/repl/replSkillAgent.ts` | REPL for SkillAgent |
| `pnpm traveltime` | `src/repl/replTravelTime.ts` | REPL for travel time tool |

---

## File Summaries

### `src/core/Agent.ts`
The abstract base class every agent extends. Owns all shared logic so concrete agents contain only what makes them unique.

**What subclasses must declare:**
- `name` — string identifier; used as Langfuse trace `functionId` and log label
- `systemPrompt` — the agent's persona and instructions
- `tools` — the tool set this agent can invoke

**What the base class provides:**
- `send(userMessage)` — the full loop: log user turn → call `generateText` with OTel telemetry → append to history → log agent reply → return text
- `historyMode` config (`'full'` | `'text-only'`) — controls what gets stored in the message array after each exchange. `'full'` keeps all tool call/result pairs (best for tool-heavy agents). `'text-only'` keeps only the final assistant reply (best for orchestrators or long sessions).
- `maxHistoryTurns` config — optional sliding window; trims old turns at user-message boundaries so tool call chains are never split mid-cycle.
- `maxSteps` config — how many tool-call iterations `generateText` may run per `send()` call (default: 5).
- `maxRetries` config — retries on transient errors (429, 5xx); default 3, passed directly to `generateText`.
- `skills` config — array of `Skill` objects loaded via `SkillLoader`; their markdown content is appended to the agent's system prompt automatically.
- `allowSkillManagement` config — when `true`, adds `createSkill` and `updateSkill` to the agent's tool set. Skills are auto-reloaded from disk after either tool runs. Default `false`.
- `store` config — optional `SessionStore` for cross-session message persistence.
- `reset()`, `length`, `history` — history management utilities.

**Constructor:** `new MyAgent(model, sessionId, config?)`

### `src/core/Skill.ts`
Defines the `Skill` interface: `{ name, fileName, content }`. Name is extracted from the first `# heading` in the file; falls back to the filename in Title Case.

### `src/core/SkillLoader.ts`
Scans the `skills/` directory for `*.md` files and returns `Skill[]`. Static methods:
- `loadAll()` — loads every skill file; gracefully skips unreadable files
- `loadByName(nameOrFile)` — finds one skill by name or filename
- `list()` — returns all skill names
- `create(fileName, content)` — writes a new `.md` file (fails if already exists)
- `update(fileName, content)` — overwrites an existing `.md` file

### `src/core/SkillAgent.ts`
A concrete `Agent` subclass for agents with **no hardcoded system prompt** — capabilities come entirely from skills at runtime. Accepts `{ name, basePrompt, skills, tools, allowSkillManagement, config }`. For existing concrete agents (PropertyAgentAssistant etc.), pass `skills` via `AgentConfig` instead — no need for `SkillAgent`.

### `src/repl/lib.ts`
Shared utilities used by every REPL to eliminate boilerplate:
- `makeSessionId(prefix)` — returns `{prefix}-{Date.now()}`
- `makeSave(sessionId, agent)` — returns a `save(label?)` function that writes agent history to `logs/exports/` as JSON
- `startAgentRepl(options)` — starts the Node.js REPL, injects standard context (`agent`, `sessionId`, `save`, plus any `extraContext`), and wires the `.quit` command for clean `sdk.shutdown()` + exit

### `src/agents/`
Nine concrete agents — each declares only `name`, `systemPrompt`, and `tools`; everything else is inherited from `Agent`. See `DOCUMENTATION/reference/agents.md` for the full registry and pipeline diagram.

### `src/tools/travelTime.ts`
Live travel time between two Singapore locations via the OneMap API. Geocodes both location names, then fetches drive and public transport durations in parallel. Reads `ONEMAP_TOKEN` from env (JWT, valid 3 days — refresh manually when expired).

### `src/tools.ts`
Two mock property tools (hardcoded data — replace with real CRM/calendar in production):
- `lookupProperty(id)` — name, price, bedrooms, location, type for P001–P004
- `checkAvailability(id, date)` — viewing slot availability for a given date

### `src/store/`
Pluggable session persistence. `SessionStore` interface with two implementations: `InMemoryStore` (default, Map-based) and `RedisStore` (ioredis stub, activate with `pnpm add ioredis`). Pass a store instance via `AgentConfig.store` to enable cross-session memory.

### `src/provider.ts`
Creates the Minimax LLM client using `createAnthropic()` with a custom `baseURL`. All agents import `model` from here. Reads `ANTHROPIC_BASE_URL` and `ANTHROPIC_API_KEY` from env.

### `src/instrumentation.ts`
Initializes OpenTelemetry with `LangfuseSpanProcessor`. Must be imported **before any AI calls**. Reads `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL` from env. Exports `sdk` for `sdk.shutdown()` at process exit.

### `src/logger/conversationLogger.ts`
Writes client ↔ agent turn records to `logs/conversations/{sessionId}.jsonl`. One JSON line per turn: `{ sessionId, role, message, timestamp }`. Tool call internals go to Langfuse only.

---

## Key Concepts

**Tool calling loop:** `generateText` with `maxSteps > 1` runs the agent in a loop — LLM produces a tool call → SDK executes it → result fed back → repeat until the LLM produces a text response or `maxSteps` is reached. This is automatic.

**History vs tracing:** The `messages` array in each agent is for the LLM's active context. Langfuse traces are for developer observability. They are independent — removing tool calls from history would break the LLM's reasoning; Langfuse captures them separately for analysis.

**`result.response.messages` (not `result.text`):** When `historyMode: 'full'`, we append `result.response.messages` — the full array including intermediate tool calls and results — not just the final text. This preserves the LLM's awareness of what it already looked up in prior steps.

**Skills system:** A skill is a plain `.md` file in `skills/` containing procedural SOPs — steps, guidelines, and constraints that tell the agent HOW to use its tools for a specific domain. Skills are loaded via `SkillLoader.loadAll()` and injected into `AgentConfig.skills`. The base `Agent` class appends their content after the agent's own system prompt automatically. Any agent can receive skills — not just `SkillAgent`. When `allowSkillManagement: true`, the agent gains `createSkill` and `updateSkill` tools (user-triggered only) and auto-reloads skills from disk after either runs.
