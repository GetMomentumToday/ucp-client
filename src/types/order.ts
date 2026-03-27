import type { Order } from '@ucp-js/sdk';

export type UCPSpecOrder = Order;

export interface UCPOrder {
  readonly id: string;
  readonly status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'canceled';
  readonly total_cents: number;
  readonly currency: string;
  readonly created_at_iso: string;
}

export interface WebhookEvent {
  readonly event_id: string;
  readonly created_time: string;
  readonly [key: string]: unknown;
}
