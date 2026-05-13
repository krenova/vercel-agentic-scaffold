import 'dotenv/config';
import * as nodeRepl from 'node:repl';
import { getTravelTime } from '../tools/travelTime.js';

console.log(`\n=== Travel Time Tool REPL ===\n`);
console.log(`Variables in scope:`);
console.log(`  travelTime(from, to) — look up travel time between two Singapore locations\n`);
console.log(`Examples:`);
console.log(`  await travelTime("Tampines MRT", "Raffles Place MRT")`);
console.log(`  await travelTime("Jurong East MRT", "Orchard Road")`);
console.log(`  await travelTime("307987", "Marina Bay Sands")  // postal code works too`);
console.log(`\nType .exit to quit.\n`);

async function travelTime(from: string, to: string) {
  const result = await getTravelTime.execute!({ from, to }, {} as never);
  if ('error' in result) {
    console.error(`Error: ${result.error}`);
    return result;
  }
  console.log(`\n${result.from.resolved} → ${result.to.resolved}`);
  const drive = result.travelTime.byDriving;
  const pt = result.travelTime.byPublicTransport;
  console.log(`  By car:  ${'error' in drive ? `FAILED — ${drive.error}` : drive.formatted}`);
  console.log(`  By PT:   ${'error' in pt ? `FAILED — ${pt.error}` : pt.formatted}\n`);
  return result;
}

const server = nodeRepl.start({ prompt: 'traveltime> ', ignoreUndefined: true });
server.context.travelTime = travelTime;
