import OpenAI from 'openai';
import { UCPClient } from '@omnixhq/ucp-client';
import { getAgentTools } from '@omnixhq/ucp-client/agent-tools';
import { toOpenAITools, executeOpenAIToolCall } from '@omnixhq/ucp-client/openai';

const client = await UCPClient.connect({
  gatewayUrl: 'https://gateway.example.com',
  agentProfileUrl: 'https://agent.example.com/profile.json',
});

const agentTools = getAgentTools(client);
const openai = new OpenAI();
const messages: OpenAI.ChatCompletionMessageParam[] = [
  { role: 'user', content: 'Find me some running shoes under $100.' },
];

while (true) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    tools: toOpenAITools(agentTools) as OpenAI.ChatCompletionTool[],
    tool_choice: 'auto',
  });

  const message = response.choices[0].message;
  messages.push(message);

  if (!message.tool_calls?.length) break;

  for (const call of message.tool_calls) {
    const result = await executeOpenAIToolCall(
      agentTools,
      call.function.name,
      JSON.parse(call.function.arguments) as Record<string, unknown>,
    );
    messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: JSON.stringify(result),
    });
  }
}

console.log(messages.at(-1));
