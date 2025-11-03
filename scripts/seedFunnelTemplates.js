#!/usr/bin/env node
/**
 * Script to seed funnel templates and brand guides in DynamoDB
 * Run this after deploying the infrastructure
 */

import { saveFunnelTemplate, saveBrandGuide } from '../src/services/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function seedFunnelTemplates() {
  try {
    console.log('Seeding funnel templates and brand guides in DynamoDB...\n');

    // Read template funnel JSON
    const templateFunnelPath = join(projectRoot, 'template_funnel.json');
    const templateFunnelContent = readFileSync(templateFunnelPath, 'utf-8');
    const templateFunnelJson = JSON.parse(templateFunnelContent);

    console.log('Loaded template funnel:');
    console.log(`  Elements: ${templateFunnelJson.length}\n`);

    // Read brand guide
    const brandGuidePath = join(projectRoot, 'brandguide.txt');
    const brandGuideContent = readFileSync(brandGuidePath, 'utf-8');

    console.log('Loaded brand guide:');
    console.log(`  Content length: ${brandGuideContent.length} chars\n`);

    // Create funnel template
    const funnelTemplate = await saveFunnelTemplate({
      funnelTemplateId: 'funnel-001',
      name: 'Hospital Bag Checklist Funnel',
      description: 'Default funnel template for hospital bag checklist lead magnet',
      funnelJson: templateFunnelJson,
      status: 'active',
      metadata: {
        source: 'template_funnel.json',
        version: '1.0'
      }
    });

    console.log('✅ Funnel template created successfully:');
    console.log(`   Funnel Template ID: ${funnelTemplate.funnelTemplateId}`);
    console.log(`   Name: ${funnelTemplate.name}`);
    console.log(`   Status: ${funnelTemplate.status}\n`);

    // Create brand guide
    const brandGuide = await saveBrandGuide({
      brandGuideId: 'brand-001',
      name: 'Built to Birth Brand Guide',
      description: 'Brand style guide and avatar for Built to Birth',
      content: brandGuideContent,
      status: 'active',
      metadata: {
        source: 'brandguide.txt',
        version: '1.0'
      }
    });

    console.log('✅ Brand guide created successfully:');
    console.log(`   Brand Guide ID: ${brandGuide.brandGuideId}`);
    console.log(`   Name: ${brandGuide.name}`);
    console.log(`   Status: ${brandGuide.status}\n`);

    return { funnelTemplate, brandGuide };
  } catch (error) {
    console.error('❌ Failed to seed funnel templates and brand guides:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFunnelTemplates()
    .then(() => {
      console.log('✅ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedFunnelTemplates };

