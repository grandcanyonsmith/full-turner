/**
 * Lambda Handler: Process Images Batch
 * Orchestrates parallel image processing and aggregates results
 */

import { extractImageUrls } from '../src/utils/imageUtils.js';
import { logger, setLogContext } from '../src/utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Lambda handler for orchestrating image processing
 * This prepares image data for parallel processing in Step Functions Map state
 * @param {Object} event - Step Functions event with template data
 * @param {Object} context - Lambda context
 * @returns {Promise<Object>} - Image processing configuration
 */
export async function handler(event, context) {
  const requestId = context.requestId || randomUUID();
  setLogContext(requestId, event.runId, event.templateId);

  try {
    const { template, apiKey } = event;

    logger.info('Preparing image processing batch', {
      templateId: template.templateId
    });

    // Extract image URLs from template funnel
    const imageUrls = extractImageUrls(template.templateFunnelJson);

    if (imageUrls.length === 0) {
      logger.info('No images to process');
      return {
        ...event,
        images: [],
        imageUrlKeys: [],
        imageMap: {},
        imageProcessingResults: []
      };
    }

    logger.info('Images extracted for processing', {
      imageCount: imageUrls.length
    });

    // Parse funnel data for element context
    const funnelData = JSON.parse(template.templateFunnelJson);

    // Prepare image processing items for Map state
    const imageItems = imageUrls.map(imageInfo => {
      const element = funnelData.find(item => item.element_id === imageInfo.elementId);
      const elementContext = element ? {
        alt_text: element.alt_text || null,
        element_id: element.element_id,
        type: element.type
      } : null;

      return {
        imageInfo,
        brandGuide: template.brandGuideContent,
        apiKey,
        elementContext,
        runId: event.runId,
        templateId: event.templateId,
        timestamp: event.timestamp
      };
    });

    return {
      ...event,
      images: imageItems,
      imageCount: imageUrls.length
    };
  } catch (error) {
    logger.error('Failed to prepare image processing batch', error, { event });
    throw error;
  }
}

/**
 * Lambda handler for aggregating image processing results
 * Aggregates results from parallel image processing
 * @param {Object} event - Step Functions event with image processing results
 * @param {Object} context - Lambda context
 * @returns {Promise<Object>} - Aggregated results
 */
export async function aggregateResults(event, context) {
  const requestId = context.requestId || randomUUID();
  setLogContext(requestId, event.runId, event.templateId);

  try {
    const { imageResults } = event;
    const imageMap = {};
    const imageUrlKeys = [];
    const imageProcessingResults = [];
    let totalCost = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const result of imageResults || []) {
      if (result.success) {
        imageMap[result.elementId] = {
          originalUrl: result.originalUrl,
          s3Url: result.s3Url,
          width: result.width,
          height: result.height
        };
        imageUrlKeys.push(result.elementId);
        imageProcessingResults.push({
          elementId: result.elementId,
          success: true,
          s3Url: result.s3Url,
          timings: result.timings
        });
        totalCost += result.cost?.cost || 0;
        successCount++;
      } else {
        imageProcessingResults.push({
          elementId: result.elementId,
          success: false,
          error: result.error
        });
        failureCount++;
      }
    }

    logger.info('Image processing results aggregated', {
      successCount,
      failureCount,
      totalCost
    });

    return {
      ...event,
      imageUrlKeys,
      imageMap,
      imageProcessingResults,
      cost: {
        images: {
          cost: totalCost,
          calls: imageResults?.length || 0,
          imagesGenerated: successCount
        }
      }
    };
  } catch (error) {
    logger.error('Failed to aggregate image processing results', error, { event });
    throw error;
  }
}

