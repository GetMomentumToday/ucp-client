export { UCPClient, connect } from './UCPClient.js';
export type { ConnectedClient, ToolDescriptor, UCPProfile } from './UCPClient.js';

export { verifyRequestSignature, createWebhookVerifier } from './verify-signature.js';
export type { WebhookVerifier } from './verify-signature.js';

export { parseWebhookEvent } from './parse-webhook-event.js';

export { getAgentTools } from './agent-tools.js';
export type { AgentTool, JsonSchema } from './agent-tools.js';

export type { AdapterOptions, ToolErrorResult } from './adapters/catch-errors.js';

export {
  UCPError,
  UCPEscalationError,
  UCPIdempotencyConflictError,
  UCPOAuthError,
} from './errors.js';
export type { UCPMessage, MessageType, MessageSeverity, ContentType } from './errors.js';

export { CheckoutCapability } from './capabilities/checkout.js';
export { OrderCapability } from './capabilities/order.js';
export { CatalogCapability } from './capabilities/catalog.js';
export type { CatalogExtensions } from './capabilities/catalog.js';
export { CartCapability } from './capabilities/cart.js';
export { IdentityLinkingCapability } from './capabilities/identity-linking.js';

// All schemas from schemas.ts (SDK re-exports + internal aliases)
export * from './schemas.js';

export type {
  UCPClientConfig,
  PostalAddress,
  BuyerConsent,
  LocalizationContext,
  JWK,
  CheckoutSession,
  CheckoutSessionStatus,
  CheckoutExtensions,
  CreateCheckoutPayload,
  UpdateCheckoutPayload,
  CompleteCheckoutPayload,
  FulfillmentMethodCreatePayload,
  FulfillmentMethodUpdatePayload,
  FulfillmentGroupUpdatePayload,
  TokenCredential,
  CardCredential,
  PaymentCredential,
  PaymentInstrument,
  PaymentHandlerInstance,
  PaymentHandlerMap,
  UCPSpecOrder,
  OrderUpdate,
  OrderUpdatePayload,
  WebhookEvent,
  LineItemUpdatePayload,
  Product,
  Variant,
  DetailOptionValue,
  CatalogSearchResponse,
  CatalogLookupResponse,
  SearchFilters,
  Pagination,
  Cart,
  CartCreatePayload,
  CartUpdatePayload,
  OAuthServerMetadata,
  AuthorizationParams,
  TokenResponse,
  TokenExchangeParams,
  TokenRefreshParams,
  TokenRevokeParams,
} from './types/index.js';

export { UCP_CAPABILITIES, DEFAULT_UCP_VERSION } from './types/config.js';
