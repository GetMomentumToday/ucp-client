import type { AgentTool, JsonSchema } from '../agent-tools.js';
import { type AdapterOptions, safeExecute } from './catch-errors.js';

export type { AgentTool, JsonSchema };

export interface VercelAIToolDefinition {
  readonly description: string;
  readonly inputSchema: JsonSchema;
  readonly execute: (args: Record<string, unknown>) => Promise<string>;
}

export type VercelAIToolMap = Record<string, VercelAIToolDefinition>;

export function toVercelAITools(
  agentTools: readonly AgentTool[],
  options?: AdapterOptions,
): VercelAIToolMap {
  return Object.fromEntries(
    agentTools.map((tool) => [
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.parameters,
        execute: async (args: Record<string, unknown>): Promise<string> => {
          const result = await safeExecute(() => tool.execute(args), options?.catchErrors ?? false);
          return JSON.stringify(result);
        },
      },
    ]),
  );
}
