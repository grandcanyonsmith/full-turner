/**
 * Error classification utility
 * Categorizes errors to determine appropriate handling strategy
 */

/**
 * Error categories
 */
export const ErrorCategory = {
  RETRYABLE: 'retryable',
  FATAL: 'fatal',
  VALIDATION: 'validation'
};

/**
 * Classify an error to determine if it should be retried
 * @param {Error} error - The error to classify
 * @returns {Object} - { category, shouldRetry, message }
 */
export function classifyError(error) {
  const errorMessage = error.message || String(error);
  const errorName = error.name || '';
  const errorCode = error.code || '';

  // Network errors - retryable
  if (
    errorMessage.includes('Premature close') ||
    errorMessage.includes('ECONNRESET') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('NetworkError') ||
    errorCode === 'ECONNRESET' ||
    errorCode === 'ETIMEDOUT' ||
    errorName === 'AbortError' ||
    errorName === 'TimeoutError'
  ) {
    return {
      category: ErrorCategory.RETRYABLE,
      shouldRetry: true,
      message: `Network error (retryable): ${errorMessage}`
    };
  }

  // Rate limiting / throttling - retryable
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('throttle') ||
    errorMessage.includes('429') ||
    errorName === 'ThrottlingException' ||
    errorName === 'RateLimitError'
  ) {
    return {
      category: ErrorCategory.RETRYABLE,
      shouldRetry: true,
      message: `Rate limit error (retryable): ${errorMessage}`
    };
  }

  // Service unavailable - retryable
  if (
    errorMessage.includes('ServiceUnavailable') ||
    errorMessage.includes('503') ||
    errorName === 'ServiceUnavailableException'
  ) {
    return {
      category: ErrorCategory.RETRYABLE,
      shouldRetry: true,
      message: `Service unavailable (retryable): ${errorMessage}`
    };
  }

  // Validation errors - not retryable
  if (
    errorMessage.includes('Invalid') ||
    errorMessage.includes('validation') ||
    errorMessage.includes('400') ||
    errorMessage.includes('401') ||
    errorMessage.includes('403') ||
    errorName === 'ValidationError' ||
    errorName === 'AuthenticationError'
  ) {
    return {
      category: ErrorCategory.VALIDATION,
      shouldRetry: false,
      message: `Validation error (not retryable): ${errorMessage}`
    };
  }

  // Stream errors - retryable
  if (
    errorMessage.includes('stream') ||
    errorMessage.includes('Premature') ||
    errorMessage.includes('aborted')
  ) {
    return {
      category: ErrorCategory.RETRYABLE,
      shouldRetry: true,
      message: `Stream error (retryable): ${errorMessage}`
    };
  }

  // Default: treat as fatal but allow retry
  return {
    category: ErrorCategory.FATAL,
    shouldRetry: false,
    message: `Unknown error: ${errorMessage}`
  };
}

/**
 * Check if an error should be retried
 * @param {Error} error - The error to check
 * @returns {boolean} - True if error should be retried
 */
export function shouldRetryError(error) {
  return classifyError(error).shouldRetry;
}

