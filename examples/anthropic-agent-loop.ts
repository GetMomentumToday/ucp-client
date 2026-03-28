import Anthropic from '@anthropic-ai/sdk';
import { UCPClient } from '@omnixhq/ucp-client';
import { getAgentTools } from '@omnixhq/ucp-client/agent-tools';
import { toAnthropicTools, executeAnthropicToolCall } from '@omnixhq/ucp-client/anthropic';

const client = await UCPClient.connect({
  gatewayUrl: 'https://gateway.example.com',
  agentProfileUrl: 'https://agent.example.com/profile.json',
});

const agentTools = getAgentTools(client);
const anthropic = new Anthropic();
const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'Find me some running shoes and create a checkout.' },
];

while (true) {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    tools: toAnthropicTools(agentTools) as Anthropic.Tool[],
    messages,
  });

  if (response.stop_reason !== 'tool_use') {
    console.log(response.content);
    break;
  }

  messages.push({ role: 'assistant', content: response.content });

  const toolResults: Anthropic.ToolResultBlockParam[] = [];
  for (const block of response.content) {
    if (block.type !== 'tool_use') continue;
    const result = await executeAnthropicToolCall(
      agentTools,
      block.name,
      block.input as Record<string, unknown>,
    );
    toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
  }

  messages.push({ role: 'user', content: toolResults });
}
