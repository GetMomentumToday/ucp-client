import type { AgentTool, JsonSchema } from '../agent-tools.js';
import { type AdapterOptions, safeExecute } from './catch-errors.js';

export type { AgentTool, JsonSchema };

export interface MCPInputSchema {
  readonly type: 'object';
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly required?: readonly string[];
  readonly description?: string;
}

export interface MCPTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: MCPInputSchema & JsonSchema;
}

export function toMCPTools(
  agentTools: readonly AgentTool[],
  // accepted for API symmetry with executeMCPToolCall; catchErrors only applies at call time
  _options?: AdapterOptions,
): readonly MCPTool[] {
  return agentTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: { ...tool.parameters, type: 'object' as const },
  }));
}

export async function executeMCPToolCall(
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
