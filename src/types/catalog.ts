import type { z } from 'zod';
import type { ProductSchema, VariantSchema, SearchFiltersSchema } from '../schemas.js';

export type Product = z.output<typeof ProductSchema>;

export type Variant = z.output<typeof VariantSchema>;

export type CatalogSearchResponse = Record<string, unknown>;

export type CatalogLookupResponse = Record<string, unknown>;

export type SearchFilters = z.output<typeof SearchFiltersSchema>;

export type Pagination = Record<string, unknown>;
