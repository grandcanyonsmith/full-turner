/**
 * Minimal Lambda API Handler
 * Directly runs workflow without heavy imports
 */

/**
 * Minimal Lambda API Handler
 * Directly runs workflow without heavy imports
 */

export async function handler(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight (Lambda Function URLs don't handle OPTIONS automatically)
  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Parse request
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON', message: e.message })
      };
    }

    // Import and run workflow (using dynamic import to reduce cold start)
    const { setDefaultOpenAIKey } = await import('@openai/agents');
    const { getOpenAIKeyFromAWS } = await import('../src/services/aws.js');
    const { runWorkflow } = await import('../src/agent/workflow.js');

    const apiKey = await getOpenAIKeyFromAWS();
    setDefaultOpenAIKey(apiKey);

    const inputText = body.input_as_text || 
      `Please rewrite the funnel JSON according to the brand style guide and avatar provided. ${body.customInstructions || ''}`;

    const result = await runWorkflow({ input_as_text: inputText }, apiKey);

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
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Workflow execution failed',
        message: error.message
      })
    };
  }
}
