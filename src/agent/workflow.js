/**
 * Workflow orchestration
 */

import { Runner, withTrace, user } from '@openai/agents';
import { config } from '../config/index.js';
import { readProjectFile } from '../utils/fileUtils.js';
import { processImages } from '../image/index.js';
import { createAgent } from '../agent/agent.js';

/**
 * Run the main workflow
 * @param {Object} workflow - Workflow input { input_as_text: string, brandGuide?: string, templateFunnel?: string }
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<{output_text: string}>}
 */
export async function runWorkflow(workflow, apiKey) {
  return await withTrace("New workflow", async () => {
    console.log("📂 Loading brand guide and template funnel...");
    
    // Use provided brand guide and template funnel, or read from files
    let brandGuide = workflow.brandGuide;
    let templateFunnel = workflow.templateFunnel;
    
    if (!brandGuide) {
      brandGuide = readProjectFile(config.paths.brandGuide);
      console.log(`   ✓ Brand guide loaded from file (${brandGuide.length} chars)`);
    } else {
      // Keep brandGuide as object for image processing (extractBrandInfo handles objects)
      // We'll stringify it later for the agent
      const length = typeof brandGuide === 'string' ? brandGuide.length : (typeof brandGuide === 'object' ? JSON.stringify(brandGuide).length : 'unknown');
      console.log(`   ✓ Brand guide provided (${length} chars)`);
    }
    
    if (!templateFunnel) {
      templateFunnel = readProjectFile(config.paths.templateFunnel);
      console.log(`   ✓ Template funnel loaded from file (${templateFunnel.length} chars)\n`);
    } else {
      // If templateFunnel is an array, stringify it
      if (typeof templateFunnel === 'object') {
        templateFunnel = JSON.stringify(templateFunnel);
      }
      console.log(`   ✓ Template funnel provided (${templateFunnel.length} chars)\n`);
    }
    
    // Process images before agent execution
    // Pass brandGuide as-is (object or string) - extractBrandInfo handles both
    const { imageUrlKeys, imageMap } = await processImages(templateFunnel, brandGuide, apiKey);
    
    // Prepare image URL keys and mapping for agent
    const imageUrlKeysText = imageUrlKeys.length > 0 
      ? `\n\n=== IMAGE URL KEYS ===\n${JSON.stringify(imageUrlKeys, null, 2)}\n\n=== PROCESSED IMAGE MAP ===\n${JSON.stringify(imageMap, null, 2)}`
      : "";
    
    // Combine workflow input with brand guide (stringified), template funnel, and processed images
    const combinedInput = `${workflow.input_as_text}

=== BRAND STYLE GUIDE & AVATAR ===
${typeof brandGuide === 'string' ? brandGuide : JSON.stringify(brandGuide)}

=== TEMPLATE FUNNEL JSON ===
${templateFunnel}${imageUrlKeysText}

IMPORTANT: The images identified in image_url_keys have already been processed and redesigned according to brand guidelines. They have been uploaded to S3 and the URLs are provided in the PROCESSED IMAGE MAP above. Use these S3 URLs in your output instead of the original URLs.`;

    console.log(`📝 Preparing input (${combinedInput.length} total chars)...`);
    const conversationHistory = [
      user(combinedInput)
    ];
    
    console.log("📋 Setting up runner...");
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: config.workflow.traceSource,
        workflow_id: config.workflow.workflowId
      }
    });
    
    console.log("🚀 Starting agent execution...\n");
    console.log("=".repeat(80));
    
    let finalOutput = "";
    console.log("⏳ Processing... (this may take a moment)\n");
    
    const startTime = Date.now();
    
    // Show progress dots while processing
    const progressInterval = setInterval(() => {
      process.stdout.write(".");
    }, 2000); // Print a dot every 2 seconds
    
    try {
      const agent = createAgent();
      const myAgentResultTemp = await runner.run(
        agent,
        [
          ...conversationHistory
        ]
      );
      
      clearInterval(progressInterval);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n\n✅ Completed in ${duration}s`);
      
      // Check if reasoning is available in the result
      if (myAgentResultTemp.reasoning) {
        console.log("\n" + "=".repeat(80));
        console.log("🤔 REASONING:");
        console.log("=".repeat(80));
        if (typeof myAgentResultTemp.reasoning === 'string') {
          console.log(myAgentResultTemp.reasoning);
        } else if (myAgentResultTemp.reasoning.content) {
          console.log(myAgentResultTemp.reasoning.content);
        } else {
          console.log(JSON.stringify(myAgentResultTemp.reasoning, null, 2));
        }
      }
      
      // Check newItems for reasoning
      if (myAgentResultTemp.newItems) {
        for (const item of myAgentResultTemp.newItems) {
          if (item.type === 'reasoning' || item.reasoning) {
            console.log("\n🤔 Reasoning found in items:");
            console.log(item.reasoning || item.content || item.text || JSON.stringify(item, null, 2));
          }
        }
      }

      if (!myAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
      }
      
      finalOutput = myAgentResultTemp.finalOutput;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }

    if (!finalOutput) {
      throw new Error("Agent result is undefined");
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Agent execution completed\n");

    const myAgentResult = {
      output_text: finalOutput
    };
    
    return myAgentResult;
  });
}

