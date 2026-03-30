import { randomUUID } from 'node:crypto';
import type { ZodType } from 'zod';
import { UCPError, UCPIdempotencyConflictError } from './errors.js';
import type { UCPMessage, MessageType, MessageSeverity, ContentType } from './errors.js';
import { MessageErrorSchema, MessageInfoSchema, MessageWarningSchema } from './schemas.js';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type LogFn = (message: string, detail?: string) => void;

export interface HttpClientConfig {
  readonly gatewayUrl: string;
  readonly agentProfileUrl: string;
  readonly ucpVersion: string;
  readonly requestSignature?: string;
  readonly accessToken?: string;
  readonly onValidationWarning?: LogFn;
}

export class HttpClient {
  private readonly gatewayUrl: string;
  private readonly agentProfileUrl: string;
  private readonly ucpVersion: string;
  private readonly requestSignature: string | undefined;
  private readonly accessToken: string | undefined;
  private readonly onValidationWarning: LogFn;

  constructor(config: HttpClientConfig) {
    this.gatewayUrl = config.gatewayUrl;
    this.agentProfileUrl = config.agentProfileUrl;
    this.ucpVersion = config.ucpVersion;
    this.requestSignature = config.requestSignature;
    this.accessToken = config.accessToken;
    this.onValidationWarning =
      config.onValidationWarning ?? // eslint-disable-next-line no-console
      ((msg, detail) => console.warn(msg, detail));
  }

  withAccessToken(token: string): HttpClient {
    return new HttpClient({
      gatewayUrl: this.gatewayUrl,
      agentProfileUrl: this.agentProfileUrl,
      ucpVersion: this.ucpVersion,
      ...(this.requestSignature !== undefined ? { requestSignature: this.requestSignature } : {}),
      accessToken: token,
      onValidationWarning: this.onValidationWarning,
    });
  }

  async request(method: HttpMethod, path: string, body?: unknown): Promise<unknown> {
    const url = `${this.gatewayUrl}${path}`;
    const requestId = randomUUID();

    const headers: Record<string, string> = {
      'UCP-Agent': `profile="${this.agentProfileUrl}", version="${this.ucpVersion}"`,
      'request-id': requestId,
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.requestSignature !== undefined) {
      headers['request-signature'] = this.requestSignature;
    }

    if (this.accessToken !== undefined) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (method === 'POST' || method === 'PUT') {
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

  validate<T>(data: unknown, schema: ZodType<T>): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      this.onValidationWarning('[UCPClient] Response validation failed:', result.error.message);
      return data as T;
    }
    return result.data;
  }

  private throwFromResponse(data: unknown, statusCode: number): never {
    if (typeof data !== 'object' || data === null) {
      if (statusCode === 409) throw new UCPIdempotencyConflictError();
      throw new UCPError('HTTP_ERROR', `Gateway returned ${statusCode}`, 'error', statusCode);
    }

    const body = data as Record<string, unknown>;
    const rawMessages = body['messages'];

    if (Array.isArray(rawMessages) && rawMessages.length > 0) {
      const allMessages = parseMessages(rawMessages);
      const first = allMessages[0]!;
      const code = first.code ?? 'UNKNOWN';

      throw new UCPError(code, first.content, first.type, statusCode, {
        ...(first.path !== undefined ? { path: first.path } : {}),
        ...(first.content_type !== undefined ? { contentType: first.content_type } : {}),
        messages: allMessages,
      });
    }

    if (statusCode === 409) throw new UCPIdempotencyConflictError();
    throw new UCPError('HTTP_ERROR', `Gateway returned ${statusCode}`, 'error', statusCode);
  }
}

function parseMessages(rawMessages: unknown[]): UCPMessage[] {
  return rawMessages.map((m: unknown) => {
    const record = m as Record<string, unknown>;
    const rawType = String(record['type'] ?? 'error');

    if (rawType === 'error') {
      const parsed = MessageErrorSchema.safeParse(m);
      if (parsed.success) {
        return {
          type: 'error' as const,
          code: parsed.data.code,
          content: parsed.data.content,
          severity: parsed.data.severity,
          ...(parsed.data.path !== undefined ? { path: parsed.data.path } : {}),
          ...(parsed.data.content_type !== undefined
            ? { content_type: parsed.data.content_type }
            : {}),
        };
      }
    }

    if (rawType === 'warning') {
      const parsed = MessageWarningSchema.safeParse(m);
      if (parsed.success) {
        return {
          type: 'warning' as const,
          code: parsed.data.code,
          content: parsed.data.content,
          ...(parsed.data.path !== undefined ? { path: parsed.data.path } : {}),
          ...(parsed.data.content_type !== undefined
            ? { content_type: parsed.data.content_type }
            : {}),
        };
      }
    }

    if (rawType === 'info') {
      const parsed = MessageInfoSchema.safeParse(m);
      if (parsed.success) {
        return {
          type: 'info' as const,
          content: parsed.data.content,
          ...(parsed.data.code !== undefined ? { code: parsed.data.code } : {}),
          ...(parsed.data.path !== undefined ? { path: parsed.data.path } : {}),
          ...(parsed.data.content_type !== undefined
            ? { content_type: parsed.data.content_type }
            : {}),
        };
      }
    }

    const validTypes: readonly string[] = ['error', 'warning', 'info'];
    const type: MessageType = validTypes.includes(rawType) ? (rawType as MessageType) : 'error';

    return {
      type,
      content: String(record['content'] ?? 'Unknown error'),
      ...(record['code'] !== undefined ? { code: String(record['code']) } : {}),
      ...(record['severity'] !== undefined
        ? { severity: String(record['severity']) as MessageSeverity }
        : {}),
      ...(record['path'] !== undefined ? { path: String(record['path']) } : {}),
      ...(record['content_type'] !== undefined
        ? { content_type: String(record['content_type']) as ContentType }
        : {}),
    };
  });
}
