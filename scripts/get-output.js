#!/usr/bin/env node
/**
 * Extract and format run output
 */

import { getRun } from '../src/services/database.js';

const runId = process.argv[2];

if (!runId) {
  console.error('Usage: node scripts/get-output.js <runId>');
  process.exit(1);
}

async function getOutput() {
  try {
    const run = await getRun(runId);
    
    if (!run) {
      console.error(`❌ Run ${runId} not found`);
      process.exit(1);
    }
    
    if (run.status !== 'completed') {
      console.error(`⚠️  Run status: ${run.status}`);
      console.log('Run must be completed to view output.');
      if (run.output?.error) {
        console.log('\nError:', run.output.error);
      }
      process.exit(1);
    }
    
    if (!run.output?.output_text) {
      console.error('❌ No output found for this run');
      process.exit(1);
    }
    
    // Parse the output text (it's a JSON string)
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(run.output.output_text);
    } catch (e) {
      console.error('❌ Failed to parse output as JSON');
      console.log('Raw output:', run.output.output_text);
      process.exit(1);
    }
    
    // Extract funnel_json
    const funnelJson = parsedOutput.funnel_json || parsedOutput;
    
    // Write to file
    const fs = await import('fs');
    const outputFile = `output-${runId}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(funnelJson, null, 2));
    
    console.log(`✅ Output extracted successfully!`);
    console.log(`\n📊 Summary:`);
    console.log(`   Elements: ${Array.isArray(funnelJson) ? funnelJson.length : 'N/A'}`);
    console.log(`   Output file: ${outputFile}`);
    
    if (parsedOutput.asset_map) {
      console.log(`   Images processed: ${parsedOutput.asset_map.length}`);
    }
    
    if (parsedOutput.notes && parsedOutput.notes.length > 0) {
      console.log(`\n📝 Processing Notes:`);
      parsedOutput.notes.forEach((note, idx) => {
        console.log(`   ${idx + 1}. ${note}`);
      });
    }
    
    if (parsedOutput.problems && parsedOutput.problems.length > 0) {
      console.log(`\n⚠️  Issues:`);
      parsedOutput.problems.forEach((problem, idx) => {
        console.log(`   ${idx + 1}. ${problem}`);
      });
    }
    
    console.log(`\n📄 Output preview (first 5 elements):`);
    if (Array.isArray(funnelJson)) {
      funnelJson.slice(0, 5).forEach((el, idx) => {
        console.log(`   ${idx + 1}. ${el.element_id} (${el.type})`);
      });
      if (funnelJson.length > 5) {
        console.log(`   ... and ${funnelJson.length - 5} more`);
      }
    }
    
    console.log(`\n💡 View full output in: ${outputFile}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getOutput();

