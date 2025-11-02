#!/usr/bin/env node
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

// Enable LOCAL_TEST mode to stub AWS/OpenAI calls
process.env.LOCAL_TEST = 'true';

const funcs = {
  InitializeRunFunction: async (event) => {
    const mod = await import('../lambda/initializeRun.js');
    return await mod.handler(event, { requestId: randomUUID() });
  },
  LoadTemplateFunction: async (event) => {
    const mod = await import('../lambda/loadTemplate.js');
    return await mod.handler(event, { requestId: randomUUID() });
  },
  ProcessImagesBatchFunction: async (event) => {
    const mod = await import('../lambda/processImagesBatch.js');
    return await mod.handler(event, { requestId: randomUUID() });
  },
  AggregateImageResultsFunction: async (event) => {
    const mod = await import('../lambda/processImagesBatch.js');
    return await mod.aggregateResults(event, { requestId: randomUUID() });
  },
  ProcessImageFunction: async (event) => {
    const mod = await import('../lambda/processImage.js');
    return await mod.handler(event, { requestId: randomUUID() });
  },
  ExecuteAgentFunction: async (event) => {
    const mod = await import('../lambda/executeAgent.js');
    return await mod.handler(event, { requestId: randomUUID() });
  },
  SaveOutputFunction: async (event) => {
    const mod = await import('../lambda/saveOutput.js');
    return await mod.handler(event, { requestId: randomUUID() });
  },
  HandleFailureFunction: async (event) => {
    const mod = await import('../lambda/handleFailure.js');
    return await mod.handler(event, { requestId: randomUUID() });
  }
};

async function main() {
  const [ , , functionName, eventPath ] = process.argv;
  if (!functionName || !eventPath) {
    console.error('Usage: node scripts/invoke-local.js <FunctionLogicalId> <event.json>');
    process.exit(1);
  }
  if (!funcs[functionName]) {
    console.error(`Unknown function: ${functionName}`);
    console.error(`Available: ${Object.keys(funcs).join(', ')}`);
    process.exit(1);
  }
  const event = JSON.parse(readFileSync(eventPath, 'utf-8'));
  try {
    const result = await funcs[functionName](event);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Invocation failed:', err?.message || err);
    process.exit(2);
  }
}

main();
