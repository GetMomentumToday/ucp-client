export { UCPClient, connect } from './UCPClient.js';
export type { ConnectedClient, ToolDescriptor, UCPProfile } from './UCPClient.js';

export {
  UCPError,
  UCPEscalationError,
  UCPIdempotencyConflictError,
  UCPOAuthError,
} from './errors.js';
export type { UCPMessage, MessageType, MessageSeverity, ContentType } from './errors.js';

export { CheckoutCapability } from './capabilities/checkout.js';
export { OrderCapability } from './capabilities/order.js';
export { IdentityLinkingCapability } from './capabilities/identity-linking.js';
export { ProductsCapability } from './capabilities/products.js';

export {
  CheckoutSessionSchema,
  UCPProfileSchema,
  UCPProductSchema,
  UCPOrderSchema,
  CreateCheckoutRequestSchema,
  UpdateCheckoutRequestSchema,
  CompleteCheckoutRequestSchema,
  CheckoutResponseStatusSchema,
  BuyerSchema,
  TotalResponseSchema,
  LineItemResponseSchema,
  MessageSchema,
  MessageErrorSchema,
  PostalAddressSchema,
  PaymentResponseSchema,
  PaymentHandlerResponseSchema,
  PaymentInstrumentSchema,
  FulfillmentResponseSchema,
  FulfillmentMethodResponseSchema,
  ItemResponseSchema,
  UCPSpecOrderSchema,
} from './schemas.js';

export type {
  UCPClientConfig,
  SearchFilters,
  PostalAddress,
  BuyerConsent,
  LocalizationContext,
  CheckoutSession,
  CheckoutSessionStatus,
  CheckoutExtensions,
  CreateCheckoutPayload,
  UpdateCheckoutPayload,
  CompleteCheckoutPayload,
  TokenCredential,
  CardCredential,
  PaymentCredential,
  PaymentInstrument,
  PaymentHandlerInstance,
  PaymentHandlerMap,
  UCPSpecOrder,
  UCPOrder,
  WebhookEvent,
  OAuthServerMetadata,
  AuthorizationParams,
  TokenResponse,
  TokenExchangeParams,
  TokenRefreshParams,
  TokenRevokeParams,
  UCPProduct,
} from './types/index.js';

export { UCP_CAPABILITIES, DEFAULT_UCP_VERSION } from './types/config.js';
