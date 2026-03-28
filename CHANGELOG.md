# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0](https://github.com/OmnixHQ/ucp-client/compare/v0.1.3...v0.2.0) (2026-03-28)


### Features

* add framework adapters for OpenAI, Anthropic, Vercel AI, LangChain, MCP ([a4bd8dd](https://github.com/OmnixHQ/ucp-client/commit/a4bd8dd35b9760b3ed8f0d3d89bca0903089e087))


### Bug Fixes

* format examples, adapter tests and README with prettier ([423b3c9](https://github.com/OmnixHQ/ucp-client/commit/423b3c9dc1072ba45220ee43faafde932b051408))


### Documentation

* add framework adapters section with table, examples, and code snippets ([66bae7b](https://github.com/OmnixHQ/ucp-client/commit/66bae7b1b2980e91a5aaa57d8ec594ab09a177a2))
* update CLAUDE.md and add project-context.md ([#12](https://github.com/OmnixHQ/ucp-client/issues/12)) ([856f5aa](https://github.com/OmnixHQ/ucp-client/commit/856f5aa3a331a31c2c7a8131ccef458dcfbd484e))


### Maintenance

* ignore no-resolution attw rule for node10 subpath exports ([b9c3b91](https://github.com/OmnixHQ/ucp-client/commit/b9c3b917d374062d26218d25fb639c6ffa100bcb))

## [0.1.3](https://github.com/OmnixHQ/ucp-client/compare/v0.1.2...v0.1.3) (2026-03-28)


### Maintenance

* add ucp-client keyword for npm search discoverability ([480c587](https://github.com/OmnixHQ/ucp-client/commit/480c5872c42154ed5235ebb09c827299b57a52bd))

## [0.1.2](https://github.com/OmnixHQ/ucp-client/compare/v0.1.1...v0.1.2) (2026-03-27)


### Bug Fixes

* rename npm scope from [@omnix](https://github.com/omnix) to [@omnixhq](https://github.com/omnixhq) ([9619854](https://github.com/OmnixHQ/ucp-client/commit/9619854adffc8e3d830a70dfa17a40c8f155641e))
* restore version 0.1.1 after rebase conflict ([e08f7dc](https://github.com/OmnixHQ/ucp-client/commit/e08f7dcb447e3d004dd1e79395206532909c8007))


### Maintenance

* add workflow_dispatch to publish without release-please ([8e8f37f](https://github.com/OmnixHQ/ucp-client/commit/8e8f37f84f4790b2cbf4b0dd0dd319d18c9ef18f))

## [0.1.1](https://github.com/OmnixHQ/ucp-client/compare/v0.1.0...v0.1.1) (2026-03-27)


### Maintenance

* fix release-please config for v4 API ([98fed58](https://github.com/OmnixHQ/ucp-client/commit/98fed58229a8c7c14ff1cbd35cdd078c2df5c482))
* ignore CHANGELOG.md and dist from prettier ([2890294](https://github.com/OmnixHQ/ucp-client/commit/28902949e86335564c57d59fe4c9e75a78b3ad8e))
* set include-component-in-tag false to match existing v0.1.0 tag ([2d71826](https://github.com/OmnixHQ/ucp-client/commit/2d71826bab1a67255c44eb2ebdc94e994ad1d265))
* use RELEASE_PLEASE_TOKEN PAT to allow PR creation ([e23632b](https://github.com/OmnixHQ/ucp-client/commit/e23632b4c3eb54c85addce3c3f70d5882fd72a12))

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
