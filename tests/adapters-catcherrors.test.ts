import { describe, it, expect, beforeAll } from 'vitest';
import type { AgentTool } from '../src/agent-tools.js';
import { UCPClient } from '../src/UCPClient.js';
import { UCPError } from '../src/errors.js';
import { executeOpenAIToolCall } from '../src/adapters/openai.js';
import { executeAnthropicToolCall } from '../src/adapters/anthropic.js';
import { executeMCPToolCall } from '../src/adapters/mcp.js';
import { toVercelAITools } from '../src/adapters/vercel-ai.js';
import { toLangChainTools } from '../src/adapters/langchain.js';

const GATEWAY_URL = process.env['GATEWAY_URL'] ?? 'http://localhost:3002';
const AGENT_PROFILE = 'https://test-agent.example.com/.well-known/ucp';

const errorTool: AgentTool = {
  name: 'error_tool',
  description: 'Always throws a UCPError',
  parameters: { type: 'object' },
  execute: () => Promise.reject(new UCPError('OUT_OF_STOCK', 'Item unavailable')),
};

describe.skipIf(process.env['INTEGRATION'] !== 'true')('adapter catchErrors — mock server', () => {
  let agentTools: readonly AgentTool[];
  let toolsWithError: AgentTool[];

  beforeAll(async () => {
    const client = await UCPClient.connect({
      gatewayUrl: GATEWAY_URL,
      agentProfileUrl: AGENT_PROFILE,
    });
    agentTools = client.getAgentTools();
    toolsWithError = [...agentTools, errorTool];
  });

  // ─── executeOpenAIToolCall ─────────────────────────────────────────────────

  describe('executeOpenAIToolCall', () => {
    it('returns result for a real tool call', async () => {
      const result = await executeOpenAIToolCall(
        agentTools,
        'create_checkout',
        {},
        { catchErrors: true },
      );
      expect(result).toBeDefined();
    });

    it('returns { error } instead of throwing when catchErrors is true', async () => {
      const result = await executeOpenAIToolCall(
        toolsWithError,
        'error_tool',
        {},
        {
          catchErrors: true,
        },
      );
      expect(result).toEqual({ error: 'OUT_OF_STOCK: Item unavailable' });
    });

    it('throws when catchErrors is false (default)', async () => {
      await expect(executeOpenAIToolCall(toolsWithError, 'error_tool', {})).rejects.toBeInstanceOf(
        UCPError,
      );
    });
  });

  // ─── executeAnthropicToolCall ──────────────────────────────────────────────

  describe('executeAnthropicToolCall', () => {
    it('returns result for a real tool call', async () => {
      const result = await executeAnthropicToolCall(
        agentTools,
        'create_checkout',
        {},
        { catchErrors: true },
      );
      expect(result).toBeDefined();
    });

    it('returns { error } instead of throwing when catchErrors is true', async () => {
      const result = await executeAnthropicToolCall(
        toolsWithError,
        'error_tool',
        {},
        {
          catchErrors: true,
        },
      );
      expect(result).toEqual({ error: 'OUT_OF_STOCK: Item unavailable' });
    });

    it('throws when catchErrors is false (default)', async () => {
      await expect(
        executeAnthropicToolCall(toolsWithError, 'error_tool', {}),
      ).rejects.toBeInstanceOf(UCPError);
    });
  });

  // ─── executeMCPToolCall ────────────────────────────────────────────────────

  describe('executeMCPToolCall', () => {
    it('returns result for a real tool call', async () => {
      const result = await executeMCPToolCall(
        agentTools,
        'create_checkout',
        {},
        { catchErrors: true },
      );
      expect(result).toBeDefined();
    });

    it('returns { error } instead of throwing when catchErrors is true', async () => {
      const result = await executeMCPToolCall(
        toolsWithError,
        'error_tool',
        {},
        {
          catchErrors: true,
        },
      );
      expect(result).toEqual({ error: 'OUT_OF_STOCK: Item unavailable' });
    });

    it('throws when catchErrors is false (default)', async () => {
      await expect(executeMCPToolCall(toolsWithError, 'error_tool', {})).rejects.toBeInstanceOf(
        UCPError,
      );
    });
  });

  // ─── toVercelAITools ───────────────────────────────────────────────────────

  describe('toVercelAITools', () => {
    it('returns JSON result for a real tool call', async () => {
      const tools = toVercelAITools(agentTools, { catchErrors: true });
      const result = await tools['create_checkout']!.execute({});
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('returns JSON { error } instead of throwing when catchErrors is true', async () => {
      const tools = toVercelAITools(toolsWithError, { catchErrors: true });
      const result = await tools['error_tool']!.execute({});
      expect(JSON.parse(result)).toEqual({ error: 'OUT_OF_STOCK: Item unavailable' });
    });

    it('throws when catchErrors is false (default)', async () => {
      const tools = toVercelAITools(toolsWithError);
      await expect(tools['error_tool']!.execute({})).rejects.toBeInstanceOf(UCPError);
    });
  });

  // ─── toLangChainTools ──────────────────────────────────────────────────────

  describe('toLangChainTools', () => {
    it('returns JSON result for a real tool call', async () => {
      const tools = toLangChainTools(agentTools, { catchErrors: true });
      const searchTool = tools.find((t) => t.name === 'create_checkout')!;
      const result = await searchTool.call({});
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('returns JSON { error } instead of throwing when catchErrors is true', async () => {
      const tools = toLangChainTools(toolsWithError, { catchErrors: true });
      const tool = tools.find((t) => t.name === 'error_tool')!;
      const result = await tool.call({});
      expect(JSON.parse(result)).toEqual({ error: 'OUT_OF_STOCK: Item unavailable' });
    });

    it('throws when catchErrors is false (default)', async () => {
      const tools = toLangChainTools(toolsWithError);
      const tool = tools.find((t) => t.name === 'error_tool')!;
      await expect(tool.call({})).rejects.toBeInstanceOf(UCPError);
    });
  });
});
