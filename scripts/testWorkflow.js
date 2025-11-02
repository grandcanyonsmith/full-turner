#!/usr/bin/env node
/**
 * Script to start a Step Functions execution for testing
 */

import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { config } from '../src/config/index.js';

const stateMachineArn = process.env.STATE_MACHINE_ARN || process.argv[2];

if (!stateMachineArn) {
  console.error('Error: State Machine ARN required');
  console.log('Usage: node scripts/testWorkflow.js <state-machine-arn>');
  console.log('Or set STATE_MACHINE_ARN environment variable');
  process.exit(1);
}

async function startExecution() {
  const client = new SFNClient({ region: config.aws.region });

  const input = {
    templateId: 'test-template-1',
    templateVersion: 'latest',
    input: {
      input_as_text: 'Please rewrite the funnel JSON according to the brand style guide and avatar provided.'
    }
  };

  console.log('Starting Step Functions execution...');
  console.log(`State Machine ARN: ${stateMachineArn}`);
  console.log(`Input:`, JSON.stringify(input, null, 2));
  console.log();

  try {
    const command = new StartExecutionCommand({
      stateMachineArn,
      input: JSON.stringify(input),
      name: `test-run-${Date.now()}`
    });

    const result = await client.send(command);

    console.log('✅ Execution started successfully:');
    console.log(`   Execution ARN: ${result.executionArn}`);
    console.log(`   Start Date: ${result.startDate}`);
    console.log();
    console.log(`Monitor execution at:`);
    console.log(`https://console.aws.amazon.com/states/home?region=${config.aws.region}#/executions/details/${result.executionArn}`);

    return result;
  } catch (error) {
    console.error('❌ Failed to start execution:', error);
    throw error;
  }
}

startExecution()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

