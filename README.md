# @omnix/ucp-client

[![npm version](https://img.shields.io/npm/v/@omnix/ucp-client.svg)](https://www.npmjs.com/package/@omnix/ucp-client)
[![CI](https://github.com/OmnixHQ/ucp-client/actions/workflows/ci.yml/badge.svg)](https://github.com/OmnixHQ/ucp-client/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)

TypeScript client that connects to any [UCP](https://ucp.dev)-compliant server, discovers what it supports, and gives your AI agent ready-to-use tools.

## Why

Every AI agent that wants to buy something from a UCP store needs to discover capabilities, construct headers, handle idempotency, parse errors, manage escalation. That's a lot of boilerplate.

`@omnix/ucp-client` handles all of it. You connect, get tools, give them to the LLM — and the LLM orchestrates the checkout flow on its own.

## Install

```bash
npm install @omnix/ucp-client
```

## Quick Start

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { UCPClient } from '@omnix/ucp-client';

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
import { UCPError, UCPEscalationError } from '@omnix/ucp-client';

try {
  await client.checkout.complete(sessionId, payload);
} catch (err) {
  if (err instanceof UCPEscalationError) {
    // Redirect buyer to err.continue_url for merchant-hosted checkout
  }
  if (err instanceof UCPError) {
    // err.code — e.g., 'PRODUCT_NOT_FOUND'
    // err.messages[] — all messages from the server
    // err.path — JSONPath to the field that caused the error
    // err.type — 'error' | 'warning' | 'info'
  }
}
```

## Capabilities

The tools you get depend on what the server declares:

| Server declares                   | Tools you get                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `dev.ucp.shopping.checkout`       | `create_checkout`, `get_checkout`, `update_checkout`, `complete_checkout`, `cancel_checkout` |
| `dev.ucp.shopping.fulfillment`    | + `set_fulfillment`, `select_destination`, `select_fulfillment_option`                       |
| `dev.ucp.shopping.discount`       | + `apply_discount_codes`                                                                     |
| `dev.ucp.shopping.order`          | + `get_order`                                                                                |
| `dev.ucp.common.identity_linking` | + `get_authorization_url`, `exchange_auth_code`, `refresh_access_token`, `revoke_token`      |
| _(always)_                        | `search_products`, `get_product`                                                             |

Connect to a different server → get different tools. Your agent code stays the same.

### Checking capabilities manually

If you need more control than `getAgentTools()`:

```typescript
const client = await UCPClient.connect(config);

client.checkout; // CheckoutCapability | null
client.order; // OrderCapability | null
client.identityLinking; // IdentityLinkingCapability | null
client.products; // ProductsCapability (always available)

if (client.checkout) {
  client.checkout.extensions.fulfillment; // boolean
  client.checkout.extensions.discount; // boolean
  client.checkout.extensions.buyerConsent; // boolean
}

console.log(Object.keys(client.paymentHandlers));
// e.g., ['com.google.pay', 'dev.shopify.shop_pay']
```

## Other agent frameworks

The `AgentTool` format maps directly to every major framework:

**OpenAI:**

```typescript
tools.map((t) => ({
  type: 'function',
  function: { name: t.name, description: t.description, parameters: t.parameters },
}));
```

**Vercel AI SDK:**

```typescript
import { tool, jsonSchema } from 'ai';

Object.fromEntries(
  tools.map((t) => [
    t.name,
    tool({ description: t.description, parameters: jsonSchema(t.parameters), execute: t.execute }),
  ]),
);
```

**MCP server:**

```typescript
for (const t of tools) {
  server.tool(t.name, t.description, t.parameters, async (params) => ({
    content: [{ type: 'text', text: JSON.stringify(await t.execute(params)) }],
  }));
}
```

## Development

```bash
npm install
npm run build        # tsdown (dual ESM + CJS)
npm test             # vitest (116 unit tests)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run check:exports # attw
npm run check:publish # publint
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for code style and CLA.

## License

[MIT](./LICENSE)
