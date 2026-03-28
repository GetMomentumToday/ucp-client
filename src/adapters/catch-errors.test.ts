import { describe, it, expect } from 'vitest';
import { formatToolError } from './catch-errors.js';
import {
  UCPError,
  UCPEscalationError,
  UCPIdempotencyConflictError,
  UCPOAuthError,
} from '../errors.js';

describe('formatToolError', () => {
  it('formats UCPError as { error: "[code]: message" }', () => {
    const err = new UCPError('INVALID_INPUT', 'Field is required');
    expect(formatToolError(err)).toEqual({ error: 'INVALID_INPUT: Field is required' });
  });

  it('formats UCPEscalationError as { requires_escalation, continue_url }', () => {
    const err = new UCPEscalationError('https://example.com/pay');
    expect(formatToolError(err)).toEqual({
      requires_escalation: true,
      continue_url: 'https://example.com/pay',
    });
  });

  it('formats UCPIdempotencyConflictError via UCPError branch with code and message', () => {
    const err = new UCPIdempotencyConflictError();
    expect(formatToolError(err)).toEqual({
      error: 'IDEMPOTENCY_CONFLICT: Idempotency key reused with different request body',
    });
  });

  it('formats UCPOAuthError with statusCode and message', () => {
    const err = new UCPOAuthError('Token exchange failed', 401);
    expect(formatToolError(err)).toEqual({ error: 'OAuth error (401): Token exchange failed' });
  });

  it('formats plain Error as { error: message }', () => {
    const err = new Error('Network timeout');
    expect(formatToolError(err)).toEqual({ error: 'Network timeout' });
  });

  it('formats unknown thrown value as { error: String(value) }', () => {
    expect(formatToolError('something went wrong')).toEqual({ error: 'something went wrong' });
    expect(formatToolError(42)).toEqual({ error: '42' });
    expect(formatToolError(null)).toEqual({ error: 'null' });
  });
});
