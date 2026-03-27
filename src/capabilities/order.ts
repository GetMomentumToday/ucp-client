import type { HttpClient } from '../http.js';
import { UCPSpecOrderSchema } from '../schemas.js';
import type { UCPSpecOrder } from '../types/order.js';

export class OrderCapability {
  constructor(private readonly http: HttpClient) {}

  async get(id: string): Promise<UCPSpecOrder> {
    const data = await this.http.request('GET', `/orders/${encodeURIComponent(id)}`);
    return this.http.validate(data, UCPSpecOrderSchema);
  }
}
