export type MessageType = 'error' | 'warning' | 'info';
export type MessageSeverity = 'recoverable' | 'requires_buyer_input' | 'requires_buyer_review';
export type ContentType = 'plain' | 'markdown';

export interface UCPMessage {
  readonly type: MessageType;
  readonly code?: string;
  readonly content: string;
  readonly severity?: MessageSeverity;
  readonly path?: string;
  readonly content_type?: ContentType;
}

export class UCPError extends Error {
  readonly code: string;
  readonly type: MessageType;
  readonly statusCode: number;
  readonly path: string | undefined;
  readonly contentType: ContentType | undefined;
  readonly messages: readonly UCPMessage[];

  constructor(
    code: string,
    message: string,
    type: MessageType = 'error',
    statusCode = 400,
    options: {
      readonly path?: string;
      readonly contentType?: ContentType;
      readonly messages?: readonly UCPMessage[];
    } = {},
  ) {
    super(message);
    this.name = 'UCPError';
    this.code = code;
    this.type = type;
    this.statusCode = statusCode;
    this.path = options.path;
    this.contentType = options.contentType;
    this.messages = options.messages ?? [];
  }
}

export class UCPIdempotencyConflictError extends UCPError {
  constructor(message = 'Idempotency key reused with different request body') {
    super('IDEMPOTENCY_CONFLICT', message, 'error', 409);
    this.name = 'UCPIdempotencyConflictError';
  }
}

export class UCPEscalationError extends Error {
  readonly continue_url: string;

  constructor(continue_url: string, message = 'Payment requires escalation') {
    super(message);
    this.name = 'UCPEscalationError';
    this.continue_url = continue_url;
  }
}

export class UCPOAuthError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'UCPOAuthError';
    this.statusCode = statusCode;
  }
}
