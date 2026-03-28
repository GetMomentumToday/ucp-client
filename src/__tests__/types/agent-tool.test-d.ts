import { expectTypeOf, describe, it } from 'vitest';
import type { AgentTool, JsonSchema } from '../../agent-tools.js';

describe('AgentTool types', () => {
  it('execute accepts Record<string, unknown> and returns Promise<unknown>', () => {
    expectTypeOf<AgentTool['execute']>().toEqualTypeOf<
      (params: Record<string, unknown>) => Promise<unknown>
    >();
  });

  it('parameters is JsonSchema', () => {
    expectTypeOf<AgentTool['parameters']>().toEqualTypeOf<JsonSchema>();
  });

  it('name and description are strings', () => {
    expectTypeOf<AgentTool['name']>().toEqualTypeOf<string>();
    expectTypeOf<AgentTool['description']>().toEqualTypeOf<string>();
  });

  it('all properties are readonly', () => {
    expectTypeOf<AgentTool>().toMatchTypeOf<{
      readonly name: string;
      readonly description: string;
      readonly parameters: JsonSchema;
    }>();
  });
});
