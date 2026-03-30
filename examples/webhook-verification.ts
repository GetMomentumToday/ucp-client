/**
 * Webhook signature verification — verify incoming order event webhooks.
 *
 * UCP businesses sign webhook POST requests with a detached JWS in the
 * `Request-Signature` header (RFC 7797). `createWebhookVerifier` handles
 * fetching the business's signing keys from their discovery profile and
 * caching them, including automatic re-fetch for key rotation.
 *
 * Usage:
 *   npx tsx examples/webhook-verification.ts
 *
 * Requires a running UCP-compliant server at GATEWAY_URL.
 */

import { createServer } from 'node:http';
import { createWebhookVerifier, parseWebhookEvent } from '../src/index.js';

const GATEWAY_URL = process.env['GATEWAY_URL'] ?? 'http://localhost:3000';
const WEBHOOK_PORT = Number(process.env['WEBHOOK_PORT'] ?? '4000');

async function main() {
  // Verifier lazily fetches signing keys from <GATEWAY_URL>/.well-known/ucp
  // on first call and caches them by kid. Re-fetches on kid miss (key rotation).
  const verifier = createWebhookVerifier(GATEWAY_URL);

  const server = createServer((req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405).end();
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      const signatureHeader = req.headers['request-signature'];

      void (async () => {
        if (typeof signatureHeader !== 'string') {
          console.warn('Rejected: missing Request-Signature header');
          res.writeHead(401).end('Missing Request-Signature');
          return;
        }

        const valid = await verifier.verify(rawBody, signatureHeader);

        if (!valid) {
          console.warn('Rejected: invalid signature');
          res.writeHead(401).end('Invalid signature');
          return;
        }

        // Signature verified — parse and validate the event payload
        const event = parseWebhookEvent(rawBody);
        console.log(`Order event: ${event.event_id} — order ${event.order.id}`);

        // MUST respond quickly with 2xx — process asynchronously
        res.writeHead(200).end('OK');
      })();
    });
  });

  server.listen(WEBHOOK_PORT, () => {
    console.log(`Webhook receiver listening on http://localhost:${WEBHOOK_PORT}`);
    console.log(`Signing keys fetched from ${GATEWAY_URL}/.well-known/ucp on first request.\n`);
  });
}

main().catch(console.error);
