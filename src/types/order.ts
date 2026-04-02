import type { z } from 'zod';
import type {
  UCPSpecOrderSchema,
  LineItemUpdateRequestSchema,
  OrderUpdateSchema,
} from '../schemas.js';

export type UCPSpecOrder = z.output<typeof UCPSpecOrderSchema>;

export type OrderUpdate = z.output<typeof OrderUpdateSchema>;

export type LineItemUpdatePayload = z.output<typeof LineItemUpdateRequestSchema>;

// The UCP spec does not define a request schema for order updates — the payload
// is server-defined (fulfillment events, adjustments, status changes, etc.).
// Named here so callers have a stable import and it's easy to tighten later.
export type OrderUpdatePayload = Record<string, unknown>;

export interface WebhookEvent {
  readonly event_id: string;
  readonly created_time: string;
  readonly order: UCPSpecOrder;
  readonly [key: string]: unknown;
}
