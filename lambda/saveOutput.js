/**
 * Lambda Handler: Save Output
 * Saves final output and updates run status in DynamoDB
 */

import { updateRunStatus, saveOutputLog } from '../src/services/database.js';
import { logger, setLogContext } from '../src/utils/logger.js';
import { aggregateCosts } from '../src/utils/costTracker.js';
import { randomUUID } from 'crypto';

/**
 * Lambda handler for saving output
 * @param {Object} event - Step Functions event with output and cost data
 * @param {Object} context - Lambda context
 * @returns {Promise<Object>} - Save result
 */
export async function handler(event, context) {
  const requestId = context.requestId || randomUUID();
  setLogContext(requestId, event.runId, event.templateId);

  try {
    const { runId, timestamp, output, cost, imageProcessingResults, executionTime } = event;

    logger.info('Saving output', { runId });

    // Aggregate costs from all sources
    const totalCost = aggregateCosts({
      agentCost: cost?.agent?.cost || 0,
      imageCost: cost?.images?.cost || 0,
      details: {
        agent: cost?.agent || {},
        images: cost?.images || {}
      }
    });

    // Update run status
    await updateRunStatus(runId, timestamp, {
      status: 'completed',
      output: {
        output_text: output,
        timestamp: new Date().toISOString()
      },
      cost: totalCost,
      imageProcessingResults: imageProcessingResults || [],
      endTime: new Date().toISOString(),
      duration: executionTime || 0
    });

    // Save output log
    await saveOutputLog(
      runId,
      'agent_output',
      'info',
      'Agent execution completed successfully',
      {
        output_length: output?.length || 0,
        cost: totalCost.total
      },
      requestId
    );

    logger.info('Output saved successfully', {
      runId,
      totalCost: totalCost.total,
      outputLength: output?.length || 0
    });

    logger.cost('total_run_cost', totalCost.total, {
      agent: totalCost.agent,
      image: totalCost.image,
      details: totalCost.details
    });

    return {
      runId,
      status: 'completed',
      cost: totalCost,
      saved: true
    };
  } catch (error) {
    logger.error('Failed to save output', error, { event });
    throw error;
  }
}

