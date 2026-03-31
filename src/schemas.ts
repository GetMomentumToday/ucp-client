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
  RetailLocationSchema,
  ShippingDestinationSchema,
  TotalSchema,
} from '@omnixhq/ucp-js-sdk';

// ─── Response validation ────────────────────────────────────────────────────
// Used internally by UCPClient to validate gateway responses.
// `.passthrough()` allows extra fields the gateway may add beyond the spec.

export const CheckoutSessionSchema = CheckoutResponseSchema.passthrough();
export const UCPProfileSchema = UcpDiscoveryProfileSchema.passthrough();

// ─── Request validation ─────────────────────────────────────────────────────
// Used to validate outgoing payloads before sending to gateway.
// `.passthrough()` allows extra fields the caller may include.

export const CreateCheckoutRequestSchema = CheckoutCreateRequestSchema.passthrough();
export const UpdateCheckoutRequestSchema = CheckoutUpdateRequestSchema.passthrough();
export const CompleteCheckoutRequestSchema = CheckoutCompleteRequestSchema.passthrough();

// ─── Backward-compat schemas ────────────────────────────────────────────────
// Removed from ucp-js-sdk 1.0.2 — kept here so downstream consumers don't break.

/** @deprecated Removed from ucp-js-sdk 1.0.2. Use PaymentCredentialSchema instead. */
export const ExtendedPaymentCredentialSchema = z
  .object({
    type: z.string(),
    token: z.string().optional(),
  })
  .passthrough();

/** @deprecated Removed from ucp-js-sdk 1.0.2. Will be removed in a future major version. */
export const PlatformConfigSchema = z
  .object({
    webhook_url: z.string().optional(),
  })
  .passthrough();

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
  RetailLocationSchema,
  ShippingDestinationSchema,
  TotalSchema,
};

// ─── Webhook event schema ────────────────────────────────────────────────────
// Not in the SDK — wraps the Order entity with event metadata.

export const WebhookEventSchema = z
  .object({
    event_id: z.string(),
    created_time: z.string(),
    order: OrderSchema.passthrough(),
  })
  .passthrough();

// ─── JWK schema ─────────────────────────────────────────────────────────────
// Not yet in the SDK — defined here until the SDK adds signing_keys support.

export const JWKSchema = z
  .object({
    kty: z.string(),
    kid: z.string().optional(),
    use: z.string().optional(),
    alg: z.string().optional(),
    crv: z.string().optional(),
    x: z.string().optional(),
    y: z.string().optional(),
  })
  .passthrough();
