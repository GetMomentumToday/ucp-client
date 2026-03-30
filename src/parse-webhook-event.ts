import { WebhookEventSchema } from './schemas.js';
import { UCPError } from './errors.js';
import type { WebhookEvent } from './types/order.js';

/**
 * Parses and validates a raw webhook request body as a UCP order event.
 *
 * Call this after verifying the `Request-Signature` header with
 * {@link createWebhookVerifier} or {@link verifyRequestSignature}.
 *
 * Throws {@link UCPError} with code `INVALID_WEBHOOK_PAYLOAD` if the body is
 * not valid JSON or does not conform to the UCP webhook event schema.
 *
 * @example
 * ```typescript
 * import { createWebhookVerifier, parseWebhookEvent } from '@omnixhq/ucp-client';
 *
 * const verifier = createWebhookVerifier('https://store.example.com');
 *
 * // In your webhook handler:
 * const valid = await verifier.verify(rawBody, req.headers['request-signature']);
 * if (!valid) return res.status(401).send('Invalid signature');
 *
 * const event = parseWebhookEvent(rawBody);
 * console.log(event.event_id, event.order.id);
 * ```
 */
export function parseWebhookEvent(body: string): WebhookEvent {
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    throw new UCPError('INVALID_WEBHOOK_PAYLOAD', 'Webhook body is not valid JSON');
  }

  const result = WebhookEventSchema.safeParse(raw);
  if (!result.success) {
    throw new UCPError(
      'INVALID_WEBHOOK_PAYLOAD',
      `Webhook payload validation failed: ${result.error.message}`,
    );
  }

  return result.data as WebhookEvent;
}
