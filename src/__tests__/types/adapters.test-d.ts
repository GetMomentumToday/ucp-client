import { expectTypeOf, describe, it } from 'vitest';
import type { OpenAITool, OpenAIFunction } from '../../adapters/openai.js';
import type { AnthropicTool, AnthropicInputSchema } from '../../adapters/anthropic.js';
import type { VercelAIToolMap, VercelAIToolDefinition } from '../../adapters/vercel-ai.js';
import type { LangChainTool } from '../../adapters/langchain.js';
import type { MCPTool, MCPInputSchema } from '../../adapters/mcp.js';
import type { JsonSchema } from '../../agent-tools.js';
import { toOpenAITools, executeOpenAIToolCall } from '../../adapters/openai.js';
import { toAnthropicTools, executeAnthropicToolCall } from '../../adapters/anthropic.js';
import { toVercelAITools } from '../../adapters/vercel-ai.js';
import { toLangChainTools } from '../../adapters/langchain.js';
import { toMCPTools, executeMCPToolCall } from '../../adapters/mcp.js';
import type { AgentTool } from '../../agent-tools.js';

describe('OpenAI adapter types', () => {
  it('toOpenAITools returns readonly OpenAITool array', () => {
    expectTypeOf(toOpenAITools).returns.toEqualTypeOf<readonly OpenAITool[]>();
  });

  it('executeOpenAIToolCall returns Promise<unknown>', () => {
    expectTypeOf(executeOpenAIToolCall).returns.toEqualTypeOf<Promise<unknown>>();
  });

  it('OpenAITool.type is literal "function"', () => {
    expectTypeOf<OpenAITool['type']>().toEqualTypeOf<'function'>();
  });

  it('OpenAIFunction has name, description, parameters', () => {
    expectTypeOf<OpenAIFunction>().toMatchTypeOf<{
      readonly name: string;
      readonly description: string;
      readonly parameters: JsonSchema;
    }>();
  });
});

describe('Anthropic adapter types', () => {
  it('toAnthropicTools returns readonly AnthropicTool array', () => {
    expectTypeOf(toAnthropicTools).returns.toEqualTypeOf<readonly AnthropicTool[]>();
  });

  it('executeAnthropicToolCall returns Promise<unknown>', () => {
    expectTypeOf(executeAnthropicToolCall).returns.toEqualTypeOf<Promise<unknown>>();
  });

  it('AnthropicTool has input_schema (not parameters)', () => {
    expectTypeOf<AnthropicTool>().toMatchTypeOf<{
      readonly name: string;
      readonly description: string;
      readonly input_schema: AnthropicInputSchema & JsonSchema;
    }>();
  });
});

describe('Vercel AI adapter types', () => {
  it('toVercelAITools returns VercelAIToolMap (Record)', () => {
    expectTypeOf(toVercelAITools).returns.toEqualTypeOf<VercelAIToolMap>();
  });

  it('VercelAIToolDefinition execute returns Promise<string>', () => {
    expectTypeOf<VercelAIToolDefinition['execute']>().returns.toEqualTypeOf<Promise<string>>();
  });

  it('VercelAIToolDefinition uses inputSchema (not parameters)', () => {
    expectTypeOf<VercelAIToolDefinition>().toMatchTypeOf<{
      readonly description: string;
      readonly inputSchema: JsonSchema;
    }>();
  });
});

describe('LangChain adapter types', () => {
  it('toLangChainTools returns readonly LangChainTool array', () => {
    expectTypeOf(toLangChainTools).returns.toEqualTypeOf<readonly LangChainTool[]>();
  });

  it('LangChainTool call returns Promise<string>', () => {
    expectTypeOf<LangChainTool['call']>().returns.toEqualTypeOf<Promise<string>>();
  });

  it('LangChainTool uses schema (not parameters or input_schema)', () => {
    expectTypeOf<LangChainTool>().toMatchTypeOf<{
      readonly schema: JsonSchema;
    }>();
  });
});

describe('MCP adapter types', () => {
  it('toMCPTools returns readonly MCPTool array', () => {
    expectTypeOf(toMCPTools).returns.toEqualTypeOf<readonly MCPTool[]>();
  });

  it('executeMCPToolCall returns Promise<unknown>', () => {
    expectTypeOf(executeMCPToolCall).returns.toEqualTypeOf<Promise<unknown>>();
  });

  it('MCPTool uses inputSchema (not parameters)', () => {
    expectTypeOf<MCPTool>().toMatchTypeOf<{
      readonly name: string;
      readonly description: string;
      readonly inputSchema: MCPInputSchema & JsonSchema;
    }>();
  });
});

describe('Adapter input types', () => {
  it('all adapters accept readonly AgentTool array', () => {
    expectTypeOf(toOpenAITools).parameter(0).toEqualTypeOf<readonly AgentTool[]>();
    expectTypeOf(toAnthropicTools).parameter(0).toEqualTypeOf<readonly AgentTool[]>();
    expectTypeOf(toVercelAITools).parameter(0).toEqualTypeOf<readonly AgentTool[]>();
    expectTypeOf(toLangChainTools).parameter(0).toEqualTypeOf<readonly AgentTool[]>();
    expectTypeOf(toMCPTools).parameter(0).toEqualTypeOf<readonly AgentTool[]>();
  });
});
