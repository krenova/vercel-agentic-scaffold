# Utilities Reference

This document covers the three infrastructure files that every agent depends on.

---

## `provider.ts` — LLM Client

**File:** `src/provider.ts`

Sets up the language model client and exports the `model` instance used by all agents.

### Exports

#### `minimax`

The Anthropic-compatible API client, created with `createAnthropic()` from the Vercel AI SDK. Pointed at the Minimax API base URL instead of Anthropic's own endpoint — this is how any Anthropic-compatible third-party provider is wired in without changing anything else in the codebase.

#### `model`

The specific model instance passed to every Agent constructor. Currently `MiniMax-M2.7`.

```ts
import { model } from './provider.js';

const agent = new MyAgent(model, sessionId);
```

### Environment variables read

| Variable | Description |
|---|---|
| `ANTHROPIC_BASE_URL` | The provider's API base URL (e.g. `https://api.minimax.io/anthropic/v1`) |
| `ANTHROPIC_API_KEY` | The provider's API key |

Both are required. If either is missing, the process will throw at startup.

### Swapping the model

To change the model across the entire project, update the string in this one file:

```ts
export const model = minimax('MiniMax-M2.7'); // ← change this string
```

To switch to a different provider entirely, replace `createAnthropic()` with the appropriate Vercel AI SDK provider adapter (e.g. `createOpenAI()`, `createGoogle()`) and update the env vars.

---

## `conversationLogger.ts` — Conversation Log

**File:** `src/logger/conversationLogger.ts`

Writes a clean, human-readable record of every user ↔ agent exchange to a `.jsonl` file on disk.

### `logTurn(sessionId, role, message)`

```ts
async function logTurn(
  sessionId: string,
  role: 'user' | 'agent',
  message: string,
): Promise<void>
```

Appends one line to `logs/conversations/{sessionId}.jsonl`. Creates the `logs/conversations/` directory on first write if it does not exist.

#### Parameters

| Name | Type | Description |
|---|---|---|
| `sessionId` | `string` | The session identifier. Determines the filename. |
| `role` | `'user' \| 'agent'` | Who sent this message. |
| `message` | `string` | The plain text content to log. |

#### Log format

Each line is a JSON object (`ConversationTurn`):

```json
{
  "sessionId": "session-1715000000000",
  "role": "user",
  "message": "Is P001 available on Saturday?",
  "timestamp": "2026-05-12T08:30:00.000Z"
}
```

One line per turn. Lines are appended — the file is never overwritten.

#### Log location

```
logs/
└── conversations/
    ├── session-1715000000000.jsonl   ← one file per session
    └── session-1715000000001.jsonl
```

#### Difference from Langfuse traces

This logger captures only the **human-readable exchange** — the user's message and the agent's final reply. It is intentionally simple: useful for audit trails, support reviews, or reading a conversation back manually.

Langfuse (via `instrumentation.ts`) captures the **full developer trace** — every LLM call, every tool invocation, token counts, latency, and intermediate steps. Use Langfuse for debugging and performance analysis; use this log for conversation history.

---

## `instrumentation.ts` — OpenTelemetry + Langfuse Tracing

**File:** `src/instrumentation.ts`

Initialises OpenTelemetry and wires it to Langfuse so that all LLM calls and tool invocations are automatically traced.

### How it works

`LangfuseSpanProcessor` hooks into the OTel SDK and intercepts every span produced by the Vercel AI SDK's `experimental_telemetry` option. Each `generateText` call in `Agent.send()` emits spans automatically; no manual instrumentation is needed in agent code.

### Exported value: `sdk`

The `NodeSDK` instance. Import and call `sdk.shutdown()` on process exit to flush any buffered spans before the process terminates — otherwise the last trace of a session may be lost.

```ts
import { sdk } from './instrumentation.js';

try {
  // ... run your agent
} finally {
  await sdk.shutdown(); // flushes remaining spans to Langfuse
}
```

### Environment variables read

`LangfuseSpanProcessor` reads these automatically — no manual configuration needed:

| Variable | Description |
|---|---|
| `LANGFUSE_PUBLIC_KEY` | Langfuse project public key |
| `LANGFUSE_SECRET_KEY` | Langfuse project secret key |
| `LANGFUSE_BASE_URL` | Langfuse host URL (self-hosted or cloud) |

### Import order requirement

`instrumentation.ts` **must be imported before any AI SDK calls**. In `run.ts` it is the first import after `dotenv/config`:

```ts
import 'dotenv/config';
import { sdk } from './instrumentation.js'; // ← must come before any agent or model import
import { createPropertyAgentAssistant } from './agents/PropertyAgentAssistant.js';
```

If you import it after a model call has already been made, those calls will not appear in Langfuse.

### What you get in Langfuse

For each `agent.send()` call, Langfuse records:
- The model used and the full prompt
- Every tool call made during the turn, with its input arguments and output
- Token usage (input, output, total)
- Latency per step
- The `sessionId` and `functionId` (agent name) as metadata for filtering
