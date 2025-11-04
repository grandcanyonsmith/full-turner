#!/usr/bin/env node
/**
 * Create a new run and monitor its progress
 */

import { getFunnelTemplate, getBrandGuide } from '../src/services/database.js';

const funnelTemplateId = 'funnel-001';
const brandGuideId = 'd0c6c8b3-ba3a-470b-bac0-2087079cc40b';

async function createAndMonitorRun() {
  try {
    console.log('🚀 Creating new run to test fixes...\n');
    
    // Verify template and brand guide exist
    const template = await getFunnelTemplate(funnelTemplateId);
    const guide = await getBrandGuide(brandGuideId);
    
    if (!template) {
      console.error(`❌ Template ${funnelTemplateId} not found`);
      process.exit(1);
    }
    
    if (!guide) {
      console.error(`❌ Brand guide ${brandGuideId} not found`);
      process.exit(1);
    }
    
    console.log('✅ Template and brand guide found');
    console.log(`   Template: ${template.name}`);
    console.log(`   Brand Guide: ${guide.name}`);
    console.log(`   Template elements: ${template.funnelJson?.length || 0}`);
    console.log(`   Brand guide type: ${typeof guide.brandGuideJson || typeof guide.content}\n`);
    
    // Get API base URL
    const API_BASE_URL = process.env.API_BASE_URL || 'https://i5of4xggwlglu3f477pzq24o7u0jrwms.lambda-url.us-west-2.on.aws';
    
    console.log('📡 Creating run via API...');
    const response = await fetch(`${API_BASE_URL}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        funnelTemplateId,
        brandGuideId,
        customInstructions: ''
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed to create run:', result.message || result.error);
      process.exit(1);
    }
    
    const runId = result.runId;
    console.log(`✅ Run created successfully!`);
    console.log(`   Run ID: ${runId}\n`);
    
    console.log('⏳ Monitoring run progress...');
    console.log('   (This may take 5-15 minutes)\n');
    
    // Monitor run status
    let status = 'pending';
    let checkCount = 0;
    const maxChecks = 60; // Check for up to 30 minutes (30 seconds * 60)
    
    while (status === 'pending' || status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      checkCount++;
      
      const statusResponse = await fetch(`${API_BASE_URL}/runs/${runId}`);
      const statusData = await statusResponse.json();
      
      if (statusResponse.ok && statusData.run) {
        const run = statusData.run;
        status = run.status;
        
        console.log(`[${checkCount}/${maxChecks}] Status: ${status}`);
        
        if (run.cost) {
          console.log(`   Cost: $${(run.cost.total || 0).toFixed(4)}`);
          console.log(`   Images generated: ${run.cost.images?.imagesGenerated || 0}`);
        }
        
        if (status === 'completed') {
          console.log('\n✅ Run completed!\n');
          
          // Check results
          console.log('📊 Results:');
          console.log(`   Status: ${run.status}`);
          console.log(`   Images processed: ${run.imageProcessingResults?.length || 0}`);
          
          if (run.imageProcessingResults && run.imageProcessingResults.length > 0) {
            console.log('\n   ✅ Images were processed:');
            run.imageProcessingResults.forEach((result, i) => {
              if (result.success) {
                console.log(`      [${i+1}] ${result.elementId}: ${result.s3Url}`);
              } else {
                console.log(`      [${i+1}] ${result.elementId}: FAILED - ${result.error?.message || 'Unknown error'}`);
              }
            });
          } else {
            console.log('   ⚠️  No images were processed');
          }
          
          if (run.output?.output_text) {
            try {
              const parsed = JSON.parse(run.output.output_text);
              if (parsed.asset_map) {
                const withS3Urls = parsed.asset_map.filter(item => item.s3_url);
                console.log(`\n   Asset map entries with S3 URLs: ${withS3Urls.length}/${parsed.asset_map.length}`);
                
                if (withS3Urls.length > 0) {
                  console.log('\n   ✅ Image URLs were replaced:');
                  withS3Urls.forEach((item, i) => {
                    console.log(`      [${i+1}] ${item.original_url.substring(0, 60)}...`);
                    console.log(`          -> ${item.s3_url}`);
                  });
                } else {
                  console.log('\n   ⚠️  No S3 URLs in asset_map (images may not have been processed)');
                }
              }
              
              // Check if brand guide was readable
              if (parsed.notes) {
                const brandGuideNote = parsed.notes.find(note => note.includes('object Object') || note.includes('brand style guide'));
                if (brandGuideNote && brandGuideNote.includes('object Object')) {
                  console.log('\n   ❌ Brand guide issue detected:', brandGuideNote);
                } else {
                  console.log('\n   ✅ Brand guide appears to have been read correctly');
                }
              }
            } catch (e) {
              console.log('   ⚠️  Could not parse output');
            }
          }
          
          console.log(`\n💡 View full details: npm run check:run ${runId}`);
          break;
        } else if (status === 'failed') {
          console.log('\n❌ Run failed');
          if (run.error) {
            console.log(`   Error: ${JSON.stringify(run.error, null, 2)}`);
          }
          if (run.output?.error) {
            console.log(`   Output error: ${run.output.error}`);
          }
          break;
        }
      } else {
        console.log(`[${checkCount}/${maxChecks}] Failed to fetch run status`);
      }
      
      if (checkCount >= maxChecks) {
        console.log('\n⏱️  Timeout waiting for run to complete');
        console.log(`   Run ID: ${runId}`);
        console.log(`   Current status: ${status}`);
        console.log(`   Check manually: npm run check:run ${runId}`);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAndMonitorRun();

