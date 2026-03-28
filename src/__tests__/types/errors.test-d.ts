import { expectTypeOf, describe, it } from 'vitest';
import {
  UCPError,
  UCPEscalationError,
  UCPIdempotencyConflictError,
  UCPOAuthError,
} from '../../errors.js';
import type { UCPMessage } from '../../errors.js';

describe('Error class hierarchy types', () => {
  it('UCPEscalationError has continue_url and extends Error', () => {
    type E = InstanceType<typeof UCPEscalationError>;
    expectTypeOf<E['continue_url']>().toEqualTypeOf<string>();
    expectTypeOf<E>().toMatchTypeOf<Error>();
  });

  it('UCPIdempotencyConflictError is assignable to UCPError', () => {
    expectTypeOf<InstanceType<typeof UCPIdempotencyConflictError>>().toMatchTypeOf<
      InstanceType<typeof UCPError>
    >();
  });

  it('UCPOAuthError is assignable to Error', () => {
    expectTypeOf<InstanceType<typeof UCPOAuthError>>().toMatchTypeOf<Error>();
  });

  it('UCPError has messages array', () => {
    expectTypeOf<InstanceType<typeof UCPError>['messages']>().toEqualTypeOf<
      readonly UCPMessage[]
    >();
  });

  it('UCPError has code, statusCode, path', () => {
    type E = InstanceType<typeof UCPError>;
    expectTypeOf<E['code']>().toEqualTypeOf<string>();
    expectTypeOf<E['statusCode']>().toEqualTypeOf<number>();
    expectTypeOf<E['path']>().toEqualTypeOf<string | undefined>();
  });

  it('instanceof narrowing: UCPEscalationError narrows to continue_url', () => {
    const check = (e: unknown): void => {
      if (e instanceof UCPEscalationError) {
        expectTypeOf(e['continue_url']).toEqualTypeOf<string>();
      }
    };
    expectTypeOf(check).toBeFunction();
  });

  it('instanceof narrowing: UCPIdempotencyConflictError is also UCPError', () => {
    const check = (e: unknown): void => {
      if (e instanceof UCPIdempotencyConflictError) {
        expectTypeOf(e).toMatchTypeOf<InstanceType<typeof UCPError>>();
      }
    };
    expectTypeOf(check).toBeFunction();
  });
});
