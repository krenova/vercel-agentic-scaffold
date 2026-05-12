# Core Agent Reference

**File:** `src/core/Agent.ts`

---

## What is `Agent`?

`Agent` is the abstract base class that all agents in this framework extend. It owns every piece of shared logic — conversation history, the LLM call loop, tool execution, session store integration, OpenTelemetry tracing, and conversation logging — so that concrete agents only need to declare the three things that make them unique.

You never instantiate `Agent` directly. You extend it.

---

## What a subclass must declare

Every concrete agent must implement exactly three members:

| Member | Type | Purpose |
|---|---|---|
| `name` | `string` | Identifier used in Langfuse trace `functionId` and log labels |
| `systemPrompt` | `string` | The LLM system message — defines the agent's persona and behaviour |
| `tools` | `Record<string, CoreTool>` | The tools the LLM may call during a conversation, keyed by name |

Everything else is inherited.

```ts
class MyAgent extends Agent {
  readonly name = 'MyAgent';
  protected readonly systemPrompt = 'You are a helpful assistant.';
  protected readonly tools = { myTool };
}
```

---

## `AgentConfig`

Passed as the optional third argument to the constructor. All fields are optional.

| Field | Type | Default | What it controls |
|---|---|---|---|
| `historyMode` | `'full' \| 'text-only'` | `'full'` | What gets stored in history after each turn — see below |
| `maxSteps` | `number` | `5` | Maximum tool-call iterations per `send()` call |
| `maxHistoryTurns` | `number \| null` | `null` | Sliding window of turns to keep; `null` = unlimited |
| `store` | `SessionStore` | `undefined` | External session store for persistent history |

### `historyMode` explained

- **`'full'`** — After each `send()`, the full LLM response is appended to history: the assistant's tool call requests, the tool results, and the final text reply. The model sees everything it did in prior turns. Required for any agent that uses tools across multiple messages (otherwise the model doesn't know what it already looked up).

- **`'text-only'`** — Only the final assistant text reply is appended. Tool call/result pairs are discarded after each turn. History stays compact but the model loses awareness of past tool calls. Useful for orchestrators or agents that never need to reference prior lookups.

### `maxHistoryTurns` explained

Trims old turns when the number of user messages exceeds this limit. Trimming always cuts at a **user-message boundary** — meaning a turn's tool call chain and agent reply are always kept together and never split mid-cycle, which would confuse the model.

### `store` explained

See [session-store.md](./session-store.md) for the full reference. When a store is provided, `send()` loads history from it at the start of every call and saves back after each reply. This enables history to survive process restarts and to be shared across multiple Agent instances for the same session.

---

## Constructor

```ts
constructor(model: LanguageModel, sessionId: string, config?: AgentConfig)
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `model` | `LanguageModel` | Yes | The LLM instance to use. Import the shared `model` export from `src/provider.ts`. |
| `sessionId` | `string` | Yes | A unique identifier for this conversation session. Used to key the JSONL log file, Langfuse trace metadata, and session store entries. Typically `session-${Date.now()}`. |
| `config` | `AgentConfig` | No | Behaviour overrides. All fields have defaults — omit entirely to accept all defaults. |

---

## `send(userMessage)`

```ts
async send(userMessage: string): Promise<string>
```

Sends a user message to the LLM and returns the agent's reply.

**Parameter:**

| Name | Type | Description |
|---|---|---|
| `userMessage` | `string` | The incoming message text from the WhatsApp client. |

**Returns:** The agent's reply as a plain text string.

**What happens internally, in order:**

1. If a `store` is configured → load this session's history from the store into `this.messages`
2. Write the user turn to the JSONL log (`logs/conversations/{sessionId}.jsonl`)
3. Append the user message to `this.messages`
4. Call `generateText` with the full history, system prompt, and tools
5. Run the tool-call loop (up to `maxSteps` iterations) if the LLM requests tools
6. Append the LLM response to `this.messages` (tool calls + results + final text, or text only, depending on `historyMode`)
7. Trim history if `maxHistoryTurns` is set
8. If a `store` is configured → save the updated `this.messages` back to the store
9. Write the agent turn to the JSONL log
10. Return the final reply text

---

## `reset()`

```ts
async reset(): Promise<void>
```

Clears the agent's conversation history. Empties `this.messages` and, if a store is configured, also deletes the session entry from the store. The next `send()` call will start with no prior context.

Note: `reset()` is `async` because the store delete is an async operation. Always `await` it.

---

## `length` (getter)

```ts
get length(): number
```

Returns the total number of messages currently in history. This counts **all** message types: user messages, assistant text replies, tool call requests, and tool results. In `historyMode: 'full'`, a single turn where the agent calls two tools before replying will add 5+ messages to history.

Use this for debugging or to display a turn count, as shown in `run.ts`.

---

## `history` (getter)

```ts
get history(): CoreMessage[]
```

Returns a **shallow copy** of the current message history array. Mutating the returned array does not affect the agent's internal state.

Use this to inspect what the agent currently holds in context. For a simpler count, use `length`.
