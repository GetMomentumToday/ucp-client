import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { UCPClient } from '@omnixhq/ucp-client';
import { getAgentTools } from '@omnixhq/ucp-client/agent-tools';
import { toLangChainTools } from '@omnixhq/ucp-client/langchain';

const ucpClient = await UCPClient.connect({
  gatewayUrl: 'https://gateway.example.com',
  agentProfileUrl: 'https://agent.example.com/profile.json',
});

const agentTools = getAgentTools(ucpClient);
const langchainDescriptors = toLangChainTools(agentTools);

// Wrap each descriptor in a DynamicStructuredTool that LangChain can execute.
const tools = langchainDescriptors.map(
  (t) =>
    new DynamicStructuredTool({
      name: t.name,
      description: t.description,
      schema: z.object({}).passthrough(),
      func: (input: Record<string, unknown>) => t.call(input),
    }),
);

const model = new ChatOpenAI({ model: 'gpt-4o' });
const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful shopping assistant.'],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
]);

const agent = await createOpenAIToolsAgent({ llm: model, tools, prompt });
const executor = new AgentExecutor({ agent, tools });

const result = await executor.invoke({ input: 'Find running shoes and start a checkout.' });
console.log(result.output);
