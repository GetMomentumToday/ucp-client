import type { Order } from '@omnixhq/ucp-js-sdk';

export type UCPSpecOrder = Order;

export interface WebhookEvent {
  readonly event_id: string;
  readonly created_time: string;
  readonly [key: string]: unknown;
}
