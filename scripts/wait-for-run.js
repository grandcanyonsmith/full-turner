#!/usr/bin/env node
/**
 * Wait for run to complete and verify results
 */

import { getRun } from '../src/services/database.js';

const runId = process.argv[2] || 'bc5501d3-522a-4aa2-9d44-57360c31b43c';
const maxWaitTime = 15 * 60 * 1000; // 15 minutes
const checkInterval = 30 * 1000; // 30 seconds

async function waitForCompletion() {
  console.log(`⏳ Waiting for run ${runId} to complete...\n`);
  
  const startTime = Date.now();
  let lastStatus = null;
  
  while (Date.now() - startTime < maxWaitTime) {
    const run = await getRun(runId);
    
    if (!run) {
      console.log('❌ Run not found');
      process.exit(1);
    }
    
    const status = run.status;
    const timestamp = new Date(run.timestamp).toLocaleString();
    
    if (status !== lastStatus) {
      console.log(`[${new Date().toLocaleTimeString()}] Status: ${status}`);
      lastStatus = status;
    }
    
    if (status === 'completed') {
      console.log('\n✅ Run completed!\n');
      console.log('📊 Results:');
      console.log(`   Run ID: ${run.runId}`);
      console.log(`   Status: ${run.status}`);
      console.log(`   Duration: ${run.duration || 'N/A'}ms`);
      
      console.log('\n💰 Cost Breakdown:');
      console.log(`   Total: $${(run.cost?.total || 0).toFixed(4)}`);
      console.log(`   Agent: $${(run.cost?.agent?.cost || 0).toFixed(4)}`);
      console.log(`   Images: $${(run.cost?.images?.cost || 0).toFixed(4)}`);
      console.log(`   Images Generated: ${run.cost?.images?.imagesGenerated || 0}`);
      
      console.log('\n🖼️  Image Processing Results:');
      const imageResults = run.imageProcessingResults || [];
      if (imageResults.length === 0) {
        console.log('   ⚠️  No images were processed');
      } else {
        let successCount = 0;
        imageResults.forEach((result, i) => {
          if (result.success) {
            successCount++;
            console.log(`   ✅ [${i+1}] ${result.elementId}: ${result.s3Url}`);
          } else {
            console.log(`   ❌ [${i+1}] ${result.elementId}: FAILED - ${result.error?.message || 'Unknown error'}`);
          }
        });
        console.log(`\n   Summary: ${successCount}/${imageResults.length} images processed successfully`);
      }
      
      if (run.output?.output_text) {
        try {
          const parsed = JSON.parse(run.output.output_text);
          
          console.log('\n📝 Output Analysis:');
          console.log(`   Has asset_map: ${!!parsed.asset_map}`);
          console.log(`   Asset map entries: ${parsed.asset_map?.length || 0}`);
          
          if (parsed.asset_map && parsed.asset_map.length > 0) {
            const withS3Urls = parsed.asset_map.filter(item => item.s3_url);
            const withoutS3Urls = parsed.asset_map.length - withS3Urls.length;
            
            console.log(`   ✅ Entries with S3 URLs: ${withS3Urls.length}`);
            console.log(`   ⚠️  Entries without S3 URLs: ${withoutS3Urls}`);
            
            if (withS3Urls.length > 0) {
              console.log('\n   ✅ Image URLs were replaced:');
              withS3Urls.forEach((item, i) => {
                const url = item.original_url || 'N/A';
                console.log(`      [${i+1}] ${url.substring(0, 60)}...`);
                console.log(`          -> ${item.s3_url}`);
              });
            }
            
            if (withoutS3Urls > 0) {
              console.log('\n   ⚠️  Images without S3 URLs:');
              parsed.asset_map.filter(item => !item.s3_url).forEach((item, i) => {
                console.log(`      [${i+1}] ${item.original_url?.substring(0, 60) || 'N/A'}...`);
                if (item.problems && item.problems.length > 0) {
                  console.log(`          Problems: ${item.problems.join(', ')}`);
                }
              });
            }
          }
          
          // Check brand guide
          if (parsed.notes) {
            const brandGuideIssues = parsed.notes.filter(note => 
              note.includes('object Object') || 
              note.includes('unreadable object placeholder') ||
              note.includes('brand style guide')
            );
            if (brandGuideIssues.length > 0) {
              console.log('\n   ⚠️  Brand guide issues detected:');
              brandGuideIssues.forEach((issue, i) => {
                console.log(`      ${i+1}. ${issue.substring(0, 100)}...`);
              });
            } else {
              console.log('\n   ✅ Brand guide appears to have been read correctly');
            }
          }
          
          if (parsed.problems && parsed.problems.length > 0) {
            console.log('\n   ⚠️  Problems:');
            parsed.problems.forEach((problem, i) => {
              console.log(`      ${i+1}. ${problem}`);
            });
          }
        } catch (e) {
          console.log('   ⚠️  Could not parse output:', e.message);
        }
      }
      
      console.log(`\n💡 View full details: npm run check:run ${runId}`);
      console.log(`💡 Extract output: npm run get:output ${runId}`);
      
      // Exit with error if images weren't processed
      if (imageResults.length === 0 || imageResults.filter(r => r.success).length === 0) {
        console.log('\n❌ WARNING: Images were not processed successfully');
        process.exit(1);
      } else {
        console.log('\n✅ SUCCESS: Images were processed and workflow completed!');
        process.exit(0);
      }
    } else if (status === 'failed') {
      console.log('\n❌ Run failed');
      if (run.error) {
        console.log(`   Error: ${JSON.stringify(run.error, null, 2)}`);
      }
      if (run.output?.error) {
        console.log(`   Output error: ${run.output.error}`);
      }
      process.exit(1);
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  console.log('\n⏱️  Timeout waiting for run to complete');
  console.log(`   Run ID: ${runId}`);
  console.log(`   Current status: ${lastStatus}`);
  console.log(`   Check manually: npm run check:run ${runId}`);
  process.exit(1);
}

waitForCompletion();

