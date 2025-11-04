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

    // Use cost structure from CostTracker.getSummary() if available, otherwise aggregate
    let finalCost;
    if (cost && (cost.agent?.cost !== undefined || cost.images?.cost !== undefined)) {
      // Already in the correct nested structure from CostTracker
      finalCost = {
        total: cost.total || (cost.agent?.cost || 0) + (cost.images?.cost || 0),
        agent: cost.agent || { cost: 0, tokens: {} },
        images: cost.images || { cost: 0, imagesGenerated: 0 }
      };
    } else {
      // Fallback to aggregateCosts for backward compatibility
      finalCost = aggregateCosts({
        agentCost: cost?.agent?.cost || cost?.agent || 0,
        imageCost: cost?.images?.cost || cost?.image || 0,
        details: {
          agent: cost?.agent || {},
          images: cost?.images || {}
        }
      });
      // Convert flat structure to nested structure for frontend
      finalCost = {
        total: finalCost.total,
        agent: {
          cost: finalCost.agent,
          tokens: finalCost.details?.agent?.tokens || {}
        },
        images: {
          cost: finalCost.image,
          imagesGenerated: finalCost.details?.images?.imagesGenerated || 0
        }
      };
    }

    // Update run status
    await updateRunStatus(runId, timestamp, {
      status: 'completed',
      output: {
        output_text: output,
        timestamp: new Date().toISOString()
      },
      cost: finalCost,
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
        cost: finalCost.total
      },
      requestId
    );

    logger.info('Output saved successfully', {
      runId,
      totalCost: finalCost.total,
      outputLength: output?.length || 0
    });

    logger.cost('total_run_cost', finalCost.total, {
      agent: finalCost.agent?.cost || finalCost.agent,
      image: finalCost.images?.cost || finalCost.image,
      details: {
        agent: finalCost.agent,
        images: finalCost.images
      }
    });

    return {
      runId,
      status: 'completed',
      cost: finalCost,
      saved: true
    };
  } catch (error) {
    logger.error('Failed to save output', error, { event });
    throw error;
  }
}

