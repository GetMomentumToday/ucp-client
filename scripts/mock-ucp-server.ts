/**
 * Minimal spec-compliant UCP mock server for local development and testing.
 *
 * Implements the full UCP REST binding:
 *   GET  /.well-known/ucp
 *   GET  /ucp/products
 *   GET  /ucp/products/:id
 *   POST /checkout-sessions
 *   GET  /checkout-sessions/:id
 *   PUT  /checkout-sessions/:id
 *   POST /checkout-sessions/:id/complete
 *   POST /checkout-sessions/:id/cancel
 *   GET  /orders/:id
 *
 * Usage:
 *   npx tsx scripts/mock-ucp-server.ts
 *   PORT=8080 npx tsx scripts/mock-ucp-server.ts
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env['PORT'] ?? 3001);
const UCP_VERSION = '2026-01-23';

// ─── In-memory store ─────────────────────────────────────────────────────────

interface Product {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  in_stock: boolean;
  stock_quantity: number;
  images: string[];
  variants: ProductVariant[];
}

interface ProductVariant {
  id: string;
  title: string;
  price_cents: number;
  in_stock: boolean;
  attributes: Record<string, string>;
}

interface Session {
  id: string;
  status: CheckoutStatus;
  currency: string;
  line_items: LineItem[];
  buyer?: Buyer;
  fulfillment_type?: string;
  order_id?: string;
}

interface LineItem {
  product_id: string;
  quantity: number;
}

interface Buyer {
  first_name?: string;
  last_name?: string;
  email?: string;
}

type CheckoutStatus =
  | 'incomplete'
  | 'ready_for_complete'
  | 'complete_in_progress'
  | 'completed'
  | 'canceled'
  | 'requires_escalation';

// ─── Seed data ───────────────────────────────────────────────────────────────

const PRODUCTS = new Map<string, Product>([
  [
    'prod_roses',
    {
      id: 'prod_roses',
      title: 'Red Roses Bouquet',
      description: 'A classic bouquet of 12 fresh red roses',
      price_cents: 2999,
      currency: 'USD',
      in_stock: true,
      stock_quantity: 50,
      images: [],
      variants: [
        {
          id: 'var_roses_12',
          title: '12 stems',
          price_cents: 2999,
          in_stock: true,
          attributes: { stems: '12' },
        },
        {
          id: 'var_roses_24',
          title: '24 stems',
          price_cents: 4999,
          in_stock: true,
          attributes: { stems: '24' },
        },
      ],
    },
  ],
  [
    'prod_lilies',
    {
      id: 'prod_lilies',
      title: 'White Lilies Arrangement',
      description: 'Elegant white lilies in a ceramic vase',
      price_cents: 3499,
      currency: 'USD',
      in_stock: true,
      stock_quantity: 30,
      images: [],
      variants: [],
    },
  ],
  [
    'prod_tulips',
    {
      id: 'prod_tulips',
      title: 'Spring Tulip Mix',
      description: 'Colorful mix of seasonal tulips',
      price_cents: 1999,
      currency: 'USD',
      in_stock: true,
      stock_quantity: 75,
      images: [],
      variants: [],
    },
  ],
  [
    'prod_sunflowers',
    {
      id: 'prod_sunflowers',
      title: 'Sunflower Bunch',
      description: 'Bright sunflowers to bring joy',
      price_cents: 2499,
      currency: 'USD',
      in_stock: false,
      stock_quantity: 0,
      images: [],
      variants: [],
    },
  ],
]);

const SESSIONS = new Map<string, Session>();
const ORDERS = new Map<string, object>();

// ─── UCP profile ─────────────────────────────────────────────────────────────

const PAYMENT_HANDLER = {
  id: 'mock-pay',
  name: 'dev.ucp.payment.mock',
  version: '1.0.0',
  spec: 'https://example.com/mock-pay',
  // `schema` is the field name expected by PaymentHandlerInstanceSchema
  schema: 'https://example.com/mock-pay/schema.json',
  config_schema: 'https://example.com/mock-pay/config-schema.json',
  instrument_schemas: ['https://example.com/mock-pay/instrument-schema.json'],
  config: {},
};

const UCP_PROFILE = {
  ucp: {
    version: UCP_VERSION,
    services: {
      'dev.ucp.shopping': {
        version: UCP_VERSION,
        spec: 'https://ucp.dev/specification/reference',
        rest: {
          schema: 'https://ucp.dev/services/shopping/rest.openapi.json',
          endpoint: `http://localhost:${PORT}`,
        },
      },
    },
    capabilities: [
      {
        name: 'dev.ucp.shopping.checkout',
        version: UCP_VERSION,
        spec: 'https://ucp.dev/specification/checkout',
        schema: 'https://ucp.dev/schemas/shopping/checkout.json',
      },
      {
        name: 'dev.ucp.shopping.fulfillment',
        version: UCP_VERSION,
        spec: 'https://ucp.dev/specification/fulfillment',
        schema: 'https://ucp.dev/schemas/shopping/fulfillment.json',
        extends: 'dev.ucp.shopping.checkout',
      },
      {
        name: 'dev.ucp.shopping.discount',
        version: UCP_VERSION,
        spec: 'https://ucp.dev/specification/discount',
        schema: 'https://ucp.dev/schemas/shopping/discount.json',
        extends: 'dev.ucp.shopping.checkout',
      },
      {
        name: 'dev.ucp.shopping.order',
        version: UCP_VERSION,
        spec: 'https://ucp.dev/specification/order',
        schema: 'https://ucp.dev/schemas/shopping/order.json',
      },
    ],
  },
  // Spec-compliant: namespace-keyed map at top level (not array under payment.handlers)
  payment_handlers: {
    'dev.ucp.payment.mock': [PAYMENT_HANDLER],
  },
};

// ─── Session → API response ──────────────────────────────────────────────────

function sessionToResponse(session: Session): object {
  const lineItemIds = session.line_items.map((li) => `li_${li.product_id}`);

  const lineItems = session.line_items.map((li) => {
    const product = PRODUCTS.get(li.product_id);
    const price = product?.price_cents ?? 0;
    const lineTotal = price * li.quantity;
    return {
      id: `li_${li.product_id}`,
      item: {
        id: li.product_id,
        title: product?.title ?? li.product_id,
        price: price,
      },
      quantity: li.quantity,
      totals: [{ type: 'subtotal', amount: lineTotal }],
    };
  });

  const subtotal = lineItems.reduce((sum, li) => sum + (li.totals[0]?.amount ?? 0), 0);

  const response: Record<string, unknown> = {
    id: session.id,
    status: session.status,
    currency: session.currency,
    line_items: lineItems,
    links: [],
    payment: { handlers: [PAYMENT_HANDLER] },
    totals: [
      { type: 'subtotal', amount: subtotal },
      { type: 'total', amount: subtotal },
    ],
    ucp: {
      version: UCP_VERSION,
      capabilities: [
        { name: 'dev.ucp.shopping.checkout', version: UCP_VERSION },
        { name: 'dev.ucp.shopping.fulfillment', version: UCP_VERSION },
        { name: 'dev.ucp.shopping.discount', version: UCP_VERSION },
      ],
    },
  };

  if (session.buyer !== undefined) {
    response['buyer'] = session.buyer;
  }
  if (session.fulfillment_type !== undefined) {
    response['fulfillment'] = {
      methods: [
        {
          id: 'method_default',
          type: session.fulfillment_type,
          line_item_ids: lineItemIds,
        },
      ],
    };
  }
  if (session.order_id !== undefined) {
    response['order_id'] = session.order_id;
  }

  return response;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function respond(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(json);
}

function respondError(res: ServerResponse, status: number, code: string, detail: string): void {
  respond(res, status, {
    code,
    messages: [{ type: 'error', text: detail, severity: 'recoverable' }],
  });
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// ─── Route handlers ───────────────────────────────────────────────────────────

function handleDiscovery(res: ServerResponse): void {
  respond(res, 200, UCP_PROFILE);
}

function handleSearchProducts(url: URL, res: ServerResponse): void {
  const q = (url.searchParams.get('q') ?? '').toLowerCase();
  const limit = Number(url.searchParams.get('limit') ?? '20');

  const results = [...PRODUCTS.values()]
    .filter(
      (p) => !q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    )
    .slice(0, limit);

  respond(res, 200, results);
}

function handleGetProduct(id: string, res: ServerResponse): void {
  const product = PRODUCTS.get(id);
  if (!product) {
    respondError(res, 404, 'PRODUCT_NOT_FOUND', `Product ${id} not found`);
    return;
  }
  respond(res, 200, product);
}

async function handleCreateCheckout(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = (await readBody(req)) as Record<string, unknown>;
  const lineItemsRaw = body['line_items'] as Array<Record<string, unknown>> | undefined;

  if (!Array.isArray(lineItemsRaw) || lineItemsRaw.length === 0) {
    respondError(res, 400, 'INVALID_REQUEST', 'line_items is required');
    return;
  }

  const lineItems: LineItem[] = lineItemsRaw.map((li) => {
    const item = li['item'] as Record<string, unknown>;
    return {
      product_id: String(item?.['id'] ?? ''),
      quantity: Number(li['quantity'] ?? 1),
    };
  });

  for (const li of lineItems) {
    if (!PRODUCTS.has(li.product_id)) {
      respondError(res, 400, 'PRODUCT_NOT_FOUND', `Product ${li.product_id} not found`);
      return;
    }
  }

  const session: Session = {
    id: `sess_${randomUUID()}`,
    status: 'incomplete',
    currency: String(body['currency'] ?? 'USD'),
    line_items: lineItems,
  };

  SESSIONS.set(session.id, session);
  respond(res, 201, sessionToResponse(session));
}

function handleGetCheckout(id: string, res: ServerResponse): void {
  const session = SESSIONS.get(id);
  if (!session) {
    respondError(res, 404, 'CHECKOUT_NOT_FOUND', `Session ${id} not found`);
    return;
  }
  respond(res, 200, sessionToResponse(session));
}

async function handleUpdateCheckout(
  id: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const session = SESSIONS.get(id);
  if (!session) {
    respondError(res, 404, 'CHECKOUT_NOT_FOUND', `Session ${id} not found`);
    return;
  }

  const body = (await readBody(req)) as Record<string, unknown>;

  const updatedSession: Session = { ...session };

  const buyer = body['buyer'] as Buyer | undefined;
  if (buyer !== undefined) {
    updatedSession.buyer = { ...session.buyer, ...buyer };
  }

  const fulfillment = body['fulfillment'] as Record<string, unknown> | undefined;
  if (fulfillment !== undefined) {
    const methods = fulfillment['methods'] as Array<Record<string, unknown>> | undefined;
    const firstMethod = methods?.[0];
    if (firstMethod?.['type'] !== undefined) {
      updatedSession.fulfillment_type = String(firstMethod['type']);
    }
  }

  // Advance to ready_for_complete once buyer info is present
  if (updatedSession.buyer?.email && updatedSession.status === 'incomplete') {
    updatedSession.status = 'ready_for_complete';
  }

  SESSIONS.set(id, updatedSession);
  respond(res, 200, sessionToResponse(updatedSession));
}

async function handleCompleteCheckout(
  id: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const session = SESSIONS.get(id);
  if (!session) {
    respondError(res, 404, 'CHECKOUT_NOT_FOUND', `Session ${id} not found`);
    return;
  }
  if (session.status === 'canceled' || session.status === 'completed') {
    respondError(res, 409, 'INVALID_STATE', `Session is already ${session.status}`);
    return;
  }

  await readBody(req); // consume body

  const orderId = `ord_${randomUUID()}`;
  const order = buildOrder(session, orderId);
  ORDERS.set(orderId, order);

  const completedSession: Session = { ...session, status: 'completed', order_id: orderId };
  SESSIONS.set(id, completedSession);
  respond(res, 200, sessionToResponse(completedSession));
}

async function handleCancelCheckout(
  id: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const session = SESSIONS.get(id);
  if (!session) {
    respondError(res, 404, 'CHECKOUT_NOT_FOUND', `Session ${id} not found`);
    return;
  }
  if (session.status === 'completed') {
    respondError(res, 409, 'INVALID_STATE', 'Cannot cancel a completed session');
    return;
  }

  await readBody(req); // consume body

  const canceledSession: Session = { ...session, status: 'canceled' };
  SESSIONS.set(id, canceledSession);
  respond(res, 200, sessionToResponse(canceledSession));
}

function handleGetOrder(id: string, res: ServerResponse): void {
  const order = ORDERS.get(id);
  if (!order) {
    respondError(res, 404, 'ORDER_NOT_FOUND', `Order ${id} not found`);
    return;
  }
  respond(res, 200, order);
}

function buildOrder(session: Session, orderId: string): object {
  const total = session.line_items.reduce((sum, li) => {
    const product = PRODUCTS.get(li.product_id);
    return sum + (product?.price_cents ?? 0) * li.quantity;
  }, 0);

  return {
    id: orderId,
    status: 'pending',
    total_cents: total,
    currency: session.currency,
    created_at_iso: new Date().toISOString(),
    line_items: session.line_items.map((li) => {
      const product = PRODUCTS.get(li.product_id);
      return {
        id: `oli_${li.product_id}`,
        product_id: li.product_id,
        title: product?.title ?? li.product_id,
        quantity: li.quantity,
        unit_price_cents: product?.price_cents ?? 0,
      };
    }),
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

async function router(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const baseUrl = `http://localhost:${PORT}`;
  const url = new URL(req.url ?? '/', baseUrl);
  const method = req.method ?? 'GET';
  const path = url.pathname;

  // GET /.well-known/ucp
  if (method === 'GET' && path === '/.well-known/ucp') {
    return handleDiscovery(res);
  }

  // GET /ucp/products
  if (method === 'GET' && path === '/ucp/products') {
    return handleSearchProducts(url, res);
  }

  // GET /ucp/products/:id
  const productMatch = /^\/ucp\/products\/([^/]+)$/.exec(path);
  if (method === 'GET' && productMatch) {
    return handleGetProduct(decodeURIComponent(productMatch[1]!), res);
  }

  // POST /checkout-sessions
  if (method === 'POST' && path === '/checkout-sessions') {
    return handleCreateCheckout(req, res);
  }

  // GET /checkout-sessions/:id
  const sessionMatch = /^\/checkout-sessions\/([^/]+)$/.exec(path);
  if (method === 'GET' && sessionMatch) {
    return handleGetCheckout(decodeURIComponent(sessionMatch[1]!), res);
  }

  // PUT /checkout-sessions/:id
  if (method === 'PUT' && sessionMatch) {
    return handleUpdateCheckout(decodeURIComponent(sessionMatch[1]!), req, res);
  }

  // POST /checkout-sessions/:id/complete
  const completeMatch = /^\/checkout-sessions\/([^/]+)\/complete$/.exec(path);
  if (method === 'POST' && completeMatch) {
    return handleCompleteCheckout(decodeURIComponent(completeMatch[1]!), req, res);
  }

  // POST /checkout-sessions/:id/cancel
  const cancelMatch = /^\/checkout-sessions\/([^/]+)\/cancel$/.exec(path);
  if (method === 'POST' && cancelMatch) {
    return handleCancelCheckout(decodeURIComponent(cancelMatch[1]!), req, res);
  }

  // GET /orders/:id
  const orderMatch = /^\/orders\/([^/]+)$/.exec(path);
  if (method === 'GET' && orderMatch) {
    return handleGetOrder(decodeURIComponent(orderMatch[1]!), res);
  }

  respond(res, 404, { code: 'NOT_FOUND', detail: `${method} ${path} not found` });
}

// ─── Server ───────────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  try {
    await router(req, res);
  } catch (err) {
    console.error('Request error:', err);
    respond(res, 500, { code: 'INTERNAL_ERROR', detail: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Mock UCP server running at http://localhost:${PORT}`);
  console.log(`  GET /.well-known/ucp`);
  console.log(`  GET /ucp/products?q=roses`);
  console.log(`  POST /checkout-sessions`);
  console.log(`  PUT /checkout-sessions/:id`);
  console.log(`  POST /checkout-sessions/:id/complete`);
  console.log(`  POST /checkout-sessions/:id/cancel`);
  console.log(`  GET /orders/:id`);
  console.log(``);
  console.log(
    `Test with: GATEWAY_URL=http://localhost:${PORT} npx tsx scripts/test-gateway-connection.ts`,
  );
});
