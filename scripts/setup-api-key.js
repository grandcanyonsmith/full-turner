#!/usr/bin/env node
/**
 * Check or set OpenAI API key in AWS Secrets Manager
 */

import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';

const secretNames = [
  "OPENAI_API_KEY_SECRET_NAME",
  "OpenAIAPIKey-dbc33f7701e74c42b278c0bf0dbc47d2",
  "OpenAIApiKey"
];

const region = process.env.AWS_REGION || 'us-west-2';
const apiKey = process.argv[2]; // Optional: API key to set

async function checkSecret(secretName) {
  const client = new SecretsManagerClient({ region });
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);
    return response.SecretString;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return null;
    }
    throw error;
  }
}

async function createOrUpdateSecret(secretName, secretValue) {
  const client = new SecretsManagerClient({ region });
  
  try {
    // Try to get existing secret
    const existing = await checkSecret(secretName);
    
    if (existing) {
      // Update existing secret
      console.log(`   Updating existing secret: ${secretName}`);
      const command = new UpdateSecretCommand({
        SecretId: secretName,
        SecretString: secretValue
      });
      await client.send(command);
      console.log(`   ✅ Updated secret: ${secretName}`);
    } else {
      // Create new secret
      console.log(`   Creating new secret: ${secretName}`);
      const command = new CreateSecretCommand({
        Name: secretName,
        SecretString: secretValue,
        Description: 'OpenAI API Key for Full Turner workflow'
      });
      await client.send(command);
      console.log(`   ✅ Created secret: ${secretName}`);
    }
  } catch (error) {
    console.error(`   ❌ Failed to create/update secret ${secretName}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🔑 Checking OpenAI API Key in AWS Secrets Manager\n');
  console.log(`Region: ${region}`);
  console.log(`Secret names to check:`);
  secretNames.forEach((name, i) => {
    console.log(`  ${i + 1}. ${name}`);
  });
  console.log();

  let foundSecret = null;
  let foundSecretName = null;

  // Check each secret name
  for (const secretName of secretNames) {
    try {
      const secretValue = await checkSecret(secretName);
      if (secretValue) {
        foundSecret = secretValue;
        foundSecretName = secretName;
        console.log(`✅ Found secret: ${secretName}`);
        console.log(`   Value: ${secretValue.substring(0, 20)}...${secretValue.substring(secretValue.length - 4)}`);
        break;
      } else {
        console.log(`❌ Not found: ${secretName}`);
      }
    } catch (error) {
      console.log(`⚠️  Error checking ${secretName}: ${error.message}`);
    }
  }

  console.log();

  if (foundSecret) {
    console.log(`✅ API Key is configured`);
    console.log(`   Secret Name: ${foundSecretName}`);
    console.log(`   Value: ${foundSecret.substring(0, 20)}...${foundSecret.substring(foundSecret.length - 4)}`);
    
    if (apiKey) {
      console.log(`\n💡 API key already exists. To update it, use:`);
      console.log(`   aws secretsmanager update-secret --secret-id ${foundSecretName} --secret-string "${apiKey}" --region ${region}`);
    }
  } else {
    console.log(`❌ No API key found in Secrets Manager`);
    
    if (apiKey) {
      console.log(`\n📝 Setting API key...`);
      try {
        // Try to create/update the first secret name
        await createOrUpdateSecret(secretNames[0], apiKey);
        console.log(`\n✅ API key configured successfully!`);
      } catch (error) {
        console.error(`\n❌ Failed to set API key:`, error.message);
        console.log(`\n💡 Manual setup:`);
        console.log(`   1. Go to AWS Secrets Manager console`);
        console.log(`   2. Create a secret with name: ${secretNames[0]}`);
        console.log(`   3. Set the secret value to your OpenAI API key`);
        console.log(`   4. Or run: aws secretsmanager create-secret --name ${secretNames[0]} --secret-string "${apiKey}" --region ${region}`);
      }
    } else {
      console.log(`\n💡 To set the API key, run:`);
      console.log(`   node scripts/setup-api-key.js <your-openai-api-key>`);
      console.log(`\n   Or manually:`);
      console.log(`   1. Go to AWS Secrets Manager console`);
      console.log(`   2. Create a secret with one of these names:`);
      secretNames.forEach((name, i) => {
        console.log(`      ${i + 1}. ${name}`);
      });
      console.log(`   3. Set the secret value to your OpenAI API key`);
    }
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

