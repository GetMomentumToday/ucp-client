/**
 * Vercel AI adapter example — simulated agent shopping flow.
 *
 * Shows how to wire up ucp-client with the Vercel AI SDK: convert tools
 * to a VercelAIToolMap and call each tool's execute() function, which
 * returns a JSON string as the Vercel AI SDK expects.
 *
 * Usage:
 *   # Terminal 1 — start mock server
 *   npm run mock-server
 *
 *   # Terminal 2 — run example
 *   GATEWAY_URL=http://localhost:3002 npx tsx scripts/agents/vercel-ai-agent.ts
 */

import { UCPClient } from '../../src/index.js';
import { toVercelAITools } from '../../src/adapters/vercel-ai.js';

const GATEWAY_URL = process.env['GATEWAY_URL'] ?? 'http://localhost:3002';
const AGENT_PROFILE = 'https://agent.example.com/.well-known/ucp';

async function main() {
  console.log('=== Vercel AI adapter — shopping flow ===\n');

  const client = await UCPClient.connect({
    gatewayUrl: GATEWAY_URL,
    agentProfileUrl: AGENT_PROFILE,
  });

  const agentTools = client.getAgentTools();

  // Convert to Vercel AI tool map — { [toolName]: { description, parameters, execute } }
  const tools = toVercelAITools(agentTools, { catchErrors: true });
  console.log(`Tools registered (${Object.keys(tools).length}):`);
  for (const name of Object.keys(tools)) {
    console.log(`  ${name}`);
  }
  console.log('');

  // Simulate Vercel AI generateText calling each tool's execute()
  // execute() always returns a JSON string (ready for the AI to read)
  console.log('Step 1: create_checkout');
  const session = JSON.parse(
    await tools['create_checkout']!.execute({
      line_items: [{ item: { id: 'prod_roses' }, quantity: 1 }],
    }),
  ) as { id: string; status: string };
  console.log(`  Session: ${session.id} (${session.status})\n`);

  console.log('Step 2: update_checkout — add buyer info');
  const updated = JSON.parse(
    await tools['update_checkout']!.execute({
      id: session.id,
      buyer: { first_name: 'Test', last_name: 'Agent', email: 'agent@example.com' },
    }),
  ) as { id: string; status: string };
  console.log(`  Status: ${updated.status}\n`);

  console.log('Step 3: cancel_checkout');
  const cancelled = JSON.parse(await tools['cancel_checkout']!.execute({ id: session.id })) as {
    status: string;
  };
  console.log(`  Status: ${cancelled.status}\n`);

  if (cancelled.status !== 'canceled') {
    throw new Error(`Expected status "canceled", got "${cancelled.status}"`);
  }

  console.log('=== Done ===\n');
}

main().catch((err) => {
  console.error('FAILED:', (err as Error).message);
  process.exit(1);
});
