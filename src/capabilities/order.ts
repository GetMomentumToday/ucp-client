import type { HttpClient } from '../http.js';
import { UCPSpecOrderSchema } from '../schemas.js';
import type { UCPSpecOrder } from '../types/order.js';

/** Order operations. Available when the server declares `dev.ucp.shopping.order`. */
export class OrderCapability {
  constructor(private readonly http: HttpClient) {}

  /** Retrieve an order by ID. Returns the UCP spec-compliant Order object. */
  async get(id: string): Promise<UCPSpecOrder> {
    const data = await this.http.request('GET', `/orders/${encodeURIComponent(id)}`);
    return this.http.validate(data, UCPSpecOrderSchema);
  }

  /** Update an order with fulfillment events, adjustments, or status changes. */
  async update(id: string, payload: Record<string, unknown>): Promise<UCPSpecOrder> {
    const data = await this.http.request('PUT', `/orders/${encodeURIComponent(id)}`, payload);
    return this.http.validate(data, UCPSpecOrderSchema);
  }
}
