# Project Context — @omnixhq/ucp-client

> Update this file for any material change: architecture, new modules, new exports, auth flows, data-model behavior.

## What It Is

`@omnixhq/ucp-client` is a capability-aware TypeScript HTTP client for any [UCP](https://ucp.dev)-compliant server. It is a **published npm library** (`@omnixhq/ucp-client`), not a server or application.

- Discovers server capabilities at connect time (`GET /.well-known/ucp`)
- Exposes only the tools the connected server supports
- Gives AI agents ready-to-use tools via `getAgentTools()`
- Ships framework adapters for every major AI SDK as subpath exports

## Current Version

`0.2.0` (on npm as of 2026-03-28)

## Repository

`github.com/OmnixHQ/ucp-client` — public, MIT license

## Architecture

### Connection Flow

```
UCPClient.connect(config)
  └─ GET /.well-known/ucp
  └─ parse capabilities[]
  └─ instantiate only supported capability classes
  └─ return frozen ConnectedClient
```

### ConnectedClient Shape

```typescript
interface ConnectedClient {
  profile: UCPProfile;
  checkout: CheckoutCapability | null; // dev.ucp.shopping.checkout
  order: OrderCapability | null; // dev.ucp.shopping.order
  identityLinking: IdentityLinkingCapability | null; // dev.ucp.common.identity_linking
  products: ProductsCapability; // always present
  paymentHandlers: PaymentHandlerMap;
  describeTools(): readonly ToolDescriptor[];
  getAgentTools(): readonly AgentTool[];
}
```

### AgentTool Interface

```typescript
interface AgentTool {
  name: string;
  description: string;
  parameters: JsonSchema;
  execute(params: Record<string, unknown>): Promise<unknown>;
}
```

`getAgentTools()` returns only tools whose capability is present on the server.

### Capability → Tools Mapping

| Server declares                   | Tools added to getAgentTools()                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `dev.ucp.shopping.checkout`       | `create_checkout`, `get_checkout`, `update_checkout`, `complete_checkout`, `cancel_checkout` |
| `dev.ucp.shopping.fulfillment`    | + `set_fulfillment`, `select_destination`, `select_fulfillment_option`                       |
| `dev.ucp.shopping.discount`       | + `apply_discount_codes`                                                                     |
| `dev.ucp.shopping.order`          | + `get_order`                                                                                |
| `dev.ucp.common.identity_linking` | + `get_authorization_url`, `exchange_auth_code`, `refresh_access_token`, `revoke_token`      |
| _(always)_                        | `search_products`, `get_product`                                                             |

## Source Layout

```
src/
  types/
    config.ts           — UCPClientConfig, UCP_CAPABILITIES constants
    checkout.ts         — CheckoutSession, Create/Update/CompleteCheckoutPayload
    order.ts            — UCPOrder, WebhookEvent
    payment.ts          — PaymentHandlerInstance, PaymentHandlerMap
    identity-linking.ts — OAuthServerMetadata, TokenResponse, AuthorizationParams
    common.ts           — PostalAddress, BuyerConsent, LocalizationContext, SearchFilters
    product.ts          — UCPProduct
  capabilities/
    checkout.ts         — CheckoutCapability (create, get, update, complete, cancel)
    order.ts            — OrderCapability (get)
    identity-linking.ts — IdentityLinkingCapability (OAuth 2.0 full flow)
    products.ts         — ProductsCapability (search, get)
  adapters/
    catch-errors.ts     — AdapterOptions, ToolErrorResult, safeExecute, formatToolError
    openai.ts           — toOpenAITools(), executeOpenAIToolCall()
    anthropic.ts        — toAnthropicTools(), executeAnthropicToolCall()
    vercel-ai.ts        — toVercelAITools()
    langchain.ts        — toLangChainTools()
    mcp.ts              — toMCPTools(), executeMCPToolCall()
  agent-tools.ts        — AgentTool interface, getAgentTools(), JsonSchema
  UCPClient.ts          — connect(), ConnectedClient
  http.ts               — HttpClient (headers, idempotency, error parsing, auth)
  errors.ts             — UCPError, UCPEscalationError, UCPIdempotencyConflictError, UCPOAuthError
  schemas.ts            — Zod schemas (SDK re-exports)
  index.ts              — Public API surface

examples/
  basic-checkout.ts          — Connect, search, create checkout, complete
  capability-detection.ts    — Show what a UCP server supports
  anthropic-agent-loop.ts    — Full agent loop with Anthropic Claude
  openai-agent-loop.ts       — Full agent loop with OpenAI
  langchain-agent.ts         — LangChain agent with DynamicStructuredTool
  vercel-ai-nextjs.ts        — Next.js App Router route handler with streamText
  mcp-server.ts              — Expose UCP tools as an MCP server

scripts/
  mock-ucp-server.ts         — Spec-compliant local UCP server for testing
  agent-demo.ts              — End-to-end Claude agent demo (Anthropic SDK)
  test-gateway-connection.ts — Live gateway integration test
  agents/
    openai-agent.ts          — OpenAI adapter example (run in CI)
    anthropic-agent.ts       — Anthropic adapter example (run in CI)
    mcp-agent.ts             — MCP adapter example (run in CI)
    vercel-ai-agent.ts       — Vercel AI adapter example (run in CI)
    langchain-agent.ts       — LangChain adapter example (run in CI)
```

## Public Exports

### Main (`@omnixhq/ucp-client`)

- `UCPClient` — `connect(config)` → `ConnectedClient`
- `UCPError`, `UCPEscalationError`, `UCPIdempotencyConflictError`, `UCPOAuthError`
- `CheckoutCapability`, `OrderCapability`, `IdentityLinkingCapability`, `ProductsCapability`
- `getAgentTools()`, `AgentTool`, `JsonSchema`
- `AdapterOptions`, `ToolErrorResult` — adapter error-handling option and return type
- All types from `src/types/`

### Subpath exports (framework adapters)

| Subpath                         | Exports                                                                  |
| ------------------------------- | ------------------------------------------------------------------------ |
| `@omnixhq/ucp-client/openai`    | `toOpenAITools`, `executeOpenAIToolCall`, `OpenAIFunction`, `OpenAITool` |
| `@omnixhq/ucp-client/anthropic` | `toAnthropicTools`, `executeAnthropicToolCall`, `AnthropicTool`          |
| `@omnixhq/ucp-client/vercel-ai` | `toVercelAITools`, `VercelAIToolDefinition`, `VercelAIToolMap`           |
| `@omnixhq/ucp-client/langchain` | `toLangChainTools`, `LangChainTool`                                      |
| `@omnixhq/ucp-client/mcp`       | `toMCPTools`, `executeMCPToolCall`, `MCPTool`                            |

All adapters are zero-dependency pure mappings — no external SDK imports.

## Error Handling

| Error class                   | When thrown                                           |
| ----------------------------- | ----------------------------------------------------- |
| `UCPError`                    | Gateway returns error response with `messages[]`      |
| `UCPEscalationError`          | Checkout response has `status: 'requires_escalation'` |
| `UCPIdempotencyConflictError` | HTTP 409 (idempotency key reused with different body) |
| `UCPOAuthError`               | OAuth token exchange / refresh / revocation failure   |

`UCPError` carries: `code`, `type`, `statusCode`, `path`, `contentType`, `messages[]` (all gateway messages).

## HTTP Client Behaviour

- All requests carry: `UCP-Agent`, `X-Request-ID` (UUID), `Content-Type: application/json`
- Mutating requests (POST, PUT, DELETE) carry `Idempotency-Key` (UUID, regenerated per call)
- Bearer token auth via `accessToken` in config
- 409 responses throw `UCPIdempotencyConflictError`; gateway `messages[]` preserved when present

## Build & Release

- **Build tool**: tsdown → dual ESM + CJS output in `dist/`
- **Type declarations**: `.d.ts` (ESM) + `.d.cts` (CJS) per entry point
- **Validation**: attw (exports map, `no-resolution` ignored for node10 subpath), publint
- **Release**: release-please reads conventional commits, opens Release PR, publishes to npm on merge
- **Secrets required**: `NPM_TOKEN`, `RELEASE_PLEASE_TOKEN` (GitHub Actions)

## Testing

- **Framework**: Vitest
- **Coverage threshold**: 80% (functions, lines, branches)
- **Unit tests**: mock `fetch` via `vi.fn()`
- **Integration tests**: skipped unless `GATEWAY_URL` env is set
- **Type tests**: `src/__tests__/types/*.test-d.ts` via `vitest run --typecheck.only` (`npm run test:types`)
- **CI jobs**: Build+Lint+Test, Integration (mock server), Agent — OpenAI/Anthropic/MCP/Vercel AI/LangChain (5 per-adapter jobs running `scripts/agents/*.ts`)

## Open Tickets (next sprint)

See Notion → 🎫 Tickets → ucp-client for full list. Key open items:

| Ticket   | Description                                      | Priority |
| -------- | ------------------------------------------------ | -------- |
| UCPM-239 | Fix UCP-Agent header — remove `version` field    | P2       |
| UCPM-230 | Error processing helpers (severity partitioning) | P1       |
| UCPM-237 | Auth config (Bearer, API key)                    | P2       |
| UCPM-226 | Request-Signature header (client-side signing)   | P0       |
| v0.2.0   | Production hardening (timeout, retry, 429)       | Next     |
