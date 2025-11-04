/**
 * Lambda Handler: Workflow API
 * HTTP API endpoint for running workflows
 */

import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { listAllRuns, getRun, createRun, updateRunStatus } from '../../src/services/database.js';
import { listTemplates, getTemplate } from '../../src/services/database.js';
import { listBrandGuides, getBrandGuide, saveBrandGuide, deleteBrandGuide } from '../../src/services/database.js';
import { listFunnelTemplates, getFunnelTemplate, saveFunnelTemplate, deleteFunnelTemplate } from '../../src/services/database.js';
import { getOpenAIKeyFromAWS } from '../../src/services/aws.js';
import { logger, setLogContext } from '../../src/utils/logger.js';
import { setDefaultOpenAIKey } from '@openai/agents';
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

  // Lambda Function URL handles CORS automatically, so we don't set CORS headers
  // to avoid duplicate headers
  const headers = {
    'Content-Type': 'application/json'
  };

  const method = event.requestContext?.http?.method;
  const path = event.requestContext?.http?.path || event.path || '';

  // Handle OPTIONS preflight requests
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: headers,
      body: ''
    };
  }

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
            headers: headers,
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
            headers: headers,
            body: JSON.stringify({
              error: 'Run not found',
              message: `Run with ID ${runId} not found`
            })
          };
        }

        return {
          statusCode: 200,
          headers: headers,
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
          headers: headers,
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
          headers: headers,
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
          headers: headers,
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
          headers: headers,
          body: JSON.stringify({
            success: true,
            funnelTemplates
          })
        };
      }

      // GET /funnel-templates/{id} - Get single funnel template
      if (path.startsWith('/funnel-templates/')) {
        const funnelTemplateId = path.split('/funnel-templates/')[1]?.split('?')[0];
        if (!funnelTemplateId) {
          return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({
              error: 'Missing funnelTemplateId',
              message: 'Funnel template ID is required'
            })
          };
        }

        logger.info('Fetching funnel template', { funnelTemplateId });
        const template = await getFunnelTemplate(funnelTemplateId);

        if (!template) {
          return {
            statusCode: 404,
            headers: headers,
            body: JSON.stringify({
              error: 'Funnel template not found',
              message: `Funnel template with ID ${funnelTemplateId} not found`
            })
          };
        }

        return {
          statusCode: 200,
          headers: headers,
          body: JSON.stringify({
            success: true,
            funnelTemplate: template
          })
        };
      }

      // GET /brand-guides/{id} - Get single brand guide
      if (path.startsWith('/brand-guides/')) {
        const brandGuideId = path.split('/brand-guides/')[1]?.split('?')[0];
        if (!brandGuideId) {
          return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({
              error: 'Missing brandGuideId',
              message: 'Brand guide ID is required'
            })
          };
        }

        logger.info('Fetching brand guide', { brandGuideId });
        const guide = await getBrandGuide(brandGuideId);

        if (!guide) {
          return {
            statusCode: 404,
            headers: headers,
            body: JSON.stringify({
              error: 'Brand guide not found',
              message: `Brand guide with ID ${brandGuideId} not found`
            })
          };
        }

        return {
          statusCode: 200,
          headers: headers,
          body: JSON.stringify({
            success: true,
            brandGuide: guide
          })
        };
      }

      // Unknown GET endpoint
      return {
        statusCode: 404,
        headers: corsHeaders,
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
          headers: headers,
          body: JSON.stringify({
            error: 'Invalid JSON in request body',
            message: e.message
          })
        };
      }

      // POST /funnel-templates - Create a new funnel template
      if (path === '/funnel-templates') {
        if (!body.name) {
          return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({
              error: 'Missing required field',
              message: 'name is required'
            })
          };
        }

        if (!body.funnelJson) {
          return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({
              error: 'Missing required field',
              message: 'funnelJson is required'
            })
          };
        }

        logger.info('Creating funnel template', { name: body.name });
        const template = await saveFunnelTemplate({
          funnelTemplateId: body.funnelTemplateId,
          name: body.name,
          description: body.description || '',
          funnelJson: body.funnelJson,
          status: body.status || 'active',
          metadata: body.metadata || {}
        });

        return {
          statusCode: 201,
          headers: headers,
          body: JSON.stringify({
            success: true,
            funnelTemplate: template
          })
        };
      }

      // POST /brand-guides - Create a new brand guide
      if (path === '/brand-guides') {
        if (!body.name) {
          return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({
              error: 'Missing required field',
              message: 'name is required'
            })
          };
        }

        // Require either content or brandGuideJson
        if (!body.content && !body.brandGuideJson) {
          return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({
              error: 'Missing required field',
              message: 'Either content or brandGuideJson is required'
            })
          };
        }

        logger.info('Creating brand guide', { name: body.name });
        const guide = await saveBrandGuide({
          brandGuideId: body.brandGuideId,
          name: body.name,
          description: body.description || '',
          content: body.content || '',
          brandGuideJson: body.brandGuideJson || null,
          status: body.status || 'active',
          metadata: body.metadata || {}
        });

        return {
          statusCode: 201,
          headers: headers,
          body: JSON.stringify({
            success: true,
            brandGuide: guide
          })
        };
      }

      // POST /runs - Create a new run
      if (path === '/runs') {
        // Validate required fields
        if (!body.funnelTemplateId && !body.templateId) {
          return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({
              error: 'Missing required field',
              message: 'funnelTemplateId is required'
            })
          };
        }

        if (!body.brandGuideId) {
          return {
            statusCode: 400,
            headers: headers,
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
            headers: headers,
            body: JSON.stringify({
              error: 'Funnel template not found',
              message: `Funnel template with ID ${body.funnelTemplateId} not found`
            })
          };
        }

        if (!brandGuide) {
          return {
            statusCode: 404,
            headers: headers,
            body: JSON.stringify({
              error: 'Brand guide not found',
              message: `Brand guide with ID ${body.brandGuideId} not found`
            })
          };
        }

        // Create run record first
        const run = await createRun({
          templateId: funnelTemplate.funnelTemplateId,
          templateVersion: 'latest',
          input: {
            funnelTemplateId: body.funnelTemplateId,
            brandGuideId: body.brandGuideId,
            customInstructions: body.customInstructions || ''
          }
        });

        // Get Step Functions state machine ARN from environment
        const stateMachineArn = process.env.STATE_MACHINE_ARN || process.env.WORKFLOW_STATE_MACHINE_ARN;
        
        if (!stateMachineArn) {
          logger.error('State Machine ARN not configured');
          return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({
              error: 'Configuration error',
              message: 'State Machine ARN not configured'
            })
          };
        }

        // Update status to processing
        await updateRunStatus(run.runId, run.timestamp, {
          status: 'processing'
        });

        // Get API key from AWS Secrets Manager
        logger.info('Fetching OpenAI API key from AWS');
        const apiKey = await getOpenAIKeyFromAWS();
        setDefaultOpenAIKey(apiKey);

        // Prepare Step Functions input
        const stepFunctionsInput = {
          runId: run.runId,
          timestamp: run.timestamp,
          templateId: funnelTemplate.funnelTemplateId,
          templateVersion: 'latest',
          input: {
            input_as_text: body.customInstructions || 'Please rewrite the funnel JSON according to the brand style guide and avatar provided.',
            funnelTemplateId: body.funnelTemplateId,
            brandGuideId: body.brandGuideId
          },
          // Pass brand guide and template funnel directly to avoid DB lookup
          // Stringify brandGuideJson if it's an object, otherwise use content string
          brandGuide: brandGuide.brandGuideJson 
            ? (typeof brandGuide.brandGuideJson === 'string' 
                ? brandGuide.brandGuideJson 
                : JSON.stringify(brandGuide.brandGuideJson))
            : brandGuide.content,
          templateFunnel: typeof funnelTemplate.funnelJson === 'string'
            ? funnelTemplate.funnelJson
            : JSON.stringify(funnelTemplate.funnelJson),
          apiKey, // Include API key in workflow input
          initiatedBy: 'api',
          source: 'workflow-api'
        };

        // Start Step Functions execution
        logger.info('Starting Step Functions execution', { 
          runId: run.runId,
          stateMachineArn 
        });
        
        // Extract region from state machine ARN (format: arn:aws:states:REGION:ACCOUNT:stateMachine:NAME)
        // State machine ARN format: arn:aws:states:us-east-1:471112574622:stateMachine:full-turner-workflow
        const stateMachineRegion = stateMachineArn.split(':')[3] || 'us-east-1';
        const sfnClient = new SFNClient({ region: stateMachineRegion });
        
        try {
          const executionName = `run-${run.runId}-${Date.now()}`;
          const command = new StartExecutionCommand({
            stateMachineArn,
            input: JSON.stringify(stepFunctionsInput),
            name: executionName
          });

          const result = await sfnClient.send(command);
          
          logger.info('Step Functions execution started', {
            runId: run.runId,
            executionArn: result.executionArn
          });

          // Store execution ARN in run metadata
          await updateRunStatus(run.runId, run.timestamp, {
            metadata: {
              stepFunctionsExecutionArn: result.executionArn,
              stepFunctionsExecutionName: executionName
            }
          });
        } catch (error) {
          logger.error('Failed to start Step Functions execution', error, { runId: run.runId });
          
          // Update run status to failed
          await updateRunStatus(run.runId, run.timestamp, {
            status: 'failed',
            output: {
              error: `Failed to start workflow: ${error.message}`,
              timestamp: new Date().toISOString()
            },
            endTime: new Date().toISOString()
          });
          
          return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({
              error: 'Failed to start workflow',
              message: error.message,
              runId: run.runId
            })
          };
        }

        return {
          statusCode: 202,
          headers: headers,
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
          headers: headers,
          body: JSON.stringify({
            error: 'Missing required field',
            message: 'Either input_as_text or templateId must be provided'
          })
        };
      }

      // Get API key from AWS
      logger.info('Fetching OpenAI API key from AWS');
      const { runWorkflow } = await import('../../src/agent/workflow.js');
      
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
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          output: result.output_text,
          image_processing_stats: result.image_processing_stats || {},
          timestamp: new Date().toISOString()
        })
      };
    }

    // Handle PUT requests for updates
    if (method === 'PUT') {
      // Parse request body
      let body;
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (e) {
        return {
          statusCode: 400,
          headers: headers,
          body: JSON.stringify({
            error: 'Invalid JSON in request body',
            message: e.message
          })
        };
      }

      // PUT /funnel-templates/{id} - Update funnel template
      if (path.startsWith('/funnel-templates/')) {
        const funnelTemplateId = path.split('/funnel-templates/')[1]?.split('?')[0];
        if (!funnelTemplateId) {
          return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({
              error: 'Missing funnelTemplateId',
              message: 'Funnel template ID is required'
            })
          };
        }

        // Check if template exists
        const existing = await getFunnelTemplate(funnelTemplateId);
        if (!existing) {
          return {
            statusCode: 404,
            headers: headers,
            body: JSON.stringify({
              error: 'Funnel template not found',
              message: `Funnel template with ID ${funnelTemplateId} not found`
            })
          };
        }

        logger.info('Updating funnel template', { funnelTemplateId });
        const template = await saveFunnelTemplate({
          funnelTemplateId,
          name: body.name !== undefined ? body.name : existing.name,
          description: body.description !== undefined ? body.description : existing.description,
          funnelJson: body.funnelJson !== undefined ? body.funnelJson : existing.funnelJson,
          status: body.status !== undefined ? body.status : existing.status,
          createdAt: existing.createdAt, // Preserve original creation date
          metadata: body.metadata !== undefined ? body.metadata : existing.metadata
        });

        return {
          statusCode: 200,
          headers: headers,
          body: JSON.stringify({
            success: true,
            funnelTemplate: template
          })
        };
      }

      // PUT /brand-guides/{id} - Update brand guide
      if (path.startsWith('/brand-guides/')) {
        const brandGuideId = path.split('/brand-guides/')[1]?.split('?')[0];
        if (!brandGuideId) {
          return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({
              error: 'Missing brandGuideId',
              message: 'Brand guide ID is required'
            })
          };
        }

        // Check if guide exists
        const existing = await getBrandGuide(brandGuideId);
        if (!existing) {
          return {
            statusCode: 404,
            headers: headers,
            body: JSON.stringify({
              error: 'Brand guide not found',
              message: `Brand guide with ID ${brandGuideId} not found`
            })
          };
        }

        logger.info('Updating brand guide', { brandGuideId });
        const guide = await saveBrandGuide({
          brandGuideId,
          name: body.name !== undefined ? body.name : existing.name,
          description: body.description !== undefined ? body.description : existing.description,
          content: body.content !== undefined ? body.content : existing.content,
          brandGuideJson: body.brandGuideJson !== undefined ? body.brandGuideJson : existing.brandGuideJson,
          status: body.status !== undefined ? body.status : existing.status,
          createdAt: existing.createdAt, // Preserve original creation date
          metadata: body.metadata !== undefined ? body.metadata : existing.metadata
        });

        return {
          statusCode: 200,
          headers: headers,
          body: JSON.stringify({
            success: true,
            brandGuide: guide
          })
        };
      }

      // Unknown PUT endpoint
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Not found',
          message: `Endpoint ${path} not found`
        })
      };
    }

    // Handle DELETE requests
    if (method === 'DELETE') {
      // DELETE /funnel-templates/{id}
      if (path.startsWith('/funnel-templates/')) {
        const funnelTemplateId = path.split('/funnel-templates/')[1]?.split('?')[0];
        if (!funnelTemplateId) {
          return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({
              error: 'Missing funnelTemplateId',
              message: 'Funnel template ID is required'
            })
          };
        }

        logger.info('Deleting funnel template', { funnelTemplateId });
        const deleted = await deleteFunnelTemplate(funnelTemplateId);

        if (!deleted) {
          return {
            statusCode: 404,
            headers: headers,
            body: JSON.stringify({
              error: 'Funnel template not found',
              message: `Funnel template with ID ${funnelTemplateId} not found`
            })
          };
        }

        return {
          statusCode: 200,
          headers: headers,
          body: JSON.stringify({
            success: true,
            message: 'Funnel template deleted successfully'
          })
        };
      }

      // DELETE /brand-guides/{id}
      if (path.startsWith('/brand-guides/')) {
        const brandGuideId = path.split('/brand-guides/')[1]?.split('?')[0];
        if (!brandGuideId) {
          return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({
              error: 'Missing brandGuideId',
              message: 'Brand guide ID is required'
            })
          };
        }

        logger.info('Deleting brand guide', { brandGuideId });
        const deleted = await deleteBrandGuide(brandGuideId);

        if (!deleted) {
          return {
            statusCode: 404,
            headers: headers,
            body: JSON.stringify({
              error: 'Brand guide not found',
              message: `Brand guide with ID ${brandGuideId} not found`
            })
          };
        }

        return {
          statusCode: 200,
          headers: headers,
          body: JSON.stringify({
            success: true,
            message: 'Brand guide deleted successfully'
          })
        };
      }

      // Unknown DELETE endpoint
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Not found',
          message: `Endpoint ${path} not found`
        })
      };
    }

    // Unsupported method
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Method not allowed',
        message: `Method ${method} not supported`
      })
    };
  } catch (error) {
    logger.error('Workflow API error', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Request failed',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
}
