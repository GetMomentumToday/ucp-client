export { UCPClient, connect } from './UCPClient.js';
export type { ConnectedClient, ToolDescriptor, UCPProfile } from './UCPClient.js';

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
export { IdentityLinkingCapability } from './capabilities/identity-linking.js';

export {
  // Gateway-specific schemas
  CheckoutSessionSchema,
  UCPProfileSchema,
  CreateCheckoutRequestSchema,
  UpdateCheckoutRequestSchema,
  CompleteCheckoutRequestSchema,

  // Enums / status
  CheckoutResponseStatusSchema,

  // Sub-entity schemas (checkout internals)
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

  // Checkout (base)
  CheckoutSchema,
  CheckoutResponseSchema,
  CheckoutCreateRequestSchema,
  CheckoutUpdateRequestSchema,
  CheckoutCompleteRequestSchema,

  // AP2 Mandate
  Ap2MandateAp2WithCheckoutMandateSchema,
  Ap2MandateAp2WithMerchantAuthorizationSchema,
  Ap2MandateCheckoutMandateSchema,
  Ap2MandateErrorCodeSchema,
  Ap2MandateMerchantAuthorizationSchema,

  // Buyer Consent
  BuyerConsentBuyerSchema,
  BuyerConsentConsentSchema,

  // Discount
  DiscountAllocationSchema,
  DiscountAppliedDiscountSchema,
  DiscountDiscountsObjectSchema,

  // Fulfillment (core)
  FulfillmentSchema,
  FulfillmentOptionSchema,
  FulfillmentGroupSchema,
  FulfillmentMethodSchema,
  FulfillmentAvailableMethodSchema,
  FulfillmentDestinationSchema,
  FulfillmentEventSchema,

  // Fulfillment (extension)
  FulfillmentExtensionFulfillmentSchema,
  FulfillmentExtensionFulfillmentOptionSchema,
  FulfillmentExtensionFulfillmentGroupSchema,
  FulfillmentExtensionFulfillmentMethodSchema,
  FulfillmentExtensionFulfillmentAvailableMethodSchema,

  // Fulfillment (config)
  BusinessFulfillmentConfigSchema,
  MerchantFulfillmentConfigSchema,
  PlatformFulfillmentConfigSchema,

  // Fulfillment (requests)
  FulfillmentMethodCreateRequestSchema,
  FulfillmentMethodUpdateRequestSchema,
  FulfillmentGroupUpdateRequestSchema,

  // Payment
  PaymentSchema,
  PaymentCredentialSchema,
  ExtendedPaymentCredentialSchema,
  PaymentIdentitySchema,
  PaymentInstrumentResponseSchema,
  CardCredentialSchema,
  CardPaymentInstrumentSchema,
  TokenCredentialSchema,

  // Payment Handler (roles)
  PaymentHandlerBaseSchema,
  PaymentHandlerBusinessSchema,
  PaymentHandlerPlatformSchema,

  // Order (sub-entities)
  OrderConfirmationSchema,
  OrderLineItemSchema,
  OrderUpdateSchema,

  // Item / LineItem
  ItemSchema,
  LineItemSchema,
  LineItemUpdateRequestSchema,

  // Message
  MessageInfoSchema,
  MessageWarningSchema,

  // UCP protocol
  UcpBaseSchema,
  UcpBusinessSchema,
  UcpPlatformSchema,
  UcpEntitySchema,
  UcpResponseCheckoutSchema,
  UcpResponseOrderSchema,
  UcpVersionSchema,
  UcpReverseDomainNameSchema,

  // Capability / Service
  CapabilityBaseSchema,
  CapabilityBusinessSchema,
  CapabilityPlatformSchema,
  CapabilityResponseSchema,
  ServiceBaseSchema,
  ServiceBusinessSchema,
  ServicePlatformSchema,
  ServiceResponseSchema,

  // Misc
  AccountInfoSchema,
  AdjustmentSchema,
  BindingSchema,
  ContextSchema,
  EmbeddedConfigSchema,
  ExpectationSchema,
  LinkSchema,
  PlatformConfigSchema,
  RetailLocationSchema,
  ShippingDestinationSchema,
  TotalSchema,
} from './schemas.js';

export type {
  UCPClientConfig,
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
  WebhookEvent,
  OAuthServerMetadata,
  AuthorizationParams,
  TokenResponse,
  TokenExchangeParams,
  TokenRefreshParams,
  TokenRevokeParams,
} from './types/index.js';

export { UCP_CAPABILITIES, DEFAULT_UCP_VERSION } from './types/config.js';
