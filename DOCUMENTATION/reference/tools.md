# Tools Reference

**File:** `src/tools.ts`

---

## What are tools?

Tools are functions the LLM can call during a conversation when it needs real data to answer a question. The LLM decides which tool to call and with what arguments; the Vercel AI SDK executes it and feeds the result back. This loop continues (up to `maxSteps` iterations) until the LLM produces a final text reply.

Each tool has three parts:
- **`description`** — tells the LLM what the tool does and when to use it
- **`parameters`** — a Zod schema that validates the LLM's arguments before execution
- **`execute`** — the async function that does the actual work and returns a result

All tools in this file use **mock data** (hardcoded). Replace the `PROPERTIES` and `UNAVAILABLE_SLOTS` objects with real CRM / calendar API calls before going to production.

---

## `lookupProperty`

Look up a property listing by its ID.

The LLM calls this when a user asks about a specific property and the agent needs accurate details before replying.

### Input

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | The property ID (case-insensitive). Valid values in mock data: `P001`, `P002`, `P003`, `P004`. |

### Output — property found

| Field | Type | Description |
|---|---|---|
| `found` | `true` | Indicates the property exists. |
| `id` | `string` | The uppercased property ID. |
| `name` | `string` | Property display name (e.g. `"Sunrise Condo"`). |
| `price` | `number` | Listing price in SGD (e.g. `1200000`). |
| `priceFormatted` | `string` | Human-readable price (e.g. `"SGD $1,200,000"`). |
| `bedrooms` | `number` | Number of bedrooms. |
| `location` | `string` | District or area name (e.g. `"Bukit Timah"`). |
| `type` | `string` | Property type: `"Condo"`, `"HDB"`, or `"Landed"`. |

### Output — property not found

| Field | Type | Description |
|---|---|---|
| `found` | `false` | Indicates the ID does not exist. |
| `message` | `string` | Human-readable error (e.g. `"No property found with ID P999."`). |

### Mock data

| ID | Name | Price | Bedrooms | Location | Type |
|---|---|---|---|---|---|
| P001 | Sunrise Condo | $1,200,000 | 3 | Bukit Timah | Condo |
| P002 | Greenview HDB | $580,000 | 4 | Tampines | HDB |
| P003 | The Pinnacle | $2,800,000 | 3 | Orchard | Condo |
| P004 | Lakeside Terrace | $3,500,000 | 5 | Jurong West | Landed |

---

## `checkAvailability`

Check whether a property is free for a viewing on a specific date.

The LLM calls this when a user asks about scheduling a viewing or asks if a property is available on a given day.

### Input

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | The property ID (case-insensitive). |
| `date` | `string` | Yes | The date to check, in `YYYY-MM-DD` format. The LLM is responsible for converting natural language dates (e.g. "this Saturday") before calling. |

### Output — property found

| Field | Type | Description |
|---|---|---|
| `found` | `true` | Indicates the property exists. |
| `id` | `string` | The uppercased property ID. |
| `propertyName` | `string` | The property's display name. |
| `date` | `string` | The date that was checked, echoed back. |
| `available` | `boolean` | `true` if the property is free for viewing on that date. |
| `message` | `string` | Human-readable result the agent can relay directly to the user. |

### Output — property not found

| Field | Type | Description |
|---|---|---|
| `found` | `false` | Indicates the ID does not exist. |
| `message` | `string` | Human-readable error. |

### Mock blocked dates

| Property | Blocked dates |
|---|---|
| P001 | 2026-05-17, 2026-05-18 |
| P003 | 2026-05-15 |
| P002, P004 | Available on all dates |

---

## How to add a new tool

### Step 1 — Define the tool in `src/tools.ts`

Use the `tool()` helper from the Vercel AI SDK with a Zod schema for parameters:

```ts
import { tool } from 'ai';
import { z } from 'zod';

export const bookViewing = tool({
  description: 'Book a property viewing for a client on a specific date and time.',
  parameters: z.object({
    propertyId: z.string().describe('The property ID, e.g. P001'),
    date: z.string().describe('Date in YYYY-MM-DD format'),
    clientName: z.string().describe('Full name of the client'),
  }),
  execute: async ({ propertyId, date, clientName }) => {
    // call your CRM / calendar API here
    return {
      success: true,
      confirmationNumber: 'CONF-12345',
      message: `Viewing booked for ${clientName} at ${propertyId} on ${date}.`,
    };
  },
});
```

**Tips:**
- Write `description` for the LLM, not for developers — it determines when and how the model calls the tool
- Use `.describe()` on each Zod field to give the LLM parameter-level guidance
- Keep `execute` async even if it currently returns static data

### Step 2 — Add it to an agent's `tools` object

Open the agent file (e.g. `src/agents/PropertyAgentAssistant.ts`) and import and register the new tool:

```ts
import { lookupProperty, checkAvailability, bookViewing } from '../tools.js';

protected readonly tools = { lookupProperty, checkAvailability, bookViewing };
```

The key name (`bookViewing`) is what the LLM sees as the tool name. No other changes are needed — the Agent base class handles execution automatically.
