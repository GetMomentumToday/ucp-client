import type { AgentTool, JsonSchema } from '../agent-tools.js';
import { type AdapterOptions, safeExecute } from './catch-errors.js';

export type { AgentTool, JsonSchema };

// Minimal Standard Schema v1 + JSON Schema v1 interfaces (https://standardschema.dev).
// Vercel AI SDK's FlexibleSchema requires both StandardSchemaV1 (validate) and
// StandardJSONSchemaV1 (jsonSchema converter) — no external deps needed.
export interface VercelAISchema {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => { readonly value: unknown; readonly issues?: undefined };
    readonly jsonSchema: {
      readonly input: (options: { readonly target: string }) => Record<string, unknown>;
      readonly output: (options: { readonly target: string }) => Record<string, unknown>;
    };
  };
}

export interface VercelAIToolDefinition {
  readonly description: string;
  readonly inputSchema: VercelAISchema;
  readonly execute: (args: Record<string, unknown>) => Promise<string>;
}

export type VercelAIToolMap = Record<string, VercelAIToolDefinition>;

function wrapSchema(schema: JsonSchema): VercelAISchema {
  return {
    '~standard': {
      version: 1,
      vendor: 'ucp-client',
      validate: (value) => ({ value }),
      jsonSchema: {
        input: () => schema as unknown as Record<string, unknown>,
        output: () => schema as unknown as Record<string, unknown>,
      },
    },
  };
}

export function toVercelAITools(
  agentTools: readonly AgentTool[],
  options?: AdapterOptions,
): VercelAIToolMap {
  return Object.fromEntries(
    agentTools.map((tool) => [
      tool.name,
      {
        description: tool.description,
        inputSchema: wrapSchema(tool.parameters),
        execute: async (args: Record<string, unknown>): Promise<string> => {
          const result = await safeExecute(() => tool.execute(args), options?.catchErrors ?? false);
          return JSON.stringify(result);
        },
      },
    ]),
  );
}
