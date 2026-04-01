import { describe, it, expect } from 'vitest';
import {
  // Checkout (base)
  CheckoutSchema,
  CheckoutResponseSchema,
  CheckoutCreateRequestSchema,
  CheckoutUpdateRequestSchema,
  CheckoutCompleteRequestSchema,

  // AP2 Mandate
  Ap2MandateAp2WithCheckoutMandateSchema,
  Ap2MandateAp2WithMerchantAuthorizationSchema,
  Ap2MandateCheckoutMandateSchema,
  Ap2MandateErrorCodeSchema,
  Ap2MandateMerchantAuthorizationSchema,

  // Buyer Consent
  BuyerConsentBuyerSchema,
  BuyerConsentConsentSchema,

  // Discount
  DiscountAllocationSchema,
  DiscountAppliedDiscountSchema,
  DiscountDiscountsObjectSchema,

  // Fulfillment (core)
  FulfillmentSchema,
  FulfillmentOptionSchema,
  FulfillmentGroupSchema,
  FulfillmentMethodSchema,
  FulfillmentAvailableMethodSchema,
  FulfillmentDestinationSchema,
  FulfillmentEventSchema,

  // Fulfillment (extension)
  FulfillmentExtensionFulfillmentSchema,
  FulfillmentExtensionFulfillmentOptionSchema,
  FulfillmentExtensionFulfillmentGroupSchema,
  FulfillmentExtensionFulfillmentMethodSchema,
  FulfillmentExtensionFulfillmentAvailableMethodSchema,

  // Fulfillment (config)
  BusinessFulfillmentConfigSchema,
  MerchantFulfillmentConfigSchema,
  PlatformFulfillmentConfigSchema,

  // Fulfillment (requests)
  FulfillmentMethodCreateRequestSchema,
  FulfillmentMethodUpdateRequestSchema,
  FulfillmentGroupUpdateRequestSchema,

  // Payment
  PaymentSchema,
  PaymentCredentialSchema,
  PaymentIdentitySchema,
  PaymentInstrumentResponseSchema,
  CardCredentialSchema,
  CardPaymentInstrumentSchema,
  TokenCredentialSchema,

  // Payment Handler (roles)
  PaymentHandlerBaseSchema,
  PaymentHandlerBusinessSchema,
  PaymentHandlerPlatformSchema,

  // Order (sub-entities)
  OrderConfirmationSchema,
  OrderLineItemSchema,
  OrderUpdateSchema,

  // Item / LineItem
  ItemSchema,
  LineItemSchema,
  LineItemUpdateRequestSchema,

  // Message
  MessageInfoSchema,
  MessageWarningSchema,

  // UCP protocol
  UcpBaseSchema,
  UcpBusinessSchema,
  UcpPlatformSchema,
  UcpEntitySchema,
  UcpResponseCheckoutSchema,
  UcpResponseOrderSchema,
  UcpVersionSchema,
  UcpReverseDomainNameSchema,

  // Capability / Service
  CapabilityBaseSchema,
  CapabilityBusinessSchema,
  CapabilityPlatformSchema,
  CapabilityResponseSchema,
  ServiceBaseSchema,
  ServiceBusinessSchema,
  ServicePlatformSchema,
  ServiceResponseSchema,

  // Misc
  AccountInfoSchema,
  AdjustmentSchema,
  BindingSchema,
  ContextSchema,
  EmbeddedConfigSchema,
  ExpectationSchema,
  LinkSchema,
  RetailLocationSchema,
  ShippingDestinationSchema,
  TotalSchema,
} from './schemas.js';

const UCP_VERSION = '2026-01-23';

const MINIMAL_UCP = { version: UCP_VERSION };

const MINIMAL_CHECKOUT = {
  ucp: { ...MINIMAL_UCP, capabilities: {}, payment_handlers: {} },
  id: 'chk_1',
  line_items: [],
  status: 'incomplete' as const,
  currency: 'USD',
  totals: [],
  links: [],
};

describe('Checkout (base) schemas', () => {
  it('CheckoutSchema', () => {
    expect(CheckoutSchema.safeParse(MINIMAL_CHECKOUT).success).toBe(true);
  });

  it('CheckoutResponseSchema', () => {
    expect(CheckoutResponseSchema.safeParse(MINIMAL_CHECKOUT).success).toBe(true);
  });

  it('CheckoutCreateRequestSchema', () => {
    expect(
      CheckoutCreateRequestSchema.safeParse({
        line_items: [
          { id: 'li-1', item: { id: 'i1', title: 'Shoes', price: 4999 }, quantity: 1, totals: [] },
        ],
      }).success,
    ).toBe(true);
  });

  it('CheckoutUpdateRequestSchema', () => {
    expect(CheckoutUpdateRequestSchema.safeParse({ id: 'chk_123', line_items: [] }).success).toBe(
      true,
    );
  });

  it('CheckoutCompleteRequestSchema', () => {
    expect(
      CheckoutCompleteRequestSchema.safeParse({
        payment: {
          instruments: [
            {
              id: 'i1',
              handler_id: 'h1',
              type: 'token',
              credential: { type: 'token', token: 'tok_1' },
            },
          ],
        },
      }).success,
    ).toBe(true);
  });
});

describe('AP2 Mandate schemas', () => {
  it('Ap2MandateAp2WithCheckoutMandateSchema', () => {
    expect(Ap2MandateAp2WithCheckoutMandateSchema.safeParse({}).success).toBe(true);
  });

  it('Ap2MandateAp2WithMerchantAuthorizationSchema', () => {
    expect(Ap2MandateAp2WithMerchantAuthorizationSchema.safeParse({}).success).toBe(true);
  });

  it('Ap2MandateCheckoutMandateSchema', () => {
    expect(
      Ap2MandateCheckoutMandateSchema.safeParse('eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJ0ZXN0In0.sig')
        .success,
    ).toBe(true);
  });

  it('Ap2MandateMerchantAuthorizationSchema', () => {
    expect(
      Ap2MandateMerchantAuthorizationSchema.safeParse('eyJhbGciOiJSUzI1NiJ9..dGVzdHNpZw').success,
    ).toBe(true);
  });

  it('Ap2MandateErrorCodeSchema accepts all values', () => {
    const codes = [
      'mandate_required',
      'agent_missing_key',
      'mandate_invalid_signature',
      'mandate_expired',
      'mandate_scope_mismatch',
      'merchant_authorization_invalid',
      'merchant_authorization_missing',
    ];
    for (const code of codes) {
      expect(Ap2MandateErrorCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it('Ap2MandateErrorCodeSchema rejects invalid value', () => {
    expect(Ap2MandateErrorCodeSchema.safeParse('invalid_code').success).toBe(false);
  });
});

describe('Buyer Consent schemas', () => {
  it('BuyerConsentBuyerSchema', () => {
    expect(BuyerConsentBuyerSchema.safeParse({}).success).toBe(true);
  });

  it('BuyerConsentConsentSchema', () => {
    expect(BuyerConsentConsentSchema.safeParse({}).success).toBe(true);
  });
});

describe('Discount schemas', () => {
  it('DiscountAllocationSchema', () => {
    expect(DiscountAllocationSchema.safeParse({ path: '/line_items/0', amount: 500 }).success).toBe(
      true,
    );
  });

  it('DiscountAppliedDiscountSchema', () => {
    expect(
      DiscountAppliedDiscountSchema.safeParse({ title: '10% OFF', amount: 1000 }).success,
    ).toBe(true);
  });

  it('DiscountDiscountsObjectSchema', () => {
    expect(DiscountDiscountsObjectSchema.safeParse({}).success).toBe(true);
  });
});

describe('Fulfillment (core) schemas', () => {
  it('FulfillmentSchema', () => {
    expect(FulfillmentSchema.safeParse({}).success).toBe(true);
  });

  it('FulfillmentOptionSchema', () => {
    expect(
      FulfillmentOptionSchema.safeParse({ id: 'opt-1', title: 'Standard', totals: [] }).success,
    ).toBe(true);
  });

  it('FulfillmentGroupSchema', () => {
    expect(FulfillmentGroupSchema.safeParse({ id: 'grp-1', line_item_ids: ['li-1'] }).success).toBe(
      true,
    );
  });

  it('FulfillmentMethodSchema', () => {
    expect(
      FulfillmentMethodSchema.safeParse({
        id: 'method-1',
        type: 'shipping',
        line_item_ids: ['li-1'],
      }).success,
    ).toBe(true);
  });

  it('FulfillmentAvailableMethodSchema', () => {
    expect(
      FulfillmentAvailableMethodSchema.safeParse({ type: 'pickup', line_item_ids: ['li-1'] })
        .success,
    ).toBe(true);
  });

  it('FulfillmentDestinationSchema', () => {
    expect(FulfillmentDestinationSchema.safeParse({ id: 'dest-1' }).success).toBe(true);
  });

  it('FulfillmentEventSchema', () => {
    expect(
      FulfillmentEventSchema.safeParse({
        id: 'ev-1',
        occurred_at: '2026-03-25T12:00:00Z',
        type: 'shipped',
        line_items: [{ id: 'li-1', quantity: 1 }],
      }).success,
    ).toBe(true);
  });
});

describe('Fulfillment (extension) schemas', () => {
  it('FulfillmentExtensionFulfillmentSchema', () => {
    expect(FulfillmentExtensionFulfillmentSchema.safeParse({}).success).toBe(true);
  });

  it('FulfillmentExtensionFulfillmentOptionSchema', () => {
    expect(
      FulfillmentExtensionFulfillmentOptionSchema.safeParse({
        id: 'opt-1',
        title: 'Express',
        totals: [],
      }).success,
    ).toBe(true);
  });

  it('FulfillmentExtensionFulfillmentGroupSchema', () => {
    expect(
      FulfillmentExtensionFulfillmentGroupSchema.safeParse({
        id: 'grp-1',
        line_item_ids: ['li-1'],
      }).success,
    ).toBe(true);
  });

  it('FulfillmentExtensionFulfillmentMethodSchema', () => {
    expect(
      FulfillmentExtensionFulfillmentMethodSchema.safeParse({
        id: 'method-1',
        type: 'shipping',
        line_item_ids: ['li-1'],
      }).success,
    ).toBe(true);
  });

  it('FulfillmentExtensionFulfillmentAvailableMethodSchema', () => {
    expect(
      FulfillmentExtensionFulfillmentAvailableMethodSchema.safeParse({
        type: 'pickup',
        line_item_ids: ['li-1'],
      }).success,
    ).toBe(true);
  });
});

describe('Fulfillment (config) schemas', () => {
  it('BusinessFulfillmentConfigSchema', () => {
    expect(BusinessFulfillmentConfigSchema.safeParse({}).success).toBe(true);
  });

  it('MerchantFulfillmentConfigSchema', () => {
    expect(MerchantFulfillmentConfigSchema.safeParse({}).success).toBe(true);
  });

  it('PlatformFulfillmentConfigSchema', () => {
    expect(PlatformFulfillmentConfigSchema.safeParse({}).success).toBe(true);
  });
});

describe('Fulfillment (request) schemas', () => {
  it('FulfillmentMethodCreateRequestSchema', () => {
    expect(FulfillmentMethodCreateRequestSchema.safeParse({ type: 'shipping' }).success).toBe(true);
  });

  it('FulfillmentMethodUpdateRequestSchema', () => {
    expect(
      FulfillmentMethodUpdateRequestSchema.safeParse({ id: 'm-1', line_item_ids: ['li-1'] })
        .success,
    ).toBe(true);
  });

  it('FulfillmentGroupUpdateRequestSchema', () => {
    expect(FulfillmentGroupUpdateRequestSchema.safeParse({ id: 'grp-1' }).success).toBe(true);
  });
});

describe('Payment schemas', () => {
  it('PaymentSchema', () => {
    expect(PaymentSchema.safeParse({}).success).toBe(true);
  });

  it('PaymentCredentialSchema', () => {
    expect(PaymentCredentialSchema.safeParse({ type: 'token' }).success).toBe(true);
  });

  it('PaymentIdentitySchema', () => {
    expect(PaymentIdentitySchema.safeParse({ access_token: 'at_abc' }).success).toBe(true);
  });

  it('PaymentInstrumentResponseSchema', () => {
    expect(
      PaymentInstrumentResponseSchema.safeParse({ id: 'instr-1', handler_id: 'h1', type: 'card' })
        .success,
    ).toBe(true);
  });

  it('CardCredentialSchema', () => {
    expect(
      CardCredentialSchema.safeParse({
        type: 'card',
        card_number_type: 'fpan',
        card_number: '4111111111111111',
        expiry_month: 12,
        expiry_year: 2028,
      }).success,
    ).toBe(true);
  });

  it('CardPaymentInstrumentSchema', () => {
    expect(
      CardPaymentInstrumentSchema.safeParse({
        id: 'instr-1',
        handler_id: 'h1',
        type: 'card',
        credential: {
          type: 'card',
          card_number_type: 'fpan',
          card_number: '4111111111111111',
          expiry_month: 12,
          expiry_year: 2028,
        },
      }).success,
    ).toBe(true);
  });

  it('TokenCredentialSchema', () => {
    expect(TokenCredentialSchema.safeParse({ type: 'token', token: 'tok_123' }).success).toBe(true);
  });
});

describe('Payment Handler (role) schemas', () => {
  it('PaymentHandlerBaseSchema', () => {
    expect(PaymentHandlerBaseSchema.safeParse({ version: UCP_VERSION }).success).toBe(true);
  });

  it('PaymentHandlerBusinessSchema', () => {
    expect(PaymentHandlerBusinessSchema.safeParse({ version: UCP_VERSION }).success).toBe(true);
  });

  it('PaymentHandlerPlatformSchema', () => {
    expect(PaymentHandlerPlatformSchema.safeParse({ version: UCP_VERSION }).success).toBe(true);
  });
});

describe('Order (sub-entity) schemas', () => {
  it('OrderConfirmationSchema', () => {
    expect(
      OrderConfirmationSchema.safeParse({
        id: 'order-1',
        permalink_url: 'https://store.example/orders/1',
      }).success,
    ).toBe(true);
  });

  it('OrderLineItemSchema', () => {
    expect(
      OrderLineItemSchema.safeParse({
        id: 'oli-1',
        item: { id: 'item-1', title: 'Shoes', price: 4999 },
        quantity: { total: 2, fulfilled: 0 },
        totals: [],
        status: 'processing',
      }).success,
    ).toBe(true);
  });

  it('OrderUpdateSchema', () => {
    expect(
      OrderUpdateSchema.safeParse({
        ucp: { version: UCP_VERSION, capabilities: {} },
        id: 'order-1',
        checkout_id: 'chk_1',
        permalink_url: 'https://store.example/orders/1',
        line_items: [],
        fulfillment: {},
        totals: [],
      }).success,
    ).toBe(true);
  });
});

describe('Item / LineItem schemas', () => {
  it('ItemSchema', () => {
    expect(ItemSchema.safeParse({ id: 'item-1', title: 'Shoes', price: 4999 }).success).toBe(true);
  });

  it('LineItemSchema', () => {
    expect(
      LineItemSchema.safeParse({
        id: 'li-1',
        item: { id: 'item-1', title: 'Shoes', price: 4999 },
        quantity: 1,
        totals: [],
      }).success,
    ).toBe(true);
  });

  it('LineItemUpdateRequestSchema', () => {
    expect(LineItemUpdateRequestSchema.safeParse({}).success).toBe(true);
  });
});

describe('Message schemas', () => {
  it('MessageInfoSchema', () => {
    expect(
      MessageInfoSchema.safeParse({ type: 'info', content: 'Free shipping available' }).success,
    ).toBe(true);
  });

  it('MessageWarningSchema', () => {
    expect(
      MessageWarningSchema.safeParse({
        type: 'warning',
        code: 'LOW_STOCK',
        content: 'Only 2 left in stock',
      }).success,
    ).toBe(true);
  });
});

describe('UCP protocol schemas', () => {
  it('UcpBaseSchema', () => {
    expect(UcpBaseSchema.safeParse(MINIMAL_UCP).success).toBe(true);
  });

  it('UcpBusinessSchema', () => {
    expect(
      UcpBusinessSchema.safeParse({
        version: UCP_VERSION,
        services: {},
        payment_handlers: {},
      }).success,
    ).toBe(true);
  });

  it('UcpPlatformSchema', () => {
    expect(
      UcpPlatformSchema.safeParse({
        version: UCP_VERSION,
        services: {},
        payment_handlers: {},
      }).success,
    ).toBe(true);
  });

  it('UcpEntitySchema', () => {
    expect(UcpEntitySchema.safeParse(MINIMAL_UCP).success).toBe(true);
  });

  it('UcpResponseCheckoutSchema', () => {
    expect(
      UcpResponseCheckoutSchema.safeParse({
        version: UCP_VERSION,
        payment_handlers: {},
      }).success,
    ).toBe(true);
  });

  it('UcpResponseOrderSchema', () => {
    expect(UcpResponseOrderSchema.safeParse(MINIMAL_UCP).success).toBe(true);
  });

  it('UcpVersionSchema', () => {
    expect(UcpVersionSchema.safeParse(UCP_VERSION).success).toBe(true);
  });

  it('UcpReverseDomainNameSchema', () => {
    expect(UcpReverseDomainNameSchema.safeParse('dev.ucp.shopping.checkout').success).toBe(true);
  });
});

describe('Capability / Service schemas', () => {
  it('CapabilityBaseSchema', () => {
    expect(CapabilityBaseSchema.safeParse({ version: UCP_VERSION }).success).toBe(true);
  });

  it('CapabilityBusinessSchema', () => {
    expect(CapabilityBusinessSchema.safeParse({ version: UCP_VERSION }).success).toBe(true);
  });

  it('CapabilityPlatformSchema', () => {
    expect(CapabilityPlatformSchema.safeParse({ version: UCP_VERSION }).success).toBe(true);
  });

  it('CapabilityResponseSchema', () => {
    expect(CapabilityResponseSchema.safeParse({ version: UCP_VERSION }).success).toBe(true);
  });

  it('ServiceBaseSchema', () => {
    expect(ServiceBaseSchema.safeParse({ version: UCP_VERSION, transport: 'rest' }).success).toBe(
      true,
    );
  });

  it('ServiceBusinessSchema', () => {
    expect(
      ServiceBusinessSchema.safeParse({ version: UCP_VERSION, transport: 'mcp' }).success,
    ).toBe(true);
  });

  it('ServicePlatformSchema', () => {
    expect(
      ServicePlatformSchema.safeParse({ version: UCP_VERSION, transport: 'a2a' }).success,
    ).toBe(true);
  });

  it('ServiceResponseSchema', () => {
    expect(
      ServiceResponseSchema.safeParse({ version: UCP_VERSION, transport: 'embedded' }).success,
    ).toBe(true);
  });
});

describe('Misc schemas', () => {
  it('AccountInfoSchema', () => {
    expect(AccountInfoSchema.safeParse({}).success).toBe(true);
  });

  it('AdjustmentSchema', () => {
    expect(
      AdjustmentSchema.safeParse({
        id: 'adj-1',
        type: 'refund',
        occurred_at: '2026-03-25T12:00:00Z',
        status: 'completed',
      }).success,
    ).toBe(true);
  });

  it('BindingSchema', () => {
    expect(BindingSchema.safeParse({ checkout_id: 'chk_1' }).success).toBe(true);
  });

  it('ContextSchema', () => {
    expect(ContextSchema.safeParse({}).success).toBe(true);
  });

  it('EmbeddedConfigSchema', () => {
    expect(EmbeddedConfigSchema.safeParse({}).success).toBe(true);
  });

  it('ExpectationSchema', () => {
    expect(
      ExpectationSchema.safeParse({
        id: 'exp-1',
        line_items: [{ id: 'li-1', quantity: 1 }],
        method_type: 'shipping',
        destination: { id: 'dest-1' },
      }).success,
    ).toBe(true);
  });

  it('LinkSchema', () => {
    expect(
      LinkSchema.safeParse({ type: 'continue', url: 'https://store.example/checkout' }).success,
    ).toBe(true);
  });

  it('RetailLocationSchema', () => {
    expect(RetailLocationSchema.safeParse({ id: 'loc-1', name: 'Main Store' }).success).toBe(true);
  });

  it('ShippingDestinationSchema', () => {
    expect(ShippingDestinationSchema.safeParse({ id: 'dest-1' }).success).toBe(true);
  });

  it('TotalSchema', () => {
    expect(TotalSchema.safeParse({ type: 'total', amount: 9999 }).success).toBe(true);
  });
});
