# Repository Guidelines

## Project Structure & Module Organization
Source code lives under `src/` and is grouped by responsibility:
- `src/core/` shared agent and skill abstractions
- `src/agents/` concrete agents such as `PropertyAgentAssistant` and `ResearchAgent`
- `src/tools/` external integrations and utility tools
- `src/store/` session persistence implementations
- `src/repl/` interactive entry points used during development
- `src/logger/` conversation logging

Repository knowledge and SOPs live outside the app code:
- `skills/` for markdown skills loaded at runtime
- `DOCUMENTATION/` for deeper design and reference material

## Architecture & SDK Boundaries
Keep concrete agents and high-level orchestration as independent from vendor SDKs as practical. Prefer project-owned interfaces and types at module boundaries, then adapt external SDK types in lower-level core/provider modules. For example, concrete agents should depend on `AgentModel` rather than importing AI SDK model types directly.

When adding or changing SDK-backed functionality:
- Keep direct SDK imports close to the implementation adapter, such as `src/core/`, `src/provider.ts`, or narrowly scoped tool modules
- Avoid leaking SDK-specific request, response, model, tool, or message types into `src/agents/` unless there is a deliberate short-term reason
- Use dependency injection through project-owned abstractions so future SDK swaps affect adapters first, not every agent
- Do not over-abstract prematurely; introduce local interfaces where they reduce real coupling or protect a likely change point

## Build, Test, and Development Commands
This project runs TypeScript directly with `tsx`; there is no separate build step in `package.json`.
- `pnpm install` installs dependencies
- `pnpm david` starts the David CLI for the orchestrator agent
- `pnpm david --print "message"` runs a one-shot orchestrator request
- `pnpm property` starts the main property-agent REPL
- `pnpm orchestrator` runs the multi-agent orchestrator REPL
- `pnpm research` runs the research REPL
- `pnpm skills` runs the skill-agent REPL
- `pnpm traveltime` runs the travel-time tool REPL
- `pnpm exec tsc --noEmit` performs a type check without emitting files

## Coding Style & Naming Conventions
Use modern TypeScript with `strict` mode enabled and NodeNext module resolution. Keep imports explicit and prefer small, single-purpose modules. File names use `PascalCase` for classes and agent implementations, and `camelCase` for functions and helpers. Add new REPL entry points under `src/repl/` and keep tool files in `src/tools/`.

## Testing Guidelines
There is no dedicated automated test suite yet. Validate changes by running the relevant REPL and, for type safety, `pnpm exec tsc --noEmit`. When changing agent behavior, exercise the affected flow end-to-end through the matching REPL and confirm logs or outputs in the session.

## Commit & Pull Request Guidelines
Git history uses short, conventional prefixes such as `feat:`, `refactor:`, and `docs:`. Keep commit messages in that style and focused on one change. Pull requests should explain the behavioral impact, list the commands used to verify the change, and include screenshots or sample transcripts when the user-facing output changes.

## Security & Configuration Tips
Never commit secrets. Runtime configuration is loaded from environment variables via `dotenv`; check the relevant agent or tool before adding a new setting. Be cautious when editing `skills/`, because those markdown files are loaded dynamically into agent prompts.
