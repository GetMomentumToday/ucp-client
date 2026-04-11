import type { z } from 'zod';
import type {
  ProductSchema,
  VariantSchema,
  SearchFiltersSchema,
  CatalogSearchSchema,
  CatalogLookupSchema,
  PaginationSchema,
  DetailOptionValueSchema,
} from '../schemas.js';

export type Product = z.output<typeof ProductSchema>;

export type Variant = z.output<typeof VariantSchema>;

export type DetailOptionValue = z.output<typeof DetailOptionValueSchema>;

export type CatalogSearchResponse = z.output<typeof CatalogSearchSchema>;

export type CatalogLookupResponse = z.output<typeof CatalogLookupSchema>;

export type SearchFilters = z.output<typeof SearchFiltersSchema>;

export type Pagination = z.output<typeof PaginationSchema>;
