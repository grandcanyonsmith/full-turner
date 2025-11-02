/**
 * Lambda Handler: Initialize Run
 * Creates a new processing run record in DynamoDB
 */

import { createRun } from '../src/services/database.js';
import { logger, setLogContext } from '../src/utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Lambda handler for initializing a run
 * @param {Object} event - Step Functions event
 * @param {Object} context - Lambda context
 * @returns {Promise<Object>} - Run initialization result
 */
export async function handler(event, context) {
  const requestId = context.requestId || randomUUID();
  setLogContext(requestId);

  try {
    logger.info('Initializing processing run', {
      templateId: event.templateId,
      templateVersion: event.templateVersion
    });

    const run = await createRun({
      templateId: event.templateId,
      templateVersion: event.templateVersion || 'latest',
      input: event.input || {},
      metadata: {
        initiatedBy: event.initiatedBy || 'system',
        source: event.source || 'step-functions'
      }
    });

    logger.info('Run initialized successfully', {
      runId: run.runId
    });

    return {
      runId: run.runId,
      timestamp: run.timestamp,
      status: run.status,
      ...event // Pass through original event data
    };
  } catch (error) {
    logger.error('Failed to initialize run', error, { event });
    throw error;
  }
}

