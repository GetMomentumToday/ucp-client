import { describe, it, expect } from 'vitest';
import type { AgentTool } from '../agent-tools.js';
import { UCPError, UCPEscalationError, UCPIdempotencyConflictError } from '../errors.js';
import { toOpenAITools, executeOpenAIToolCall } from './openai.js';
import { toAnthropicTools, executeAnthropicToolCall } from './anthropic.js';
import { toVercelAITools } from './vercel-ai.js';
import { toLangChainTools } from './langchain.js';
import { toMCPTools, executeMCPToolCall } from './mcp.js';

const makeTool = (execute: AgentTool['execute']): AgentTool => ({
  name: 'test_tool',
  description: 'A test tool',
  parameters: { type: 'object' },
  execute,
});

const ucpErrorTool = makeTool(() =>
  Promise.reject(new UCPError('OUT_OF_STOCK', 'Item unavailable')),
);
const escalationTool = makeTool(() =>
  Promise.reject(new UCPEscalationError('https://pay.example.com')),
);
const idempotencyTool = makeTool(() => Promise.reject(new UCPIdempotencyConflictError()));
const genericErrorTool = makeTool(() => Promise.reject(new Error('Network timeout')));
const unknownErrorTool = makeTool(() => Promise.reject('raw string error'));
const successTool = makeTool(() => Promise.resolve({ ok: true }));

// ─── executeOpenAIToolCall ────────────────────────────────────────────────────

describe('executeOpenAIToolCall catchErrors', () => {
  it('returns result normally when no error', async () => {
    const result = await executeOpenAIToolCall(
      [successTool],
      'test_tool',
      {},
      { catchErrors: true },
    );
    expect(result).toEqual({ ok: true });
  });

  it('returns { error } for UCPError instead of throwing', async () => {
    const result = await executeOpenAIToolCall(
      [ucpErrorTool],
      'test_tool',
      {},
      { catchErrors: true },
    );
    expect(result).toEqual({ error: 'OUT_OF_STOCK: Item unavailable' });
  });

  it('returns { requires_escalation, continue_url } for UCPEscalationError', async () => {
    const result = await executeOpenAIToolCall(
      [escalationTool],
      'test_tool',
      {},
      { catchErrors: true },
    );
    expect(result).toEqual({ requires_escalation: true, continue_url: 'https://pay.example.com' });
  });

  it('returns { error: "Duplicate request" } for UCPIdempotencyConflictError', async () => {
    const result = await executeOpenAIToolCall(
      [idempotencyTool],
      'test_tool',
      {},
      { catchErrors: true },
    );
    expect(result).toEqual({ error: 'Duplicate request' });
  });

  it('returns { error } for generic Error', async () => {
    const result = await executeOpenAIToolCall(
      [genericErrorTool],
      'test_tool',
      {},
      { catchErrors: true },
    );
    expect(result).toEqual({ error: 'Network timeout' });
  });

  it('still throws when catchErrors is false (default)', async () => {
    await expect(executeOpenAIToolCall([ucpErrorTool], 'test_tool', {})).rejects.toThrow();
    await expect(
      executeOpenAIToolCall([ucpErrorTool], 'test_tool', {}, { catchErrors: false }),
    ).rejects.toThrow();
  });
});

// ─── executeAnthropicToolCall ─────────────────────────────────────────────────

describe('executeAnthropicToolCall catchErrors', () => {
  it('returns { error } for UCPError', async () => {
    const result = await executeAnthropicToolCall(
      [ucpErrorTool],
      'test_tool',
      {},
      { catchErrors: true },
    );
    expect(result).toEqual({ error: 'OUT_OF_STOCK: Item unavailable' });
  });

  it('returns { requires_escalation, continue_url } for UCPEscalationError', async () => {
    const result = await executeAnthropicToolCall(
      [escalationTool],
      'test_tool',
      {},
      { catchErrors: true },
    );
    expect(result).toEqual({ requires_escalation: true, continue_url: 'https://pay.example.com' });
  });

  it('still throws by default', async () => {
    await expect(executeAnthropicToolCall([ucpErrorTool], 'test_tool', {})).rejects.toThrow();
  });
});

// ─── executeMCPToolCall ───────────────────────────────────────────────────────

describe('executeMCPToolCall catchErrors', () => {
  it('returns { error } for UCPError', async () => {
    const result = await executeMCPToolCall([ucpErrorTool], 'test_tool', {}, { catchErrors: true });
    expect(result).toEqual({ error: 'OUT_OF_STOCK: Item unavailable' });
  });

  it('returns { error } for unknown thrown value', async () => {
    const result = await executeMCPToolCall(
      [unknownErrorTool],
      'test_tool',
      {},
      { catchErrors: true },
    );
    expect(result).toEqual({ error: 'raw string error' });
  });

  it('still throws by default', async () => {
    await expect(executeMCPToolCall([ucpErrorTool], 'test_tool', {})).rejects.toThrow();
  });
});

// ─── toVercelAITools ──────────────────────────────────────────────────────────

describe('toVercelAITools catchErrors', () => {
  it('returns JSON error string for UCPError instead of throwing', async () => {
    const tools = toVercelAITools([ucpErrorTool], { catchErrors: true });
    const result = await tools['test_tool'].execute({});
    expect(JSON.parse(result)).toEqual({ error: 'OUT_OF_STOCK: Item unavailable' });
  });

  it('returns JSON requires_escalation for UCPEscalationError', async () => {
    const tools = toVercelAITools([escalationTool], { catchErrors: true });
    const result = await tools['test_tool'].execute({});
    expect(JSON.parse(result)).toEqual({
      requires_escalation: true,
      continue_url: 'https://pay.example.com',
    });
  });

  it('returns success JSON normally', async () => {
    const tools = toVercelAITools([successTool], { catchErrors: true });
    const result = await tools['test_tool'].execute({});
    expect(JSON.parse(result)).toEqual({ ok: true });
  });

  it('still throws by default', async () => {
    const tools = toVercelAITools([ucpErrorTool]);
    await expect(tools['test_tool'].execute({})).rejects.toThrow();
  });
});

// ─── toLangChainTools ─────────────────────────────────────────────────────────

describe('toLangChainTools catchErrors', () => {
  it('returns JSON error string for UCPError instead of throwing', async () => {
    const tools = toLangChainTools([ucpErrorTool], { catchErrors: true });
    const result = await tools[0].call({});
    expect(JSON.parse(result)).toEqual({ error: 'OUT_OF_STOCK: Item unavailable' });
  });

  it('returns JSON requires_escalation for UCPEscalationError', async () => {
    const tools = toLangChainTools([escalationTool], { catchErrors: true });
    const result = await tools[0].call({});
    expect(JSON.parse(result)).toEqual({
      requires_escalation: true,
      continue_url: 'https://pay.example.com',
    });
  });

  it('still throws by default', async () => {
    const tools = toLangChainTools([ucpErrorTool]);
    await expect(tools[0].call({})).rejects.toThrow();
  });
});

// ─── toOpenAITools / toAnthropicTools / toMCPTools (shape unchanged) ──────────

describe('toOpenAITools catchErrors option does not affect shape', () => {
  it('shape is identical with or without catchErrors', () => {
    const without = toOpenAITools([successTool]);
    const with_ = toOpenAITools([successTool], { catchErrors: true });
    expect(without[0].type).toBe(with_[0].type);
    expect(without[0].function.name).toBe(with_[0].function.name);
  });
});

describe('toAnthropicTools catchErrors option does not affect shape', () => {
  it('shape is identical with or without catchErrors', () => {
    const without = toAnthropicTools([successTool]);
    const with_ = toAnthropicTools([successTool], { catchErrors: true });
    expect(without[0].name).toBe(with_[0].name);
  });
});

describe('toMCPTools catchErrors option does not affect shape', () => {
  it('shape is identical with or without catchErrors', () => {
    const without = toMCPTools([successTool]);
    const with_ = toMCPTools([successTool], { catchErrors: true });
    expect(without[0].name).toBe(with_[0].name);
  });
});
