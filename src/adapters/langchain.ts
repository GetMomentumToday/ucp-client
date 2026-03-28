import type { AgentTool, JsonSchema } from '../agent-tools.js';

export type { AgentTool, JsonSchema };

export interface LangChainTool {
  readonly name: string;
  readonly description: string;
  readonly schema: JsonSchema;
  readonly call: (input: Record<string, unknown>) => Promise<string>;
}

export function toLangChainTools(agentTools: readonly AgentTool[]): readonly LangChainTool[] {
  return agentTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    schema: tool.parameters,
    call: async (input: Record<string, unknown>): Promise<string> => {
      const result = await tool.execute(input);
      return JSON.stringify(result);
    },
  }));
}
