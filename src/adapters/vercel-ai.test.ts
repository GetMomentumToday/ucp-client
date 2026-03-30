import { describe, it, expect, vi } from 'vitest';
import type { AgentTool } from '../agent-tools.js';
import { toVercelAITools } from './vercel-ai.js';

const mockTools: readonly AgentTool[] = [
  {
    name: 'get_checkout',
    description: 'Get a checkout session by ID',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Checkout session ID' } },
      required: ['id'],
    },
    execute: vi.fn().mockResolvedValue({ id: 'chk_1', status: 'incomplete' }),
  },
  {
    name: 'failing_tool',
    description: 'A tool that always fails',
    parameters: { type: 'object' },
    execute: vi.fn().mockRejectedValue(new Error('execution failed')),
  },
];

describe('toVercelAITools', () => {
  it('returns a record keyed by tool name', () => {
    const result = toVercelAITools(mockTools);
    expect(Object.keys(result)).toEqual(['get_checkout', 'failing_tool']);
  });

  it('maps description and wraps inputSchema as Standard Schema v1', () => {
    const result = toVercelAITools(mockTools);
    const schema = result['get_checkout'].inputSchema;
    expect(result['get_checkout'].description).toBe('Get a checkout session by ID');
    // Standard Schema v1 contract
    expect(schema['~standard'].version).toBe(1);
    expect(schema['~standard'].vendor).toBe('ucp-client');
    expect(schema['~standard'].validate({ id: 'chk_1' })).toEqual({ value: { id: 'chk_1' } });
    // AI SDK reads jsonSchema via ~standard.jsonSchema.input/output
    expect(schema['~standard'].jsonSchema.input({ target: 'input' })).toEqual(
      mockTools[0].parameters,
    );
    expect(schema['~standard'].jsonSchema.output({ target: 'output' })).toEqual(
      mockTools[0].parameters,
    );
  });

  it('execute returns JSON stringified result', async () => {
    const result = toVercelAITools(mockTools);
    const output = await result['get_checkout'].execute({ id: 'chk_1' });
    expect(output).toBe(JSON.stringify({ id: 'chk_1', status: 'incomplete' }));
    expect(typeof output).toBe('string');
  });

  it('execute propagates errors from the underlying tool', async () => {
    const result = toVercelAITools(mockTools);
    await expect(result['failing_tool'].execute({})).rejects.toThrow('execution failed');
  });
});
