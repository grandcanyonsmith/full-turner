/**
 * Main entry point for the application
 */

import { setDefaultOpenAIKey, setTracingExportApiKey } from '@openai/agents';
import { getOpenAIKeyFromAWS, getTracingExporterKeyFromAWS } from './services/aws.js';
import { runWorkflow } from './agent/workflow.js';

/**
 * Main execution function
 */
async function main() {
  try {
    console.log("Fetching OpenAI API key from AWS Secrets Manager...\n");
    const apiKey = await getOpenAIKeyFromAWS();
    setDefaultOpenAIKey(apiKey);
    console.log("API key retrieved successfully.\n");
    
    // Configure tracing exporter
    console.log("Configuring tracing exporter...\n");
    const tracingKey = await getTracingExporterKeyFromAWS();
    if (tracingKey) {
      setTracingExportApiKey(tracingKey);
      console.log("Tracing exporter API key configured.\n");
    } else {
      // Use OpenAI API key as fallback for tracing exporter
      setTracingExportApiKey(apiKey);
      console.log("Using OpenAI API key for tracing exporter.\n");
    }
    
    console.log("=".repeat(80));
    console.log("🚀 WORKFLOW START");
    console.log("=".repeat(80) + "\n");
    
    const result = await runWorkflow({ 
      input_as_text: "Please rewrite the funnel JSON according to the brand style guide and avatar provided." 
    }, apiKey);
    
    console.log("\n" + "=".repeat(80));
    console.log("📤 FINAL OUTPUT");
    console.log("=".repeat(80) + "\n");
    console.log(result.output_text);
    console.log("\n" + "=".repeat(80));
    console.log("✅ Workflow completed successfully!");
    console.log("=".repeat(80) + "\n");
  } catch (error) {
    console.error("Error running workflow:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === `file://${process.argv[1]}/`) {
  main();
}

export { main };

