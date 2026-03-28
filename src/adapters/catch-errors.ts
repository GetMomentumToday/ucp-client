import { UCPError, UCPEscalationError, UCPIdempotencyConflictError } from '../errors.js';

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
  if (err instanceof UCPIdempotencyConflictError) {
    return { error: 'Duplicate request' };
  }
  if (err instanceof UCPError) {
    return { error: `${err.code}: ${err.message}` };
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
