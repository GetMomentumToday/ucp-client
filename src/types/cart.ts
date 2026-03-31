import type { z } from 'zod';
import type { CartCreateRequestSchema } from '../schemas.js';
import type { CartResponseSchema } from '../schemas.js';

export type Cart = z.output<typeof CartResponseSchema>;

export type CartCreatePayload = z.output<typeof CartCreateRequestSchema>;

export interface CartUpdatePayload {
  readonly line_items?: ReadonlyArray<{
    readonly item: { readonly id: string };
    readonly quantity: number;
  }>;
  readonly context?: Record<string, unknown>;
  readonly signals?: Record<string, unknown>;
  readonly buyer?: {
    readonly first_name?: string;
    readonly last_name?: string;
    readonly email?: string;
    readonly phone_number?: string;
  };
}
