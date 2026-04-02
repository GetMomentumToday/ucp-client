import type { HttpClient } from '../http.js';
import { UCPSpecOrderSchema, OrderUpdateSchema } from '../schemas.js';
import type {
  UCPSpecOrder,
  OrderUpdate,
  OrderUpdatePayload,
  LineItemUpdatePayload,
} from '../types/order.js';

/** Order operations. Available when the server declares `dev.ucp.shopping.order`. */
export class OrderCapability {
  constructor(private readonly http: HttpClient) {}

  /** Retrieve an order by ID. Returns the UCP spec-compliant Order object. */
  async get(id: string): Promise<UCPSpecOrder> {
    const data = await this.http.request('GET', `/orders/${encodeURIComponent(id)}`);
    return this.http.validate(data, UCPSpecOrderSchema);
  }

  /** Update an order with fulfillment events, adjustments, or status changes. */
  async update(id: string, payload: OrderUpdatePayload): Promise<OrderUpdate> {
    const data = await this.http.request('PUT', `/orders/${encodeURIComponent(id)}`, payload);
    return this.http.validate(data, OrderUpdateSchema);
  }

  /** Update a single line item within an order (e.g. set parent for grouping). */
  async updateLineItem(
    id: string,
    lineItemId: string,
    payload: LineItemUpdatePayload,
  ): Promise<OrderUpdate> {
    const data = await this.http.request(
      'PUT',
      `/orders/${encodeURIComponent(id)}/line-items/${encodeURIComponent(lineItemId)}`,
      payload,
    );
    return this.http.validate(data, OrderUpdateSchema);
  }
}
