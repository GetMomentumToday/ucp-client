import type { AgentTool, JsonSchema } from '../agent-tools.js';

export type { AgentTool, JsonSchema };

export interface VercelAIToolDefinition {
  readonly description: string;
  readonly parameters: JsonSchema;
  readonly execute: (args: Record<string, unknown>) => Promise<string>;
}

export type VercelAIToolMap = Record<string, VercelAIToolDefinition>;

export function toVercelAITools(agentTools: readonly AgentTool[]): VercelAIToolMap {
  return Object.fromEntries(
    agentTools.map((tool) => [
      tool.name,
      {
        description: tool.description,
        parameters: tool.parameters,
        execute: async (args: Record<string, unknown>): Promise<string> => {
          const result = await tool.execute(args);
          return JSON.stringify(result);
        },
      },
    ]),
  );
}
