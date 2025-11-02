/**
 * Image utility functions
 */

import { randomUUID } from 'crypto';

/**
 * Generate a unique S3 key for an image
 * Format: YYYYMMDD-UUID.extension
 * @param {string} originalUrl - Original image URL
 * @returns {string} - Generated S3 key
 */
export function generateS3Key(originalUrl) {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  const uuid = randomUUID().split('-')[0];
  const extension = originalUrl.split('.').pop().split('?')[0] || 'png';
  return `${dateStr}-${uuid}.${extension}`;
}

/**
 * Validate and normalize image metadata
 * @param {Object} imageInfo - Image information object
 * @returns {Object} - Validated and normalized image info
 */
export function validateImageMetadata(imageInfo) {
  const validated = {
    elementId: imageInfo.elementId,
    url: imageInfo.url,
    width: imageInfo.width || null,
    height: imageInfo.height || null,
    transparentBg: imageInfo.transparentBg === true || imageInfo.transparentBg === "true"
  };

  // Validate URL
  if (!validated.url || typeof validated.url !== 'string') {
    throw new Error(`Invalid URL for image ${validated.elementId}: ${validated.url}`);
  }

  // Validate dimensions are numbers if provided
  if (validated.width !== null && (typeof validated.width !== 'number' || validated.width <= 0)) {
    console.warn(`   ⚠️  Invalid width for ${validated.elementId}: ${validated.width}, using default`);
    validated.width = null;
  }

  if (validated.height !== null && (typeof validated.height !== 'number' || validated.height <= 0)) {
    console.warn(`   ⚠️  Invalid height for ${validated.elementId}: ${validated.height}, using default`);
    validated.height = null;
  }

  // Log warnings for missing dimensions
  if (!validated.width || !validated.height) {
    console.warn(`   ⚠️  Missing dimensions for ${validated.elementId}, will use 'auto' size`);
  }

  return validated;
}

/**
 * Extract image URLs from template funnel JSON
 * @param {string} templateFunnelJson - Template funnel JSON string
 * @returns {Array<{elementId: string, url: string, width?: number, height?: number, transparentBg: boolean}>}
 */
export function extractImageUrls(templateFunnelJson) {
  const funnelData = JSON.parse(templateFunnelJson);
  const imageUrls = [];
  
  for (const item of funnelData) {
    if (item.type === "image" && item.url) {
      const imageInfo = {
        elementId: item.element_id,
        url: item.url,
        width: item.width,
        height: item.height,
        transparentBg: item.transparent_bg === true || item.transparent_bg === "true"
      };
      
      // Validate and normalize metadata
      try {
        imageUrls.push(validateImageMetadata(imageInfo));
      } catch (error) {
        console.warn(`   ⚠️  Skipping invalid image ${imageInfo.elementId}: ${error.message}`);
      }
    }
  }
  
  return imageUrls;
}

/**
 * Download an image from a URL
 * @param {string} url - Image URL
 * @returns {Promise<{buffer: Buffer, base64: string}>}
 */
export async function downloadImage(url) {
  console.log(`   Downloading image from ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  return { buffer, base64 };
}

/**
 * Extract image buffer from various OpenAI API response output formats
 * @param {any} output - Output from OpenAI API (could be base64 string, URL, object, etc.)
 * @returns {Promise<Buffer|null>} - Image buffer or null if not found
 */
export async function extractImageFromOutput(output) {
  // Handle string outputs
  if (typeof output === 'string') {
    // Base64 data URL
    if (output.startsWith('data:image')) {
      const base64Data = output.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    }
    // Direct URL
    if (output.startsWith('http://') || output.startsWith('https://')) {
      const imgResponse = await fetch(output);
      const arrayBuffer = await imgResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    // Base64 string without data URL prefix
    try {
      return Buffer.from(output, 'base64');
    } catch (e) {
      // If base64 decode fails, try as URL
      if (output.includes('http')) {
        const imgResponse = await fetch(output);
        const arrayBuffer = await imgResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    }
  }
  
  // Handle object outputs
  if (typeof output === 'object' && output !== null) {
    if (output.url) {
      const imgResponse = await fetch(output.url);
      const arrayBuffer = await imgResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    if (output.data) {
      return await extractImageFromOutput(output.data);
    }
    if (output.image_url) {
      const url = output.image_url.startsWith('data:') 
        ? output.image_url 
        : `https://${output.image_url}`;
      if (url.startsWith('data:')) {
        const base64Data = url.split(',')[1];
        return Buffer.from(base64Data, 'base64');
      }
      const imgResponse = await fetch(url);
      const arrayBuffer = await imgResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  }
  
  return null;
}

