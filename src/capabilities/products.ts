import type { HttpClient } from '../http.js';
import { UCPProductSchema } from '../schemas.js';
import type { UCPProduct } from '../types/product.js';
import type { SearchFilters } from '../types/common.js';

export class ProductsCapability {
  constructor(private readonly http: HttpClient) {}

  async search(query: string, filters: SearchFilters = {}): Promise<readonly UCPProduct[]> {
    const params = new URLSearchParams({ q: query });

    const filterEntries: ReadonlyArray<[string, unknown]> = [
      ['max_price_cents', filters.max_price_cents],
      ['min_price_cents', filters.min_price_cents],
      ['in_stock', filters.in_stock],
      ['category', filters.category],
      ['limit', filters.limit],
      ['page', filters.page],
    ];

    for (const [key, value] of filterEntries) {
      if (value != null) {
        params.set(key, String(value));
      }
    }

    const res = await this.http.request('GET', `/ucp/products?${params.toString()}`);
    const data = res as { products?: UCPProduct[] } | UCPProduct[];
    const products = Array.isArray(data) ? data : (data.products ?? []);
    return products.map((p) => this.http.validate(p, UCPProductSchema));
  }

  async get(id: string): Promise<UCPProduct> {
    const data = await this.http.request('GET', `/ucp/products/${encodeURIComponent(id)}`);
    return this.http.validate(data, UCPProductSchema);
  }
}
