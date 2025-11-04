/**
 * Lambda Handler: Process Workflow
 * Invoked by Step Functions to execute the actual workflow
 */

import { runWorkflow } from '../src/agent/workflow.js';
import { getOpenAIKeyFromAWS } from '../src/services/aws.js';
import { getRun, updateRunStatus } from '../src/services/database.js';
import { getBrandGuide, getFunnelTemplate } from '../src/services/database.js';
import { logger, setLogContext } from '../src/utils/logger.js';
import { setDefaultOpenAIKey } from '@openai/agents';
import { randomUUID } from 'crypto';

/**
 * Lambda handler for Step Functions workflow execution
 * @param {Object} event - Step Functions event (contains runId, timestamp, brandGuide, templateFunnel, etc.)
 * @param {Object} context - Lambda context
 * @returns {Promise<Object>} - Workflow result
 */
export async function handler(event, context) {
  const requestId = context.requestId || randomUUID();
  setLogContext(requestId, event.runId, event.templateId);

  try {
    logger.info('Processing workflow from Step Functions', {
      runId: event.runId,
      timestamp: event.timestamp,
      hasBrandGuide: !!event.brandGuide,
      hasTemplateFunnel: !!event.templateFunnel
    });

    // Get or fetch brand guide and template funnel
    let brandGuide = event.brandGuide;
    let templateFunnel = event.templateFunnel;

    // If not provided in event, fetch from database
    if (!brandGuide && event.input?.brandGuideId) {
      logger.info('Fetching brand guide from database', { brandGuideId: event.input.brandGuideId });
      const brandGuideRecord = await getBrandGuide(event.input.brandGuideId);
      if (brandGuideRecord) {
        // Use brandGuideJson if available, otherwise fall back to content
        if (brandGuideRecord.brandGuideJson) {
          brandGuide = brandGuideRecord.brandGuideJson;
        } else {
          brandGuide = brandGuideRecord.content;
        }
      }
    }

    if (!templateFunnel && event.input?.funnelTemplateId) {
      logger.info('Fetching funnel template from database', { funnelTemplateId: event.input.funnelTemplateId });
      const funnelTemplateRecord = await getFunnelTemplate(event.input.funnelTemplateId);
      if (funnelTemplateRecord) {
        templateFunnel = funnelTemplateRecord.funnelJson;
      }
    }

    if (!brandGuide || !templateFunnel) {
      throw new Error('Missing brandGuide or templateFunnel');
    }

    // Ensure templateFunnel is a string
    if (typeof templateFunnel === 'object') {
      templateFunnel = JSON.stringify(templateFunnel);
    }

    // Get OpenAI API key
    logger.info('Fetching OpenAI API key');
    const apiKey = await getOpenAIKeyFromAWS();
    setDefaultOpenAIKey(apiKey);

    // Prepare workflow input
    const workflowInput = {
      input_as_text: event.input?.input_as_text || event.input_as_text || 'Please rewrite the funnel JSON according to the brand style guide and avatar provided.',
      brandGuide,
      templateFunnel
    };

    // Execute workflow
    logger.info('Starting workflow execution');
    const result = await runWorkflow(workflowInput, apiKey);

    logger.info('Workflow completed successfully', {
      outputLength: result.output_text?.length || 0
    });

    return {
      success: true,
      output_text: result.output_text,
      image_processing_stats: result.image_processing_stats || {}
    };
  } catch (error) {
    logger.error('Workflow execution failed', error, {
      runId: event.runId,
      timestamp: event.timestamp
    });

    // Update run status to failed
    if (event.runId && event.timestamp) {
      await updateRunStatus(event.runId, event.timestamp, {
        status: 'failed',
        error: error.message,
        endTime: new Date().toISOString()
      }).catch(err => {
        logger.error('Failed to update run status', err);
      });
    }

    throw error;
  }
}

