import { z } from 'zod';
import {
  // ─── Response schemas ───────────────────────────────────────────────────────
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

  // ─── Order ──────────────────────────────────────────────────────────────────
  OrderSchema,

  // ─── Checkout ───────────────────────────────────────────────────────────────
  CheckoutSchema,
  CheckoutResponseSchema,
  CheckoutCreateRequestSchema,
  CheckoutUpdateRequestSchema,
  CheckoutCompleteRequestSchema,
  CheckoutStatusEnumSchema,

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
  DiscountAppliedDiscountMethodEnumSchema,
  DiscountDiscountsObjectSchema,

  // ─── Fulfillment (core) ─────────────────────────────────────────────────────
  FulfillmentSchema,
  FulfillmentOptionSchema,
  FulfillmentGroupSchema,
  FulfillmentMethodSchema,
  FulfillmentAvailableMethodSchema,
  FulfillmentAvailableMethodTypeEnumSchema,
  FulfillmentDestinationSchema,
  FulfillmentEventSchema,
  FulfillmentMethodTypeEnumSchema,

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
  PaymentIdentitySchema,
  PaymentInstrumentResponseSchema,
  CardCredentialSchema,
  CardCredentialCardNumberTypeEnumSchema,
  CardPaymentInstrumentSchema,
  TokenCredentialSchema,

  // ─── Payment Handler (roles) ────────────────────────────────────────────────
  PaymentHandlerBaseSchema,
  PaymentHandlerBusinessSchema,
  PaymentHandlerPlatformSchema,

  // ─── Order (sub-entities) ───────────────────────────────────────────────────
  OrderConfirmationSchema,
  OrderLineItemSchema,
  OrderLineItemStatusEnumSchema,
  OrderUpdateSchema,

  // ─── Item / LineItem ────────────────────────────────────────────────────────
  ItemSchema,
  LineItemSchema,
  LineItemUpdateRequestSchema,

  // ─── Message ────────────────────────────────────────────────────────────────
  MessageInfoSchema,
  MessageInfoContentTypeEnumSchema,
  MessageWarningSchema,
  MessageWarningContentTypeEnumSchema,
  MessageErrorContentTypeEnumSchema,
  MessageErrorSeverityEnumSchema,

  // ─── UCP protocol ───────────────────────────────────────────────────────────
  UcpBaseSchema,
  UcpBusinessSchema,
  UcpPlatformSchema,
  UcpEntitySchema,
  UcpResponseCheckoutSchema,
  UcpResponseOrderSchema,
  UcpVersionSchema,
  UcpSigningKeySchema,
  UcpDiscoveryBusinessProfileSchema,
  UcpDiscoveryPlatformProfileSchema,
  UcpReverseDomainNameSchema,

  // ─── Capability / Service ───────────────────────────────────────────────────
  CapabilityBaseSchema,
  CapabilityBusinessSchema,
  CapabilityPlatformSchema,
  CapabilityResponseSchema,
  ServiceBaseSchema,
  ServiceBaseTransportEnumSchema,
  ServiceBusinessSchema,
  ServicePlatformSchema,
  ServiceResponseSchema,

  // ─── Profile ────────────────────────────────────────────────────────────────
  ProfileSchemaBaseSchema,
  ProfileSchemaBusinessProfileSchema,
  ProfileSchemaPlatformProfileSchema,
  ProfileSchemaSigningKeySchema,
  ProfileSchemaSigningKeyUseEnumSchema,

  // ─── Misc ───────────────────────────────────────────────────────────────────
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
  TotalTypeEnumSchema,
} from '@omnixhq/ucp-js-sdk';

// ─── Response / request schema aliases ─────────────────────────────────────
// Aliases used internally by UCPClient for validation. No passthrough — strict
// spec compliance only.

export const CheckoutSessionSchema = CheckoutResponseSchema;
export const UCPProfileSchema = UcpDiscoveryProfileSchema;

export const CreateCheckoutRequestSchema = CheckoutCreateRequestSchema;
export const UpdateCheckoutRequestSchema = CheckoutUpdateRequestSchema;
export const CompleteCheckoutRequestSchema = CheckoutCompleteRequestSchema;

// ─── SDK re-exports ─────────────────────────────────────────────────────────
// Re-export all SDK schemas so consumers can use them for tool definitions,
// Zod-to-JSON-Schema conversion, validation, etc.

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

  // ─── Checkout ───────────────────────────────────────────────────────────────
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
  DiscountAppliedDiscountMethodEnumSchema,
  DiscountDiscountsObjectSchema,

  // ─── Fulfillment (core) ─────────────────────────────────────────────────────
  FulfillmentSchema,
  FulfillmentOptionSchema,
  FulfillmentGroupSchema,
  FulfillmentMethodSchema,
  FulfillmentAvailableMethodSchema,
  FulfillmentAvailableMethodTypeEnumSchema,
  FulfillmentDestinationSchema,
  FulfillmentEventSchema,
  FulfillmentMethodTypeEnumSchema,

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
  PaymentIdentitySchema,
  PaymentInstrumentResponseSchema,
  CardCredentialSchema,
  CardCredentialCardNumberTypeEnumSchema,
  CardPaymentInstrumentSchema,
  TokenCredentialSchema,

  // ─── Payment Handler (roles) ────────────────────────────────────────────────
  PaymentHandlerBaseSchema,
  PaymentHandlerBusinessSchema,
  PaymentHandlerPlatformSchema,

  // ─── Order (sub-entities) ───────────────────────────────────────────────────
  OrderConfirmationSchema,
  OrderLineItemSchema,
  OrderLineItemStatusEnumSchema,
  OrderUpdateSchema,

  // ─── Item / LineItem ────────────────────────────────────────────────────────
  ItemSchema,
  LineItemSchema,
  LineItemUpdateRequestSchema,

  // ─── Message ────────────────────────────────────────────────────────────────
  MessageInfoSchema,
  MessageInfoContentTypeEnumSchema,
  MessageWarningSchema,
  MessageWarningContentTypeEnumSchema,
  MessageErrorContentTypeEnumSchema,
  MessageErrorSeverityEnumSchema,

  // ─── UCP protocol ───────────────────────────────────────────────────────────
  UcpBaseSchema,
  UcpBusinessSchema,
  UcpPlatformSchema,
  UcpEntitySchema,
  UcpResponseCheckoutSchema,
  UcpResponseOrderSchema,
  UcpVersionSchema,
  UcpSigningKeySchema,
  UcpDiscoveryBusinessProfileSchema,
  UcpDiscoveryPlatformProfileSchema,
  UcpReverseDomainNameSchema,

  // ─── Capability / Service ───────────────────────────────────────────────────
  CapabilityBaseSchema,
  CapabilityBusinessSchema,
  CapabilityPlatformSchema,
  CapabilityResponseSchema,
  ServiceBaseSchema,
  ServiceBaseTransportEnumSchema,
  ServiceBusinessSchema,
  ServicePlatformSchema,
  ServiceResponseSchema,

  // ─── Profile ────────────────────────────────────────────────────────────────
  ProfileSchemaBaseSchema,
  ProfileSchemaBusinessProfileSchema,
  ProfileSchemaPlatformProfileSchema,
  ProfileSchemaSigningKeySchema,
  ProfileSchemaSigningKeyUseEnumSchema,

  // ─── Misc ───────────────────────────────────────────────────────────────────
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
  TotalTypeEnumSchema,
};

// ─── Webhook event schema ────────────────────────────────────────────────────
// Not in the SDK — wraps the Order entity with event metadata.

export const WebhookEventSchema = z.object({
  event_id: z.string(),
  created_time: z.string(),
  order: OrderSchema,
});

// ─── JWK schema ─────────────────────────────────────────────────────────────
// Use the SDK's UcpSigningKeySchema as the canonical signing key schema.
export { UcpSigningKeySchema as JWKSchema };
