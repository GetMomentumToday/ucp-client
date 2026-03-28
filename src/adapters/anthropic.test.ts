import { describe, it, expect, vi } from 'vitest';
import type { AgentTool } from '../agent-tools.js';
import { toAnthropicTools, executeAnthropicToolCall } from './anthropic.js';

const mockTools: readonly AgentTool[] = [
  {
    name: 'get_product',
    description: 'Get product by ID',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Product ID' } },
      required: ['id'],
    },
    execute: vi.fn().mockResolvedValue({ id: 'prod_1', name: 'Shoe' }),
  },
  {
    name: 'failing_tool',
    description: 'A tool that always fails',
    parameters: { type: 'object' },
    execute: vi.fn().mockRejectedValue(new Error('execution failed')),
  },
];

describe('toAnthropicTools', () => {
  it('maps each tool to Anthropic tool format', () => {
    const result = toAnthropicTools(mockTools);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      name: 'get_product',
      description: 'Get product by ID',
      input_schema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Product ID' } },
        required: ['id'],
      },
    });
  });

  it('always sets input_schema.type to "object"', () => {
    const result = toAnthropicTools(mockTools);
    for (const tool of result) {
      expect(tool.input_schema.type).toBe('object');
    }
  });

  it('preserves name and description', () => {
    const result = toAnthropicTools(mockTools);
    expect(result[1].name).toBe('failing_tool');
    expect(result[1].description).toBe('A tool that always fails');
  });
});

describe('executeAnthropicToolCall', () => {
  it('calls the matching tool with the given input', async () => {
    const result = await executeAnthropicToolCall(mockTools, 'get_product', { id: 'prod_1' });
    expect(mockTools[0].execute).toHaveBeenCalledWith({ id: 'prod_1' });
    expect(result).toEqual({ id: 'prod_1', name: 'Shoe' });
  });

  it('throws when the tool name is not found', async () => {
    await expect(
      executeAnthropicToolCall(mockTools, 'unknown_tool', {}),
    ).rejects.toThrow('Tool not found: unknown_tool');
  });

  it('propagates errors from execute', async () => {
    await expect(
      executeAnthropicToolCall(mockTools, 'failing_tool', {}),
    ).rejects.toThrow('execution failed');
  });
});
