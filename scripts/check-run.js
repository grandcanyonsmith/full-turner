#!/usr/bin/env node
/**
 * Diagnostic script to check run status and Step Functions execution
 */

import { getRun } from '../src/services/database.js';
import { SFNClient, DescribeExecutionCommand } from '@aws-sdk/client-sfn';
import { config } from '../src/config/index.js';

const runId = process.argv[2];

if (!runId) {
  console.error('Usage: node scripts/check-run.js <runId>');
  process.exit(1);
}

async function checkRun() {
  try {
    console.log(`🔍 Checking run: ${runId}\n`);
    
    // Get run from database
    const run = await getRun(runId);
    
    if (!run) {
      console.error(`❌ Run ${runId} not found in database`);
      process.exit(1);
    }
    
    console.log('📊 Run Details:');
    console.log(`   Run ID: ${run.runId}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Timestamp: ${run.timestamp}`);
    console.log(`   Start Time: ${run.startTime || 'N/A'}`);
    console.log(`   End Time: ${run.endTime || 'N/A'}`);
    console.log(`   Template ID: ${run.templateId || 'N/A'}`);
    
    if (run.output && Object.keys(run.output).length > 0) {
      console.log(`\n📝 Output:`);
      console.log(JSON.stringify(run.output, null, 2));
    }
    
    if (run.error) {
      console.log(`\n❌ Error:`);
      console.log(JSON.stringify(run.error, null, 2));
    }
    
    // Check Step Functions execution if metadata exists
    if (run.metadata?.stepFunctionsExecutionArn) {
      const executionArn = run.metadata.stepFunctionsExecutionArn;
      console.log(`\n🔄 Step Functions Execution:`);
      console.log(`   Execution ARN: ${executionArn}`);
      
      const sfnClient = new SFNClient({ region: config.aws.region });
      
      try {
        const command = new DescribeExecutionCommand({ executionArn });
        const execution = await sfnClient.send(command);
        
        console.log(`   Status: ${execution.status}`);
        console.log(`   Start Date: ${execution.startDate || 'N/A'}`);
        console.log(`   Stop Date: ${execution.stopDate || 'N/A'}`);
        
        if (execution.status === 'FAILED') {
          console.log(`\n❌ Execution Failed:`);
          if (execution.error) {
            console.log(`   Error: ${execution.error}`);
          }
          if (execution.cause) {
            console.log(`   Cause: ${execution.cause}`);
          }
        } else if (execution.status === 'RUNNING') {
          console.log(`\n⏳ Execution is still running...`);
        } else if (execution.status === 'SUCCEEDED') {
          console.log(`\n✅ Execution succeeded!`);
        }
        
        console.log(`\nView in AWS Console:`);
        const region = config.aws.region;
        const executionId = executionArn.split(':').pop();
        console.log(`https://console.aws.amazon.com/states/home?region=${region}#/executions/details/${executionArn}`);
        
      } catch (error) {
        console.error(`   ❌ Failed to get execution details: ${error.message}`);
      }
    } else {
      console.log(`\n⚠️  No Step Functions execution ARN found in metadata`);
      console.log(`   This suggests the Step Functions execution never started.`);
      console.log(`   Possible causes:`);
      console.log(`   - STATE_MACHINE_ARN environment variable not set`);
      console.log(`   - Step Functions execution failed to start`);
      console.log(`   - Error occurred before execution could start`);
    }
    
    // Diagnostic recommendations
    console.log(`\n💡 Diagnostic Recommendations:`);
    
    if (run.status === 'pending') {
      console.log(`   ⚠️  Run is stuck in 'pending' status`);
      console.log(`   - Check CloudWatch logs for the workflowApi Lambda`);
      console.log(`   - Verify STATE_MACHINE_ARN is set in Lambda environment`);
      console.log(`   - Check if Step Functions execution was started`);
    } else if (run.status === 'processing') {
      console.log(`   ⏳ Run is processing`);
      console.log(`   - Check Step Functions execution status above`);
      console.log(`   - Check CloudWatch logs for Lambda functions`);
    } else if (run.status === 'failed') {
      console.log(`   ❌ Run failed`);
      console.log(`   - Check error details above`);
      console.log(`   - Check Step Functions execution status`);
      console.log(`   - Review CloudWatch logs`);
    }
    
  } catch (error) {
    console.error('❌ Error checking run:', error);
    process.exit(1);
  }
}

checkRun();

