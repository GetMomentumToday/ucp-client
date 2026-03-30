import { expectTypeOf, describe, it } from 'vitest';
import type { ConnectedClient, ToolDescriptor } from '../../UCPClient.js';
import type { CheckoutCapability } from '../../capabilities/checkout.js';
import type { OrderCapability } from '../../capabilities/order.js';
import type { IdentityLinkingCapability } from '../../capabilities/identity-linking.js';
import type { AgentTool } from '../../agent-tools.js';

describe('ConnectedClient types', () => {
  it('checkout is nullable', () => {
    expectTypeOf<ConnectedClient['checkout']>().toEqualTypeOf<CheckoutCapability | null>();
  });

  it('order is nullable', () => {
    expectTypeOf<ConnectedClient['order']>().toEqualTypeOf<OrderCapability | null>();
  });

  it('identityLinking is nullable', () => {
    expectTypeOf<
      ConnectedClient['identityLinking']
    >().toEqualTypeOf<IdentityLinkingCapability | null>();
  });

  it('describeTools returns readonly ToolDescriptor array', () => {
    expectTypeOf<ConnectedClient['describeTools']>().returns.toEqualTypeOf<
      readonly ToolDescriptor[]
    >();
  });

  it('getAgentTools returns readonly AgentTool array', () => {
    expectTypeOf<ConnectedClient['getAgentTools']>().returns.toEqualTypeOf<readonly AgentTool[]>();
  });

  it('all properties are readonly', () => {
    expectTypeOf<ConnectedClient>().toMatchTypeOf<{
      readonly checkout: CheckoutCapability | null;
      readonly order: OrderCapability | null;
      readonly identityLinking: IdentityLinkingCapability | null;
    }>();
  });
});
