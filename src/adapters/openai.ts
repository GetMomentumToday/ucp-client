import type { AgentTool, JsonSchema } from '../agent-tools.js';

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

export function toOpenAITools(agentTools: readonly AgentTool[]): readonly OpenAITool[] {
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
): Promise<unknown> {
  const tool = agentTools.find((t) => t.name === toolName);
  if (!tool) {
    throw new Error(`Tool not found: ${toolName}`);
  }
  return tool.execute(toolInput);
}
