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

const GATEWAY_URL = process.env['GATEWAY_URL'] ?? 'http://localhost:3002';
const AGENT_PROFILE = 'https://agent.example.com/.well-known/ucp';
const TASK =
  process.env['TASK'] ??
  'Find me some roses and create a checkout. ' +
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

  // 2. Get tools — only what this server supports, with schemas + executors
  const tools = client.getAgentTools();
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
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool['input_schema'],
      })),
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    const toolCalls = response.content.filter((b) => b.type === 'tool_use');

    if (toolCalls.length === 0) {
      // Claude is done — print final response
      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as Anthropic.TextBlock).text)
        .join('');
      console.log(`\nAgent: ${text}\n`);
      break;
    }

    // Execute tool calls
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolCalls) {
      if (block.type !== 'tool_use') continue;
      const tool = tools.find((t) => t.name === block.name);
      if (!tool) continue;

      console.log(`  → ${block.name}(${JSON.stringify(block.input)})`);
      try {
        const result = await tool.execute(block.input as Record<string, unknown>);
        const resultStr = JSON.stringify(result, null, 2);
        console.log(`  ← ${resultStr.slice(0, 200)}${resultStr.length > 200 ? '...' : ''}`);
        results.push({ type: 'tool_result', tool_use_id: block.id, content: resultStr });
      } catch (err) {
        const errMsg = (err as Error).message;
        console.log(`  ✗ ${errMsg}`);
        results.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: `Error: ${errMsg}`,
          is_error: true,
        });
      }
    }

    messages.push({ role: 'user', content: results });
  }

  console.log('=== Done ===\n');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
