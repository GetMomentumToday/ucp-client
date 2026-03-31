import type { HttpClient } from '../http.js';
import { CatalogSearchSchema, CatalogLookupSchema } from '../schemas.js';
import type {
  CatalogSearchResponse,
  CatalogLookupResponse,
  SearchFilters,
  Pagination,
} from '../types/catalog.js';

/** Catalog operations. Available when the server declares `dev.ucp.shopping.catalog`. */
export class CatalogCapability {
  constructor(private readonly http: HttpClient) {}

  async search(
    query: string,
    filters?: SearchFilters,
    pagination?: Pagination,
  ): Promise<CatalogSearchResponse> {
    const payload: Record<string, unknown> = { query };
    if (filters !== undefined) payload['filters'] = filters;
    if (pagination !== undefined) payload['pagination'] = pagination;
    const data = await this.http.request('POST', '/catalog/search', payload);
    return this.http.validate(data, CatalogSearchSchema);
  }

  async lookup(productId: string): Promise<CatalogLookupResponse> {
    const data = await this.http.request(
      'GET',
      `/catalog/products/${encodeURIComponent(productId)}`,
    );
    return this.http.validate(data, CatalogLookupSchema);
  }
}
