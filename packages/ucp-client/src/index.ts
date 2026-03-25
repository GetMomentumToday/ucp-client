export { UCPClient } from './UCPClient.js';
export { UCPError, UCPEscalationError } from './errors.js';

export {
  // Response validation
  CheckoutSessionSchema,
  UCPProfileSchema,
  UCPProductSchema,
  UCPOrderSchema,

  // Request validation
  CreateCheckoutRequestSchema,
  UpdateCheckoutRequestSchema,
  CompleteCheckoutRequestSchema,

  // SDK sub-entity schemas (for AI Brain tool definitions)
  CheckoutResponseStatusSchema,
  BuyerSchema,
  TotalResponseSchema,
  LineItemResponseSchema,
  MessageSchema,
  MessageErrorSchema,
  PostalAddressSchema,
  PaymentResponseSchema,
  PaymentHandlerResponseSchema,
  PaymentInstrumentSchema,
  FulfillmentResponseSchema,
  FulfillmentMethodResponseSchema,
  ItemResponseSchema,
  UCPSpecOrderSchema,
} from './schemas.js';

export type {
  UCPClientConfig,
  SearchFilters,
  CreateCheckoutPayload,
  UpdateCheckoutPayload,
  CompleteCheckoutPayload,
  CheckoutSession,
  CheckoutSessionStatus,
  PaymentInstrument,
  UCPProduct,
  UCPOrder,
  UCPProfile,
} from './types.js';
