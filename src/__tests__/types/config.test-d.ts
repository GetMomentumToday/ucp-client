import { expectTypeOf, describe, it } from 'vitest';
import type { UCPClientConfig } from '../../types/index.js';

describe('UCPClientConfig types', () => {
  it('gatewayUrl is required string', () => {
    expectTypeOf<UCPClientConfig['gatewayUrl']>().toEqualTypeOf<string>();
  });

  it('agentProfileUrl is required string', () => {
    expectTypeOf<UCPClientConfig['agentProfileUrl']>().toEqualTypeOf<string>();
  });

  it('ucpVersion is optional', () => {
    expectTypeOf<UCPClientConfig['ucpVersion']>().toEqualTypeOf<string | undefined>();
  });

  it('requestSignature is optional', () => {
    expectTypeOf<UCPClientConfig['requestSignature']>().toEqualTypeOf<string | undefined>();
  });

  it('accepts minimal config with required fields only', () => {
    const minimal: UCPClientConfig = {
      gatewayUrl: 'https://example.com/ucp',
      agentProfileUrl: 'https://agent.example.com/profile',
    };
    expectTypeOf(minimal).toMatchTypeOf<UCPClientConfig>();
  });

  it('accepts full config with all optional fields', () => {
    const full: UCPClientConfig = {
      gatewayUrl: 'https://example.com/ucp',
      agentProfileUrl: 'https://agent.example.com/profile',
      ucpVersion: '2026-01-23',
      requestSignature: 'sig_abc',
    };
    expectTypeOf(full).toMatchTypeOf<UCPClientConfig>();
  });
});
