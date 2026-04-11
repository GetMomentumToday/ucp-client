import type { HttpClient } from '../http.js';
import { CartResponseSchema } from '../schemas.js';
import type { Cart, CartCreatePayload, CartUpdatePayload } from '../types/cart.js';

/** Cart operations. Available when the server declares `dev.ucp.shopping.cart`. */
export class CartCapability {
  constructor(private readonly http: HttpClient) {}

  async create(payload: CartCreatePayload): Promise<Cart> {
    const data = await this.http.request('POST', '/carts', payload);
    return this.http.validate(data, CartResponseSchema);
  }

  async get(id: string): Promise<Cart> {
    const data = await this.http.request('GET', `/carts/${encodeURIComponent(id)}`);
    return this.http.validate(data, CartResponseSchema);
  }

  async update(id: string, payload: CartUpdatePayload): Promise<Cart> {
    const data = await this.http.request('PUT', `/carts/${encodeURIComponent(id)}`, payload);
    return this.http.validate(data, CartResponseSchema);
  }

  async cancel(id: string): Promise<Cart> {
    const data = await this.http.request('POST', `/carts/${encodeURIComponent(id)}/cancel`);
    return this.http.validate(data, CartResponseSchema);
  }
}
