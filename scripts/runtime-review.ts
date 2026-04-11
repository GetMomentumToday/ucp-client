/**
 * Runtime integration test — exercises the full client through real HTTP
 * against a UCP server. Validates request headers, response parsing,
 * adapter tool generation, error handling, and edge cases.
 *
 * Works with both the mock server and real ucp-middleware.
 *
 * Usage:
 *   GATEWAY_URL=http://localhost:3000 npx tsx scripts/runtime-review.ts
 */

import { UCPClient } from '../src/UCPClient.js';
import { UCPError } from '../src/errors.js';
import { getAgentTools } from '../src/agent-tools.js';
import { toOpenAITools, executeOpenAIToolCall } from '../src/adapters/openai.js';
import { toAnthropicTools, executeAnthropicToolCall } from '../src/adapters/anthropic.js';
import { toMCPTools, executeMCPToolCall } from '../src/adapters/mcp.js';
import { toVercelAITools } from '../src/adapters/vercel-ai.js';
import { toLangChainTools } from '../src/adapters/langchain.js';
import { createWebhookVerifier } from '../src/verify-signature.js';

const GATEWAY_URL = process.env['GATEWAY_URL'] ?? 'http://localhost:3456';
const AGENT_PROFILE = 'https://agent.example.com/.well-known/ucp';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// Intercept fetch to inspect request/response
const originalFetch = globalThis.fetch;
const requestLog: Array<{
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}> = [];

globalThis.fetch = async (input, init) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;
  const method = init?.method ?? 'GET';
  const headers = (init?.headers as Record<string, string>) ?? {};
  const body = init?.body as string | undefined;
  requestLog.push({ url, method, headers, body });
  return originalFetch(input, init);
};

async function main(): Promise<void> {
  console.log(`\n=== Runtime Integration Review ===`);
  console.log(`Gateway: ${GATEWAY_URL}\n`);

  // ─── 1. Connect + Discovery ─────────────────────────────────────────────
  console.log('1. Connect & Discovery');

  const client = await UCPClient.connect({
    gatewayUrl: GATEWAY_URL,
    agentProfileUrl: AGENT_PROFILE,
  });

  assert(client.profile !== null, 'Discovery profile fetched');
  assert(
    typeof client.profile.ucp?.version === 'string',
    `UCP version: ${client.profile.ucp?.version}`,
  );
  assert(client.checkout !== null, 'Checkout capability detected');

  const capNames = Object.keys(client.profile.ucp?.capabilities ?? {});
  console.log(`    Capabilities: ${capNames.join(', ')}`);

  // Verify discovery request headers
  const discoveryReq = requestLog.find((r) => r.url.includes('.well-known/ucp'));
  assert(discoveryReq !== undefined, 'Discovery request was sent');
  assert(
    discoveryReq!.headers['UCP-Agent']?.includes('profile='),
    `UCP-Agent header present: ${discoveryReq!.headers['UCP-Agent']?.slice(0, 60)}`,
  );
  assert(
    discoveryReq!.headers['request-id'] !== undefined,
    `request-id header present: ${discoveryReq!.headers['request-id']}`,
  );
  assert(discoveryReq!.headers['Content-Type'] === undefined, 'No Content-Type on GET request');

  // Signing keys
  assert(client.signingKeys.length > 0, `Signing keys extracted: ${client.signingKeys.length}`);
  assert(
    typeof client.signingKeys[0]!.kid === 'string',
    `First key kid: ${client.signingKeys[0]!.kid}`,
  );

  // Payment handlers
  assert(typeof client.paymentHandlers === 'object', 'Payment handlers is object');
  console.log(
    `    Payment handler namespaces: ${JSON.stringify(Object.keys(client.paymentHandlers))}`,
  );

  // Order capability (may or may not be present)
  console.log(`    Order capability: ${client.order !== null ? 'yes' : 'no'}`);
  console.log(`    Identity linking: ${client.identityLinking !== null ? 'yes' : 'no'}`);

  // ─── 2. Tool Generation ────────────────────────────────────────────────
  console.log('\n2. Tool Generation');

  const tools = getAgentTools(client);
  assert(tools.length > 0, `Agent tools generated: ${tools.length}`);
  console.log(`    Tools: ${tools.map((t) => t.name).join(', ')}`);

  // Core checkout tools always present
  const toolNames = new Set(tools.map((t) => t.name));
  assert(toolNames.has('create_checkout'), 'Has create_checkout tool');
  assert(toolNames.has('get_checkout'), 'Has get_checkout tool');
  assert(toolNames.has('update_checkout'), 'Has update_checkout tool');
  assert(toolNames.has('complete_checkout'), 'Has complete_checkout tool');
  assert(toolNames.has('cancel_checkout'), 'Has cancel_checkout tool');

  // Verify each tool has required fields
  for (const tool of tools) {
    assert(typeof tool.name === 'string' && tool.name.length > 0, `Tool "${tool.name}" has name`);
    assert(
      typeof tool.description === 'string' && tool.description.length > 0,
      `Tool "${tool.name}" has description`,
    );
    assert(tool.parameters.type === 'object', `Tool "${tool.name}" parameters.type is "object"`);
    assert(typeof tool.execute === 'function', `Tool "${tool.name}" has execute function`);
  }

  // describeTools() + getAgentTools() on client
  const descriptors = client.describeTools();
  assert(
    descriptors.length === tools.length,
    `describeTools() count matches: ${descriptors.length}`,
  );
  const clientTools = client.getAgentTools();
  assert(
    clientTools.length === tools.length,
    `client.getAgentTools() count matches: ${clientTools.length}`,
  );

  // ─── 3. Adapter Conversion ─────────────────────────────────────────────
  console.log('\n3. Adapter Conversion');

  const openaiTools = toOpenAITools(tools);
  assert(openaiTools.length === tools.length, `OpenAI tools: ${openaiTools.length}`);
  assert(openaiTools[0]!.type === 'function', 'OpenAI tool type is "function"');
  assert(typeof openaiTools[0]!.function.parameters === 'object', 'OpenAI function has parameters');

  const anthropicTools = toAnthropicTools(tools);
  assert(anthropicTools.length === tools.length, `Anthropic tools: ${anthropicTools.length}`);
  assert(
    anthropicTools[0]!.input_schema.type === 'object',
    'Anthropic input_schema.type is "object"',
  );

  const mcpTools = toMCPTools(tools);
  assert(mcpTools.length === tools.length, `MCP tools: ${mcpTools.length}`);
  assert(mcpTools[0]!.inputSchema.type === 'object', 'MCP inputSchema.type is "object"');

  const vercelTools = toVercelAITools(tools);
  assert(
    Object.keys(vercelTools).length === tools.length,
    `Vercel AI tools: ${Object.keys(vercelTools).length}`,
  );

  const langchainTools = toLangChainTools(tools);
  assert(langchainTools.length === tools.length, `LangChain tools: ${langchainTools.length}`);
  assert(typeof langchainTools[0]!.call === 'function', 'LangChain tool has call()');

  // ─── 4. Full Checkout Flow ─────────────────────────────────────────────
  console.log('\n4. Full Checkout Flow (via adapter execute)');

  requestLog.length = 0;

  // 4a. Create checkout — use generic product IDs the middleware MockAdapter knows
  const createResult = (await executeOpenAIToolCall(tools, 'create_checkout', {
    line_items: [{ item: { id: 'prod_roses' }, quantity: 2 }],
    currency: 'USD',
  })) as Record<string, unknown>;

  assert(typeof createResult['id'] === 'string', `Checkout created: ${createResult['id']}`);
  const status = createResult['status'];
  assert(typeof status === 'string', `Status: ${status}`);
  assert(Array.isArray(createResult['line_items']), 'Has line_items array');
  assert(Array.isArray(createResult['totals']), 'Has totals array');

  const sessionId = createResult['id'] as string;

  // Verify POST request headers
  const createReq = requestLog.find(
    (r) => r.method === 'POST' && r.url.includes('/checkout-sessions'),
  );
  assert(createReq !== undefined, 'Create request was POST /checkout-sessions');
  assert(createReq!.headers['Content-Type'] === 'application/json', 'Content-Type set on POST');
  assert(createReq!.headers['idempotency-key'] !== undefined, 'idempotency-key present on POST');
  assert(createReq!.headers['request-id'] !== undefined, 'request-id present on POST');

  // 4b. Get checkout via Anthropic adapter
  const getResult = (await executeAnthropicToolCall(tools, 'get_checkout', {
    id: sessionId,
  })) as Record<string, unknown>;

  assert(getResult['id'] === sessionId, `GET returned same session`);

  // Verify GET request headers
  const getReq = requestLog.find(
    (r) => r.method === 'GET' && r.url.includes(`/checkout-sessions/`),
  );
  assert(getReq !== undefined, 'GET request sent');
  assert(getReq!.headers['idempotency-key'] === undefined, 'No idempotency-key on GET');
  assert(getReq!.headers['Content-Type'] === undefined, 'No Content-Type on GET');

  // 4c. Update checkout with buyer info via MCP adapter
  const updateResult = (await executeMCPToolCall(tools, 'update_checkout', {
    id: sessionId,
    buyer: { first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' },
  })) as Record<string, unknown>;

  assert(updateResult['id'] === sessionId, 'Update returned same session');
  console.log(`    Status after update: ${updateResult['status']}`);

  // Verify PUT request headers
  const updateReq = requestLog.find(
    (r) => r.method === 'PUT' && r.url.includes(`/checkout-sessions/`),
  );
  assert(updateReq !== undefined, 'PUT request sent');
  assert(updateReq!.headers['idempotency-key'] !== undefined, 'idempotency-key present on PUT');
  assert(updateReq!.headers['Content-Type'] === 'application/json', 'Content-Type set on PUT');

  // 4d. Set fulfillment (if available)
  if (toolNames.has('set_fulfillment')) {
    const fulfillResult = (await executeOpenAIToolCall(tools, 'set_fulfillment', {
      id: sessionId,
      type: 'shipping',
    })) as Record<string, unknown>;

    assert(fulfillResult['id'] === sessionId, 'Fulfillment set');
    console.log(`    Status after fulfillment: ${fulfillResult['status']}`);
  }

  // 4e. Complete checkout
  const completeResult = (await executeOpenAIToolCall(tools, 'complete_checkout', {
    id: sessionId,
    payment: {
      instruments: [
        {
          id: 'inst_1',
          handler_id: 'checkmo',
          type: 'offline',
          credential: { type: 'token', token: 'tok_test' },
        },
      ],
    },
  })) as Record<string, unknown>;

  const completeStatus = completeResult['status'] as string;
  console.log(`    Complete status: ${completeStatus}`);
  assert(
    completeStatus === 'completed' || completeStatus === 'requires_escalation',
    `Complete returned terminal status: ${completeStatus}`,
  );

  // 4f. Get order (if order capability and order_id present)
  if (client.order && typeof completeResult['order_id'] === 'string') {
    const orderId = completeResult['order_id'] as string;
    const orderResult = (await executeAnthropicToolCall(tools, 'get_order', {
      id: orderId,
    })) as Record<string, unknown>;
    assert(orderResult['id'] === orderId, `Order retrieved: ${orderId}`);
  }

  // ─── 5. Error Handling ─────────────────────────────────────────────────
  console.log('\n5. Error Handling');

  // 5a. Get non-existent session → 404 UCPError
  try {
    await client.checkout!.get('non_existent_session_id');
    assert(false, 'Should throw on 404', 'Did not throw');
  } catch (err) {
    assert(err instanceof UCPError, `Throws UCPError on 404`);
    if (err instanceof UCPError) {
      assert(err.statusCode === 404, `Status code: ${err.statusCode}`);
      assert(typeof err.code === 'string' && err.code.length > 0, `Error code: ${err.code}`);
      assert(typeof err.message === 'string' && err.message.length > 0, `Error message present`);
      assert(err.messages.length > 0, `Messages array populated: ${err.messages.length} messages`);
      console.log(
        `    Error detail: [${err.code}] ${err.message} (${err.messages[0]?.content_type ?? 'no content_type'})`,
      );
    }
  }

  // 5b. catchErrors mode — errors returned as result, not thrown
  const errorResult = (await executeOpenAIToolCall(
    tools,
    'get_checkout',
    { id: 'non_existent' },
    { catchErrors: true },
  )) as Record<string, unknown>;
  assert(typeof errorResult['error'] === 'string', `catchErrors returns error object`);
  console.log(`    catchErrors result: ${String(errorResult['error']).slice(0, 80)}`);

  // 5c. Tool not found — throws
  try {
    await executeOpenAIToolCall(tools, 'nonexistent_tool', {});
    assert(false, 'Should throw for unknown tool');
  } catch (err) {
    assert(err instanceof Error, `Throws Error for unknown tool`);
  }

  // 5d. Tool not found — catchErrors returns error
  const unknownResult = (await executeOpenAIToolCall(
    tools,
    'nonexistent_tool',
    {},
    { catchErrors: true },
  )) as Record<string, unknown>;
  assert(typeof unknownResult['error'] === 'string', 'catchErrors catches unknown tool');

  // ─── 6. WebhookVerifier ────────────────────────────────────────────────
  console.log('\n6. WebhookVerifier');

  const verifier = createWebhookVerifier(GATEWAY_URL);
  assert((await verifier.verify('{}', 'not.a.valid.jws')) === false, 'Invalid JWS returns false');
  assert((await verifier.verify('{}', 'only.two')) === false, 'Malformed structure returns false');
  assert((await verifier.verify('{}', '')) === false, 'Empty signature returns false');

  // ─── 7. Idempotency Key Uniqueness ─────────────────────────────────────
  console.log('\n7. Idempotency Key Uniqueness');

  requestLog.length = 0;

  await executeOpenAIToolCall(tools, 'create_checkout', {
    line_items: [{ item: { id: 'PROD-001' }, quantity: 1 }],
  }).catch(() => {});
  await executeOpenAIToolCall(tools, 'create_checkout', {
    line_items: [{ item: { id: 'PROD-001' }, quantity: 1 }],
  }).catch(() => {});

  const postReqs = requestLog.filter((r) => r.method === 'POST');
  const idemKeys = postReqs.map((r) => r.headers['idempotency-key']);
  assert(idemKeys.length >= 2, `Multiple POST requests: ${idemKeys.length}`);
  assert(
    idemKeys[0] !== idemKeys[1],
    `Unique idempotency keys: ${idemKeys[0]?.slice(0, 8)}... vs ${idemKeys[1]?.slice(0, 8)}...`,
  );

  const reqIds = postReqs.map((r) => r.headers['request-id']);
  assert(
    reqIds[0] !== reqIds[1],
    `Unique request-ids: ${reqIds[0]?.slice(0, 8)}... vs ${reqIds[1]?.slice(0, 8)}...`,
  );

  // ─── 8. Object Immutability ────────────────────────────────────────────
  console.log('\n8. Object Immutability');
  assert(Object.isFrozen(client), 'ConnectedClient is frozen');

  // ─── Summary ───────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(50)}\n`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
