/**
 * OpenAI Cost Tracking Utility
 * Calculates costs based on OpenAI API usage and pricing
 */

/**
 * OpenAI Pricing (per 1M tokens, as of 2024 - update as needed)
 * Prices are in USD
 */
const OPENAI_PRICING = {
  'gpt-5': {
    input: 0.03, // $30 per 1M input tokens
    output: 0.12, // $120 per 1M output tokens
    reasoning: 0.01 // $10 per 1M reasoning tokens (if billed separately)
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06
  },
  'gpt-image-1': {
    standard: 0.04, // $0.04 per image
    hd: 0.08 // $0.08 per HD image
  },
  'dall-e-3': {
    standard: 0.04,
    hd: 0.08
  }
};

/**
 * Calculate cost for text generation API call
 * @param {string} model - Model name (e.g., 'gpt-5')
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @param {number} reasoningTokens - Number of reasoning tokens (optional)
 * @returns {number} - Cost in USD
 */
export function calculateTextGenerationCost(model, inputTokens, outputTokens, reasoningTokens = 0) {
  const pricing = OPENAI_PRICING[model];
  if (!pricing) {
    console.warn(`Unknown pricing for model: ${model}, using gpt-5 pricing`);
    return calculateTextGenerationCost('gpt-5', inputTokens, outputTokens, reasoningTokens);
  }

  const inputCost = (inputTokens / 1_000_000) * (pricing.input || 0);
  const outputCost = (outputTokens / 1_000_000) * (pricing.output || 0);
  const reasoningCost = reasoningTokens > 0 
    ? (reasoningTokens / 1_000_000) * (pricing.reasoning || 0)
    : 0;

  return inputCost + outputCost + reasoningCost;
}

/**
 * Calculate cost for image generation
 * @param {string} model - Model name (e.g., 'gpt-image-1')
 * @param {string} quality - Image quality ('standard' or 'hd')
 * @param {number} count - Number of images generated
 * @returns {number} - Cost in USD
 */
export function calculateImageGenerationCost(model, quality = 'standard', count = 1) {
  const pricing = OPENAI_PRICING[model];
  if (!pricing) {
    console.warn(`Unknown pricing for model: ${model}, using gpt-image-1 pricing`);
    return calculateImageGenerationCost('gpt-image-1', quality, count);
  }

  const pricePerImage = quality === 'hd' ? pricing.hd : pricing.standard;
  return pricePerImage * count;
}

/**
 * Extract usage information from OpenAI API response
 * @param {Object} response - OpenAI API response object
 * @returns {Object} - Usage information { inputTokens, outputTokens, reasoningTokens, model }
 */
export function extractUsageFromResponse(response) {
  // Handle different response formats
  const usage = response.usage || response.response?.usage || {};
  
  return {
    inputTokens: usage.prompt_tokens || usage.input_tokens || 0,
    outputTokens: usage.completion_tokens || usage.output_tokens || 0,
    reasoningTokens: usage.reasoning_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    model: response.model || response.response?.model || 'gpt-5'
  };
}

/**
 * Extract image generation cost from response
 * @param {Object} response - OpenAI API response object
 * @param {string} model - Model name used
 * @param {string} quality - Image quality used
 * @returns {number} - Cost in USD
 */
export function extractImageCostFromResponse(response, model = 'gpt-image-1', quality = 'standard') {
  // Count number of images generated
  // For Responses API, check if image_generation_call exists
  const output = response.output || [];
  let imageCount = 0;
  
  for (const item of output) {
    if (item.type === 'image_generation_call' && item.status === 'completed') {
      imageCount++;
    }
  }
  
  // If no images found in output, assume 1 image was generated
  if (imageCount === 0 && response) {
    imageCount = 1;
  }
  
  return calculateImageGenerationCost(model, quality, imageCount);
}

/**
 * Track cost for a processing run
 * @param {Object} costs - Cost breakdown
 * @param {string} costs.agentCost - Cost from agent execution
 * @param {string} costs.imageCost - Cost from image generation
 * @param {Object} costs.details - Detailed breakdown
 * @returns {Object} - Total cost and breakdown
 */
export function aggregateCosts(costs) {
  const agentCost = parseFloat(costs.agentCost || 0);
  const imageCost = parseFloat(costs.imageCost || 0);
  const totalCost = agentCost + imageCost;

  return {
    total: totalCost,
    agent: agentCost,
    image: imageCost,
    details: costs.details || {},
    currency: 'USD',
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Cost tracking accumulator
 * Tracks costs across multiple API calls
 */
export class CostTracker {
  constructor() {
    this.costs = {
      agent: {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cost: 0
      },
      images: {
        calls: 0,
        imagesGenerated: 0,
        cost: 0
      },
      total: 0
    };
  }

  /**
   * Add text generation cost
   * @param {string} model - Model name
   * @param {number} inputTokens - Input tokens
   * @param {number} outputTokens - Output tokens
   * @param {number} reasoningTokens - Reasoning tokens
   */
  addTextGeneration(model, inputTokens, outputTokens, reasoningTokens = 0) {
    this.costs.agent.calls++;
    this.costs.agent.inputTokens += inputTokens;
    this.costs.agent.outputTokens += outputTokens;
    this.costs.agent.reasoningTokens += reasoningTokens;
    
    const cost = calculateTextGenerationCost(model, inputTokens, outputTokens, reasoningTokens);
    this.costs.agent.cost += cost;
    this.costs.total += cost;
  }

  /**
   * Add image generation cost
   * @param {string} model - Model name
   * @param {string} quality - Image quality
   * @param {number} count - Number of images
   */
  addImageGeneration(model, quality, count = 1) {
    this.costs.images.calls++;
    this.costs.images.imagesGenerated += count;
    
    const cost = calculateImageGenerationCost(model, quality, count);
    this.costs.images.cost += cost;
    this.costs.total += cost;
  }

  /**
   * Add cost from API response
   * @param {Object} response - OpenAI API response
   * @param {string} type - 'agent' or 'image'
   */
  addFromResponse(response, type = 'agent') {
    if (type === 'agent') {
      const usage = extractUsageFromResponse(response);
      this.addTextGeneration(
        usage.model,
        usage.inputTokens,
        usage.outputTokens,
        usage.reasoningTokens
      );
    } else if (type === 'image') {
      const model = response.model || 'gpt-image-1';
      const quality = response.quality || 'standard';
      const cost = extractImageCostFromResponse(response, model, quality);
      this.costs.images.calls++;
      this.costs.images.cost += cost;
      this.costs.total += cost;
    }
  }

  /**
   * Get current cost summary
   * @returns {Object} - Cost summary
   */
  getSummary() {
    return {
      total: this.costs.total,
      agent: {
        calls: this.costs.agent.calls,
        tokens: {
          input: this.costs.agent.inputTokens,
          output: this.costs.agent.outputTokens,
          reasoning: this.costs.agent.reasoningTokens,
          total: this.costs.agent.inputTokens + this.costs.agent.outputTokens + this.costs.agent.reasoningTokens
        },
        cost: this.costs.agent.cost
      },
      images: {
        calls: this.costs.images.calls,
        imagesGenerated: this.costs.images.imagesGenerated,
        cost: this.costs.images.cost
      },
      currency: 'USD'
    };
  }

  /**
   * Reset tracker
   */
  reset() {
    this.costs = {
      agent: { calls: 0, inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cost: 0 },
      images: { calls: 0, imagesGenerated: 0, cost: 0 },
      total: 0
    };
  }
}

