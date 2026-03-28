import type { AgentTool, JsonSchema } from '../agent-tools.js';
import { type AdapterOptions, safeExecute } from './catch-errors.js';

export type { AgentTool, JsonSchema };

export interface LangChainTool {
  readonly name: string;
  readonly description: string;
  readonly schema: JsonSchema;
  readonly call: (input: Record<string, unknown>) => Promise<string>;
}

export function toLangChainTools(
  agentTools: readonly AgentTool[],
  options?: AdapterOptions,
): readonly LangChainTool[] {
  return agentTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    schema: tool.parameters,
    call: async (input: Record<string, unknown>): Promise<string> => {
      const result = await safeExecute(() => tool.execute(input), options?.catchErrors ?? false);
      return JSON.stringify(result);
    },
  }));
}
