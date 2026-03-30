/**
 * Full agent demo: Claude shops at the mock UCP server.
 *
 * Usage:
 *   # Terminal 1 — start mock server
 *   npm run mock-server
 *
 *   # Terminal 2 — run agent
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/agent-demo.ts
 *
 * Optional env vars:
 *   GATEWAY_URL   — UCP server URL (default: http://localhost:3002)
 *   TASK          — Shopping instruction for Claude (default: below)
 */

import Anthropic from '@anthropic-ai/sdk';
import { UCPClient } from '../src/index.js';
import { toAnthropicTools, executeAnthropicToolCall } from '../src/adapters/anthropic.js';

const GATEWAY_URL = process.env['GATEWAY_URL'] ?? 'http://localhost:3002';
const AGENT_PROFILE = 'https://agent.example.com/.well-known/ucp';
const TASK =
  process.env['TASK'] ??
  'Create a checkout with product id "prod_roses" (quantity 1). ' +
    'Update it with buyer info: Jane Doe, jane@example.com. ' +
    'Set shipping fulfillment. ' +
    'Then cancel the checkout.';

async function main() {
  if (!process.env['ANTHROPIC_API_KEY']) {
    console.error('ANTHROPIC_API_KEY is not set');
    process.exit(1);
  }

  console.log(`\n=== UCP Agent Demo ===`);
  console.log(`Gateway: ${GATEWAY_URL}`);
  console.log(`Task: ${TASK}\n`);

  // 1. Connect to the UCP server — discovers capabilities automatically
  console.log('Connecting to UCP server...');
  const client = await UCPClient.connect({
    gatewayUrl: GATEWAY_URL,
    agentProfileUrl: AGENT_PROFILE,
  });

  console.log(`Connected. Available tools:`);
  for (const t of client.describeTools()) {
    console.log(`  ${t.name} (${t.capability})`);
  }
  console.log('');

  // 2. Get tools via Anthropic adapter — catchErrors returns { error } instead of throwing
  const agentTools = client.getAgentTools();
  const anthropicTools = toAnthropicTools(agentTools, { catchErrors: true });
  const anthropic = new Anthropic();
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: TASK }];

  // 3. Agent loop — Claude decides which tools to call and in what order
  let turn = 0;
  while (turn < 20) {
    turn++;
    console.log(`--- Turn ${turn} ---`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system:
        "You are a shopping agent. Complete the user's shopping task using the available UCP tools. " +
        'Be concise — do not explain each step, just execute the tools.',
      tools: anthropicTools as Anthropic.Tool[],
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    const toolCalls = response.content.filter((b) => b.type === 'tool_use');

    if (toolCalls.length === 0) {
      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as Anthropic.TextBlock).text)
        .join('');
      console.log(`\nAgent: ${text}\n`);
      break;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolCalls) {
      if (block.type !== 'tool_use') continue;

      console.log(`  → ${block.name}(${JSON.stringify(block.input)})`);
      const result = await executeAnthropicToolCall(
        agentTools,
        block.name,
        block.input as Record<string, unknown>,
        { catchErrors: true },
      );
      const resultStr = JSON.stringify(result, null, 2);
      console.log(`  ← ${resultStr.slice(0, 200)}${resultStr.length > 200 ? '...' : ''}`);
      results.push({ type: 'tool_result', tool_use_id: block.id, content: resultStr });
    }

    messages.push({ role: 'user', content: results });
  }

  console.log('=== Done ===\n');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
