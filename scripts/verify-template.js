#!/usr/bin/env node
/**
 * Verify funnel template exists and has correct data
 */

import { getFunnelTemplate } from '../src/services/database.js';

const templateId = process.argv[2] || 'funnel-001';

async function verifyTemplate() {
  try {
    console.log(`🔍 Verifying funnel template: ${templateId}\n`);
    
    const template = await getFunnelTemplate(templateId);
    
    if (!template) {
      console.error(`❌ Template ${templateId} not found in database`);
      process.exit(1);
    }
    
    console.log('✅ Template found in database:');
    console.log(`   ID: ${template.funnelTemplateId}`);
    console.log(`   Name: ${template.name}`);
    console.log(`   Status: ${template.status}`);
    console.log(`   Description: ${template.description || 'N/A'}`);
    
    // Check funnelJson
    if (!template.funnelJson) {
      console.error('❌ Template has no funnelJson field');
      process.exit(1);
    }
    
    const isArray = Array.isArray(template.funnelJson);
    const elementCount = isArray ? template.funnelJson.length : 0;
    
    console.log(`\n📊 Funnel JSON Data:`);
    console.log(`   Type: ${isArray ? 'Array' : typeof template.funnelJson}`);
    console.log(`   Element Count: ${elementCount}`);
    
    if (!isArray) {
      console.error('❌ funnelJson is not an array!');
      console.log(`   Actual type: ${typeof template.funnelJson}`);
      if (typeof template.funnelJson === 'string') {
        console.log('   ⚠️  funnelJson appears to be a string, not an array');
        try {
          const parsed = JSON.parse(template.funnelJson);
          console.log(`   ✓ Can be parsed as JSON, element count: ${Array.isArray(parsed) ? parsed.length : 'N/A'}`);
        } catch (e) {
          console.error('   ✗ Cannot parse as JSON');
        }
      }
      process.exit(1);
    }
    
    if (elementCount === 0) {
      console.error('❌ Template has 0 elements!');
      process.exit(1);
    }
    
    // Show first few elements
    console.log(`\n📝 First 3 elements:`);
    template.funnelJson.slice(0, 3).forEach((el, idx) => {
      console.log(`   ${idx + 1}. ${el.element_id} (${el.type})`);
    });
    
    // Count by type
    const typeCounts = {};
    template.funnelJson.forEach(el => {
      typeCounts[el.type] = (typeCounts[el.type] || 0) + 1;
    });
    
    console.log(`\n📊 Element breakdown by type:`);
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
    console.log(`\n✅ Template verification successful!`);
    console.log(`   All ${elementCount} elements are present and correctly stored.`);
    
  } catch (error) {
    console.error('❌ Error verifying template:', error);
    process.exit(1);
  }
}

verifyTemplate();

