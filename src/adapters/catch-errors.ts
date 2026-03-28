import { UCPError, UCPEscalationError, UCPOAuthError } from '../errors.js';

export interface AdapterOptions {
  readonly catchErrors?: boolean;
}

export type ToolErrorResult =
  | { readonly error: string }
  | { readonly requires_escalation: true; readonly continue_url: string };

export function formatToolError(err: unknown): ToolErrorResult {
  if (err instanceof UCPEscalationError) {
    return { requires_escalation: true, continue_url: err.continue_url };
  }
  // UCPIdempotencyConflictError extends UCPError — handled by the branch below
  if (err instanceof UCPError) {
    return { error: `${err.code}: ${err.message}` };
  }
  // OAuth errors carry statusCode but no UCP code — surface both for actionability
  if (err instanceof UCPOAuthError) {
    return { error: `OAuth error (${err.statusCode}): ${err.message}` };
  }
  if (err instanceof Error) {
    return { error: err.message };
  }
  return { error: String(err) };
}

export async function safeExecute(
  execute: () => Promise<unknown>,
  catchErrors: boolean,
): Promise<unknown> {
  if (!catchErrors) return execute();
  try {
    return await execute();
  } catch (err) {
    return formatToolError(err);
  }
}
