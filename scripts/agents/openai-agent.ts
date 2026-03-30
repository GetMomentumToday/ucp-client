/**
 * OpenAI adapter example — simulated agent shopping flow.
 *
 * Shows how to wire up ucp-client with the OpenAI adapter: convert tools
 * to the OpenAI function-calling format, then execute tool calls one by
 * one as an LLM agent would.
 *
 * Usage:
 *   # Terminal 1 — start mock server
 *   npm run mock-server
 *
 *   # Terminal 2 — run example
 *   GATEWAY_URL=http://localhost:3002 npx tsx scripts/agents/openai-agent.ts
 */

import { UCPClient } from '../../src/index.js';
import { toOpenAITools, executeOpenAIToolCall } from '../../src/adapters/openai.js';

const GATEWAY_URL = process.env['GATEWAY_URL'] ?? 'http://localhost:3002';
const AGENT_PROFILE = 'https://agent.example.com/.well-known/ucp';

async function main() {
  console.log('=== OpenAI adapter — shopping flow ===\n');

  const client = await UCPClient.connect({
    gatewayUrl: GATEWAY_URL,
    agentProfileUrl: AGENT_PROFILE,
  });

  const agentTools = client.getAgentTools();

  // Convert to OpenAI function-calling format
  const openaiTools = toOpenAITools(agentTools, { catchErrors: true });
  console.log(`Tools registered (${openaiTools.length}):`);
  for (const t of openaiTools) {
    console.log(`  ${t.function.name}`);
  }
  console.log('');

  // Simulate an agent executing tool calls in sequence
  console.log('Step 1: create_checkout');
  const session = (await executeOpenAIToolCall(
    agentTools,
    'create_checkout',
    { line_items: [{ item: { id: 'prod_roses' }, quantity: 1 }] },
    { catchErrors: true },
  )) as { id: string; status: string };
  console.log(`  Session: ${session.id} (${session.status})\n`);

  console.log('Step 2: update_checkout — add buyer info');
  const updated = (await executeOpenAIToolCall(
    agentTools,
    'update_checkout',
    {
      id: session.id,
      buyer: { first_name: 'Test', last_name: 'Agent', email: 'agent@example.com' },
    },
    { catchErrors: true },
  )) as { id: string; status: string };
  console.log(`  Status: ${updated.status}\n`);

  console.log('Step 3: cancel_checkout');
  const cancelled = (await executeOpenAIToolCall(
    agentTools,
    'cancel_checkout',
    { id: session.id },
    { catchErrors: true },
  )) as { status: string };
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
