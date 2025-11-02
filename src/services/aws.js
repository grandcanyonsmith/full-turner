/**
 * AWS Services Module
 * Handles AWS Secrets Manager and S3 operations
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/index.js';
import { retryWithBackoff } from '../utils/retry.js';

const LOCAL_TEST = process.env.LOCAL_TEST === 'true';

/**
 * Get a secret from AWS Secrets Manager
 * @param {string[]} secretNames - Array of secret names to try
 * @param {string} region - AWS region
 * @returns {Promise<string|null>} - Secret value or null if not found
 */
export async function getSecretFromAWS(secretNames, region = config.aws.secretsManager.region) {
  if (LOCAL_TEST) {
    // Return mock API key for local testing
    return 'test-api-key-local-' + Date.now();
  }

  const client = new SecretsManagerClient({ region });
  
  for (const secretName of secretNames) {
    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await retryWithBackoff(
        () => client.send(command),
        {
          maxRetries: 3,
          initialDelay: 1000,
          shouldRetry: (error) => {
            // Retry on network errors or throttling
            return error.name === 'ThrottlingException' || 
                   error.name === 'ServiceUnavailableException' ||
                   error.code === 'ECONNRESET' ||
                   error.code === 'ETIMEDOUT';
          }
        }
      );
      
      if (response.SecretString) {
        return response.SecretString;
      }
    } catch (error) {
      // Try next secret name if this one fails
      if (error.name === 'ResourceNotFoundException' || error.name === 'AccessDeniedException') {
        continue;
      }
      // Log unexpected errors but continue trying
      console.warn(`Error fetching secret ${secretName}: ${error.message}`);
    }
  }
  
  return null;
}

/**
 * Get OpenAI API key from AWS Secrets Manager
 * @returns {Promise<string>} - OpenAI API key
 * @throws {Error} - If key cannot be retrieved
 */
export async function getOpenAIKeyFromAWS() {
  const secretValue = await getSecretFromAWS(config.aws.secretsManager.secretNames.openaiApiKey);
  
  if (!secretValue) {
    throw new Error("Could not retrieve OpenAI API key from AWS Secrets Manager");
  }
  
  return secretValue;
}

/**
 * Get Tracing Exporter API key from AWS Secrets Manager
 * @returns {Promise<string|null>} - Tracing API key or null if not found
 */
export async function getTracingExporterKeyFromAWS() {
  return await getSecretFromAWS(config.aws.secretsManager.secretNames.tracingApiKey);
}

/**
 * Upload a buffer to S3
 * @param {Buffer} buffer - File buffer to upload
 * @param {string} key - S3 object key
 * @param {string} contentType - Content type (default: 'image/png')
 * @param {string} bucket - S3 bucket name (default: from config)
 * @param {string} region - AWS region (default: from config)
 * @returns {Promise<string>} - Public URL of uploaded object
 */
export async function uploadToS3(buffer, key, contentType = 'image/png', bucket = config.aws.s3.bucket, region = config.aws.s3.region) {
  console.log(`   Uploading to S3: ${key}...`);
  
  if (LOCAL_TEST) {
    // Return mock S3 URL for local testing
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    console.log(`   ✓ [LOCAL TEST] Mock uploaded to ${url}`);
    return url;
  }
  
  const s3Client = new S3Client({ region });
  
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
    CacheControl: 'max-age=31536000, public, immutable', // Cache permanently (no expiration)
    Metadata: {
      'permanent': 'true' // Mark as permanent asset
    }
  });
  
  await retryWithBackoff(
    () => s3Client.send(command),
    {
      maxRetries: 3,
      initialDelay: 1000,
      shouldRetry: (error) => {
        // Retry on network errors or throttling
        return error.name === 'ThrottlingException' || 
               error.name === 'ServiceUnavailableException' ||
               error.code === 'ECONNRESET' ||
               error.code === 'ETIMEDOUT';
      }
    }
  );
  
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  console.log(`   ✓ Uploaded to ${url}`);
  return url;
}

