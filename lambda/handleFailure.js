/**
 * Lambda Handler: Handle Failure
 * Handles errors and updates run status
 */

import { updateRunStatus, saveOutputLog } from '../src/services/database.js';
import { logger, setLogContext } from '../src/utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Lambda handler for handling failures
 * @param {Object} event - Step Functions error event
 * @param {Object} context - Lambda context
 * @returns {Promise<Object>} - Error handling result
 */
export async function handler(event, context) {
  const requestId = context.requestId || randomUUID();
  setLogContext(requestId, event.runId, event.templateId);

  try {
    const { runId, timestamp, error, cause } = event;

    logger.error('Handling failure', new Error(error || cause), {
      runId,
      errorType: event.Error || 'Unknown',
      cause: cause || error
    });

    // Update run status to failed
    if (runId && timestamp) {
      await updateRunStatus(runId, timestamp, {
        status: 'failed',
        error: {
          message: error || cause || 'Unknown error',
          type: event.Error || 'Unknown',
          timestamp: new Date().toISOString(),
          cause: cause || error
        },
        endTime: new Date().toISOString()
      });

      // Save error log
      await saveOutputLog(
        runId,
        'error',
        'error',
        `Processing failed: ${error || cause || 'Unknown error'}`,
        {
          errorType: event.Error,
          cause: cause || error,
          step: event.step || 'unknown'
        },
        requestId
      );
    }

    logger.warn('Failure handled', {
      runId,
      error: error || cause
    });

    return {
      runId,
      status: 'failed',
      error: error || cause,
      handled: true
    };
  } catch (handlerError) {
    logger.error('Failed to handle failure', handlerError, { event });
    // Don't throw - we want to return error info even if logging fails
    return {
      status: 'failed',
      error: handlerError.message,
      handled: false
    };
  }
}

