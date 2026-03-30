/**
 * LangChain adapter example — simulated agent shopping flow.
 *
 * Shows how to wire up ucp-client with LangChain: convert tools to a
 * LangChainTool array and call each tool's call() function, which returns
 * a JSON string as LangChain's AgentExecutor expects.
 *
 * Usage:
 *   # Terminal 1 — start mock server
 *   npm run mock-server
 *
 *   # Terminal 2 — run example
 *   GATEWAY_URL=http://localhost:3002 npx tsx scripts/agents/langchain-agent.ts
 */

import { UCPClient } from '../../src/index.js';
import { toLangChainTools, type LangChainTool } from '../../src/adapters/langchain.js';

const GATEWAY_URL = process.env['GATEWAY_URL'] ?? 'http://localhost:3002';
const AGENT_PROFILE = 'https://agent.example.com/.well-known/ucp';

function getTool(tools: readonly LangChainTool[], name: string): LangChainTool {
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

async function main() {
  console.log('=== LangChain adapter — shopping flow ===\n');

  const client = await UCPClient.connect({
    gatewayUrl: GATEWAY_URL,
    agentProfileUrl: AGENT_PROFILE,
  });

  const agentTools = client.getAgentTools();

  // Convert to LangChain tool array — [{ name, description, schema, call }]
  const tools = toLangChainTools(agentTools, { catchErrors: true });
  console.log(`Tools registered (${tools.length}):`);
  for (const t of tools) {
    console.log(`  ${t.name}`);
  }
  console.log('');

  // Simulate LangChain AgentExecutor calling each tool's call()
  // call() always returns a JSON string (ready for the agent to parse)
  console.log('Step 1: create_checkout');
  const session = JSON.parse(
    await getTool(tools, 'create_checkout').call({
      line_items: [{ item: { id: 'prod_roses' }, quantity: 1 }],
    }),
  ) as { id: string; status: string };
  console.log(`  Session: ${session.id} (${session.status})\n`);

  console.log('Step 2: update_checkout — add buyer info');
  const updated = JSON.parse(
    await getTool(tools, 'update_checkout').call({
      id: session.id,
      buyer: { first_name: 'Test', last_name: 'Agent', email: 'agent@example.com' },
    }),
  ) as { id: string; status: string };
  console.log(`  Status: ${updated.status}\n`);

  console.log('Step 3: cancel_checkout');
  const cancelled = JSON.parse(
    await getTool(tools, 'cancel_checkout').call({ id: session.id }),
  ) as { status: string };
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
