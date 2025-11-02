/**
 * Database Service Layer
 * Handles all DynamoDB operations for templates, processing runs, and output logs
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config/index.js';
import { randomUUID } from 'crypto';

// LOCAL_TEST mode: use in-memory stubs instead of real DynamoDB
const LOCAL_TEST = process.env.LOCAL_TEST === 'true';
const localDb = LOCAL_TEST ? { templates: {}, runs: {}, logs: [], brandGuides: {}, funnelTemplates: {} } : null;

const dynamoClient = LOCAL_TEST ? null : new DynamoDBClient({ region: config.aws.region });
const docClient = LOCAL_TEST ? null : DynamoDBDocumentClient.from(dynamoClient);

// Table names (can be overridden via environment variables)
const TABLES = {
  TEMPLATES: process.env.TEMPLATES_TABLE || 'templates',
  PROCESSING_RUNS: process.env.PROCESSING_RUNS_TABLE || 'processingRuns',
  OUTPUT_LOGS: process.env.OUTPUT_LOGS_TABLE || 'outputLogs',
  BRAND_GUIDES: process.env.BRAND_GUIDES_TABLE || 'brandGuides',
  FUNNEL_TEMPLATES: process.env.FUNNEL_TEMPLATES_TABLE || 'funnelTemplates'
};

/**
 * Template Operations
 */

/**
 * Save or update a template
 * @param {Object} templateData - Template data
 * @param {string} templateData.templateId - Template ID
 * @param {string} templateData.version - Version (default: 'latest')
 * @param {string} templateData.name - Template name
 * @param {string} templateData.brandGuideContent - Brand guide content
 * @param {string} templateData.templateFunnelJson - Template funnel JSON
 * @param {Object} templateData.metadata - Additional metadata
 * @returns {Promise<Object>} - Saved template
 */
export async function saveTemplate(templateData) {
  const templateId = templateData.templateId || randomUUID();
  const version = templateData.version || 'latest';
  const now = new Date().toISOString();

  const item = {
    templateId,
    version,
    name: templateData.name || 'Unnamed Template',
    description: templateData.description || '',
    brandGuideContent: templateData.brandGuideContent || '',
    templateFunnelJson: templateData.templateFunnelJson || '',
    status: templateData.status || 'active',
    createdAt: templateData.createdAt || now,
    updatedAt: now,
    createdBy: templateData.createdBy || 'system',
    metadata: templateData.metadata || {}
  };

  if (LOCAL_TEST) {
    const key = `${templateId}:${version}`;
    localDb.templates[key] = item;
    return item;
  }

  await docClient.send(new PutCommand({
    TableName: TABLES.TEMPLATES,
    Item: item
  }));

  return item;
}

/**
 * Get a template by ID and version
 * @param {string} templateId - Template ID
 * @param {string} version - Version (default: 'latest')
 * @returns {Promise<Object|null>} - Template object or null if not found
 */
export async function getTemplate(templateId, version = 'latest') {
  if (LOCAL_TEST) {
    const key = `${templateId}:${version}`;
    return localDb.templates[key] || null;
  }

  const result = await docClient.send(new GetCommand({
    TableName: TABLES.TEMPLATES,
    Key: {
      templateId,
      version
    }
  }));

  return result.Item || null;
}

/**
 * List templates
 * @param {string} status - Filter by status (optional)
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Array of templates
 */
export async function listTemplates(status = null, limit = 100) {
  const params = {
    TableName: TABLES.TEMPLATES,
    Limit: limit
  };

  if (status) {
    params.FilterExpression = '#status = :status';
    params.ExpressionAttributeNames = { '#status': 'status' };
    params.ExpressionAttributeValues = { ':status': status };
  }

  const result = await docClient.send(new ScanCommand(params));
  return result.Items || [];
}

/**
 * Processing Run Operations
 */

/**
 * Create a new processing run
 * @param {Object} runData - Run data
 * @param {string} runData.templateId - Template ID
 * @param {string} runData.templateVersion - Template version
 * @param {Object} runData.input - Input data
 * @returns {Promise<Object>} - Created run record
 */
export async function createRun(runData) {
  const runId = randomUUID();
  const timestamp = new Date().toISOString();

  const item = {
    runId,
    timestamp,
    templateId: runData.templateId,
    templateVersion: runData.templateVersion || 'latest',
    status: 'pending',
    input: runData.input || {},
    startTime: timestamp,
    cost: {
      total: 0,
      agent: 0,
      image: 0,
      details: {}
    },
    metadata: runData.metadata || {}
  };

  if (LOCAL_TEST) {
    localDb.runs[runId] = item;
    return item;
  }

  await docClient.send(new PutCommand({
    TableName: TABLES.PROCESSING_RUNS,
    Item: item
  }));

  return item;
}

/**
 * Update run status and data
 * @param {string} runId - Run ID
 * @param {string} timestamp - Run timestamp (for key)
 * @param {Object} updates - Updates to apply
 * @param {string} updates.status - New status
 * @param {Object} updates.output - Output data
 * @param {Object} updates.cost - Cost information
 * @param {Object} updates.imageProcessingResults - Image processing results
 * @param {Object} updates.metadata - Additional metadata
 * @returns {Promise<Object>} - Updated run record
 */
export async function updateRunStatus(runId, timestamp, updates) {
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (updates.status) {
    updateExpressions.push('#status = :status');
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeValues[':status'] = updates.status;
  }

  if (updates.output !== undefined) {
    updateExpressions.push('#output = :output');
    expressionAttributeNames['#output'] = 'output';
    expressionAttributeValues[':output'] = updates.output;
  }

  if (updates.cost !== undefined) {
    updateExpressions.push('#cost = :cost');
    expressionAttributeNames['#cost'] = 'cost';
    expressionAttributeValues[':cost'] = updates.cost;
  }

  if (updates.imageProcessingResults !== undefined) {
    updateExpressions.push('imageProcessingResults = :imageProcessingResults');
    expressionAttributeValues[':imageProcessingResults'] = updates.imageProcessingResults;
  }

  if (updates.endTime) {
    updateExpressions.push('endTime = :endTime');
    expressionAttributeValues[':endTime'] = updates.endTime || new Date().toISOString();
  }

  if (updates.duration) {
    updateExpressions.push('#duration = :duration');
    expressionAttributeNames['#duration'] = 'duration';
    expressionAttributeValues[':duration'] = updates.duration;
  }

  if (updates.error) {
    updateExpressions.push('#error = :error');
    expressionAttributeNames['#error'] = 'error';
    expressionAttributeValues[':error'] = updates.error;
  }

  if (updates.metadata) {
    updateExpressions.push('metadata = :metadata');
    expressionAttributeValues[':metadata'] = {
      ...updates.metadata,
      updatedAt: new Date().toISOString()
    };
  }

  updateExpressions.push('updatedAt = :updatedAt');
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  if (LOCAL_TEST) {
    if (localDb.runs[runId]) {
      Object.assign(localDb.runs[runId], updates);
      localDb.runs[runId].updatedAt = new Date().toISOString();
      return localDb.runs[runId];
    }
    // In LOCAL_TEST, create the run if it doesn't exist
    const newRun = {
      runId,
      timestamp,
      status: updates.status || 'pending',
      ...updates
    };
    localDb.runs[runId] = newRun;
    return newRun;
  }

  await docClient.send(new UpdateCommand({
    TableName: TABLES.PROCESSING_RUNS,
    Key: {
      runId,
      timestamp
    },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  }));

  const result = await docClient.send(new GetCommand({
    TableName: TABLES.PROCESSING_RUNS,
    Key: { runId, timestamp }
  }));

  return result.Item;
}

/**
 * Get a run by ID (requires scanning - in production use GSI)
 * @param {string} runId - Run ID
 * @returns {Promise<Object|null>} - Run object or null
 */
export async function getRun(runId) {
  // Note: This is inefficient - in production you'd use a GSI with runId as PK
  const result = await docClient.send(new ScanCommand({
    TableName: TABLES.PROCESSING_RUNS,
    FilterExpression: 'runId = :runId',
    ExpressionAttributeValues: {
      ':runId': runId
    },
    Limit: 1
  }));

  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
}

/**
 * Get run history for a template
 * @param {string} templateId - Template ID
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Array of runs
 */
export async function getRunHistory(templateId, limit = 50) {
  // Note: Requires GSI with templateId as PK and timestamp as SK
  // For now, using scan (inefficient for production)
  const result = await docClient.send(new ScanCommand({
    TableName: TABLES.PROCESSING_RUNS,
    FilterExpression: 'templateId = :templateId',
    ExpressionAttributeValues: {
      ':templateId': templateId
    },
    Limit: limit
  }));

  // Sort by timestamp descending
  const items = (result.Items || []).sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  return items.slice(0, limit);
}

/**
 * List all runs with pagination support
 * @param {number} limit - Maximum number of results (default: 100)
 * @param {Object} lastKey - Last evaluated key for pagination (optional)
 * @returns {Promise<{items: Array, lastKey: Object|null}>} - Array of runs and pagination token
 */
export async function listAllRuns(limit = 100, lastKey = null) {
  const params = {
    TableName: TABLES.PROCESSING_RUNS,
    Limit: limit
  };

  if (lastKey) {
    params.ExclusiveStartKey = lastKey;
  }

  if (LOCAL_TEST) {
    const items = Object.values(localDb.runs);
    // Sort by timestamp descending
    const sorted = items.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    return {
      items: sorted.slice(0, limit),
      lastKey: null
    };
  }

  const result = await docClient.send(new ScanCommand(params));

  // Sort by timestamp descending
  const items = (result.Items || []).sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  return {
    items: items.slice(0, limit),
    lastKey: result.LastEvaluatedKey || null
  };
}

/**
 * Output Log Operations
 */

/**
 * Save an output log entry
 * @param {string} runId - Run ID
 * @param {string} logType - Log type ('agent_output', 'image_processing', 'error')
 * @param {string} level - Log level ('info', 'warn', 'error')
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 * @param {string} requestId - Request ID for tracing
 * @returns {Promise<Object>} - Saved log entry
 */
export async function saveOutputLog(runId, logType, level, message, data = {}, requestId = null) {
  const timestamp = new Date().toISOString();
  const logId = randomUUID();

  const item = {
    runId,
    logType,
    logId,
    timestamp,
    level,
    message,
    data,
    requestId: requestId || randomUUID()
  };

  if (LOCAL_TEST) {
    localDb.logs.push(item);
    return item;
  }

  await docClient.send(new PutCommand({
    TableName: TABLES.OUTPUT_LOGS,
    Item: item
  }));

  return item;
}

/**
 * Get logs for a run
 * @param {string} runId - Run ID
 * @param {string} logType - Filter by log type (optional)
 * @returns {Promise<Array>} - Array of log entries
 */
export async function getRunLogs(runId, logType = null) {
  const params = {
    TableName: TABLES.OUTPUT_LOGS,
    KeyConditionExpression: 'runId = :runId',
    ExpressionAttributeValues: {
      ':runId': runId
    }
  };

  if (logType) {
    params.KeyConditionExpression += ' AND logType = :logType';
    params.ExpressionAttributeValues[':logType'] = logType;
  }

  const result = await docClient.send(new QueryCommand(params));
  return result.Items || [];
}

/**
 * Brand Guide Operations
 */

/**
 * Save or update a brand guide
 * @param {Object} brandGuideData - Brand guide data
 * @param {string} brandGuideData.brandGuideId - Brand guide ID
 * @param {string} brandGuideData.name - Brand guide name
 * @param {string} brandGuideData.content - Brand guide content
 * @param {Object} brandGuideData.metadata - Additional metadata
 * @returns {Promise<Object>} - Saved brand guide
 */
export async function saveBrandGuide(brandGuideData) {
  const brandGuideId = brandGuideData.brandGuideId || randomUUID();
  const now = new Date().toISOString();

  const item = {
    brandGuideId,
    name: brandGuideData.name || 'Unnamed Brand Guide',
    description: brandGuideData.description || '',
    content: brandGuideData.content || '',
    status: brandGuideData.status || 'active',
    createdAt: brandGuideData.createdAt || now,
    updatedAt: now,
    createdBy: brandGuideData.createdBy || 'system',
    metadata: brandGuideData.metadata || {}
  };

  if (LOCAL_TEST) {
    localDb.brandGuides[brandGuideId] = item;
    return item;
  }

  await docClient.send(new PutCommand({
    TableName: TABLES.BRAND_GUIDES,
    Item: item
  }));

  return item;
}

/**
 * Get a brand guide by ID
 * @param {string} brandGuideId - Brand guide ID
 * @returns {Promise<Object|null>} - Brand guide object or null if not found
 */
export async function getBrandGuide(brandGuideId) {
  if (LOCAL_TEST) {
    return localDb.brandGuides[brandGuideId] || null;
  }

  const result = await docClient.send(new GetCommand({
    TableName: TABLES.BRAND_GUIDES,
    Key: { brandGuideId }
  }));

  return result.Item || null;
}

/**
 * List brand guides
 * @param {string} status - Filter by status (optional)
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Array of brand guides
 */
export async function listBrandGuides(status = null, limit = 100) {
  const params = {
    TableName: TABLES.BRAND_GUIDES,
    Limit: limit
  };

  if (status) {
    params.FilterExpression = '#status = :status';
    params.ExpressionAttributeNames = { '#status': 'status' };
    params.ExpressionAttributeValues = { ':status': status };
  }

  if (LOCAL_TEST) {
    const items = Object.values(localDb.brandGuides);
    return items.slice(0, limit);
  }

  const result = await docClient.send(new ScanCommand(params));
  return result.Items || [];
}

/**
 * Funnel Template Operations
 */

/**
 * Save or update a funnel template
 * @param {Object} funnelTemplateData - Funnel template data
 * @param {string} funnelTemplateData.funnelTemplateId - Funnel template ID
 * @param {string} funnelTemplateData.name - Funnel template name
 * @param {Array} funnelTemplateData.funnelJson - Funnel JSON array
 * @param {Object} funnelTemplateData.metadata - Additional metadata
 * @returns {Promise<Object>} - Saved funnel template
 */
export async function saveFunnelTemplate(funnelTemplateData) {
  const funnelTemplateId = funnelTemplateData.funnelTemplateId || randomUUID();
  const now = new Date().toISOString();

  const item = {
    funnelTemplateId,
    name: funnelTemplateData.name || 'Unnamed Funnel Template',
    description: funnelTemplateData.description || '',
    funnelJson: funnelTemplateData.funnelJson || [],
    status: funnelTemplateData.status || 'active',
    createdAt: funnelTemplateData.createdAt || now,
    updatedAt: now,
    createdBy: funnelTemplateData.createdBy || 'system',
    metadata: funnelTemplateData.metadata || {}
  };

  if (LOCAL_TEST) {
    localDb.funnelTemplates[funnelTemplateId] = item;
    return item;
  }

  await docClient.send(new PutCommand({
    TableName: TABLES.FUNNEL_TEMPLATES,
    Item: item
  }));

  return item;
}

/**
 * Get a funnel template by ID
 * @param {string} funnelTemplateId - Funnel template ID
 * @returns {Promise<Object|null>} - Funnel template object or null if not found
 */
export async function getFunnelTemplate(funnelTemplateId) {
  if (LOCAL_TEST) {
    return localDb.funnelTemplates[funnelTemplateId] || null;
  }

  const result = await docClient.send(new GetCommand({
    TableName: TABLES.FUNNEL_TEMPLATES,
    Key: { funnelTemplateId }
  }));

  return result.Item || null;
}

/**
 * List funnel templates
 * @param {string} status - Filter by status (optional)
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Array of funnel templates
 */
export async function listFunnelTemplates(status = null, limit = 100) {
  const params = {
    TableName: TABLES.FUNNEL_TEMPLATES,
    Limit: limit
  };

  if (status) {
    params.FilterExpression = '#status = :status';
    params.ExpressionAttributeNames = { '#status': 'status' };
    params.ExpressionAttributeValues = { ':status': status };
  }

  if (LOCAL_TEST) {
    const items = Object.values(localDb.funnelTemplates);
    return items.slice(0, limit);
  }

  const result = await docClient.send(new ScanCommand(params));
  return result.Items || [];
}

