# @omnixhq/ucp-client

[![npm version](https://img.shields.io/npm/v/@omnixhq/ucp-client.svg)](https://www.npmjs.com/package/@omnixhq/ucp-client)
[![CI](https://github.com/OmnixHQ/ucp-client/actions/workflows/ci.yml/badge.svg)](https://github.com/OmnixHQ/ucp-client/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)

TypeScript client that connects to any [UCP](https://ucp.dev)-compliant server, discovers what it supports, and gives your AI agent ready-to-use tools.

## Why

Every AI agent that wants to buy something from a UCP store needs to discover capabilities, construct headers, handle idempotency, parse errors, manage escalation. That's a lot of boilerplate.

`@omnixhq/ucp-client` handles all of it. You connect, get tools, give them to the LLM — and the LLM orchestrates the checkout flow on its own.

## Install

```bash
npm install @omnixhq/ucp-client
```

## Quick Start

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { UCPClient } from '@omnixhq/ucp-client';

// Connect to any UCP server — discovers capabilities automatically
const client = await UCPClient.connect({
  gatewayUrl: 'https://store.example.com',
  agentProfileUrl: 'https://your-app.com/.well-known/ucp',
});

// Get tools — only what this server supports, with schemas + executors
const tools = client.getAgentTools();
const anthropic = new Anthropic();
const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'Buy me running shoes under $100' },
];

// Agent loop — Claude decides which tools to call and in what order
while (true) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    })),
    messages,
  });

  // Add Claude's response to the conversation
  messages.push({ role: 'assistant', content: response.content });

  // Find tool calls and execute them
  const toolBlocks = response.content.filter((b) => b.type === 'tool_use');

  if (toolBlocks.length === 0) break;

  const toolResults: Anthropic.ToolResultBlockParam[] = [];
  for (const block of toolBlocks) {
    const tool = tools.find((t) => t.name === block.name);
    if (tool) {
      const result = await tool.execute(block.input as Record<string, unknown>);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }
  }

  messages.push({ role: 'user', content: toolResults });
}
```

You write the loop. Claude decides the flow: search → create checkout → set shipping → complete → done.

Each tool returned by `getAgentTools()` has: `name`, `description`, `parameters` (JSON Schema), and `execute(params)` — everything an LLM needs.

## Error handling

```typescript
import {
  UCPError,
  UCPEscalationError,
  UCPIdempotencyConflictError,
  UCPOAuthError,
} from '@omnixhq/ucp-client';

try {
  await client.checkout.complete(sessionId, payload);
} catch (err) {
  if (err instanceof UCPEscalationError) {
    // Redirect buyer to err.continue_url for merchant-hosted checkout
  }
  if (err instanceof UCPIdempotencyConflictError) {
    // HTTP 409 — idempotency key reused with a different request body
  }
  if (err instanceof UCPOAuthError) {
    // OAuth token exchange / refresh / revocation failed — err.statusCode
  }
  if (err instanceof UCPError) {
    // err.code — e.g., 'PRODUCT_NOT_FOUND'
    // err.messages[] — all messages from the server
    // err.path — JSONPath to the field that caused the error
    // err.type — 'error' | 'warning' | 'info'
  }
}
```

### catchErrors option

Pass `{ catchErrors: true }` to any adapter to return errors as structured objects instead of
throwing. The agent observes the failure and can decide what to do next — no try/catch needed in
every tool call.

```typescript
import { executeAnthropicToolCall } from '@omnixhq/ucp-client/anthropic';
import type { ToolErrorResult } from '@omnixhq/ucp-client';

const result = await executeAnthropicToolCall(agentTools, toolName, input, { catchErrors: true });

if (result && typeof result === 'object' && 'error' in result) {
  const err = result as ToolErrorResult;
  // { error: 'OUT_OF_STOCK: Item unavailable' }
  // { requires_escalation: true, continue_url: 'https://...' }
}
```

All five adapters (`openai`, `anthropic`, `mcp`, `vercel-ai`, `langchain`) support `catchErrors`.

## Capabilities

The tools you get depend on what the server declares:

| Server declares                   | Tools you get                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `dev.ucp.shopping.checkout`       | `create_checkout`, `get_checkout`, `update_checkout`, `complete_checkout`, `cancel_checkout` |
| `dev.ucp.shopping.fulfillment`    | + `set_fulfillment`, `select_destination`, `select_fulfillment_option`                       |
| `dev.ucp.shopping.discount`       | + `apply_discount_codes`                                                                     |
| `dev.ucp.shopping.order`          | + `get_order`, `update_order`                                                                |
| `dev.ucp.common.identity_linking` | + `get_authorization_url`, `exchange_auth_code`, `refresh_access_token`, `revoke_token`      |

Connect to a different server → get different tools. Your agent code stays the same.

### Checking capabilities manually

If you need more control than `getAgentTools()`:

```typescript
const client = await UCPClient.connect(config);

client.checkout; // CheckoutCapability | null
client.order; // OrderCapability | null
client.identityLinking; // IdentityLinkingCapability | null

if (client.checkout) {
  client.checkout.extensions.fulfillment; // boolean
  client.checkout.extensions.discount; // boolean
  client.checkout.extensions.buyerConsent; // boolean
  client.checkout.extensions.ap2Mandate; // boolean
}

console.log(Object.keys(client.paymentHandlers));
// e.g., ['com.google.pay', 'dev.shopify.shop_pay']

client.signingKeys; // JWK[] — EC P-256 keys for webhook verification
```

## Webhook signature verification

UCP businesses sign webhook POST requests with a detached JWS in the `Request-Signature` header (RFC 7797). The JWT header MUST include a `kid` claim identifying the signing key.

Use `createWebhookVerifier` to get a stateful verifier that fetches and caches signing keys from the business's discovery profile. It automatically re-fetches on a `kid` cache miss to support zero-downtime key rotation.

```typescript
import { createWebhookVerifier } from '@omnixhq/ucp-client';

const verifier = createWebhookVerifier('https://store.example.com');

// In your webhook handler — MUST respond quickly with 2xx, process async:
const valid = await verifier.verify(rawBody, req.headers['request-signature']);
if (!valid) return res.status(401).send('Invalid signature');

// Safe to process
```

Keys are loaded lazily on the first `verify()` call from `<gatewayUrl>/.well-known/ucp` and cached by `kid`. A `kid` not found in cache triggers one re-fetch (key rotation support).

If you already have signing keys loaded (e.g. from `client.signingKeys`), use `verifyRequestSignature` directly:

```typescript
import { UCPClient, verifyRequestSignature } from '@omnixhq/ucp-client';

const client = await UCPClient.connect(config);
const valid = await verifyRequestSignature(rawBody, signature, client.signingKeys);
```

See [examples/webhook-verification.ts](./examples/webhook-verification.ts) for a complete HTTP server example.

## Framework adapters

Ready-made adapters convert `getAgentTools()` output to each framework's native format — no manual mapping.

| Framework         | Import                           | Example                                                                |
| ----------------- | -------------------------------- | ---------------------------------------------------------------------- |
| **Anthropic SDK** | `@omnixhq/ucp-client` (built-in) | [examples/anthropic-agent-loop.ts](./examples/anthropic-agent-loop.ts) |
| **OpenAI SDK**    | `@omnixhq/ucp-client/openai`     | [examples/openai-agent-loop.ts](./examples/openai-agent-loop.ts)       |
| **Vercel AI SDK** | `@omnixhq/ucp-client/vercel-ai`  | [examples/vercel-ai-nextjs.ts](./examples/vercel-ai-nextjs.ts)         |
| **LangChain**     | `@omnixhq/ucp-client/langchain`  | [examples/langchain-agent.ts](./examples/langchain-agent.ts)           |
| **MCP server**    | `@omnixhq/ucp-client/mcp`        | [examples/mcp-server.ts](./examples/mcp-server.ts)                     |

**OpenAI:**

```typescript
import { toOpenAITools, executeOpenAIToolCall } from '@omnixhq/ucp-client/openai';

const tools = toOpenAITools(client.getAgentTools());

// In your agent loop:
const response = await openai.chat.completions.create({ model: 'gpt-4o', tools, messages });

for (const call of response.choices[0].message.tool_calls ?? []) {
  const result = await executeOpenAIToolCall(
    agentTools,
    call.function.name,
    JSON.parse(call.function.arguments),
  );
}
```

**Vercel AI SDK:**

```typescript
import { toVercelAITools } from '@omnixhq/ucp-client/vercel-ai';
import { jsonSchema, streamText } from 'ai';

const rawTools = toVercelAITools(client.getAgentTools());

// Wrap parameters with jsonSchema() for strict Vercel AI SDK typing:
const tools = Object.fromEntries(
  Object.entries(rawTools).map(([name, t]) => [
    name,
    { ...t, parameters: jsonSchema(t.parameters) },
  ]),
);

const result = await streamText({ model, tools, messages });
```

**LangChain:**

```typescript
import { toLangChainTools } from '@omnixhq/ucp-client/langchain';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const rawTools = toLangChainTools(client.getAgentTools());

const tools = rawTools.map(
  (t) =>
    new DynamicStructuredTool({
      name: t.name,
      description: t.description,
      schema: z.object({}),
      func: t.call,
    }),
);
```

**MCP server:**

```typescript
import { toMCPTools, executeMCPToolCall } from '@omnixhq/ucp-client/mcp';

const agentTools = client.getAgentTools();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toMCPTools(agentTools),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify(
        await executeMCPToolCall(agentTools, req.params.name, req.params.arguments ?? {}),
      ),
    },
  ],
}));
```

## Development

```bash
npm install
npm run build        # tsdown (dual ESM + CJS)
npm test             # vitest (unit tests)
npm run test:types   # type-level tests (vitest --typecheck.only)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run check:exports # attw
npm run check:publish # publint
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for code style and CLA.

## License

[MIT](./LICENSE)
