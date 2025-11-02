/**
 * Lambda Handler: Process Single Image
 * Processes a single image with OpenAI
 */

import { generateImageWithOpenAI } from '../src/image/imageGeneration.js';
import { downloadImage, generateS3Key } from '../src/utils/imageUtils.js';
import { uploadToS3 } from '../src/services/aws.js';
import { logger, setLogContext } from '../src/utils/logger.js';
import { CostTracker } from '../src/utils/costTracker.js';
import { randomUUID } from 'crypto';

/**
 * Lambda handler for processing a single image
 * @param {Object} event - Step Functions event with image info
 * @param {Object} context - Lambda context
 * @returns {Promise<Object>} - Image processing result
 */
export async function handler(event, context) {
  const requestId = context.requestId || randomUUID();
  setLogContext(requestId, event.runId, event.templateId);

  const costTracker = new CostTracker();
  const startTime = Date.now();

  try {
    const { imageInfo, brandGuide, apiKey, elementContext } = event;

    logger.info('Processing image', {
      elementId: imageInfo.elementId,
      url: imageInfo.url
    });

    // Download original image
    const downloadStart = Date.now();
    const { buffer, base64 } = await downloadImage(imageInfo.url);
    const downloadTime = Date.now() - downloadStart;
    logger.metric('image_download', downloadTime, { elementId: imageInfo.elementId });

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
      brandGuide,
      elementContext,
      imageInfo.width,
      imageInfo.height
    );
    const generationTime = Date.now() - generationStart;
    logger.metric('image_generation', generationTime, { elementId: imageInfo.elementId });

    // Track image generation cost (estimate - actual cost would come from API response)
    const quality = imageInfo.transparentBg ? 'medium' : 'standard';
    costTracker.addImageGeneration('gpt-image-1', quality, 1);

    // Upload to S3
    const uploadStart = Date.now();
    const s3Key = generateS3Key(imageInfo.url);
    const s3Url = await uploadToS3(generatedBuffer, s3Key, 'image/png');
    const uploadTime = Date.now() - uploadStart;
    logger.metric('image_upload', uploadTime, { elementId: imageInfo.elementId });

    const totalTime = Date.now() - startTime;
    const costSummary = costTracker.getSummary();

    logger.info('Image processed successfully', {
      elementId: imageInfo.elementId,
      s3Url,
      duration: totalTime,
      cost: costSummary.images.cost
    });

    logger.cost('image_processing', costSummary.images.cost, {
      elementId: imageInfo.elementId,
      model: 'gpt-image-1',
      quality
    });

    return {
      success: true,
      elementId: imageInfo.elementId,
      originalUrl: imageInfo.url,
      s3Url,
      width: imageInfo.width,
      height: imageInfo.height,
      timings: {
        download: downloadTime,
        generation: generationTime,
        upload: uploadTime,
        total: totalTime
      },
      cost: costSummary.images
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('Failed to process image', error, {
      elementId: event.imageInfo?.elementId,
      duration: totalTime
    });

    return {
      success: false,
      elementId: event.imageInfo?.elementId,
      error: {
        message: error.message,
        name: error.name
      },
      timings: {
        total: totalTime
      },
      cost: { cost: 0 }
    };
  }
}

