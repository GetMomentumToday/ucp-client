// Next.js App Router route handler: app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { UCPClient } from '@omnixhq/ucp-client';
import { getAgentTools } from '@omnixhq/ucp-client/agent-tools';
import { toVercelAITools } from '@omnixhq/ucp-client/vercel-ai';

const ucpClient = await UCPClient.connect({
  gatewayUrl: process.env.GATEWAY_URL!,
  agentProfileUrl: process.env.AGENT_PROFILE_URL!,
});

const agentTools = getAgentTools(ucpClient);
const tools = toVercelAITools(agentTools);

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: unknown[] };

  const result = streamText({
    model: openai('gpt-4o'),
    messages: messages as Parameters<typeof streamText>[0]['messages'],
    tools,
    maxSteps: 10,
  });

  return result.toDataStreamResponse();
}
