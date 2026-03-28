import { describe, it, expect, vi } from 'vitest';
import type { AgentTool } from '../agent-tools.js';
import { toMCPTools, executeMCPToolCall } from './mcp.js';

const mockTools: readonly AgentTool[] = [
  {
    name: 'create_checkout',
    description: 'Create a checkout session',
    parameters: {
      type: 'object',
      properties: {
        line_items: { type: 'array', description: 'Items to purchase', items: { type: 'object' } },
      },
      required: ['line_items'],
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

describe('toMCPTools', () => {
  it('maps each tool to MCP tool list format', () => {
    const result = toMCPTools(mockTools);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      name: 'create_checkout',
      description: 'Create a checkout session',
      inputSchema: {
        type: 'object',
        properties: {
          line_items: { type: 'array', description: 'Items to purchase' },
        },
        required: ['line_items'],
      },
    });
  });

  it('always sets inputSchema.type to "object"', () => {
    const result = toMCPTools(mockTools);
    for (const tool of result) {
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('preserves name and description', () => {
    const result = toMCPTools(mockTools);
    expect(result[1].name).toBe('failing_tool');
    expect(result[1].description).toBe('A tool that always fails');
  });
});

describe('executeMCPToolCall', () => {
  it('calls the matching tool with the given input', async () => {
    const result = await executeMCPToolCall(mockTools, 'create_checkout', {
      line_items: [{ item: { id: 'p1' }, quantity: 1 }],
    });
    expect(mockTools[0].execute).toHaveBeenCalledWith({
      line_items: [{ item: { id: 'p1' }, quantity: 1 }],
    });
    expect(result).toEqual({ id: 'chk_1', status: 'incomplete' });
  });

  it('throws when the tool name is not found', async () => {
    await expect(
      executeMCPToolCall(mockTools, 'unknown_tool', {}),
    ).rejects.toThrow('Tool not found: unknown_tool');
  });

  it('propagates errors from execute', async () => {
    await expect(
      executeMCPToolCall(mockTools, 'failing_tool', {}),
    ).rejects.toThrow('execution failed');
  });
});
