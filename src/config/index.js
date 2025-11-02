/**
 * Configuration management for the application
 * Supports environment variables with sensible defaults
 */

export const config = {
  // AWS Configuration
  aws: {
    region: process.env.AWS_REGION || 'us-west-2',
    s3: {
      bucket: process.env.S3_BUCKET || 'cc360-pages',
      region: process.env.S3_REGION || process.env.AWS_REGION || 'us-west-2'
    },
    secretsManager: {
      region: process.env.AWS_REGION || 'us-west-2',
      secretNames: {
        openaiApiKey: process.env.OPENAI_API_KEY_SECRET_NAME 
          ? [process.env.OPENAI_API_KEY_SECRET_NAME]
          : [
              "OPENAI_API_KEY_SECRET_NAME",
              "OpenAIAPIKey-dbc33f7701e74c42b278c0bf0dbc47d2",
              "OpenAIApiKey"
            ],
        tracingApiKey: process.env.OPENAI_TRACING_API_KEY_SECRET_NAME
          ? [process.env.OPENAI_TRACING_API_KEY_SECRET_NAME]
          : [
              "OPENAI_TRACING_API_KEY",
              "OpenAITracingAPIKey",
              "OPENAI_API_KEY_SECRET_NAME",
              "OpenAIAPIKey-dbc33f7701e74c42b278c0bf0dbc47d2",
              "OpenAIApiKey"
            ]
      }
    }
  },

  // OpenAI Configuration
  openai: {
    model: process.env.OPENAI_MODEL || 'gpt-5',
    imageModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    reasoning: {
      effort: process.env.OPENAI_REASONING_EFFORT || 'medium',
      summary: process.env.OPENAI_REASONING_SUMMARY || 'auto'
    }
  },

  // Image Processing Configuration
  image: {
    defaultQuality: process.env.IMAGE_QUALITY || 'auto',
    transparencyQuality: process.env.IMAGE_TRANSPARENCY_QUALITY || 'medium',
    outputFormat: process.env.IMAGE_OUTPUT_FORMAT || 'png',
    partialImages: parseInt(process.env.IMAGE_PARTIAL_IMAGES || '3', 10),
    generationTimeout: parseInt(process.env.IMAGE_GENERATION_TIMEOUT || '300000', 10), // 5 minutes default
    maxRetries: parseInt(process.env.IMAGE_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.IMAGE_RETRY_DELAY || '2000', 10) // 2 seconds default
  },

  // File Paths
  paths: {
    brandGuide: process.env.BRAND_GUIDE_PATH || 'brandguide.txt',
    templateFunnel: process.env.TEMPLATE_FUNNEL_PATH || 'template_funnel.json'
  },

  // Workflow Configuration
  workflow: {
    traceSource: process.env.TRACE_SOURCE || 'agent-builder',
    workflowId: process.env.WORKFLOW_ID || 'wf_69043945c8e48190bbe9d846914c78a80d481960236c2925'
  },

  // Retry Configuration
  retry: {
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    initialDelay: parseInt(process.env.RETRY_INITIAL_DELAY || '1000', 10),
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '10000', 10),
    backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2', 10)
  },

  // Performance Configuration
  performance: {
    imageProcessingConcurrency: parseInt(process.env.IMAGE_PROCESSING_CONCURRENCY || '3', 10),
    logSlowOperations: process.env.LOG_SLOW_OPERATIONS !== 'false',
    slowOperationThreshold: parseInt(process.env.SLOW_OPERATION_THRESHOLD || '30000', 10) // 30 seconds
  }
};

