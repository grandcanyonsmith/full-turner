/**
 * Image processing orchestration with parallel processing and performance monitoring
 */

import { extractImageUrls, downloadImage, generateS3Key } from '../utils/imageUtils.js';
import { uploadToS3 } from '../services/aws.js';
import { generateImageWithOpenAI } from './imageGeneration.js';
import { config } from '../config/index.js';

/**
 * Process a single image with timing
 * @param {Object} imageInfo - Image information
 * @param {string} brandGuide - Brand guide text content
 * @param {string} apiKey - OpenAI API key
 * @param {Array} funnelData - Parsed funnel data for context
 * @returns {Promise<{success: boolean, elementId: string, result?: Object, error?: Error, timings: Object}>}
 */
async function processSingleImage(imageInfo, brandGuide, apiKey, funnelData) {
  const timings = {
    download: 0,
    generation: 0,
    upload: 0,
    total: 0
  };
  const startTime = Date.now();

  try {
    // Ensure brandGuide is properly formatted (handle both string and object)
    // extractBrandInfo handles objects, but we need to ensure it's not undefined
    let brandGuideForProcessing = brandGuide;
    if (brandGuide && typeof brandGuide === 'object' && !Array.isArray(brandGuide)) {
      // Keep as object - extractBrandInfo handles objects
      brandGuideForProcessing = brandGuide;
    } else if (typeof brandGuide !== 'string' && brandGuide !== undefined) {
      // Stringify if it's something else
      brandGuideForProcessing = JSON.stringify(brandGuide);
    }
    
    // Find matching element in template funnel to get context
    const element = funnelData.find(item => item.element_id === imageInfo.elementId);
    const elementContext = element ? {
      alt_text: element.alt_text || null,
      element_id: element.element_id,
      type: element.type
    } : null;
    
    // Download original image
    const downloadStart = Date.now();
    const { buffer, base64 } = await downloadImage(imageInfo.url);
    timings.download = Date.now() - downloadStart;
    
    // Determine image type
    const imageType = imageInfo.elementId.includes("logo") ? "logo" : "hero";
    
    // Generate new image with OpenAI
    const generationStart = Date.now();
    const generatedBuffer = await generateImageWithOpenAI(
      base64,
      imageType,
      imageInfo.elementId,
      apiKey,
      imageInfo.transparentBg,
      brandGuideForProcessing,
      elementContext,
      imageInfo.width,
      imageInfo.height
    );
    timings.generation = Date.now() - generationStart;
    
    // Upload to S3
    const uploadStart = Date.now();
    const s3Key = generateS3Key(imageInfo.url);
    const s3Url = await uploadToS3(generatedBuffer, s3Key, 'image/png');
    timings.upload = Date.now() - uploadStart;
    
    timings.total = Date.now() - startTime;
    
    // Log slow operations
    if (config.performance.logSlowOperations && timings.total > config.performance.slowOperationThreshold) {
      console.log(`   ⏱️  Slow operation detected for ${imageInfo.elementId}: ${timings.total}ms`);
    }
    
    return {
      success: true,
      elementId: imageInfo.elementId,
      result: {
        originalUrl: imageInfo.url,
        s3Url: s3Url,
        width: imageInfo.width,
        height: imageInfo.height
      },
      timings
    };
  } catch (error) {
    timings.total = Date.now() - startTime;
    return {
      success: false,
      elementId: imageInfo.elementId,
      error,
      timings
    };
  }
}

/**
 * Process images in parallel with concurrency limit
 * @param {Array} imageInfos - Array of image information objects
 * @param {string} brandGuide - Brand guide text content
 * @param {string} apiKey - OpenAI API key
 * @param {Array} funnelData - Parsed funnel data for context
 * @returns {Promise<Array>} - Array of processing results
 */
async function processImagesInParallel(imageInfos, brandGuide, apiKey, funnelData) {
  const concurrency = config.performance.imageProcessingConcurrency;
  const results = [];
  
  // Process in batches to respect concurrency limit
  for (let i = 0; i < imageInfos.length; i += concurrency) {
    const batch = imageInfos.slice(i, i + concurrency);
    const batchNumber = Math.floor(i / concurrency) + 1;
    const totalBatches = Math.ceil(imageInfos.length / concurrency);
    
    console.log(`\n   Processing batch ${batchNumber}/${totalBatches} (${batch.length} image(s))...`);
    
    const batchPromises = batch.map(imageInfo => 
      processSingleImage(imageInfo, brandGuide, apiKey, funnelData)
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        if (result.value.success) {
          console.log(`   ✓ Completed ${result.value.elementId} (${result.value.timings.total}ms)`);
        } else {
          console.error(`   ✗ Failed to process ${result.value.elementId}: ${result.value.error.message}`);
        }
      } else {
        console.error(`   ✗ Unexpected error: ${result.reason}`);
        results.push({
          success: false,
          elementId: 'unknown',
          error: result.reason,
          timings: { total: 0 }
        });
      }
    }
  }
  
  return results;
}

/**
 * Process all images from template funnel
 * @param {string} templateFunnelJson - Template funnel JSON string
 * @param {string} brandGuide - Brand guide text content
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<{imageUrlKeys: string[], imageMap: Object, stats: Object}>}
 */
export async function processImages(templateFunnelJson, brandGuide, apiKey) {
  console.log("\n🖼️  Processing images...");
  const imageUrls = extractImageUrls(templateFunnelJson);
  
  if (imageUrls.length === 0) {
    console.log("   No images found to process.");
    return { imageUrlKeys: [], imageMap: {}, stats: { processed: 0, failed: 0, totalTime: 0 } };
  }
  
  console.log(`   Found ${imageUrls.length} image(s) to process.`);
  console.log(`   Using concurrency limit: ${config.performance.imageProcessingConcurrency}\n`);
  
  // Parse template funnel to extract element context
  const funnelData = JSON.parse(templateFunnelJson);
  
  const overallStartTime = Date.now();
  
  // Process images in parallel with concurrency limit
  const results = await processImagesInParallel(imageUrls, brandGuide, apiKey, funnelData);
  
  const overallTime = Date.now() - overallStartTime;
  
  // Aggregate results
  const imageMap = {};
  const imageUrlKeys = [];
  const stats = {
    processed: 0,
    failed: 0,
    totalTime: overallTime,
    averageTime: 0,
    timings: {
      download: 0,
      generation: 0,
      upload: 0
    }
  };
  
  for (const result of results) {
    if (result.success) {
      imageMap[result.elementId] = result.result;
      imageUrlKeys.push(result.elementId);
      stats.processed++;
      
      // Aggregate timing stats
      stats.timings.download += result.timings.download;
      stats.timings.generation += result.timings.generation;
      stats.timings.upload += result.timings.upload;
    } else {
      stats.failed++;
    }
  }
  
  // Calculate averages
  if (stats.processed > 0) {
    stats.averageTime = stats.totalTime / stats.processed;
    stats.timings.download = Math.round(stats.timings.download / stats.processed);
    stats.timings.generation = Math.round(stats.timings.generation / stats.processed);
    stats.timings.upload = Math.round(stats.timings.upload / stats.processed);
  }
  
  console.log(`\n✅ Image processing complete:`);
  console.log(`   Processed: ${stats.processed}/${imageUrls.length}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Total time: ${stats.totalTime}ms`);
  if (stats.processed > 0) {
    console.log(`   Average time per image: ${Math.round(stats.averageTime)}ms`);
    console.log(`   Average timings - Download: ${stats.timings.download}ms, Generation: ${stats.timings.generation}ms, Upload: ${stats.timings.upload}ms`);
  }
  console.log();
  
  return { imageUrlKeys, imageMap, stats };
}
