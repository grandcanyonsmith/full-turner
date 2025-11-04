/**
 * Lambda Handler: Execute Agent
 * Executes OpenAI agent to rewrite funnel content
 */

import { Runner, user, setDefaultOpenAIKey } from '@openai/agents';
import { createAgent } from '../src/agent/agent.js';
import { config } from '../src/config/index.js';
import { logger, setLogContext } from '../src/utils/logger.js';
import { CostTracker, extractUsageFromResponse } from '../src/utils/costTracker.js';
import { getOpenAIKeyFromAWS } from '../src/services/aws.js';
import { randomUUID } from 'crypto';

/**
 * Lambda handler for executing the agent
 * @param {Object} event - Step Functions event with template and processed images
 * @param {Object} context - Lambda context
 * @returns {Promise<Object>} - Agent execution result
 */
export async function handler(event, context) {
  const requestId = context.requestId || randomUUID();
  setLogContext(requestId, event.runId, event.templateId);

  const costTracker = new CostTracker();
  const startTime = Date.now();

  try {
    const { template, imageUrlKeys, imageMap, input, apiKey } = event;

    // Get API key from event or retrieve from AWS
    let openAIApiKey = apiKey;
    if (!openAIApiKey) {
      logger.info('API key not in event, retrieving from AWS');
      openAIApiKey = await getOpenAIKeyFromAWS();
    }
    setDefaultOpenAIKey(openAIApiKey);

    logger.info('Executing agent', {
      templateId: template.templateId,
      imageCount: imageUrlKeys?.length || 0,
      hasApiKey: !!openAIApiKey
    });

    // Prepare image URL keys and mapping for agent
    const imageUrlKeysText = imageUrlKeys && imageUrlKeys.length > 0 
      ? `\n\n=== IMAGE URL KEYS ===\n${JSON.stringify(imageUrlKeys, null, 2)}\n\n=== PROCESSED IMAGE MAP ===\n${JSON.stringify(imageMap, null, 2)}`
      : "";

    // Ensure brand guide is a string (stringify if object)
    const brandGuideText = typeof template.brandGuideContent === 'string'
      ? template.brandGuideContent
      : JSON.stringify(template.brandGuideContent);
    
    // Ensure template funnel JSON is a string
    const templateFunnelText = typeof template.templateFunnelJson === 'string'
      ? template.templateFunnelJson
      : JSON.stringify(template.templateFunnelJson);
    
    // Combine workflow input with brand guide, template funnel, and processed images
    const combinedInput = `${input || "Please rewrite the funnel JSON according to the brand style guide and avatar provided."}

=== BRAND STYLE GUIDE & AVATAR ===
${brandGuideText}

=== TEMPLATE FUNNEL JSON ===
${templateFunnelText}${imageUrlKeysText}

IMPORTANT: The images identified in image_url_keys have already been processed and redesigned according to brand guidelines. They have been uploaded to S3 and the URLs are provided in the PROCESSED IMAGE MAP above. Use these S3 URLs in your output instead of the original URLs.`;

    logger.debug('Agent input prepared', {
      inputLength: combinedInput.length
    });

    const conversationHistory = [user(combinedInput)];

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: config.workflow.traceSource,
        workflow_id: config.workflow.workflowId
      }
    });

    logger.info('Starting agent execution');

    const LOCAL_TEST = process.env.LOCAL_TEST === 'true';
    let agentResult;
    
    if (LOCAL_TEST) {
      // Mock agent result for local testing
      logger.info('[LOCAL TEST] Mocking agent execution');
      agentResult = {
        finalOutput: JSON.stringify({
          funnel_json: JSON.parse(template.templateFunnelJson),
          asset_map: imageMap ? Object.values(imageMap).map(img => ({
            original_url: img.originalUrl,
            s3_url: img.s3Url,
            transform_notes: `[LOCAL TEST] Mock transformation for ${img.s3Url}`
          })) : [],
          notes: ['[LOCAL TEST] This is a mock response'],
          problems: []
        }, null, 2),
        reasoning: '[LOCAL TEST] Mock reasoning output',
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          reasoning_tokens: 200,
          total_tokens: 1700
        }
      };
    } else {
      const agent = createAgent();
      agentResult = await runner.run(agent, conversationHistory);
    }

    const executionTime = Date.now() - startTime;

    // Extract usage and calculate cost
    // Note: The agent result may not include usage directly
    // We'll need to track this from the OpenAI API responses
    // For now, we'll estimate or extract from response metadata
    if (agentResult.usage) {
      const usage = extractUsageFromResponse({ usage: agentResult.usage });
      costTracker.addTextGeneration(
        config.openai.model,
        usage.inputTokens,
        usage.outputTokens,
        usage.reasoningTokens
      );
    }

    const costSummary = costTracker.getSummary();

    logger.info('Agent execution completed', {
      duration: executionTime,
      cost: costSummary.agent.cost
    });

    logger.cost('agent_execution', costSummary.agent.cost, {
      model: config.openai.model,
      tokens: costSummary.agent.tokens
    });

    if (!agentResult.finalOutput) {
      throw new Error("Agent result is undefined");
    }

    return {
      ...event,
      output: agentResult.finalOutput,
      reasoning: agentResult.reasoning,
      usage: agentResult.usage,
      cost: costSummary.agent,
      executionTime
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Agent execution failed', error, {
      duration: executionTime
    });
    throw error;
  }
}

