# Agents Reference

This document covers the concrete agent implementations in `src/agents/`. For the base class and shared logic, see [core-agent.md](./core-agent.md).

---

## `PropertyAgentAssistant`

**File:** `src/agents/PropertyAgentAssistant.ts`

A WhatsApp assistant for a Singapore property agent. It handles inbound messages from buyers and tenants — answering questions about listings, checking viewing availability, and keeping replies short and conversational, as a real agent would write on WhatsApp.

This is the first concrete agent in the framework. It extends `Agent` and declares only the three things specific to this role. All history management, tracing, and logging are inherited.

### Declared members

| Member | Value |
|---|---|
| `name` | `'PropertyAgentAssistant'` |
| `systemPrompt` | Singapore property agent persona; instructs the LLM to be warm and concise, use tools before answering, and ask a clarifying question if unsure |
| `tools` | `{ lookupProperty, checkAvailability }` — see [tools.md](./tools.md) |

---

## `createPropertyAgentAssistant(sessionId, config?)`

**The recommended way to instantiate this agent.** The factory handles the `model` dependency internally so call sites stay clean.

```ts
function createPropertyAgentAssistant(
  sessionId: string,
  config?: AgentConfig,
): PropertyAgentAssistant
```

### Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sessionId` | `string` | Yes | Unique identifier for the conversation session. Passed through to `Agent` for log files and tracing. Use `session-${Date.now()}` or a user-scoped ID in production. |
| `config` | `AgentConfig` | No | Optional overrides for `historyMode`, `maxSteps`, `maxHistoryTurns`, and `store`. Omit to accept all defaults. See [core-agent.md → AgentConfig](./core-agent.md#agentconfig). |

### Returns

A ready-to-use `PropertyAgentAssistant` instance.

### Usage example

```ts
import { createPropertyAgentAssistant } from './agents/PropertyAgentAssistant.js';

const agent = createPropertyAgentAssistant(`session-${Date.now()}`);

const reply = await agent.send("Tell me about P001");
console.log(reply); // "Sunrise Condo is a 3-bedroom condo in Bukit Timah, listed at SGD $1,200,000."

console.log(agent.length); // number of messages currently in history
```

With a session store:

```ts
import { InMemoryStore } from './store/InMemoryStore.js';

const store = new InMemoryStore();
const agent = createPropertyAgentAssistant('session-abc', { store });
```

---

## How to add a new agent

Adding a specialist agent (e.g. a `SchedulingAgent` or `ListingAgent`) takes three steps.

### Step 1 — Create the file

Create `src/agents/MyAgent.ts`. Extend `Agent` and declare the three required members:

```ts
import { Agent, type AgentConfig } from '../core/Agent.js';
import { model } from '../provider.js';
import { myTool } from '../tools.js'; // import whatever tools this agent needs

export class MyAgent extends Agent {
  readonly name = 'MyAgent';

  protected readonly systemPrompt = `You are a ... (describe persona and behaviour)`;

  protected readonly tools = { myTool };
}

export function createMyAgent(sessionId: string, config?: AgentConfig): MyAgent {
  return new MyAgent(model, sessionId, config);
}
```

### Step 2 — Add any tools the agent needs

If this agent needs tools that don't exist yet, add them to `src/tools.ts`. See [tools.md → How to add a new tool](./tools.md#how-to-add-a-new-tool).

### Step 3 — Use it

```ts
import { createMyAgent } from './agents/MyAgent.js';

const agent = createMyAgent(`session-${Date.now()}`);
const reply = await agent.send("...");
```

No changes to `Agent.ts` are needed — the base class handles everything else.
