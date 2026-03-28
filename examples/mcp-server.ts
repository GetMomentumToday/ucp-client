import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { UCPClient } from '@omnixhq/ucp-client';
import { getAgentTools } from '@omnixhq/ucp-client/agent-tools';
import { toMCPTools, executeMCPToolCall } from '@omnixhq/ucp-client/mcp';

const ucpClient = await UCPClient.connect({
  gatewayUrl: process.env.GATEWAY_URL!,
  agentProfileUrl: process.env.AGENT_PROFILE_URL!,
});

const agentTools = getAgentTools(ucpClient);
const mcpToolList = toMCPTools(agentTools);

const server = new Server(
  { name: 'ucp-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: mcpToolList,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const result = await executeMCPToolCall(
    agentTools,
    request.params.name,
    (request.params.arguments ?? {}) as Record<string, unknown>,
  );
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
