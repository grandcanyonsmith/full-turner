/**
 * OpenAI image generation service
 */

import OpenAI from 'openai';
import { config } from '../config/index.js';
import { getImagePrompt, mapDimensionsToOpenAISize } from './brandExtraction.js';
import { extractImageFromOutput } from '../utils/imageUtils.js';
import { withTimeout, retryWithBackoff } from '../utils/retry.js';
import { classifyError, shouldRetryError } from '../utils/errorClassification.js';

/**
 * Attempt to fetch image from stored response
 * @param {OpenAI} client - OpenAI client
 * @param {string} storedResponseId - Stored response ID
 * @returns {Promise<Buffer|null>} - Image buffer or null if not found
 */
async function fetchImageFromStoredResponse(client, storedResponseId) {
  if (!storedResponseId) {
    return null;
  }

  console.log(`\n   📥 Fetching stored response ${storedResponseId}...`);
  try {
    const storedResponse = await client.responses.retrieve(storedResponseId);
    
    // Check stored response for image
    if (storedResponse.output && storedResponse.output.length > 0) {
      for (const outputItem of storedResponse.output) {
        // Check for image_generation_call with result
        if (outputItem.type === 'image_generation_call') {
          console.log(`\n   🖼️  Found image_generation_call, status: ${outputItem.status}`);
          if (outputItem.result) {
            // result is base64 encoded image data
            try {
              const imageBuffer = Buffer.from(outputItem.result, 'base64');
              if (imageBuffer.length > 0) {
                process.stdout.write(`\n   ✓ Image found in image_generation_call result`);
                return imageBuffer;
              }
            } catch (e) {
              console.log(`\n   ⚠️  Failed to decode result: ${e.message}`);
            }
          }
        }
        
        if (outputItem.type === 'image' || outputItem.type === 'image_url') {
          const imageBuffer = await extractImageFromOutput(outputItem.image_url || outputItem.url);
          if (imageBuffer) {
            process.stdout.write(`\n   ✓ Image found in stored response`);
            return imageBuffer;
          }
        }
      }
    }
    
    // Check for tool results in stored response
    if (storedResponse.output && Array.isArray(storedResponse.output)) {
      for (const outputItem of storedResponse.output) {
        if (outputItem.type === 'tool_use' && (outputItem.name === 'image_generation' || outputItem.name === 'image')) {
          if (outputItem.output) {
            const imageBuffer = await extractImageFromOutput(outputItem.output);
            if (imageBuffer) {
              process.stdout.write(`\n   ✓ Image found in tool output`);
              return imageBuffer;
            }
          }
        }
      }
    }
  } catch (err) {
    console.log(`\n   ⚠️  Could not fetch stored response: ${err.message}`);
  }
  
  return null;
}

/**
 * Process stream and extract image
 * @param {AsyncIterable} stream - OpenAI stream
 * @param {OpenAI} client - OpenAI client
 * @returns {Promise<{buffer: Buffer|null, storedResponseId: string|null}>}
 */
async function processStream(stream, client) {
  let finalImageBuffer = null;
  let storedResponseId = null;
  let streamError = null;

  try {
    // Process stream events with error handling
    for await (const chunk of stream) {
      try {
        // Save response ID if provided
        if (chunk.response && chunk.response.id) {
          storedResponseId = chunk.response.id;
        }
        
        // Check for item chunks with part data
        if (chunk.part) {
          // Check if part is tool_use for image_generation
          if (chunk.part.type === 'tool_use') {
            if (chunk.part.name === 'image_generation' || chunk.part.name === 'image') {
              // The output might come in a later chunk or need to be fetched
            }
          }
          
          // Check if part is image
          if (chunk.part.type === 'image' || chunk.part.type === 'image_url') {
            const imageBuffer = await extractImageFromOutput(chunk.part.image_url || chunk.part.url || chunk.part);
            if (imageBuffer) {
              finalImageBuffer = imageBuffer;
              process.stdout.write(`\n   ✓ Image generated`);
              break;
            }
          }
        }
        
        // Check for item chunks
        if (chunk.item) {
          // Check for image_generation_call in item
          if (chunk.item.type === 'image_generation_call') {
            if (chunk.item.result) {
              try {
                const imageBuffer = Buffer.from(chunk.item.result, 'base64');
                if (imageBuffer.length > 0) {
                  finalImageBuffer = imageBuffer;
                  process.stdout.write(`\n   ✓ Image generated from stream`);
                  break;
                }
              } catch (e) {
                // Continue checking other fields
              }
            }
          }
          
          if (chunk.item.type === 'tool_use' && (chunk.item.name === 'image_generation' || chunk.item.name === 'image')) {
            // Check for output in item
            if (chunk.item.output) {
              const imageBuffer = await extractImageFromOutput(chunk.item.output);
              if (imageBuffer) {
                finalImageBuffer = imageBuffer;
                process.stdout.write(`\n   ✓ Image generated`);
                break;
              }
            }
          }
          
          // Check item content for images
          if (chunk.item.content) {
            for (const contentItem of chunk.item.content) {
              if (contentItem.type === 'image' || contentItem.type === 'image_url') {
                const imageBuffer = await extractImageFromOutput(contentItem.image_url || contentItem.url);
                if (imageBuffer) {
                  finalImageBuffer = imageBuffer;
                  process.stdout.write(`\n   ✓ Image generated`);
                  break;
                }
              }
            }
          }
        }
        
        // Check part for image_generation_call
        if (chunk.part) {
          if (chunk.part.type === 'image_generation_call') {
            if (chunk.part.result) {
              try {
                const imageBuffer = Buffer.from(chunk.part.result, 'base64');
                if (imageBuffer.length > 0) {
                  finalImageBuffer = imageBuffer;
                  process.stdout.write(`\n   ✓ Image generated from part`);
                  break;
                }
              } catch (e) {
                // Continue checking
              }
            }
          }
        }
        
        // Log reasoning delta if available
        if (chunk.delta && chunk.delta.type === 'reasoning' && chunk.delta.content) {
          process.stdout.write(`\n   🤔 ${chunk.delta.content.substring(0, 100)}`);
        }
      } catch (chunkError) {
        // Log chunk processing error but continue
        console.warn(`\n   ⚠️  Error processing chunk: ${chunkError.message}`);
      }
    }
  } catch (error) {
    // Stream error occurred - capture for recovery
    streamError = error;
    const errorInfo = classifyError(error);
    console.log(`\n   ⚠️  Stream error (${errorInfo.category}): ${errorInfo.message}`);
    
    // If we have a stored response ID, try to fetch immediately
    if (storedResponseId) {
      console.log(`\n   🔄 Attempting recovery from stored response...`);
      const recoveredBuffer = await fetchImageFromStoredResponse(client, storedResponseId);
      if (recoveredBuffer) {
        return { buffer: recoveredBuffer, storedResponseId };
      }
    }
    
    // Re-throw if we couldn't recover
    throw streamError;
  }

  // If no image found in stream, try to fetch from stored response
  if (!finalImageBuffer && storedResponseId) {
    const recoveredBuffer = await fetchImageFromStoredResponse(client, storedResponseId);
    if (recoveredBuffer) {
      return { buffer: recoveredBuffer, storedResponseId };
    }
  }

  if (!finalImageBuffer) {
    throw new Error("No image found in OpenAI stream response");
  }

  return { buffer: finalImageBuffer, storedResponseId };
}

/**
 * Generate an image using OpenAI's Responses API with gpt-image-1
 * @param {string} originalImageBase64 - Base64 encoded original image
 * @param {string} imageType - Type of image ("logo", "hero", etc.)
 * @param {string} elementId - Element ID from template funnel
 * @param {string} apiKey - OpenAI API key
 * @param {boolean} transparentBg - Whether to use transparent background
 * @param {string} brandGuide - Brand guide text content
 * @param {Object} elementContext - Element context (alt_text, element_id, type)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Promise<Buffer>} - Generated image buffer
 */
async function generateImageWithOpenAIInternal(
  originalImageBase64,
  imageType,
  elementId,
  apiKey,
  transparentBg,
  brandGuide,
  elementContext,
  width,
  height
) {
  const LOCAL_TEST = process.env.LOCAL_TEST === 'true';
  
  // Ensure brandGuide is properly formatted (handle both string and object)
  let brandGuideForPrompt = brandGuide;
  if (brandGuide && typeof brandGuide === 'object') {
    // If it's an object, keep it as-is (extractBrandInfo handles objects)
    brandGuideForPrompt = brandGuide;
  } else if (typeof brandGuide !== 'string') {
    // If it's neither string nor object, stringify it
    brandGuideForPrompt = JSON.stringify(brandGuide);
  }
  
  // Map dimensions to OpenAI size
  const size = mapDimensionsToOpenAISize(width, height);
  console.log(`   Dimensions: ${width}x${height} → OpenAI size: ${size}`);
  
  const prompt = getImagePrompt(imageType, elementId, transparentBg, brandGuideForPrompt, elementContext);
  
  // Log the complete prompt
  console.log("\n" + "=".repeat(80));
  console.log("📝 IMAGE GENERATION PROMPT:");
  console.log("=".repeat(80));
  console.log(prompt);
  console.log("=".repeat(80) + "\n");
  
  if (LOCAL_TEST) {
    // Return mock image buffer for local testing
    console.log(`   [LOCAL TEST] Mocking image generation for ${elementId}`);
    const mockImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    return mockImageBuffer;
  }
  
  const client = new OpenAI({ apiKey });
  
  // Use streaming to see reasoning and get partial images
  const stream = await client.responses.create({
    model: config.openai.model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: `data:image/png;base64,${originalImageBase64}`
          },
          {
            type: "input_text",
            text: prompt
          }
        ]
      }
    ],
    text: {
      format: {
        type: "text"
      },
      verbosity: "medium"
    },
    reasoning: {
      effort: config.openai.reasoning.effort,
      summary: config.openai.reasoning.summary
    },
    tools: [
      {
        type: "image_generation",
        model: config.openai.imageModel,
        size: size,
        quality: transparentBg ? config.image.transparencyQuality : config.image.defaultQuality,
        output_format: config.image.outputFormat,
        background: transparentBg ? "transparent" : "opaque",
        moderation: "auto",
        partial_images: config.image.partialImages
      }
    ],
    store: true,
    stream: true
  });
  
  // Process stream with error recovery
  const { buffer } = await processStream(stream, client);
  return buffer;
}

/**
 * Generate an image with retry logic and timeout
 * @param {string} originalImageBase64 - Base64 encoded original image
 * @param {string} imageType - Type of image ("logo", "hero", etc.)
 * @param {string} elementId - Element ID from template funnel
 * @param {string} apiKey - OpenAI API key
 * @param {boolean} transparentBg - Whether to use transparent background
 * @param {string} brandGuide - Brand guide text content
 * @param {Object} elementContext - Element context (alt_text, element_id, type)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Promise<Buffer>} - Generated image buffer
 */
export async function generateImageWithOpenAI(
  originalImageBase64,
  imageType,
  elementId,
  apiKey,
  transparentBg,
  brandGuide,
  elementContext,
  width,
  height
) {
  console.log(`   Generating image with OpenAI for ${elementId}...`);
  if (transparentBg) {
    console.log(`   Using transparent background`);
  }
  
  try {
    // Wrap with timeout and retry logic
    const imageBuffer = await retryWithBackoff(
      async () => {
        return await withTimeout(
          async () => {
            return await generateImageWithOpenAIInternal(
              originalImageBase64,
              imageType,
              elementId,
              apiKey,
              transparentBg,
              brandGuide,
              elementContext,
              width,
              height
            );
          },
          config.image.generationTimeout,
          `Image generation timed out after ${config.image.generationTimeout / 1000}s for ${elementId}`
        );
      },
      {
        maxRetries: config.image.maxRetries,
        initialDelay: config.image.retryDelay,
        maxDelay: config.retry.maxDelay,
        backoffMultiplier: config.retry.backoffMultiplier,
        shouldRetry: (error) => {
          const shouldRetry = shouldRetryError(error);
          if (shouldRetry) {
            console.log(`\n   🔄 Retrying image generation for ${elementId}...`);
          }
          return shouldRetry;
        }
      }
    );
    
    return imageBuffer;
  } catch (error) {
    const errorInfo = classifyError(error);
    const errorMessage = `Failed to generate image for ${elementId}: ${errorInfo.message}`;
    console.error(`\n   ✗ ${errorMessage}`);
    throw new Error(errorMessage);
  }
}
