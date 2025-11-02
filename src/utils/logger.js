/**
 * Structured Logging Utility
 * Provides CloudWatch Logs compatible structured logging
 */

import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { config } from '../config/index.js';
import { randomUUID } from 'crypto';

const cloudWatchClient = new CloudWatchLogsClient({ region: config.aws.region });

// Log levels
export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

// Log group name (can be overridden via environment)
const LOG_GROUP_NAME = process.env.LOG_GROUP_NAME || '/aws/lambda/full-turner';

// Request ID for correlation (set per request)
let currentRequestId = null;
let currentRunId = null;
let currentTemplateId = null;

/**
 * Set context for logging
 * @param {string} requestId - Request ID
 * @param {string} runId - Run ID
 * @param {string} templateId - Template ID
 */
export function setLogContext(requestId, runId = null, templateId = null) {
  currentRequestId = requestId;
  currentRunId = runId;
  currentTemplateId = templateId;
}

/**
 * Get current request ID
 * @returns {string} - Current request ID
 */
export function getRequestId() {
  return currentRequestId || randomUUID();
}

/**
 * Create a structured log entry
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 * @param {number} duration - Duration in milliseconds (optional)
 * @returns {Object} - Structured log entry
 */
function createLogEntry(level, message, data = {}, duration = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    requestId: currentRequestId || getRequestId(),
    message
  };

  if (currentRunId) entry.runId = currentRunId;
  if (currentTemplateId) entry.templateId = currentTemplateId;
  if (duration !== null) entry.duration = duration;
  if (Object.keys(data).length > 0) entry.data = data;

  return entry;
}

/**
 * Log to CloudWatch (async)
 * @param {Object} logEntry - Log entry object
 */
async function logToCloudWatch(logEntry) {
  try {
    // In Lambda, CloudWatch logging is automatic via console.log
    // This function can be used for additional CloudWatch Logs API calls if needed
    // For now, we'll use console.log which Lambda automatically sends to CloudWatch
    
    // Format as JSON for structured logging
    console.log(JSON.stringify(logEntry));
  } catch (error) {
    // Fallback to console.error if CloudWatch fails
    console.error('Failed to log to CloudWatch:', error);
    console.error(JSON.stringify(logEntry));
  }
}

/**
 * Logger class
 */
class Logger {
  constructor(context = {}) {
    this.context = context;
  }

  /**
   * Create child logger with additional context
   * @param {Object} additionalContext - Additional context
   * @returns {Logger} - Child logger
   */
  child(additionalContext) {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Log debug message
   * @param {string} message - Message
   * @param {Object} data - Additional data
   */
  debug(message, data = {}) {
    const logEntry = createLogEntry(LogLevel.DEBUG, message, { ...this.context, ...data });
    if (process.env.LOG_LEVEL === 'DEBUG' || !process.env.LOG_LEVEL) {
      logToCloudWatch(logEntry);
    }
  }

  /**
   * Log info message
   * @param {string} message - Message
   * @param {Object} data - Additional data
   * @param {number} duration - Duration in ms (optional)
   */
  info(message, data = {}, duration = null) {
    const logEntry = createLogEntry(LogLevel.INFO, message, { ...this.context, ...data }, duration);
    logToCloudWatch(logEntry);
  }

  /**
   * Log warning message
   * @param {string} message - Message
   * @param {Object} data - Additional data
   */
  warn(message, data = {}) {
    const logEntry = createLogEntry(LogLevel.WARN, message, { ...this.context, ...data });
    logToCloudWatch(logEntry);
  }

  /**
   * Log error message
   * @param {string} message - Message
   * @param {Error|Object} error - Error object or data
   * @param {Object} data - Additional data
   */
  error(message, error = null, data = {}) {
    const errorData = error instanceof Error 
      ? { 
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        }
      : error || {};

    const logEntry = createLogEntry(LogLevel.ERROR, message, { ...this.context, ...errorData, ...data });
    logToCloudWatch(logEntry);
  }

  /**
   * Log performance metric
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  metric(operation, duration, metadata = {}) {
    const logEntry = createLogEntry(
      LogLevel.INFO,
      `Performance metric: ${operation}`,
      { ...this.context, operation, ...metadata },
      duration
    );
    logEntry.type = 'metric';
    logToCloudWatch(logEntry);
  }

  /**
   * Log cost information
   * @param {string} operation - Operation name
   * @param {number} cost - Cost in USD
   * @param {Object} details - Cost details
   */
  cost(operation, cost, details = {}) {
    const logEntry = createLogEntry(
      LogLevel.INFO,
      `Cost: ${operation}`,
      { ...this.context, operation, cost, ...details },
      null
    );
    logEntry.type = 'cost';
    logToCloudWatch(logEntry);
  }
}

// Default logger instance
export const logger = new Logger();

// Create logger with context
export function createLogger(context = {}) {
  return new Logger(context);
}

// Convenience functions
export function debug(message, data) {
  logger.debug(message, data);
}

export function info(message, data, duration) {
  logger.info(message, data, duration);
}

export function warn(message, data) {
  logger.warn(message, data);
}

export function error(message, err, data) {
  logger.error(message, err, data);
}

export function metric(operation, duration, metadata) {
  logger.metric(operation, duration, metadata);
}

export function logCost(operation, cost, details) {
  logger.cost(operation, cost, details);
}

