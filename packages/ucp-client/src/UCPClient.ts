import { randomUUID } from 'node:crypto';
import type { ZodType } from 'zod';
import type {
  UCPClientConfig,
  SearchFilters,
  CreateCheckoutPayload,
  UpdateCheckoutPayload,
  CompleteCheckoutPayload,
  CheckoutSession,
  UCPProduct,
  UCPOrder,
  UCPProfile,
} from './types.js';
import { UCPError, UCPEscalationError } from './errors.js';
import {
  CheckoutSessionSchema,
  UCPProfileSchema,
  UCPProductSchema,
  UCPOrderSchema,
} from './schemas.js';

const DEFAULT_UCP_VERSION = '2026-01-23';

type HttpMethod = 'GET' | 'POST' | 'PUT';

export class UCPClient {
  private readonly gatewayUrl: string;
  private readonly agentProfileUrl: string;
  private readonly ucpVersion: string;

  constructor(config: UCPClientConfig) {
    new URL(config.gatewayUrl);
    if (config.agentProfileUrl.includes('"') || config.agentProfileUrl.includes('\n')) {
      throw new Error('agentProfileUrl must not contain double quotes or newlines');
    }
    new URL(config.agentProfileUrl);

    this.gatewayUrl = config.gatewayUrl.replace(/\/+$/, '');
    this.agentProfileUrl = config.agentProfileUrl;
    this.ucpVersion = config.ucpVersion ?? DEFAULT_UCP_VERSION;
  }

  async discover(): Promise<UCPProfile> {
    const data = await this.request('GET', '/.well-known/ucp');
    return this.validate(data, UCPProfileSchema) as UCPProfile;
  }

  async searchProducts(query: string, filters: SearchFilters = {}): Promise<UCPProduct[]> {
    const params = new URLSearchParams({ q: query });

    if (filters.max_price_cents != null) {
      params.set('max_price_cents', String(filters.max_price_cents));
    }
    if (filters.min_price_cents != null) {
      params.set('min_price_cents', String(filters.min_price_cents));
    }
    if (filters.in_stock != null) {
      params.set('in_stock', String(filters.in_stock));
    }
    if (filters.category != null) {
      params.set('category', filters.category);
    }
    if (filters.limit != null) {
      params.set('limit', String(filters.limit));
    }
    if (filters.page != null) {
      params.set('page', String(filters.page));
    }

    const res = await this.request('GET', `/ucp/products?${params.toString()}`);
    const data = res as { products?: UCPProduct[] } | UCPProduct[];
    const products = Array.isArray(data) ? data : (data.products ?? []);
    return products.map((p) => this.validate(p, UCPProductSchema) as UCPProduct);
  }

  async getProduct(id: string): Promise<UCPProduct> {
    const data = await this.request('GET', `/ucp/products/${encodeURIComponent(id)}`);
    return this.validate(data, UCPProductSchema) as UCPProduct;
  }

  async createCheckout(payload: CreateCheckoutPayload): Promise<CheckoutSession> {
    const data = await this.request('POST', '/checkout-sessions', payload);
    return this.validateCheckout(data);
  }

  async getCheckout(id: string): Promise<CheckoutSession> {
    const data = await this.request(
      'GET',
      `/checkout-sessions/${encodeURIComponent(id)}`,
    );
    return this.validateCheckout(data);
  }

  async updateCheckout(id: string, patch: UpdateCheckoutPayload): Promise<CheckoutSession> {
    const body = { ...patch, id };
    const data = await this.request(
      'PUT',
      `/checkout-sessions/${encodeURIComponent(id)}`,
      body,
    );
    return this.validateCheckout(data);
  }

  async completeCheckout(
    id: string,
    payload: CompleteCheckoutPayload,
  ): Promise<CheckoutSession> {
    const data = await this.request(
      'POST',
      `/checkout-sessions/${encodeURIComponent(id)}/complete`,
      payload,
    );
    const session = this.validateCheckout(data);

    if (session.status === 'requires_escalation' && session.continue_url) {
      throw new UCPEscalationError(session.continue_url);
    }

    return session;
  }

  async cancelCheckout(id: string): Promise<CheckoutSession> {
    const data = await this.request(
      'POST',
      `/checkout-sessions/${encodeURIComponent(id)}/cancel`,
    );
    return this.validateCheckout(data);
  }

  async getOrder(id: string): Promise<UCPOrder> {
    const data = await this.request('GET', `/orders/${encodeURIComponent(id)}`);
    return this.validate(data, UCPOrderSchema) as UCPOrder;
  }

  private validateCheckout(data: unknown): CheckoutSession {
    return this.validate(data, CheckoutSessionSchema) as CheckoutSession;
  }

  private validate(data: unknown, schema: ZodType): unknown {
    const result = schema.safeParse(data);
    if (!result.success) {
      // Graceful degradation: warn but return unvalidated data
      // eslint-disable-next-line no-console
      console.warn('[UCPClient] Response validation failed:', result.error.message);
      return data;
    }
    return result.data;
  }

  private async request(method: HttpMethod, path: string, body?: unknown): Promise<unknown> {
    const url = `${this.gatewayUrl}${path}`;
    const requestId = randomUUID();

    const headers: Record<string, string> = {
      'UCP-Agent': `profile="${this.agentProfileUrl}", version="${this.ucpVersion}"`,
      'Content-Type': 'application/json',
      'request-id': requestId,
    };

    if (method === 'POST') {
      headers['idempotency-key'] = randomUUID();
    }

    const res = await fetch(url, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const data: unknown = await res.json().catch(() => ({}));

    if (!res.ok) {
      this.throwFromResponse(data, res.status);
    }

    return data;
  }

  private throwFromResponse(data: unknown, statusCode: number): never {
    if (typeof data !== 'object' || data === null) {
      throw new UCPError('HTTP_ERROR', `Gateway returned ${statusCode}`, 'error', statusCode);
    }

    const body = data as Record<string, unknown>;
    const messages = body['messages'];

    if (Array.isArray(messages) && messages.length > 0) {
      const first = messages[0] as Record<string, string>;
      const severity = first['severity'] ?? 'error';
      const validSeverities = new Set(['error', 'warning', 'info']);
      throw new UCPError(
        first['code'] ?? 'UNKNOWN',
        first['content'] ?? 'Unknown error',
        validSeverities.has(severity) ? (severity as 'error' | 'warning' | 'info') : 'error',
        statusCode,
      );
    }

    throw new UCPError('HTTP_ERROR', `Gateway returned ${statusCode}`, 'error', statusCode);
  }
}
