import {
  // ─── Response schemas ───────────────────────────────────────────────────────
  ExtendedCheckoutResponseSchema,
  UcpDiscoveryProfileSchema,
  CheckoutResponseStatusSchema,

  // ─── Sub-entity schemas (checkout internals) ────────────────────────────────
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

  // ─── Request schemas ────────────────────────────────────────────────────────
  ExtendedCheckoutCreateRequestSchema,
  ExtendedCheckoutUpdateRequestSchema,

  // ─── Order ──────────────────────────────────────────────────────────────────
  OrderSchema,

  // ─── Checkout (base) ────────────────────────────────────────────────────────
  CheckoutSchema,
  CheckoutResponseSchema,
  CheckoutCreateRequestSchema,
  CheckoutUpdateRequestSchema,
  CheckoutCompleteRequestSchema,

  // ─── AP2 Mandate ────────────────────────────────────────────────────────────
  Ap2MandateAp2WithCheckoutMandateSchema,
  Ap2MandateAp2WithMerchantAuthorizationSchema,
  Ap2MandateCheckoutMandateSchema,
  Ap2MandateErrorCodeSchema,
  Ap2MandateMerchantAuthorizationSchema,

  // ─── Buyer Consent ──────────────────────────────────────────────────────────
  BuyerConsentBuyerSchema,
  BuyerConsentConsentSchema,

  // ─── Discount ───────────────────────────────────────────────────────────────
  DiscountAllocationSchema,
  DiscountAppliedDiscountSchema,
  DiscountDiscountsObjectSchema,

  // ─── Fulfillment (core) ─────────────────────────────────────────────────────
  FulfillmentSchema,
  FulfillmentOptionSchema,
  FulfillmentGroupSchema,
  FulfillmentMethodSchema,
  FulfillmentAvailableMethodSchema,
  FulfillmentDestinationSchema,
  FulfillmentEventSchema,

  // ─── Fulfillment (extension) ────────────────────────────────────────────────
  FulfillmentExtensionFulfillmentSchema,
  FulfillmentExtensionFulfillmentOptionSchema,
  FulfillmentExtensionFulfillmentGroupSchema,
  FulfillmentExtensionFulfillmentMethodSchema,
  FulfillmentExtensionFulfillmentAvailableMethodSchema,

  // ─── Fulfillment (config) ───────────────────────────────────────────────────
  BusinessFulfillmentConfigSchema,
  MerchantFulfillmentConfigSchema,
  PlatformFulfillmentConfigSchema,

  // ─── Fulfillment (requests) ─────────────────────────────────────────────────
  FulfillmentMethodCreateRequestSchema,
  FulfillmentMethodUpdateRequestSchema,
  FulfillmentGroupUpdateRequestSchema,

  // ─── Payment ────────────────────────────────────────────────────────────────
  PaymentSchema,
  PaymentCredentialSchema,
  ExtendedPaymentCredentialSchema,
  PaymentIdentitySchema,
  PaymentInstrumentResponseSchema,
  CardCredentialSchema,
  CardPaymentInstrumentSchema,
  TokenCredentialSchema,

  // ─── Payment Handler (roles) ────────────────────────────────────────────────
  PaymentHandlerBaseSchema,
  PaymentHandlerBusinessSchema,
  PaymentHandlerPlatformSchema,

  // ─── Order (sub-entities) ───────────────────────────────────────────────────
  OrderConfirmationSchema,
  OrderLineItemSchema,
  OrderUpdateSchema,

  // ─── Item / LineItem ────────────────────────────────────────────────────────
  ItemSchema,
  LineItemSchema,
  LineItemUpdateRequestSchema,

  // ─── Message ────────────────────────────────────────────────────────────────
  MessageInfoSchema,
  MessageWarningSchema,

  // ─── UCP protocol ───────────────────────────────────────────────────────────
  UcpBaseSchema,
  UcpBusinessSchema,
  UcpPlatformSchema,
  UcpEntitySchema,
  UcpResponseCheckoutSchema,
  UcpResponseOrderSchema,
  UcpVersionSchema,
  UcpReverseDomainNameSchema,

  // ─── Capability / Service ───────────────────────────────────────────────────
  CapabilityBaseSchema,
  CapabilityBusinessSchema,
  CapabilityPlatformSchema,
  CapabilityResponseSchema,
  ServiceBaseSchema,
  ServiceBusinessSchema,
  ServicePlatformSchema,
  ServiceResponseSchema,

  // ─── Misc ───────────────────────────────────────────────────────────────────
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
} from '@omnixhq/ucp-js-sdk';

// ─── Response validation ────────────────────────────────────────────────────
// Used internally by UCPClient to validate gateway responses.
// `.passthrough()` allows extra fields the gateway may add beyond the spec.

export const CheckoutSessionSchema = ExtendedCheckoutResponseSchema.passthrough();
export const UCPProfileSchema = UcpDiscoveryProfileSchema.passthrough();

// ─── Request validation ─────────────────────────────────────────────────────
// Used to validate outgoing payloads before sending to gateway.
// `.passthrough()` allows extra fields the caller may include.

export const CreateCheckoutRequestSchema = ExtendedCheckoutCreateRequestSchema.passthrough();
export const UpdateCheckoutRequestSchema = ExtendedCheckoutUpdateRequestSchema.passthrough();
export const CompleteCheckoutRequestSchema = CheckoutCompleteRequestSchema.passthrough();

// ─── SDK re-exports ─────────────────────────────────────────────────────────
// Re-export all SDK schemas so consumers can use them for tool definitions,
// Zod-to-JSON-Schema conversion, validation, etc.

export {
  // Enums / status
  CheckoutResponseStatusSchema,

  // Sub-entity schemas (checkout internals)
  BuyerSchema,
  TotalResponseSchema,
  LineItemResponseSchema,
  MessageSchema,
  MessageErrorSchema,
  PostalAddressSchema,

  // Payment (response)
  PaymentResponseSchema,
  PaymentHandlerResponseSchema,
  PaymentInstrumentSchema,

  // Fulfillment (response)
  FulfillmentResponseSchema,
  FulfillmentMethodResponseSchema,

  // Items (response)
  ItemResponseSchema,

  // Order (UCP spec order — different from gateway's UCPOrderSchema)
  OrderSchema as UCPSpecOrderSchema,

  // ─── Checkout (base) ────────────────────────────────────────────────────────
  CheckoutSchema,
  CheckoutResponseSchema,
  CheckoutCreateRequestSchema,
  CheckoutUpdateRequestSchema,
  CheckoutCompleteRequestSchema,

  // ─── AP2 Mandate ────────────────────────────────────────────────────────────
  Ap2MandateAp2WithCheckoutMandateSchema,
  Ap2MandateAp2WithMerchantAuthorizationSchema,
  Ap2MandateCheckoutMandateSchema,
  Ap2MandateErrorCodeSchema,
  Ap2MandateMerchantAuthorizationSchema,

  // ─── Buyer Consent ──────────────────────────────────────────────────────────
  BuyerConsentBuyerSchema,
  BuyerConsentConsentSchema,

  // ─── Discount ───────────────────────────────────────────────────────────────
  DiscountAllocationSchema,
  DiscountAppliedDiscountSchema,
  DiscountDiscountsObjectSchema,

  // ─── Fulfillment (core) ─────────────────────────────────────────────────────
  FulfillmentSchema,
  FulfillmentOptionSchema,
  FulfillmentGroupSchema,
  FulfillmentMethodSchema,
  FulfillmentAvailableMethodSchema,
  FulfillmentDestinationSchema,
  FulfillmentEventSchema,

  // ─── Fulfillment (extension) ────────────────────────────────────────────────
  FulfillmentExtensionFulfillmentSchema,
  FulfillmentExtensionFulfillmentOptionSchema,
  FulfillmentExtensionFulfillmentGroupSchema,
  FulfillmentExtensionFulfillmentMethodSchema,
  FulfillmentExtensionFulfillmentAvailableMethodSchema,

  // ─── Fulfillment (config) ───────────────────────────────────────────────────
  BusinessFulfillmentConfigSchema,
  MerchantFulfillmentConfigSchema,
  PlatformFulfillmentConfigSchema,

  // ─── Fulfillment (requests) ─────────────────────────────────────────────────
  FulfillmentMethodCreateRequestSchema,
  FulfillmentMethodUpdateRequestSchema,
  FulfillmentGroupUpdateRequestSchema,

  // ─── Payment ────────────────────────────────────────────────────────────────
  PaymentSchema,
  PaymentCredentialSchema,
  ExtendedPaymentCredentialSchema,
  PaymentIdentitySchema,
  PaymentInstrumentResponseSchema,
  CardCredentialSchema,
  CardPaymentInstrumentSchema,
  TokenCredentialSchema,

  // ─── Payment Handler (roles) ────────────────────────────────────────────────
  PaymentHandlerBaseSchema,
  PaymentHandlerBusinessSchema,
  PaymentHandlerPlatformSchema,

  // ─── Order (sub-entities) ───────────────────────────────────────────────────
  OrderConfirmationSchema,
  OrderLineItemSchema,
  OrderUpdateSchema,

  // ─── Item / LineItem ────────────────────────────────────────────────────────
  ItemSchema,
  LineItemSchema,
  LineItemUpdateRequestSchema,

  // ─── Message ────────────────────────────────────────────────────────────────
  MessageInfoSchema,
  MessageWarningSchema,

  // ─── UCP protocol ───────────────────────────────────────────────────────────
  UcpBaseSchema,
  UcpBusinessSchema,
  UcpPlatformSchema,
  UcpEntitySchema,
  UcpResponseCheckoutSchema,
  UcpResponseOrderSchema,
  UcpVersionSchema,
  UcpReverseDomainNameSchema,

  // ─── Capability / Service ───────────────────────────────────────────────────
  CapabilityBaseSchema,
  CapabilityBusinessSchema,
  CapabilityPlatformSchema,
  CapabilityResponseSchema,
  ServiceBaseSchema,
  ServiceBusinessSchema,
  ServicePlatformSchema,
  ServiceResponseSchema,

  // ─── Misc ───────────────────────────────────────────────────────────────────
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
};
