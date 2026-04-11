import type { HttpClient } from '../http.js';
import { CatalogSearchSchema, CatalogLookupSchema } from '../schemas.js';
import type {
  CatalogSearchResponse,
  CatalogLookupResponse,
  SearchFilters,
  Pagination,
} from '../types/catalog.js';

export interface CatalogExtensions {
  readonly search: boolean;
  readonly lookup: boolean;
}

/**
 * Catalog operations. Available when the server declares
 * `dev.ucp.shopping.catalog.search` and/or `dev.ucp.shopping.catalog.lookup`.
 */
export class CatalogCapability {
  readonly extensions: CatalogExtensions;

  constructor(
    private readonly http: HttpClient,
    extensions: CatalogExtensions,
  ) {
    this.extensions = extensions;
  }

  async search(
    query: string,
    filters?: SearchFilters,
    pagination?: Pagination,
  ): Promise<CatalogSearchResponse> {
    const payload: Record<string, unknown> = {
      query,
      ...(filters !== undefined ? { filters } : {}),
      ...(pagination !== undefined ? { pagination } : {}),
    };
    const data = await this.http.request('POST', '/catalog/search', payload);
    return this.http.validate(data, CatalogSearchSchema);
  }

  async getProduct(productId: string): Promise<CatalogLookupResponse> {
    const data = await this.http.request('POST', '/catalog/product', {
      id: productId,
    });
    return this.http.validate(data, CatalogLookupSchema);
  }
}
