# Project Context — @omnixhq/ucp-client

> Update this file for any material change: architecture, new modules, new exports, auth flows, data-model behavior.

## What It Is

`@omnixhq/ucp-client` is a capability-aware TypeScript HTTP client for any [UCP](https://ucp.dev)-compliant server. It is a **published npm library** (`@omnixhq/ucp-client`), not a server or application.

- Discovers server capabilities at connect time (`GET /.well-known/ucp`)
- Exposes only the tools the connected server supports
- Gives AI agents ready-to-use tools via `getAgentTools()`
- Ships framework adapters for every major AI SDK as subpath exports

## Current Version

`2.5.0` (on npm). SDK dependency: `@omnixhq/ucp-js-sdk@2.0.0`.

## Repository

`github.com/OmnixHQ/ucp-client` — public, MIT license

## Architecture

### Connection Flow

```
UCPClient.connect(config)
  └─ GET /.well-known/ucp
  └─ parse capabilities[]
  └─ optionally fetch /.well-known/oauth-authorization-server (if identity_linking declared)
  └─ instantiate only supported capability classes
  └─ return frozen ConnectedClient
```

### ConnectedClient Shape

```typescript
interface ConnectedClient {
  profile: UCPProfile; // full discovery profile
  signingKeys: readonly JWK[]; // EC P-256 keys for webhook verification
  checkout: CheckoutCapability | null; // dev.ucp.shopping.checkout
  order: OrderCapability | null; // dev.ucp.shopping.order
  catalog: CatalogCapability | null; // dev.ucp.shopping.catalog.search / .lookup
  cart: CartCapability | null; // dev.ucp.shopping.cart
  identityLinking: IdentityLinkingCapability | null; // dev.ucp.common.identity_linking
  paymentHandlers: PaymentHandlerMap; // namespace-keyed map from profile
  describeTools(): readonly ToolDescriptor[]; // lightweight name+description list
  getAgentTools(): readonly AgentTool[]; // full tools with parameters + execute
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

| Server declares                   | Tools added to getAgentTools()                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dev.ucp.shopping.checkout`       | `create_checkout`, `get_checkout`, `update_checkout`, `complete_checkout`, `cancel_checkout`                                                                 |
| `dev.ucp.shopping.fulfillment`    | + `set_fulfillment`, `select_destination`, `select_fulfillment_option`, `create_fulfillment_method`, `update_fulfillment_method`, `update_fulfillment_group` |
| `dev.ucp.shopping.discount`       | + `apply_discount_codes`                                                                                                                                     |
| `dev.ucp.shopping.order`          | + `get_order`, `update_order`, `update_order_line_item`                                                                                                      |
| `dev.ucp.shopping.catalog.search` | + `search_catalog`                                                                                                                                           |
| `dev.ucp.shopping.catalog.lookup` | + `get_product`                                                                                                                                              |
| `dev.ucp.shopping.cart`           | + `create_cart`, `get_cart`, `update_cart`, `cancel_cart`                                                                                                    |
| `dev.ucp.common.identity_linking` | + `get_authorization_url`, `exchange_auth_code`, `refresh_access_token`, `revoke_token`                                                                      |

`describeTools()` returns the same set (name + capability + description only, no parameters or execute).

### CheckoutCapability Extensions

When `dev.ucp.shopping.checkout` is declared, the checkout capability exposes boolean flags:

```typescript
client.checkout.extensions.fulfillment; // dev.ucp.shopping.fulfillment
client.checkout.extensions.discount; // dev.ucp.shopping.discount
client.checkout.extensions.buyerConsent; // dev.ucp.shopping.buyer_consent
client.checkout.extensions.ap2Mandate; // dev.ucp.shopping.ap2_mandate
```

### CatalogCapability Extensions

When either `dev.ucp.shopping.catalog.search` or `dev.ucp.shopping.catalog.lookup` is declared:

```typescript
client.catalog.extensions.search; // dev.ucp.shopping.catalog.search
client.catalog.extensions.lookup; // dev.ucp.shopping.catalog.lookup
```

A server may advertise search without lookup, or both. The capability is null only when neither is declared.

## Source Layout

```
src/
  types/
    config.ts           — UCPClientConfig, UCP_CAPABILITIES constants, DEFAULT_UCP_VERSION
    checkout.ts         — CheckoutSession, CheckoutExtensions, Create/Update/CompleteCheckoutPayload,
                          FulfillmentMethod*Payload, CheckoutSessionStatus
    order.ts            — UCPSpecOrder, OrderUpdate, WebhookEvent, LineItemUpdatePayload
    catalog.ts          — Product, Variant, DetailOptionValue, CatalogSearchResponse,
                          CatalogLookupResponse, SearchFilters, Pagination
    cart.ts             — Cart, CartCreatePayload, CartUpdatePayload
    payment.ts          — PaymentCredential, PaymentInstrument, PaymentHandlerInstance, PaymentHandlerMap
    identity-linking.ts — OAuthServerMetadata, TokenResponse, AuthorizationParams,
                          TokenExchangeParams, TokenRefreshParams, TokenRevokeParams
    common.ts           — PostalAddress, BuyerConsent, LocalizationContext, JWK
                          (all derived from @omnixhq/ucp-js-sdk schemas via z.output<>)
    index.ts            — re-exports all types
  capabilities/
    checkout.ts         — CheckoutCapability (create, get, update, complete, cancel,
                          setFulfillment, selectDestination, selectFulfillmentOption,
                          createFulfillmentMethod, updateFulfillmentMethod, updateFulfillmentGroup,
                          applyDiscountCodes)
    order.ts            — OrderCapability (get, update, updateLineItem)
    catalog.ts          — CatalogCapability (search, getProduct), CatalogExtensions
    cart.ts             — CartCapability (create, get, update, cancel)
    identity-linking.ts — IdentityLinkingCapability (getAuthorizationUrl, exchangeCode,
                          refreshToken, revokeToken)
  adapters/
    catch-errors.ts     — AdapterOptions, ToolErrorResult, safeExecute, formatToolError
    openai.ts           — toOpenAITools(), executeOpenAIToolCall()
    anthropic.ts        — toAnthropicTools(), executeAnthropicToolCall()
    vercel-ai.ts        — toVercelAITools()
    langchain.ts        — toLangChainTools()
    mcp.ts              — toMCPTools(), executeMCPToolCall()
  agent-tools.ts        — AgentTool interface, getAgentTools(), JsonSchema
  UCPClient.ts          — connect(), ConnectedClient, UCPProfile, ToolDescriptor
  http.ts               — HttpClient (headers, idempotency, error parsing, auth)
  errors.ts             — UCPError, UCPEscalationError, UCPIdempotencyConflictError, UCPOAuthError
  schemas.ts            — Zod schema aliases + direct re-exports from @omnixhq/ucp-js-sdk;
                          WebhookEventSchema (local — SDK doesn't own webhook envelope).
                          Pass-through schemas use `export { ... } from` (no import needed).
                          index.ts uses `export * from './schemas.js'` to avoid duplication.
  verify-signature.ts   — verifyRequestSignature(), createWebhookVerifier(), WebhookVerifier
  parse-webhook-event.ts — parseWebhookEvent()
  index.ts              — Public API surface

scripts/
  mock-ucp-server.ts         — Spec-compliant local UCP server (port 3001) for integration tests
  agent-demo.ts              — End-to-end Claude agent demo (Anthropic SDK, costs API credits)
  test-gateway-connection.ts — Live gateway smoke test
  agents/
    openai-agent.ts          — OpenAI adapter example (run in CI)
    anthropic-agent.ts       — Anthropic adapter example (run in CI)
    mcp-agent.ts             — MCP adapter example (run in CI)
    vercel-ai-agent.ts       — Vercel AI adapter example (run in CI)
    langchain-agent.ts       — LangChain adapter example (run in CI)
```

## Schema Strategy

All public types are derived from `@omnixhq/ucp-js-sdk` schemas via `z.output<typeof XSchema>`. No manual interfaces that duplicate SDK-owned shapes.

Four custom (non-SDK) schemas are justified and remain:

| Schema                      | Location       | Why custom                                                                   |
| --------------------------- | -------------- | ---------------------------------------------------------------------------- |
| `WebhookEventSchema`        | `schemas.ts`   | Webhook envelope (`event_id`, `created_time`) — not owned by UCP spec        |
| `CartResponseSchema`        | `schemas.ts`   | Alias for `CartSchema` — mirrors `CheckoutSessionSchema` pattern             |
| `PaymentHandlerMapSchema`   | `UCPClient.ts` | Map-level wrapper composing `PaymentHandlerBaseSchema` — SDK has no map type |
| `OAuthServerMetadataSchema` | `UCPClient.ts` | RFC 8414 (OAuth 2.0 metadata) — not UCP spec; has `.passthrough()` correctly |

## Public Exports

### Main (`@omnixhq/ucp-client`)

- `UCPClient`, `connect` — connect to a UCP server
- `UCPError`, `UCPEscalationError`, `UCPIdempotencyConflictError`, `UCPOAuthError`
- `CheckoutCapability`, `OrderCapability`, `CatalogCapability`, `CatalogExtensions`, `CartCapability`, `IdentityLinkingCapability`
- `getAgentTools()`, `AgentTool`, `JsonSchema`
- `verifyRequestSignature()`, `createWebhookVerifier()`, `WebhookVerifier`
- `parseWebhookEvent()`
- `AdapterOptions`, `ToolErrorResult`
- All `@omnixhq/ucp-js-sdk` schemas re-exported (150+ schemas)
- All types from `src/types/`

### Subpath exports (framework adapters)

| Subpath                         | Exports                                        |
| ------------------------------- | ---------------------------------------------- |
| `@omnixhq/ucp-client/openai`    | `toOpenAITools`, `executeOpenAIToolCall`       |
| `@omnixhq/ucp-client/anthropic` | `toAnthropicTools`, `executeAnthropicToolCall` |
| `@omnixhq/ucp-client/vercel-ai` | `toVercelAITools`                              |
| `@omnixhq/ucp-client/langchain` | `toLangChainTools`                             |
| `@omnixhq/ucp-client/mcp`       | `toMCPTools`, `executeMCPToolCall`             |

All adapters accept optional `AdapterOptions` (`catchErrors?: boolean`). When `catchErrors: true`, errors are returned as `ToolErrorResult` instead of throwing.

## Error Handling

| Error class                   | When thrown                                           |
| ----------------------------- | ----------------------------------------------------- |
| `UCPError`                    | Gateway returns error response with `messages[]`      |
| `UCPEscalationError`          | Checkout response has `status: 'requires_escalation'` |
| `UCPIdempotencyConflictError` | HTTP 409 (idempotency key reused with different body) |
| `UCPOAuthError`               | OAuth token exchange / refresh / revocation failure   |

`UCPError` carries: `code`, `type`, `statusCode`, `path`, `contentType`, `messages[]`.

`MessageSeverity` values: `'recoverable'`, `'requires_buyer_input'`, `'requires_buyer_review'`, `'unrecoverable'`.

## HTTP Client Behaviour

- All requests carry: `UCP-Agent` (profile URL + version), `request-id` (UUID), `Content-Type: application/json`
- Mutating requests (POST, PUT) carry `idempotency-key` (UUID, regenerated per call)
- Optional `requestSignature` config field adds `request-signature` header to every request
- Bearer token auth via `accessToken` on `HttpClient` (used by `IdentityLinkingCapability`)
- 409 responses → `UCPIdempotencyConflictError`; gateway `messages[]` preserved when present
- `validate()` falls back to raw data with a warning when schema validation fails (backwards-compat guarantee)

## Webhook Flow

```
1. Receive POST with Request-Signature header
2. verifier.verify(rawBody, signature)  — fetches keys from /.well-known/ucp, caches by kid
3. parseWebhookEvent(rawBody)           — validates and returns typed WebhookEvent
4. event.order.id, event.event_id, ...
```

`createWebhookVerifier` refetches keys on `kid` cache miss (zero-downtime key rotation support).

## Build & Release

- **Build tool**: tsdown → dual ESM + CJS output in `dist/`
- **Type declarations**: `.d.ts` (ESM) + `.d.cts` (CJS) per entry point
- **API baseline**: `docs/ucp-client.api.md` — regenerate with `npx api-extractor run --local` after any public API change
- **Validation**: attw (exports map), publint
- **Release**: release-please reads conventional commits, opens Release PR, publishes to npm on merge to `main`
- **Secrets required**: `NPM_TOKEN`, `RELEASE_PLEASE_TOKEN` (GitHub Actions)

## Testing

- **Framework**: Vitest
- **Coverage threshold**: 80% (functions, lines, branches)
- **Unit tests**: mock `fetch` via `vi.fn()`; 382 unit tests
- **Integration tests**: skipped unless `INTEGRATION=true`; run against `scripts/mock-ucp-server.ts` (port 3001)
- **Type tests**: `src/__tests__/types/*.test-d.ts` via `vitest run --typecheck.only` (`npm run test:types`)
- **CI jobs**: Build + Lint + Test, Integration (mock server), per-adapter agent examples (5 jobs)
