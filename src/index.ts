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

export {
  // Gateway-specific schemas
  CheckoutSessionSchema,
  UCPProfileSchema,
  JWKSchema,
  WebhookEventSchema,
  CreateCheckoutRequestSchema,
  UpdateCheckoutRequestSchema,
  CompleteCheckoutRequestSchema,
  CartResponseSchema,

  // Enums / status
  CheckoutResponseStatusSchema,
  CheckoutStatusEnumSchema,

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

  // Checkout
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
  DiscountAppliedDiscountMethodEnumSchema,
  DiscountDiscountsObjectSchema,

  // Fulfillment (core)
  FulfillmentSchema,
  FulfillmentOptionSchema,
  FulfillmentGroupSchema,
  FulfillmentMethodSchema,
  FulfillmentAvailableMethodSchema,
  FulfillmentAvailableMethodTypeEnumSchema,
  FulfillmentDestinationSchema,
  FulfillmentEventSchema,
  FulfillmentMethodTypeEnumSchema,

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
  AmountSchema,
  PaymentSchema,
  PaymentCredentialSchema,
  PaymentIdentitySchema,
  PaymentInstrumentResponseSchema,
  AvailablePaymentInstrumentSchema,
  CardCredentialSchema,
  CardCredentialCardNumberTypeEnumSchema,
  CardPaymentInstrumentAvailableCardPaymentInstrumentSchema,
  TokenCredentialSchema,
  SignedAmountSchema,
  TotalsSchema,

  // Payment Handler (roles)
  PaymentHandlerBaseSchema,
  PaymentHandlerBusinessSchema,
  PaymentHandlerPlatformSchema,

  // Order (sub-entities)
  OrderConfirmationSchema,
  OrderLineItemSchema,
  OrderLineItemStatusEnumSchema,
  OrderUpdateSchema,

  // Item / LineItem
  ItemSchema,
  LineItemSchema,
  LineItemUpdateRequestSchema,

  // Message
  MessageInfoSchema,
  MessageInfoContentTypeEnumSchema,
  MessageWarningSchema,
  MessageWarningContentTypeEnumSchema,
  MessageErrorContentTypeEnumSchema,
  MessageErrorSeverityEnumSchema,

  // Error handling
  ErrorResponseSchema,
  ErrorCodeSchema,
  InputCorrelationSchema,
  UcpErrorSchema,
  UcpSuccessSchema,

  // Catalog
  CatalogSearchSchema,
  CatalogLookupSchema,
  ProductSchema,
  VariantSchema,
  CategorySchema,
  ProductOptionSchema,
  OptionValueSchema,
  DetailOptionValueSchema,
  SelectedOptionSchema,
  MediaSchema,
  DescriptionSchema,
  RatingSchema,
  PriceSchema,
  PriceRangeSchema,
  PriceFilterSchema,
  PaginationSchema,
  SearchFiltersSchema,
  SignalsSchema,

  // Cart
  CartSchema,
  CartCreateRequestSchema,
  CartUpdateRequestSchema,

  // UCP protocol
  UcpBaseSchema,
  UcpBaseStatusEnumSchema,
  UcpBusinessSchema,
  UcpPlatformSchema,
  UcpEntitySchema,
  UcpRequiresSchema,
  UcpResponseCartSchema,
  UcpResponseCatalogSchema,
  UcpResponseCheckoutSchema,
  UcpResponseOrderSchema,
  UcpVersionSchema,
  UcpVersionConstraintSchema,
  UcpSigningKeySchema,
  UcpDiscoveryBusinessProfileSchema,
  UcpDiscoveryPlatformProfileSchema,
  ReverseDomainNameSchema,

  // Capability / Service
  CapabilityBaseSchema,
  CapabilityBusinessSchema,
  CapabilityPlatformSchema,
  CapabilityResponseSchema,
  ServiceBaseSchema,
  ServiceBaseTransportEnumSchema,
  ServiceBusinessSchema,
  ServicePlatformSchema,
  ServiceResponseSchema,

  // Profile
  ProfileSchemaBaseSchema,
  ProfileSchemaBusinessProfileSchema,
  ProfileSchemaPlatformProfileSchema,
  ProfileSchemaSigningKeySchema,
  ProfileSchemaSigningKeyUseEnumSchema,

  // Misc
  AccountInfoSchema,
  AdjustmentSchema,
  AdjustmentStatusEnumSchema,
  BindingSchema,
  ContextSchema,
  EmbeddedConfigSchema,
  ExpectationSchema,
  ExpectationMethodTypeEnumSchema,
  LinkSchema,
  RetailLocationSchema,
  ShippingDestinationSchema,
  TotalSchema,
} from './schemas.js';

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
