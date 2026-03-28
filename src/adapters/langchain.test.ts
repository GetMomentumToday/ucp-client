import { describe, it, expect, vi } from 'vitest';
import type { AgentTool } from '../agent-tools.js';
import { toLangChainTools } from './langchain.js';

const mockTools: readonly AgentTool[] = [
  {
    name: 'get_order',
    description: 'Get order by ID',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Order ID' } },
      required: ['id'],
    },
    execute: vi.fn().mockResolvedValue({ id: 'order_1', status: 'shipped' }),
  },
  {
    name: 'failing_tool',
    description: 'A tool that always fails',
    parameters: { type: 'object' },
    execute: vi.fn().mockRejectedValue(new Error('execution failed')),
  },
];

describe('toLangChainTools', () => {
  it('maps each tool to LangChain tool format', () => {
    const result = toLangChainTools(mockTools);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('get_order');
    expect(result[0].description).toBe('Get order by ID');
    expect(result[0].schema).toEqual(mockTools[0].parameters);
  });

  it('preserves name and description for all tools', () => {
    const result = toLangChainTools(mockTools);
    expect(result[1].name).toBe('failing_tool');
    expect(result[1].description).toBe('A tool that always fails');
  });

  it('call returns JSON stringified result', async () => {
    const result = toLangChainTools(mockTools);
    const output = await result[0].call({ id: 'order_1' });
    expect(output).toBe(JSON.stringify({ id: 'order_1', status: 'shipped' }));
    expect(typeof output).toBe('string');
  });

  it('call propagates errors from the underlying tool', async () => {
    const result = toLangChainTools(mockTools);
    await expect(result[1].call({})).rejects.toThrow('execution failed');
  });
});
