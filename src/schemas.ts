import { z } from 'zod';

// Only import schemas needed for aliases or the WebhookEventSchema definition.
// Everything else is re-exported directly via `export { ... } from` below.
import {
  UcpDiscoveryProfileSchema,
  CheckoutResponseSchema,
  CheckoutCreateRequestSchema,
  CheckoutUpdateRequestSchema,
  CheckoutCompleteRequestSchema,
  OrderSchema,
  CartSchema,
  UcpSigningKeySchema,
} from '@omnixhq/ucp-js-sdk';

// ─── Internal aliases ───────────────────────────────────────────────────────
// Used by UCPClient and capabilities for validation.

export const CheckoutSessionSchema = CheckoutResponseSchema;
export const UCPProfileSchema = UcpDiscoveryProfileSchema;
export const CartResponseSchema = CartSchema;

export const CreateCheckoutRequestSchema = CheckoutCreateRequestSchema;
export const UpdateCheckoutRequestSchema = CheckoutUpdateRequestSchema;
export const CompleteCheckoutRequestSchema = CheckoutCompleteRequestSchema;

// ─── Custom schemas ─────────────────────────────────────────────────────────
// Not in the SDK — defined here.

export const WebhookEventSchema = z.object({
  event_id: z.string(),
  created_time: z.string(),
  order: OrderSchema,
});

export { UcpSigningKeySchema as JWKSchema };

// ─── SDK re-exports ─────────────────────────────────────────────────────────
// Direct re-export from the SDK. Each schema appears only once.

export {
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

  // Order (UCP spec order — different from gateway's UCPOrderSchema)
  OrderSchema as UCPSpecOrderSchema,

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
} from '@omnixhq/ucp-js-sdk';
