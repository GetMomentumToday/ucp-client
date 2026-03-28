import type { AgentTool, JsonSchema } from '../agent-tools.js';
import { type AdapterOptions, safeExecute } from './catch-errors.js';

export type { AgentTool, JsonSchema };

export interface OpenAIFunction {
  readonly name: string;
  readonly description: string;
  readonly parameters: JsonSchema;
}

export interface OpenAITool {
  readonly type: 'function';
  readonly function: OpenAIFunction;
}

export function toOpenAITools(
  agentTools: readonly AgentTool[],
  // accepted for API symmetry with executeOpenAIToolCall; catchErrors only applies at call time
  _options?: AdapterOptions,
): readonly OpenAITool[] {
  return agentTools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export async function executeOpenAIToolCall(
  agentTools: readonly AgentTool[],
  toolName: string,
  toolInput: Record<string, unknown>,
  options?: AdapterOptions,
): Promise<unknown> {
  return safeExecute(() => {
    const tool = agentTools.find((t) => t.name === toolName);
    if (!tool) throw new Error(`Tool not found: ${toolName}`);
    return tool.execute(toolInput);
  }, options?.catchErrors ?? false);
}
