import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { sdk } from '../instrumentation.js';
import { createOrchestrator } from '../agents/OrchestratorAgent.js';
import { getModel } from '../provider.js';
import { FileSessionStore } from '../store/FileSessionStore.js';
import { makeSave, makeSessionId } from '../repl/lib.js';

interface CliOptions {
  help: boolean;
  print: boolean;
  newSession: boolean;
  sessionId?: string;
  modelName?: string;
  prompt: string;
}

class UsageError extends Error {
  readonly exitCode = 2;
}

const USAGE = `David CLI

Usage:
  pnpm david
  pnpm david --print "Tell me about P001"
  pnpm david -p "Can I view P001 this Saturday?"
  echo "Tell me about P002" | pnpm david --print
  pnpm --silent david --print "Tell me about P001"

Options:
  -p, --print          Run once and print only the final response from the CLI
  -s, --session <id>   Resume or create a named session
  --new                Force a new generated session
  -m, --model <id>     Override ANTHROPIC_MODEL for this run
  -h, --help           Show this help

Interactive commands:
  /help                Show interactive commands
  /session             Print the active session ID
  /clear               Clear this session's history
  /save [label]        Export the current history to logs/exports/
  /exit                Exit cleanly`;

const INTERACTIVE_HELP = `Commands:
  /help          Show this help
  /session       Print the active session ID
  /clear         Clear this session's history
  /save [label]  Export the current history to logs/exports/
  /exit          Exit cleanly`;

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    help: false,
    print: false,
    newSession: false,
    prompt: '',
  };
  const promptParts: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--') {
      promptParts.push(...argv.slice(i + 1));
      break;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--print' || arg === '-p') {
      options.print = true;
    } else if (arg === '--new') {
      options.newSession = true;
    } else if (arg === '--session' || arg === '-s') {
      options.sessionId = readOptionValue(argv, i, arg);
      i += 1;
    } else if (arg === '--model' || arg === '-m') {
      options.modelName = readOptionValue(argv, i, arg);
      i += 1;
    } else if (arg.startsWith('-')) {
      throw new UsageError(`Unknown option: ${arg}`);
    } else {
      promptParts.push(arg);
    }
  }

  if (options.newSession && options.sessionId) {
    throw new UsageError('--new cannot be combined with --session');
  }

  options.prompt = promptParts.join(' ').trim();
  return options;
}

function readOptionValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith('-')) {
    throw new UsageError(`${flag} requires a value`);
  }
  return value;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of input) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8').trim();
}

function createAgent(options: CliOptions) {
  const sessionId = options.newSession || !options.sessionId
    ? makeSessionId('david')
    : options.sessionId;
  const store = new FileSessionStore();
  const agent = createOrchestrator(sessionId, { store }, getModel(options.modelName));
  return { agent, sessionId };
}

async function runPrint(options: CliOptions): Promise<void> {
  const prompt = options.prompt || (input.isTTY ? '' : await readStdin());
  if (!prompt) {
    throw new UsageError('Missing prompt for non-interactive mode');
  }

  const { agent } = createAgent(options);
  const response = await agent.send(prompt);
  console.log(response);
}

async function runInteractive(options: CliOptions): Promise<void> {
  const { agent, sessionId } = createAgent(options);
  const save = makeSave(sessionId, agent);
  const rl = createInterface({ input, output, prompt: 'david> ' });

  console.error(`\nDavid CLI — Session: ${sessionId}`);
  console.error('Type /help for commands or /exit to quit.\n');

  try {
    while (true) {
      const line = await rl.question('david> ').catch(() => null);
      if (line === null) break;

      const message = line.trim();
      if (!message) continue;

      if (message.startsWith('/')) {
        const shouldExit = await handleCommand(message, agent, sessionId, save);
        if (shouldExit) break;
        continue;
      }

      const response = await agent.send(message);
      console.log(`\n${response}\n`);
    }
  } finally {
    rl.close();
  }
}

async function handleCommand(
  raw: string,
  agent: ReturnType<typeof createOrchestrator>,
  sessionId: string,
  save: (label?: string) => string,
): Promise<boolean> {
  const [command, ...args] = raw.slice(1).trim().split(/\s+/);

  switch (command) {
    case 'help':
      console.log(INTERACTIVE_HELP);
      return false;
    case 'session':
      console.log(sessionId);
      return false;
    case 'clear':
      await agent.reset();
      console.log('Session history cleared.');
      return false;
    case 'save':
      save(args.join('-') || undefined);
      return false;
    case 'exit':
    case 'quit':
      return true;
    default:
      console.warn(`Unknown command: /${command}. Type /help for commands.`);
      return false;
  }
}

async function main(): Promise<number> {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(USAGE);
      return 0;
    }

    const shouldRunOnce = options.print || options.prompt.length > 0 || !input.isTTY;
    if (shouldRunOnce) {
      await runPrint(options);
    } else {
      await runInteractive(options);
    }
    return 0;
  } catch (err) {
    if (err instanceof UsageError) {
      console.error(err.message);
      console.error('\n' + USAGE);
      return err.exitCode;
    }
    console.error(err);
    return 1;
  } finally {
    await sdk.shutdown();
  }
}

process.exitCode = await main();
