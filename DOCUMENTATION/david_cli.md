# David CLI

`david` is the terminal interface for the existing orchestrator agent. It supports interactive chat sessions and non-interactive one-shot prompts.

## Setup

Install dependencies and configure `.env`:

```bash
pnpm install
cp .env.example .env
```

Required LLM settings:

```bash
ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic/v1
ANTHROPIC_API_KEY=your_minimax_api_key_here
ANTHROPIC_MODEL=MiniMax-M2.7
```

## Commands

| Command | What it does |
|---|---|
| `pnpm david` | Starts interactive chat mode. |
| `pnpm david --print "message"` | Sends one message and prints the final response. |
| `pnpm david -p "message"` | Short form of `--print`. |
| `pnpm --silent david --print "message"` | Runs one-shot mode without pnpm's script banner; best for piping. |
| `pnpm david "message"` | Sends one message without requiring `--print`. |
| `echo "message" \| pnpm david --print` | Reads a prompt from stdin and prints the response. |
| `pnpm david --session <id>` | Uses a named local session and resumes prior history if present. |
| `pnpm david --new` | Forces a fresh generated session ID. |
| `pnpm david --model <id>` | Overrides `ANTHROPIC_MODEL` for this run. |
| `pnpm david --help` | Prints CLI usage and exits. |

Non-interactive mode writes only the assistant's final answer from the CLI. Diagnostics and errors go to stderr. When piping output through `pnpm`, use `pnpm --silent david ...` to suppress pnpm's own script banner.

## Interactive Commands

| Command | What it does |
|---|---|
| `/help` | Shows interactive commands. |
| `/session` | Prints the active session ID. |
| `/clear` | Clears persisted history for the current session. |
| `/save [label]` | Exports the current history to `logs/exports/`. |
| `/exit` | Flushes tracing and exits. Ctrl-D also exits. |

## Examples

Start a chat:

```bash
pnpm david
```

Run a one-shot query:

```bash
pnpm david --print "Tell me about P001"
```

Resume a session:

```bash
pnpm david --session client-lee
pnpm david --print --session client-lee "What did we discuss earlier?"
```

Try another model for one run:

```bash
pnpm david --model MiniMax-M2.7 --print "What can you do?"
```

Session state is stored under `logs/sessions/`, conversation logs under `logs/conversations/`, and exports under `logs/exports/`. These paths are ignored by git.
