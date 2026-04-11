import type { z } from 'zod';
import type {
  CartCreateRequestSchema,
  CartUpdateRequestSchema,
  CartResponseSchema,
} from '../schemas.js';

export type Cart = z.output<typeof CartResponseSchema>;

export type CartCreatePayload = z.output<typeof CartCreateRequestSchema>;
export type CartUpdatePayload = z.output<typeof CartUpdateRequestSchema>;
