import { z } from 'zod';
import {
  ExtendedCheckoutResponseSchema,
  UcpDiscoveryProfileSchema,
} from '@ucp-js/sdk';

/**
 * SDK schemas — used for runtime validation of gateway responses.
 * `.passthrough()` allows extra fields the gateway may add beyond the spec.
 */
export const CheckoutSessionSchema = ExtendedCheckoutResponseSchema.passthrough();
export const UCPProfileSchema = UcpDiscoveryProfileSchema.passthrough();

/**
 * Gateway-specific schemas — these types extend beyond the SDK spec.
 */
export const UCPProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  price_cents: z.number(),
  currency: z.string(),
  in_stock: z.boolean(),
  stock_quantity: z.number(),
  images: z.array(z.string()),
  variants: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      price_cents: z.number(),
      in_stock: z.boolean(),
      attributes: z.record(z.string()),
    }),
  ),
});

export const UCPOrderSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'canceled']),
  total_cents: z.number(),
  currency: z.string(),
  created_at_iso: z.string(),
});
