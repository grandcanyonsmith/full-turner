/**
 * Lambda Handler: Workflow API
 * HTTP API endpoint for running workflows
 */

import { setDefaultOpenAIKey } from '@openai/agents';
import { getOpenAIKeyFromAWS } from '../src/services/aws.js';
import { runWorkflow } from '../src/agent/workflow.js';
import { listAllRuns, getRun, createRun, updateRunStatus } from '../src/services/database.js';
import { listTemplates, getTemplate } from '../src/services/database.js';
import { listBrandGuides, getBrandGuide } from '../src/services/database.js';
import { listFunnelTemplates, getFunnelTemplate } from '../src/services/database.js';
import { logger, setLogContext } from '../src/utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Lambda handler for HTTP API
 * @param {Object} event - API Gateway event
 * @param {Object} context - Lambda context
 * @returns {Promise<Object>} - API response
 */
export async function handler(event, context) {
  const requestId = context.requestId || randomUUID();
  setLogContext(requestId);

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  const method = event.requestContext?.http?.method;
  const path = event.requestContext?.http?.path || event.path || '';

  try {
    logger.info('Workflow API request received', {
      method,
      path
    });

    // Handle GET requests for runs
    if (method === 'GET') {
      // GET /runs/{runId} - Get single run (check this first as it's more specific)
      if (path.startsWith('/runs/')) {
        const runId = path.split('/runs/')[1]?.split('?')[0];
        
        if (!runId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Missing runId',
              message: 'Run ID is required'
            })
          };
        }

        logger.info('Fetching run', { runId });
        const run = await getRun(runId);

        if (!run) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              error: 'Run not found',
              message: `Run with ID ${runId} not found`
            })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            run
          })
        };
      }

      // GET /runs - List all runs
      if (path === '/runs') {
        const limit = parseInt(event.queryStringParameters?.limit || '100', 10);
        const lastKey = event.queryStringParameters?.lastKey 
          ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastKey))
          : null;

        logger.info('Fetching runs list', { limit });
        const result = await listAllRuns(limit, lastKey);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            runs: result.items,
            lastKey: result.lastKey,
            count: result.items.length
          })
        };
      }

      // GET /templates - List templates
      if (path === '/templates') {
        const limit = parseInt(event.queryStringParameters?.limit || '100', 10);
        logger.info('Fetching templates list', { limit });
        const templates = await listTemplates('active', limit);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            templates
          })
        };
      }

      // GET /brand-guides - List brand guides
      if (path === '/brand-guides') {
        const limit = parseInt(event.queryStringParameters?.limit || '100', 10);
        logger.info('Fetching brand guides list', { limit });
        const brandGuides = await listBrandGuides('active', limit);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            brandGuides
          })
        };
      }

      // GET /funnel-templates - List funnel templates
      if (path === '/funnel-templates') {
        const limit = parseInt(event.queryStringParameters?.limit || '100', 10);
        logger.info('Fetching funnel templates list', { limit });
        const funnelTemplates = await listFunnelTemplates('active', limit);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            funnelTemplates
          })
        };
      }

      // Unknown GET endpoint
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Not found',
          message: `Endpoint ${path} not found`
        })
      };
    }

    // Handle POST requests for workflow execution
    if (method === 'POST') {
      // Parse request body
      let body;
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid JSON in request body',
            message: e.message
          })
        };
      }

      // POST /runs - Create a new run
      if (path === '/runs') {
        // Validate required fields
        if (!body.funnelTemplateId && !body.templateId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Missing required field',
              message: 'funnelTemplateId is required'
            })
          };
        }

        if (!body.brandGuideId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Missing required field',
              message: 'brandGuideId is required'
            })
          };
        }

        // Fetch funnel template and brand guide
        logger.info('Fetching funnel template and brand guide', {
          funnelTemplateId: body.funnelTemplateId,
          brandGuideId: body.brandGuideId
        });

        const funnelTemplate = await getFunnelTemplate(body.funnelTemplateId);
        const brandGuide = await getBrandGuide(body.brandGuideId);

        if (!funnelTemplate) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              error: 'Funnel template not found',
              message: `Funnel template with ID ${body.funnelTemplateId} not found`
            })
          };
        }

        if (!brandGuide) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              error: 'Brand guide not found',
              message: `Brand guide with ID ${body.brandGuideId} not found`
            })
          };
        }

        // Create run record
        const run = await createRun({
          templateId: funnelTemplate.funnelTemplateId,
          templateVersion: 'latest',
          input: {
            funnelTemplateId: body.funnelTemplateId,
            brandGuideId: body.brandGuideId,
            customInstructions: body.customInstructions || ''
          }
        });

        // Get API key from AWS
        logger.info('Fetching OpenAI API key from AWS');
        const apiKey = await getOpenAIKeyFromAWS();
        setDefaultOpenAIKey(apiKey);

        // Prepare workflow input
        const workflowInput = {
          input_as_text: body.customInstructions || 'Please rewrite the funnel JSON according to the brand style guide and avatar provided.',
          brandGuide: brandGuide.content,
          templateFunnel: funnelTemplate.funnelJson
        };

        // Start workflow execution (async - don't wait for completion)
        logger.info('Starting workflow execution', { runId: run.runId });
        
        // Update status to processing
        await updateRunStatus(run.runId, run.timestamp, {
          status: 'processing'
        });
        
        // Run workflow in background (in production, you'd use Step Functions)
        runWorkflow(workflowInput, apiKey).then(async result => {
          logger.info('Workflow completed successfully', {
            runId: run.runId,
            outputLength: result.output_text?.length || 0
          });
          
          // Update run status to completed
          await updateRunStatus(run.runId, run.timestamp, {
            status: 'completed',
            output: {
              output_text: result.output_text,
              timestamp: new Date().toISOString()
            },
            cost: result.cost || {},
            imageProcessingResults: result.image_processing_stats || [],
            endTime: new Date().toISOString(),
            duration: result.duration || 0
          });
        }).catch(async error => {
          logger.error('Workflow execution failed', error, { runId: run.runId });
          
          // Update run status to failed
          await updateRunStatus(run.runId, run.timestamp, {
            status: 'failed',
            output: {
              error: error.message,
              timestamp: new Date().toISOString()
            },
            endTime: new Date().toISOString()
          });
        });

        return {
          statusCode: 202,
          headers,
          body: JSON.stringify({
            success: true,
            runId: run.runId,
            message: 'Run created and processing started',
            timestamp: new Date().toISOString()
          })
        };
      }

      // POST / (legacy workflow execution)
      // Validate required fields
      if (!body.input_as_text && !body.templateId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Missing required field',
            message: 'Either input_as_text or templateId must be provided'
          })
        };
      }

      // Get API key from AWS
      logger.info('Fetching OpenAI API key from AWS');
      const apiKey = await getOpenAIKeyFromAWS();
      setDefaultOpenAIKey(apiKey);

      // Prepare workflow input
      const workflowInput = {
        input_as_text: body.input_as_text || `Please rewrite the funnel JSON according to the brand style guide and avatar provided. ${body.customInstructions || ''}`
      };

      logger.info('Starting workflow execution');
      const result = await runWorkflow(workflowInput, apiKey);

      logger.info('Workflow completed successfully', {
        outputLength: result.output_text?.length || 0
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          output: result.output_text,
          image_processing_stats: result.image_processing_stats || {},
          timestamp: new Date().toISOString()
        })
      };
    }

    // Unsupported method
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed',
        message: `Method ${method} not supported`
      })
    };
  } catch (error) {
    logger.error('Workflow API error', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Request failed',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
}
