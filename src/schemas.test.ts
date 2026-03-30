import { describe, it, expect } from 'vitest';
import {
  // Response schemas
  CheckoutSessionSchema,
  UCPProfileSchema,

  // Request schemas
  CreateCheckoutRequestSchema,
  UpdateCheckoutRequestSchema,
  CompleteCheckoutRequestSchema,

  // SDK sub-entity schemas
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

describe('Response schemas', () => {
  describe('CheckoutResponseStatusSchema', () => {
    it('accepts all valid statuses', () => {
      const statuses = [
        'canceled',
        'complete_in_progress',
        'completed',
        'incomplete',
        'ready_for_complete',
        'requires_escalation',
      ];
      for (const status of statuses) {
        expect(CheckoutResponseStatusSchema.safeParse(status).success).toBe(true);
      }
    });

    it('rejects invalid status', () => {
      expect(CheckoutResponseStatusSchema.safeParse('expired').success).toBe(false);
    });
  });
});

describe('Request schemas', () => {
  describe('CompleteCheckoutRequestSchema', () => {
    it('validates a valid complete checkout payload', () => {
      const result = CompleteCheckoutRequestSchema.safeParse({
        payment: {
          instruments: [
            {
              id: 'instr_1',
              handler_id: 'mock_handler',
              type: 'offline',
              credential: { type: 'token', token: 'tok_success' },
            },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing payment', () => {
      const result = CompleteCheckoutRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects empty instruments array', () => {
      const result = CompleteCheckoutRequestSchema.safeParse({
        payment: { instruments: [] },
      });
      expect(result.success).toBe(true);
    });

    it('rejects instrument missing required fields', () => {
      const result = CompleteCheckoutRequestSchema.safeParse({
        payment: {
          instruments: [{ id: 'instr_1' }],
        },
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SDK sub-entity schemas are importable and functional', () => {
  it('BuyerSchema validates buyer', () => {
    const result = BuyerSchema.safeParse({
      first_name: 'Jan',
      last_name: 'Novak',
      email: 'jan@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('TotalResponseSchema validates totals', () => {
    const result = TotalResponseSchema.safeParse({
      type: 'total',
      amount: 9999,
    });
    expect(result.success).toBe(true);
  });

  it('MessageSchema validates messages', () => {
    const result = MessageSchema.safeParse({
      type: 'error',
      code: 'OUT_OF_STOCK',
      content: 'Product is out of stock',
      severity: 'recoverable',
    });
    expect(result.success).toBe(true);
  });

  it('MessageErrorSchema validates error messages', () => {
    const result = MessageErrorSchema.safeParse({
      type: 'error',
      code: 'INVALID_QUANTITY',
      content: 'Quantity must be positive',
      severity: 'recoverable',
    });
    expect(result.success).toBe(true);
  });

  it('PostalAddressSchema validates addresses', () => {
    const result = PostalAddressSchema.safeParse({
      street_address: '123 Main St',
      address_locality: 'Berlin',
      address_region: 'BE',
      postal_code: '10115',
      address_country: 'DE',
    });
    expect(result.success).toBe(true);
  });

  it('ItemResponseSchema validates items', () => {
    const result = ItemResponseSchema.safeParse({
      id: 'item-001',
      title: 'Shoes',
      price: 4999,
    });
    expect(result.success).toBe(true);
  });

  it('LineItemResponseSchema validates line items', () => {
    const result = LineItemResponseSchema.safeParse({
      id: 'li-001',
      item: { id: 'item-001', title: 'Shoes', price: 4999 },
      quantity: 2,
      totals: [],
    });
    expect(result.success).toBe(true);
  });

  it('PaymentHandlerResponseSchema validates handlers', () => {
    const result = PaymentHandlerResponseSchema.safeParse({
      id: 'handler_mock',
      name: 'Mock Payment',
      version: '2026-01-23',
      config: {},
      config_schema: '{}',
      instrument_schemas: [],
      spec: 'https://example.com/spec',
    });
    expect(result.success).toBe(true);
  });

  it('UCPSpecOrderSchema validates UCP spec orders', () => {
    const result = UCPSpecOrderSchema.safeParse({
      id: 'order-001',
      checkout_id: 'chk_1',
      line_items: [],
      totals: [],
      fulfillment: {},
      permalink_url: 'https://store.com/orders/001',
      ucp: { version: '2026-01-23', capabilities: {} },
    });
    expect(result.success).toBe(true);
  });

  it('all response schemas have safeParse method', () => {
    const schemas = [
      CheckoutSessionSchema,
      UCPProfileSchema,
      CreateCheckoutRequestSchema,
      UpdateCheckoutRequestSchema,
      CompleteCheckoutRequestSchema,
      PaymentResponseSchema,
      PaymentInstrumentSchema,
      FulfillmentResponseSchema,
      FulfillmentMethodResponseSchema,
    ];
    for (const schema of schemas) {
      expect(typeof schema.safeParse).toBe('function');
    }
  });
});
