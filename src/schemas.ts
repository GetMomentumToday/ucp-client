import { z } from 'zod';
import {
  // Response schemas
  ExtendedCheckoutResponseSchema,
  UcpDiscoveryProfileSchema,
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

  // Request schemas
  ExtendedCheckoutCreateRequestSchema,
  ExtendedCheckoutUpdateRequestSchema,

  // Order
  OrderSchema,
} from '@ucp-js/sdk';

// ─── Response validation ────────────────────────────────────────────────────
// Used internally by UCPClient to validate gateway responses.
// `.passthrough()` allows extra fields the gateway may add beyond the spec.

export const CheckoutSessionSchema = ExtendedCheckoutResponseSchema.passthrough();
export const UCPProfileSchema = UcpDiscoveryProfileSchema.passthrough();

// ─── Gateway-specific response schemas ──────────────────────────────────────
// These types extend beyond the SDK spec (gateway adds fields like price_cents,
// stock_quantity, variants for products; status, total_cents for orders).

export const UCPProductSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    price_cents: z.number().int(),
    currency: z.string().min(3).max(3),
    in_stock: z.boolean(),
    stock_quantity: z.number().int().min(0),
    images: z.array(z.string().url()),
    variants: z.array(
      z
        .object({
          id: z.string(),
          title: z.string(),
          price_cents: z.number().int(),
          in_stock: z.boolean(),
          attributes: z.record(z.string()),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export const UCPOrderSchema = z
  .object({
    id: z.string(),
    status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'canceled']),
    total_cents: z.number().int(),
    currency: z.string().min(3).max(3),
    created_at_iso: z.string().datetime({ offset: true }),
  })
  .passthrough();

// ─── Request validation ─────────────────────────────────────────────────────
// Used to validate outgoing payloads before sending to gateway.
// `.passthrough()` allows extra fields the caller may include.

export const CreateCheckoutRequestSchema = ExtendedCheckoutCreateRequestSchema.passthrough();
export const UpdateCheckoutRequestSchema = ExtendedCheckoutUpdateRequestSchema.passthrough();

export const CompleteCheckoutRequestSchema = z.object({
  payment: z.object({
    instruments: z.array(
      z
        .object({
          id: z.string(),
          handler_id: z.string(),
          type: z.string(),
          selected: z.boolean().optional(),
          credential: z
            .object({
              type: z.string(),
              token: z.string().optional(),
            })
            .optional(),
          billing_address: z.unknown().optional(),
        })
        .passthrough(),
    ),
  }),
});

// ─── SDK re-exports ─────────────────────────────────────────────────────────
// Re-export SDK schemas so consumers (AI Brain) can use them for tool
// definitions, Zod-to-JSON-Schema conversion, etc.

export {
  // Enums
  CheckoutResponseStatusSchema,

  // Sub-entity schemas
  BuyerSchema,
  TotalResponseSchema,
  LineItemResponseSchema,
  MessageSchema,
  MessageErrorSchema,
  PostalAddressSchema,

  // Payment
  PaymentResponseSchema,
  PaymentHandlerResponseSchema,
  PaymentInstrumentSchema,

  // Fulfillment
  FulfillmentResponseSchema,
  FulfillmentMethodResponseSchema,

  // Items
  ItemResponseSchema,

  // Order (UCP spec order — different from gateway's UCPOrderSchema)
  OrderSchema as UCPSpecOrderSchema,
};
