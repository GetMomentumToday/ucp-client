import { describe, it, expect } from 'vitest';
import { parseWebhookEvent } from './parse-webhook-event.js';
import { UCPError } from './errors.js';

const MINIMAL_ORDER = {
  id: 'ord_123',
  checkout_id: 'chk_456',
  permalink_url: 'https://store.example.com/orders/ord_123',
  ucp: { version: '2024-01-01' },
  line_items: [],
  fulfillment: {},
  totals: [],
};

const VALID_EVENT = {
  event_id: 'evt_abc',
  created_time: '2026-03-30T12:00:00Z',
  order: MINIMAL_ORDER,
};

describe('parseWebhookEvent', () => {
  it('parses a valid webhook event body', () => {
    const event = parseWebhookEvent(JSON.stringify(VALID_EVENT));
    expect(event.event_id).toBe('evt_abc');
    expect(event.created_time).toBe('2026-03-30T12:00:00Z');
    expect(event.order.id).toBe('ord_123');
  });

  it('preserves extra fields on the event (passthrough)', () => {
    const body = JSON.stringify({ ...VALID_EVENT, custom_field: 'value' });
    const event = parseWebhookEvent(body);
    expect((event as Record<string, unknown>)['custom_field']).toBe('value');
  });

  it('preserves extra fields on the order (passthrough)', () => {
    const body = JSON.stringify({
      ...VALID_EVENT,
      order: { ...MINIMAL_ORDER, extra: 'data' },
    });
    const event = parseWebhookEvent(body);
    expect((event.order as Record<string, unknown>)['extra']).toBe('data');
  });

  it('throws UCPError with code INVALID_WEBHOOK_PAYLOAD for invalid JSON', () => {
    let err: unknown;
    try {
      parseWebhookEvent('not-json');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(UCPError);
    expect((err as UCPError).code).toBe('INVALID_WEBHOOK_PAYLOAD');
  });

  it('throws UCPError when event_id is missing', () => {
    const body = JSON.stringify({ created_time: '2026-03-30T12:00:00Z', order: MINIMAL_ORDER });
    let err: unknown;
    try {
      parseWebhookEvent(body);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(UCPError);
    expect((err as UCPError).code).toBe('INVALID_WEBHOOK_PAYLOAD');
  });

  it('throws UCPError when created_time is missing', () => {
    const body = JSON.stringify({ event_id: 'evt_abc', order: MINIMAL_ORDER });
    let err: unknown;
    try {
      parseWebhookEvent(body);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(UCPError);
    expect((err as UCPError).code).toBe('INVALID_WEBHOOK_PAYLOAD');
  });

  it('throws UCPError when order is missing', () => {
    const body = JSON.stringify({ event_id: 'evt_abc', created_time: '2026-03-30T12:00:00Z' });
    let err: unknown;
    try {
      parseWebhookEvent(body);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(UCPError);
    expect((err as UCPError).code).toBe('INVALID_WEBHOOK_PAYLOAD');
  });

  it('throws UCPError when order.id is missing', () => {
    const body = JSON.stringify({
      ...VALID_EVENT,
      order: { ...MINIMAL_ORDER, id: undefined },
    });
    let err: unknown;
    try {
      parseWebhookEvent(body);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(UCPError);
    expect((err as UCPError).code).toBe('INVALID_WEBHOOK_PAYLOAD');
  });
});
