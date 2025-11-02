#!/usr/bin/env node
/**
 * Test script to run boxing course workflow against real AWS
 */

import { setDefaultOpenAIKey, setTracingExportApiKey } from '@openai/agents';
import { getOpenAIKeyFromAWS, getTracingExporterKeyFromAWS } from '../src/services/aws.js';
import { runWorkflow } from '../src/agent/workflow.js';
import { readFileSync } from 'fs';

async function main() {
  try {
    console.log("=".repeat(80));
    console.log("🥊 BOXING COURSE TEST - REAL AWS EXECUTION");
    console.log("=".repeat(80));
    console.log("\n📋 Test Parameters:");
    console.log("  • Course: Learn How to Box");
    console.log("  • Instructor: Canyon Smith");
    console.log("  • Contact: 8016237631");
    console.log("\n" + "=".repeat(80) + "\n");

    console.log("🔑 Fetching OpenAI API key from AWS Secrets Manager...");
    const apiKey = await getOpenAIKeyFromAWS();
    setDefaultOpenAIKey(apiKey);
    console.log("✅ API key retrieved successfully.\n");
    
    console.log("🔍 Configuring tracing exporter...");
    const tracingKey = await getTracingExporterKeyFromAWS();
    if (tracingKey) {
      setTracingExportApiKey(tracingKey);
      console.log("✅ Tracing exporter API key configured.\n");
    } else {
      setTracingExportApiKey(apiKey);
      console.log("✅ Using OpenAI API key for tracing exporter.\n");
    }
    
    console.log("🚀 Starting workflow execution...\n");
    
    const inputText = `Please rewrite the funnel JSON according to the brand style guide and avatar provided. 
    
IMPORTANT: Use "Canyon Smith" as the name throughout and "8016237631" as the contact phone number.
The course is about learning how to box.`;

    const result = await runWorkflow({ 
      input_as_text: inputText
    }, apiKey);
    
    console.log("\n" + "=".repeat(80));
    console.log("📤 FINAL OUTPUT");
    console.log("=".repeat(80) + "\n");
    console.log(result.output_text);
    console.log("\n" + "=".repeat(80));
    console.log("💰 COST BREAKDOWN");
    console.log("=".repeat(80));
    if (result.image_processing_stats) {
      console.log(`  • Images Processed: ${result.image_processing_stats.success}/${result.image_processing_stats.total}`);
      console.log(`  • Image Processing Duration: ${(result.image_processing_stats.duration / 1000).toFixed(2)}s`);
    }
    console.log("\n✅ Workflow completed successfully!");
    console.log("=".repeat(80) + "\n");
  } catch (error) {
    console.error("\n❌ Error running workflow:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
