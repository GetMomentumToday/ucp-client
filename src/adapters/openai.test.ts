import { describe, it, expect, vi } from 'vitest';
import type { AgentTool } from '../agent-tools.js';
import { toOpenAITools, executeOpenAIToolCall } from './openai.js';

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

describe('toOpenAITools', () => {
  it('maps each tool to OpenAI function calling format', () => {
    const result = toOpenAITools(mockTools);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      type: 'function',
      function: {
        name: 'get_checkout',
        description: 'Get a checkout session by ID',
        parameters: mockTools[0].parameters,
      },
    });
  });

  it('sets type to "function" for all tools', () => {
    const result = toOpenAITools(mockTools);
    for (const tool of result) {
      expect(tool.type).toBe('function');
    }
  });

  it('preserves name and description', () => {
    const result = toOpenAITools(mockTools);
    expect(result[1].function.name).toBe('failing_tool');
    expect(result[1].function.description).toBe('A tool that always fails');
  });
});

describe('executeOpenAIToolCall', () => {
  it('calls the matching tool with the given input', async () => {
    const result = await executeOpenAIToolCall(mockTools, 'get_checkout', { id: 'chk_1' });
    expect(mockTools[0].execute).toHaveBeenCalledWith({ id: 'chk_1' });
    expect(result).toEqual({ id: 'chk_1', status: 'incomplete' });
  });

  it('throws when the tool name is not found', async () => {
    await expect(executeOpenAIToolCall(mockTools, 'unknown_tool', {})).rejects.toThrow(
      'Tool not found: unknown_tool',
    );
  });

  it('propagates errors from execute', async () => {
    await expect(executeOpenAIToolCall(mockTools, 'failing_tool', {})).rejects.toThrow(
      'execution failed',
    );
  });
});
