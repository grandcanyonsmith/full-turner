#!/usr/bin/env node
/**
 * Script to seed a template in DynamoDB for testing
 * Run this after deploying the infrastructure
 */

import { saveTemplate } from './src/services/database.js';
import { readProjectFile } from './src/utils/fileUtils.js';
import { config } from './src/config/index.js';

async function seedTemplate() {
  try {
    console.log('Seeding template in DynamoDB...\n');

    // Read brand guide and template funnel
    const brandGuide = readProjectFile(config.paths.brandGuide);
    const templateFunnel = readProjectFile(config.paths.templateFunnel);

    console.log('Loaded files:');
    console.log(`  Brand guide: ${brandGuide.length} chars`);
    console.log(`  Template funnel: ${templateFunnel.length} chars\n`);

    // Create template
    const template = await saveTemplate({
      templateId: 'test-template-1',
      version: 'latest',
      name: 'Test Template 1',
      description: 'Test template for full-turner workflow',
      brandGuideContent: brandGuide,
      templateFunnelJson: templateFunnel,
      status: 'active',
      metadata: {
        createdFor: 'testing',
        test: true
      }
    });

    console.log('✅ Template created successfully:');
    console.log(`   Template ID: ${template.templateId}`);
    console.log(`   Version: ${template.version}`);
    console.log(`   Name: ${template.name}`);
    console.log(`   Status: ${template.status}\n`);

    return template;
  } catch (error) {
    console.error('❌ Failed to seed template:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTemplate()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { seedTemplate };

