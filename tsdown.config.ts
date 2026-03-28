import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/adapters/openai.ts',
    'src/adapters/anthropic.ts',
    'src/adapters/vercel-ai.ts',
    'src/adapters/langchain.ts',
    'src/adapters/mcp.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
});
