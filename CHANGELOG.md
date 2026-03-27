# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-27

### Added

- **`getAgentTools()`** — returns complete tool definitions with JSON Schema parameters and execute functions, ready for any AI agent framework (Claude API, OpenAI, Vercel AI SDK, LangChain, MCP)
- **Capability-aware `UCPClient.connect()`** — discovers server capabilities via `GET /.well-known/ucp` and only exposes supported features
- **Checkout capability** — `create`, `get`, `update`, `complete`, `cancel`
- **Fulfillment extension** — `setFulfillment`, `selectDestination`, `selectFulfillmentOption`
- **Discount extension** — `applyDiscountCodes`
- **Buyer consent extension** — consent fields in checkout payloads
- **AP2 mandate extension** — `ap2.checkout_mandate` in complete payload
- **Order capability** — `get` with spec-compliant Order schema
- **Identity linking capability** — OAuth 2.0 authorization code flow (`getAuthorizationUrl`, `exchangeCode`, `refreshToken`, `revokeToken`)
- **Payment handler types** — `PaymentHandlerMap`, `PaymentInstrument`, `TokenCredential`, `CardCredential`
- **Products capability** — `search`, `get` (gateway-specific)
- Auto-attached headers: `UCP-Agent`, `Request-Id`, `Idempotency-Key`, `Content-Type`, `Request-Signature`, `Authorization`
- Typed error hierarchy: `UCPError`, `UCPEscalationError`, `UCPIdempotencyConflictError`, `UCPOAuthError`
- Enriched `UCPError` with `type`, `path`, `contentType`, and full `messages[]` array
- `requires_escalation` detection on all checkout responses
- Zod validation at all external boundaries (responses, OAuth metadata, payment handlers)
- Generic `validate<T>()` — zero unsafe casts at call sites
- Dual ESM/CJS output via tsdown
- Export validation with `@arethetypeswrong/cli` and `publint`
- 116 unit tests, 15 integration tests
- Optional `onValidationWarning` callback for custom logging
- MIT license, published to public npm as `@omnix/ucp-client`

[0.1.0]: https://github.com/OmnixHQ/ucp-client/releases/tag/v0.1.0
