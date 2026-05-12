# Session Store Reference

**Files:** `src/store/SessionStore.ts`, `src/store/InMemoryStore.ts`, `src/store/RedisStore.ts`

For a conceptual overview and sequence diagrams, see [session_store.md](../session_store.md).

---

## Why it exists

By default, each `Agent` instance keeps its conversation history in a private array in process memory. This means history is lost the moment the process exits, and two Agent instances for the same user can never share context.

The `SessionStore` interface makes history persistence pluggable. Pass a store to the Agent via `AgentConfig.store` and the Agent will load history from it at the start of every `send()` call and save the updated history back after each reply — regardless of which process or instance handles the next message.

---

## `SessionStore` interface

**File:** `src/store/SessionStore.ts`

The contract all store implementations must fulfil. The `Agent` class depends only on this interface, never on a concrete implementation.

```ts
interface SessionStore {
  load(sessionId: string): Promise<CoreMessage[]>;
  save(sessionId: string, messages: CoreMessage[]): Promise<void>;
  delete(sessionId: string): Promise<void>;
}
```

### Methods

#### `load(sessionId)`

| Parameter | Type | Description |
|---|---|---|
| `sessionId` | `string` | The session key — matches the value passed to the Agent constructor. |

**Returns:** `Promise<CoreMessage[]>` — the stored message history, or an empty array `[]` if the session does not exist yet. Never throws for a missing session.

---

#### `save(sessionId, messages)`

| Parameter | Type | Description |
|---|---|---|
| `sessionId` | `string` | The session key. |
| `messages` | `CoreMessage[]` | The complete, current message history to persist. Overwrites any previously stored value for this session. |

**Returns:** `Promise<void>`

Called by the Agent after every `send()` call, once history has been appended and trimmed.

---

#### `delete(sessionId)`

| Parameter | Type | Description |
|---|---|---|
| `sessionId` | `string` | The session key to remove. |

**Returns:** `Promise<void>` — should be a no-op (not throw) if the session does not exist.

Called by `Agent.reset()`.

---

## `InMemoryStore`

**File:** `src/store/InMemoryStore.ts`

A `Map<string, CoreMessage[]>`-backed implementation. No dependencies — works out of the box.

### Constructor

```ts
new InMemoryStore()
```

No parameters.

### When to use it

- Development and local testing
- Single-process deployments where history does not need to survive restarts
- Sharing history across multiple `Agent` instances **within the same process** (e.g. recreating an Agent object per incoming webhook request without losing conversation context)

### What it does and does not survive

| Event | History survives? |
|---|---|
| Multiple `send()` calls on the same Agent | Yes |
| Creating a second Agent with the same `sessionId` and same store | Yes |
| Process restart / crash | No |
| Multiple Node.js workers | No (each worker has its own Map) |

### Example

```ts
import { InMemoryStore } from './store/InMemoryStore.js';

const store = new InMemoryStore();

// Agent A and Agent B share the same store and sessionId — Agent B picks up Agent A's history
const agentA = createPropertyAgentAssistant('session-001', { store });
await agentA.send('Tell me about P001');

const agentB = createPropertyAgentAssistant('session-001', { store });
const reply = await agentB.send('What did I just ask about?'); // knows about P001
```

---

## `RedisStore`

**File:** `src/store/RedisStore.ts`

**Status: stub — not yet active.** The full `ioredis` implementation is written in comments and ready to enable. See activation steps below.

When active, each session is stored as a JSON-serialised `CoreMessage[]` under the Redis key `session:{sessionId}`, with a configurable TTL.

### Constructor

```ts
new RedisStore(options?: RedisStoreOptions)
```

### `RedisStoreOptions`

| Field | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | `REDIS_URL` env var, then `redis://localhost:6379` | Redis connection URL. |
| `ttl` | `number` | `86400` (24 hours) | Time-to-live in seconds for each session key. After this many seconds of inactivity the key expires automatically. Each `save()` call resets the TTL. |

### Additional method: `quit()`

```ts
async quit(): Promise<void>
```

Gracefully closes the Redis connection. Call this during process shutdown (e.g. in the `finally` block of `run.ts`) so in-flight commands complete before the process exits.

### Redis key scheme

```
session:{sessionId}

Examples:
  session:session-1715000000000
  session:user-whatsapp-6512345678
```

Inspect live sessions:

```bash
redis-cli keys 'session:*'
redis-cli get 'session:session-1715000000000'
```

### Activation steps

```bash
# 1. Install the ioredis client
pnpm add ioredis

# 2. Set the connection URL in .env
REDIS_URL=redis://localhost:6379

# 3. Open src/store/RedisStore.ts and uncomment the four marked sections:
#    - the import line
#    - the `private readonly client: Redis` field
#    - the constructor body
#    - all method bodies (delete the throw statements)
```

Then swap the store in your entry point:

```ts
import { RedisStore } from './store/RedisStore.js';

const store = new RedisStore();          // reads REDIS_URL from env automatically
const agent = createPropertyAgentAssistant(sessionId, { store });

// On process exit — flush the connection cleanly
process.on('beforeExit', () => store.quit());
```

---

## Store comparison

| | No store | `InMemoryStore` | `RedisStore` |
|---|---|---|---|
| **Survives process restart** | No | No | Yes |
| **Works across multiple workers** | No | No | Yes |
| **Extra dependencies** | None | None | `ioredis` |
| **Network latency per send()** | None | None | Yes |
| **Best for** | Dev / demos | Single-process testing | Production |

---

## How to pass a store to an agent

```ts
import { InMemoryStore } from './store/InMemoryStore.js';
import { createPropertyAgentAssistant } from './agents/PropertyAgentAssistant.js';

const store = new InMemoryStore();
const agent = createPropertyAgentAssistant('session-001', { store });
```

The same `store` instance should be reused across all agents and requests in your process — not recreated per request.
