  ---
  1. OrchestratorAgent (highest priority)
  
  Routes incoming WhatsApp messages to the right specialist agent. Without
  this, the agent has to manually decide which agent handles each message —
  which defeats the purpose of a personal assistant.

  Responsibility: Classify intent → hand off to the right agent → return the
  reply.

  Why first: Every other agent becomes more useful once there's a router. This
   is also where historyMode: 'text-only' makes sense — the orchestrator
  doesn't need to remember tool internals, only the final replies.

  ---
  2. SchedulingAgent

  Manages viewing appointments end-to-end.

  Responsibilities:
  - Check property availability for a requested date/time
  - Book a viewing and send confirmation
  - Handle rescheduling and cancellations
  - Send reminders before a viewing
  
  Tools needed: Calendar API (Google Calendar or similar), availability
  checker (replace mock checkAvailability).

  ---
  3. LeadQualificationAgent

  Screens inbound inquiries to understand how serious and ready a buyer or
  tenant is.

  Responsibilities:
  - Assess buyer budget, financing status (cash vs CPF vs loan), and timeline
  - Identify property preferences (location, type, size, price range)
  - Flag hot leads vs browsers
  - Summarise lead profile for the agent to review

  Why it matters: A property agent's time is the constraint. This agent helps
  prioritise who to call back first.

  ---
  4. ComplianceAgent

  Answers the Singapore-specific regulatory questions that come up constantly.

  Responsibilities:
  - ABSD (Additional Buyer's Stamp Duty) calculations based on citizenship and
   property count
  - CPF usage rules for different property types
  - HDB eligibility (MOP, income ceiling, ethnic quota)
  - Cooling measures and loan limits (TDSR, LTV)
  - Stamp duty estimates for a given price
  
  Why it matters: These questions are frequent, rule-based, and easy to get
  wrong. A dedicated agent with accurate rules is far more reliable than the
  general assistant guessing.

  ---
  5. ListingWriterAgent

  Generates property listing copy for different platforms.

  Responsibilities:
  - Write a compelling PropertyGuru / 99.co listing from a set of property
  facts
  - Adapt tone for different audiences (HDB buyers vs luxury condo buyers)
  - Generate WhatsApp-friendly property summaries to send to interested
  clients
  - Write follow-up messages after viewings

  ---
  6. MarketAnalysisAgent
  
  A property-domain specialisation of your existing ResearchAgent — focused on
   Singapore property data specifically rather than general web research.

  Responsibilities:
  - Pull recent HDB resale transactions for a given block/town
  - Compare rental yields across districts
  - Summarise URA private property transaction data
  - Assess whether a asking price is fair vs comparable transactions
  
  Tools needed: URA API, HDB resale data API (both are public in Singapore).

  ---
  Suggested build order

  OrchestratorAgent       ← ties everything together
        ↓
  SchedulingAgent         ← highest operational value, handles a daily
  workflow
        ↓
  LeadQualificationAgent  ← saves the agent's time on low-quality leads
        ↓
  ComplianceAgent         ← eliminates a whole category of risky guessing
        ↓
  ListingWriterAgent      ← quality-of-life, not time-critical
        ↓
  MarketAnalysisAgent     ← builds on ResearchAgent, needs real data
  integrations

  The first two (Orchestrator + Scheduling) are where I'd start — they
  transform the system from a collection of isolated agents into something
  that actually works like a personal assistant.