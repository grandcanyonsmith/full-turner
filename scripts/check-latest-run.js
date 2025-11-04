#!/usr/bin/env node
/**
 * Check the most recent run
 */

import { listAllRuns } from '../src/services/database.js';

async function checkLatestRun() {
  try {
    const result = await listAllRuns(10);
    const runs = Array.isArray(result) ? result : (result.items || result.runs || []);
    
    if (runs.length === 0) {
      console.log('❌ No runs found');
      process.exit(1);
    }
    
    // Sort by timestamp descending
    runs.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });
    
    const latest = runs[0];
    
    console.log('📊 Most Recent Run:');
    console.log(`   Run ID: ${latest.runId}`);
    console.log(`   Status: ${latest.status}`);
    console.log(`   Timestamp: ${latest.timestamp}`);
    console.log(`   Template ID: ${latest.templateId || 'N/A'}`);
    
    console.log('\n💰 Cost Breakdown:');
    console.log(`   Total: $${(latest.cost?.total || 0).toFixed(4)}`);
    console.log(`   Agent: $${(latest.cost?.agent?.cost || 0).toFixed(4)}`);
    console.log(`   Images: $${(latest.cost?.images?.cost || 0).toFixed(4)} (Generated: ${latest.cost?.images?.imagesGenerated || 0})`);
    
    console.log('\n🖼️  Image Processing Results:');
    const imageResults = latest.imageProcessingResults || [];
    if (imageResults.length === 0) {
      console.log('   ⚠️  No images were processed');
    } else {
      imageResults.forEach((result, i) => {
        console.log(`   [${i+1}] ${result.elementId}: ${result.success ? '✓ Success' : '✗ Failed'}`);
        if (result.success && result.s3Url) {
          console.log(`       S3 URL: ${result.s3Url}`);
        } else if (result.error) {
          console.log(`       Error: ${result.error.message || result.error}`);
        }
      });
    }
    
    const output = latest.output?.output_text || '';
    if (output) {
      try {
        const parsed = JSON.parse(output);
        console.log('\n📝 Output Analysis:');
        console.log(`   Has asset_map: ${!!parsed.asset_map}`);
        console.log(`   Asset map entries: ${parsed.asset_map?.length || 0}`);
        
        if (parsed.asset_map && parsed.asset_map.length > 0) {
          console.log('\n   Asset Map Details:');
          parsed.asset_map.forEach((item, i) => {
            const url = item.original_url || 'N/A';
            const s3Url = item.s3_url || 'EMPTY';
            console.log(`   [${i+1}] ${url.substring(0, 70)}...`);
            console.log(`       -> S3 URL: ${s3Url}`);
            if (item.transform_notes) {
              console.log(`       Notes: ${item.transform_notes.substring(0, 100)}...`);
            }
          });
        }
        
        if (parsed.problems && parsed.problems.length > 0) {
          console.log('\n⚠️  Problems:');
          parsed.problems.forEach((problem, i) => {
            console.log(`   ${i+1}. ${problem}`);
          });
        }
      } catch (e) {
        console.log('   Could not parse output:', e.message);
      }
    }
    
    console.log(`\n💡 Run this for full details: npm run check:run ${latest.runId}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkLatestRun();

