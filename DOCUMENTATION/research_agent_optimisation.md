# ResearchAgent Tool Call Optimisation

## Background

During a live research session, it was observed that a single user query caused the agent to make **16 tool calls across 8 rounds** before producing a response. The answer was available in search result snippets by round 2. This document records the investigation methodology, every issue identified, the fixes applied, and the one issue that could not be resolved via prompt engineering.

---

## Investigation Methodology

The trace was extracted from the live REPL session using the built-in `save()` helper:

```js
research> save("workiva-trace")
// Saved → logs/exports/research-{sessionId}_workiva-trace.json
```

The exported file was then loaded into a code editor and read in full. String values longer than 500 characters had been trimmed using the `trimStrings()` utility to make the file readable:

```js
research> writeFileSync('history-trimmed.json', JSON.stringify(trimStrings(agent.history, 500), null, 2))
```

The trace was analysed message by message, tracking every tool call, its result, and the reasoning text the model produced before each decision.

**Query that triggered the investigation:**
> *"Why has Workiva stock price fallen so much yesterday? It seems to be a company specific issue as the software industry in general did not suffer from a similar selloff. For reference, today is the 12th of May."*

---

## Trace Summary

| Round | Tool calls | Outcome |
|---|---|---|
| 1 | 2× `braveSearch` | Returned mixed 2025/2026 results; answer already in snippets |
| 2 | 3× `fetchPage` | 2 failed (403), 1 succeeded with sufficient content |
| 3 | 2× `braveSearch` | Agent confused by year ambiguity; re-searched same topic |
| 4 | 1× `fetchPage` + 1× `braveSearch` | fetchPage failed (timeout); search returned 0 results |
| 5 | 1× `braveSearch` + 1× `fetchPage` | fetchPage failed (403); agent drifted to price history |
| 6 | 2× `fetchPage` | Both failed (403) |
| 7 | 2× `braveSearch` | Near-duplicate of earlier queries |
| 8 | — | Agent finally synthesised and responded |

**Total: 16 tool calls. Minimum needed: 3–4.**

---

## Issues Identified

### Issue 1 — Wrong ticker in first search query
**Evidence:** The model's reasoning text read *"The user is asking about why Workiva (WKEY) stock price fell."* The first search query was `Workiva WKEY stock price drop May 11 2025`. Workiva's actual ticker is **WK**, not WKEY.

**Effect:** The first search returned mostly historical price pages rather than news articles, reducing the quality of initial results and necessitating follow-up searches.

**Root cause:** Model hallucination of a financial ticker symbol. This is a model knowledge issue, not a prompt issue.

---

### Issue 2 — Date ambiguity (no year in query)
**Evidence:** The user said *"today is the 12th of May"* without specifying a year. Search results mixed articles from May 2025 and May 2026. The reasoning text in rounds 3–6 repeatedly showed the agent noticing this confusion: *"some articles reference Q1 2025 results and others Q1 2026 results."*

**Effect:** Four entire search rounds (rounds 3–6) were spent trying to disambiguate the year rather than answering the question.

**Root cause:** The system prompt had no date context, forcing the agent to infer the year from search results — which were themselves ambiguous.

---

### Issue 3 — Fetched 3 URLs in parallel when 1 would have sufficed
**Evidence:** In round 2, the agent issued 3 simultaneous `fetchPage` calls. The system prompt said *"use fetchPage on the most relevant URLs"* (plural).

**Effect:** 2 of the 3 fetches failed immediately. The 1 that succeeded contained sufficient information to answer the question.

**Root cause:** The word "URLs" in the prompt was interpreted as an instruction to fetch multiple pages at once.

---

### Issue 4 — `fetchPage` on known-paywalled financial sites
**Evidence:** 6 of 7 `fetchPage` calls returned either `HTTP 403` or `TypeError: fetch failed`:
- `finance.yahoo.com` — TypeError fetch failed
- `tipranks.com` — HTTP 403
- `investing.com` — HTTP 403
- `macrotrends.net` — HTTP 403
- `stockinvest.us` — HTTP 403

**Effect:** Each failure prompted the agent to try another URL, spawning additional rounds.

**Root cause:** The system prompt gave no guidance on which sites block automated access. The agent chose high-traffic financial sites, which consistently block non-browser requests.

---

### Issue 5 — No stopping criterion
**Evidence:** By the end of round 2, the one successful `fetchPage` (FinancialContent) contained: *"shares fell 8.2% after mixed Q1 results featuring a miss on billings and Q2 guidance that only met expectations."* This directly answered the question. The agent continued searching for 6 more rounds.

The system prompt said *"if results are insufficient, refine your query and search again"* but never defined what constitutes "sufficient."

**Root cause:** No explicit rule telling the agent when to stop and synthesise.

---

### Issue 6 — Zero-result search with no handling guidance
**Evidence:** Round 4 included a query `"Workiva" "May 11" stock selloff 2025` which returned `results: []`. The agent then immediately retried with a near-identical query.

**Root cause:** No instruction on what to do when a search returns zero results.

---

### Issue 7 — Question drift into unrelated data
**Evidence:** In rounds 5–6, the agent shifted from answering *"why did the stock fall"* to attempting to retrieve exact daily historical price data (fetching Macrotrends, StockInvest, Yahoo Finance history pages). The reasoning text showed: *"Let me try to get more specific information about Workiva's stock movement."*

**Effect:** 4 `fetchPage` calls on price history pages, all of which returned 403.

**Root cause:** Date confusion caused the agent to pursue price data as a proxy for confirming what year the event happened, drifting entirely off the original question.

---

### Issue 8 — Search snippets not used as a direct source
**Evidence:** The search result in round 1 already contained: *"fell 13% in the morning session after the company reported weak first-quarter 2025 results, weighed down by a sharp cut to its next-quarter EPS guidance."* The agent ignored this and proceeded to `fetchPage` for more detail.

**Root cause:** The system prompt said *"After getting search results, use fetchPage on the most relevant URLs"* — an unconditional instruction that made fetching mandatory regardless of what the snippets contained.

---

### Issue 9 — `maxSteps: 10` too permissive
**Evidence:** The agent ran all the way to round 8 (16 tool calls) before stopping.

**Root cause:** A limit of 10 steps provides no meaningful constraint for a "why did X happen" question that should resolve in 3–4 steps.

---

## Fixes Applied

All fixes were made to `src/agents/ResearchAgent.ts`.

### Fix 1 — Inject today's date (addresses Issue 2)

```ts
Today's date is ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
```

Evaluated at agent instantiation time, so every session starts with the correct date.

### Fix 2 — Singular fetchPage + snippet-first assessment (addresses Issues 3, 8)

**Before:**
```
- After getting search results, use fetchPage on the most relevant URLs to read the actual content.
```

**After:**
```
- After getting search results, assess whether the snippets already answer the question.
  If they do, synthesise directly without fetchPage.
  If more detail is needed, use fetchPage on the single most relevant URL only.
```

### Fix 3 — Block paywalled financial sites (addresses Issue 4)

```
- Do not use fetchPage on paywalled financial sites — they consistently return 403 errors.
  Avoid: Yahoo Finance articles, Investing.com, TipRanks, Macrotrends, StockInvest, Seeking Alpha.
  Prefer: company investor relations pages, press release wires (BusinessWire, PR Newswire),
  open news syndicates (Reuters, Bloomberg public pages, FinancialContent, StockStory).
```

### Fix 4 — No retry after fetchPage failure (addresses Issue 4 continued)

```
- If fetchPage returns a 403 or timeout error, do not attempt another URL for the same
  information. Move on and synthesise from what you already have.
```

### Fix 5 — Explicit stopping criterion (addresses Issue 5)

```
- Once you have a credible explanation supported by at least one source, stop searching and
  synthesise your response immediately. Do not search for confirmation or additional detail
  beyond what the question requires.
```

### Fix 6 — Search cap and zero-result handling (addresses Issues 6, 8)

**Before:**
```
- If the first search results are insufficient, refine your query and search again.
```

**After:**
```
- If search results are insufficient, you may refine and search again — but make no more than
  3 braveSearch calls per question in total.
- If a search returns zero results, do not retry with a minor variation. Broaden your approach
  significantly or synthesise from what you already have.
```

### Fix 7 — Stay focused on the question (addresses Issue 7)

```
- Always answer the exact question asked. Do not drift into related data (e.g. looking up
  exact historical prices when asked "why did the stock fall") unless explicitly requested.
```

### Fix 8 — Reduce `maxSteps` from 10 to 6 (addresses Issue 9)

```ts
return new ResearchAgent(model, sessionId, { maxSteps: 6, ...config });
```

6 steps allows: 2 parallel searches → 1 fetchPage → 1 follow-up search → 1 fetchPage → synthesise. Sufficient for genuine multi-source research; insufficient for runaway spirals.

### Fix 9 — User-provided URLs always fetched (added post-analysis)

```
- If the user explicitly provides a URL in their message, always use fetchPage on that URL
  regardless of the domain restrictions above. The restrictions apply only when you are
  autonomously choosing which pages to read.
```

---

## What Could Not Be Fixed

**Issue 1 — Wrong ticker hallucination.** The agent searched for `WKEY` instead of `WK`. This is a model knowledge error in the search query itself. No system prompt rule can reliably prevent a model from misremembering a financial ticker symbol. The existing instruction to *"always use braveSearch first — never answer from memory alone"* is the correct mitigation; the model followed this rule but still hallucinated the ticker in the query.

---

## Before vs After System Prompt

### Before

```
You are a thorough and accurate research assistant.
Your job is to find, read, and synthesise information from the web to answer questions.

Guidelines:
- Always use braveSearch first to find relevant pages — never answer from memory alone.
- After getting search results, use fetchPage on the most relevant URLs to read the actual content.
- If the first search results are insufficient, refine your query and search again.
- Always include the source URL when citing a fact.
- Keep responses structured: use bullet points for lists of facts, prose for synthesis.
- Be honest when information is incomplete or conflicting across sources.
```

### After

```
You are a thorough and accurate research assistant.
Today's date is {current date injected at instantiation}.
Your job is to find, read, and synthesise information from the web to answer questions.

Guidelines:
- Always use braveSearch first to find relevant pages — never answer from memory alone.
- After getting search results, assess whether the snippets already answer the question.
  If they do, synthesise directly without fetchPage.
  If more detail is needed, use fetchPage on the single most relevant URL only.
- If search results are insufficient, you may refine and search again — but make no more than
  3 braveSearch calls per question in total.
- If a search returns zero results, do not retry with a minor variation. Broaden your approach
  significantly or synthesise from what you already have.
- Once you have a credible explanation supported by at least one source, stop searching and
  synthesise your response immediately.
- If fetchPage returns a 403 or timeout error, do not attempt another URL for the same information.
  Move on and synthesise from what you already have.
- If the user explicitly provides a URL, always use fetchPage on it regardless of the domain
  restrictions above.
- Always answer the exact question asked. Do not drift into related data unless explicitly requested.
- Always include the source URL when citing a fact.
- Keep responses structured: use bullet points for lists of facts, prose for synthesis.
- Be honest when information is incomplete or conflicting across sources.
```

---

## Expected Outcome

For a question of the same type ("why did X happen"), the optimised agent should complete in **3–4 tool calls** (1–2 searches, 0–1 fetchPage) rather than 16. The key wins are:

- Rounds 3–6 eliminated by injecting today's date
- Rounds 5–6 eliminated by the paywalled-site blocklist and no-retry rule
- Rounds 7–8 eliminated by the stopping criterion and search cap
