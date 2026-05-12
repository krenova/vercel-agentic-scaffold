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
cp .env.example .env   # fill in real API keys
pnpm dev
```

Required `.env` values are documented in `.env.example`.

---

## Source Structure

```
src/
├── core/
│   └── Agent.ts                   # Abstract base class — all agents extend this
├── agents/
│   └── PropertyAgentAssistant.ts  # First concrete agent (WhatsApp property assistant)
├── logger/
│   └── conversationLogger.ts      # Writes client ↔ agent turns to JSONL files
├── provider.ts                    # Minimax LLM client
├── tools.ts                       # Tool definitions with Zod schemas
├── instrumentation.ts             # OpenTelemetry + Langfuse setup
└── run.ts                         # Entry point — demo conversation
```

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
- `reset()`, `length`, `history` — history management utilities.

**Constructor:** `new MyAgent(model, sessionId, config?)`

### `src/agents/PropertyAgentAssistant.ts`
The first concrete agent as a Property Agent's Personal Assistant as a concept. Handles WhatsApp messages from property buyers and tenants. Contains only the three things specific to this agent: `name`, `systemPrompt`, and `tools`. Everything else is inherited.

Uses default config: `historyMode: 'full'`, `maxSteps: 5`, `maxHistoryTurns: null` (unlimited).

Exports `createPropertyAgentAssistant(sessionId, config?)` as a factory function.

### `src/provider.ts`
Creates the Minimax LLM client using `createAnthropic()` with a custom `baseURL`. All agents import `model` from here. Reads `ANTHROPIC_BASE_URL` and `ANTHROPIC_API_KEY` from env.

### `src/tools.ts`
Two mock tools (hardcoded data — replace with real CRM/calendar in future):
- `lookupProperty(id)` — returns name, price, bedrooms, location, type for properties P001–P004
- `checkAvailability(id, date)` — returns viewing availability for a given date

Tools use Zod schemas so the AI SDK guarantees correct JSON before calling `execute`.

### `src/instrumentation.ts`
Initializes OpenTelemetry with `LangfuseSpanProcessor`. Must be imported **before any AI calls** in `run.ts`. Reads `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL` from env automatically. Exports `sdk` for calling `sdk.shutdown()` at process exit.

### `src/logger/conversationLogger.ts`
Writes clean client ↔ agent turn records to `logs/conversations/{sessionId}.jsonl`. One JSON line per turn: `{ sessionId, role, message, timestamp }`. Only the human-readable exchange — no tool call internals (those go to Langfuse). Creates the log directory on first write.

### `src/run.ts`
Entry point for development and testing. Generates a `sessionId`, creates a `PropertyAgentAssistant`, runs 5 hardcoded WhatsApp-style messages through it, and prints each reply with the growing history count. Wraps the loop in `try/finally` so `sdk.shutdown()` always flushes traces to Langfuse before exit.

---

## Key Concepts

**Tool calling loop:** `generateText` with `maxSteps > 1` runs the agent in a loop — LLM produces a tool call → SDK executes it → result fed back → repeat until the LLM produces a text response or `maxSteps` is reached. This is automatic.

**History vs tracing:** The `messages` array in each agent is for the LLM's active context. Langfuse traces are for developer observability. They are independent — removing tool calls from history would break the LLM's reasoning; Langfuse captures them separately for analysis.

**`result.response.messages` (not `result.text`):** When `historyMode: 'full'`, we append `result.response.messages` — the full array including intermediate tool calls and results — not just the final text. This preserves the LLM's awareness of what it already looked up in prior steps.
