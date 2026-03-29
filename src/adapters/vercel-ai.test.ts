import { describe, it, expect, vi } from 'vitest';
import type { AgentTool } from '../agent-tools.js';
import { toVercelAITools } from './vercel-ai.js';

const mockTools: readonly AgentTool[] = [
  {
    name: 'search_products',
    description: 'Search for products',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search query' } },
      required: ['query'],
    },
    execute: vi.fn().mockResolvedValue({ products: [{ id: 'p1' }] }),
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
    expect(Object.keys(result)).toEqual(['search_products', 'failing_tool']);
  });

  it('maps description and wraps inputSchema as Standard Schema v1', () => {
    const result = toVercelAITools(mockTools);
    const schema = result['search_products'].inputSchema;
    expect(result['search_products'].description).toBe('Search for products');
    // Standard Schema v1 contract
    expect(schema['~standard'].version).toBe(1);
    expect(schema['~standard'].vendor).toBe('ucp-client');
    expect(schema['~standard'].validate({ query: 'test' })).toEqual({ value: { query: 'test' } });
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
    const output = await result['search_products'].execute({ query: 'boots' });
    expect(output).toBe(JSON.stringify({ products: [{ id: 'p1' }] }));
    expect(typeof output).toBe('string');
  });

  it('execute propagates errors from the underlying tool', async () => {
    const result = toVercelAITools(mockTools);
    await expect(result['failing_tool'].execute({})).rejects.toThrow('execution failed');
  });
});
