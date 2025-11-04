#!/usr/bin/env node
/**
 * End-to-end test script
 * Tests:
 * 1. Dynamic HTML rendering with funnel templates
 * 2. Cost calculation fixes
 * 3. Pattern-based element detection
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Import renderer functions
const rendererPath = join(projectRoot, 'frontend', 'renderer.js');
const rendererModule = await import('file://' + rendererPath);

// Test data
const testFunnelTemplate = [
    { element_id: "opt_brand_name", type: "character", text: "Test Brand" },
    { element_id: "opt_logo_url", type: "image", url: "https://example.com/logo.png" },
    { element_id: "opt_meta_title", type: "character", text: "Test Page" },
    { element_id: "opt_form_headline", type: "character", text: "Get Started" },
    { element_id: "opt_form_button_text", type: "character", text: "Submit" },
    { element_id: "opt_hero_tag", type: "character", text: "FREE GUIDE" },
    { element_id: "opt_hero_headline", type: "character", text: "Welcome to Our Service" },
    { element_id: "opt_hero_subheadline", type: "character", text: "Get everything you need" },
    { element_id: "opt_pain_1", type: "character", text: "Pain point 1" },
    { element_id: "opt_pain_2", type: "character", text: "Pain point 2" },
    { element_id: "opt_pain_3", type: "character", text: "Pain point 3" },
    { element_id: "opt_outcome_1", type: "character", text: "Outcome 1" },
    { element_id: "opt_outcome_2", type: "character", text: "Outcome 2" },
    { element_id: "opt_benefit_1", type: "character", text: "Benefit 1" },
    { element_id: "opt_benefit_2", type: "character", text: "Benefit 2" },
    { element_id: "opt_color_brand", type: "character", text: "#FF5733" },
    { element_id: "opt_color_brand_2", type: "character", text: "#FF8C69" },
    { element_id: "opt_color_bg_hero", type: "character", text: "#FFFFFF" },
    { element_id: "opt_color_bg_section", type: "character", text: "#F5F5F5" },
    { element_id: "opt_color_text_primary", type: "character", text: "#333333" },
    { element_id: "opt_color_text_secondary", type: "character", text: "#666666" },
    { element_id: "ty_headline", type: "character", text: "Thank You!" },
    { element_id: "ty_message", type: "character", text: "Check your email" },
    { element_id: "ty_inside_1", type: "character", text: "Inside item 1" },
    { element_id: "ty_inside_2", type: "character", text: "Inside item 2" },
    { element_id: "ty_inside_3", type: "character", text: "Inside item 3" },
    { element_id: "ty_inside_4", type: "character", text: "Inside item 4" },
];

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        testsPassed++;
    } catch (error) {
        console.error(`❌ ${name}`);
        console.error(`   Error: ${error.message}`);
        testsFailed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

console.log('🧪 Running E2E Tests\n');
console.log('='.repeat(60));

// Test 1: Pattern-based element detection
test('Pattern-based element detection (opt_pain_*)', () => {
    const painPoints = rendererModule.getElementsByPatternAsValues(testFunnelTemplate, 'opt_pain_*');
    assert(painPoints.length === 3, `Expected 3 pain points, got ${painPoints.length}`);
    assert(painPoints[0] === 'Pain point 1', 'First pain point incorrect');
    assert(painPoints[1] === 'Pain point 2', 'Second pain point incorrect');
    assert(painPoints[2] === 'Pain point 3', 'Third pain point incorrect');
});

test('Pattern-based element detection (opt_outcome_*)', () => {
    const outcomes = rendererModule.getElementsByPatternAsValues(testFunnelTemplate, 'opt_outcome_*');
    assert(outcomes.length === 2, `Expected 2 outcomes, got ${outcomes.length}`);
});

test('Pattern-based element detection (opt_benefit_*)', () => {
    const benefits = rendererModule.getElementsByPatternAsValues(testFunnelTemplate, 'opt_benefit_*');
    assert(benefits.length === 2, `Expected 2 benefits, got ${benefits.length}`);
});

test('Pattern-based element detection (ty_inside_*)', () => {
    const insideItems = rendererModule.getElementsByPatternAsValues(testFunnelTemplate, 'ty_inside_*');
    assert(insideItems.length === 4, `Expected 4 inside items, got ${insideItems.length}`);
});

// Test 2: HTML Rendering
test('Opt-in page renders with dynamic sections', () => {
    const html = rendererModule.renderOptInPage(testFunnelTemplate);
    assert(html.includes('Test Brand'), 'Brand name not found in HTML');
    assert(html.includes('FREE GUIDE'), 'Hero tag not found in HTML');
    assert(html.includes('Welcome to Our Service'), 'Hero headline not found in HTML');
    assert(html.includes('Pain point 1'), 'Pain points not found in HTML');
    assert(html.includes('Outcome 1'), 'Outcomes not found in HTML');
    assert(html.includes('Benefit 1'), 'Benefits not found in HTML');
    assert(html.includes('#FF5733'), 'Brand color not found in HTML');
});

test('Thank you page renders with dynamic inside items', () => {
    const html = rendererModule.renderThankYouPage(testFunnelTemplate);
    assert(html.includes('Thank You!'), 'Headline not found in HTML');
    assert(html.includes('Check your email'), 'Message not found in HTML');
    assert(html.includes('Inside item 1'), 'Inside item 1 not found');
    assert(html.includes('Inside item 4'), 'Inside item 4 not found (should render all items)');
});

test('Opt-in page handles missing optional sections gracefully', () => {
    const minimalTemplate = [
        { element_id: "opt_brand_name", type: "character", text: "Minimal Brand" },
        { element_id: "opt_form_headline", type: "character", text: "Enter Email" },
        { element_id: "opt_color_brand", type: "character", text: "#000000" },
    ];
    const html = rendererModule.renderOptInPage(minimalTemplate);
    assert(html.includes('Minimal Brand'), 'Brand name not found');
    assert(html.includes('Enter Email'), 'Form headline not found');
    // Should not crash even without optional sections
});

// Test 3: Cost calculation fix
test('Cost calculation handles object vs number correctly', () => {
    // Simulate the cost extraction logic from app.js
    function extractCost(cost) {
        let agentCost = 0;
        if (cost?.agent) {
            if (typeof cost.agent === 'number') {
                agentCost = cost.agent;
            } else if (typeof cost.agent.cost === 'number') {
                agentCost = cost.agent.cost;
            }
        }
        return agentCost;
    }

    // Test case 1: cost.agent is a number
    const cost1 = { agent: 0.05 };
    assert(extractCost(cost1) === 0.05, 'Failed to extract number cost');

    // Test case 2: cost.agent is an object with cost property
    const cost2 = { agent: { cost: 0.10, tokens: { input: 1000, output: 500 } } };
    assert(extractCost(cost2) === 0.10, 'Failed to extract object cost');

    // Test case 3: cost.agent is an object without cost property
    const cost3 = { agent: { tokens: { input: 1000 } } };
    assert(extractCost(cost3) === 0, 'Should return 0 when cost property missing');

    // Test case 4: cost.agent is undefined
    const cost4 = {};
    assert(extractCost(cost4) === 0, 'Should return 0 when agent is undefined');

    // Test case 5: cost.agent.cost is 0 (should still work)
    const cost5 = { agent: { cost: 0 } };
    assert(extractCost(cost5) === 0, 'Should handle zero cost correctly');
});

test('Cost toFixed works correctly after extraction', () => {
    function extractAndFormatCost(cost) {
        let agentCost = 0;
        if (cost?.agent) {
            if (typeof cost.agent === 'number') {
                agentCost = cost.agent;
            } else if (typeof cost.agent.cost === 'number') {
                agentCost = cost.agent.cost;
            }
        }
        return agentCost.toFixed(4);
    }

    const cost1 = { agent: 0.05 };
    assert(extractAndFormatCost(cost1) === '0.0500', 'Failed to format number cost');

    const cost2 = { agent: { cost: 0.123456 } };
    assert(extractAndFormatCost(cost2) === '0.1235', 'Failed to format object cost');

    const cost3 = { agent: { cost: 0 } };
    assert(extractAndFormatCost(cost3) === '0.0000', 'Failed to format zero cost');
});

// Test 4: Element value extraction
test('getElementValue extracts text correctly', () => {
    const element1 = { element_id: "test", type: "character", text: "Test text" };
    assert(rendererModule.getElementValue(element1) === 'Test text', 'Failed to extract text');

    const element2 = { element_id: "test", type: "image", url: "https://example.com/image.png" };
    assert(rendererModule.getElementValue(element2) === 'https://example.com/image.png', 'Failed to extract url');

    const element3 = { element_id: "test", type: "character", value: "Test value" };
    assert(rendererModule.getElementValue(element3) === 'Test value', 'Failed to extract value');
});

// Test 5: Backward compatibility
test('Backward compatibility with simple templates', () => {
    const simpleTemplate = [
        { element_id: "opt_brand_name", type: "character", text: "Simple Brand" },
        { element_id: "opt_form_headline", type: "character", text: "Enter Email" },
    ];
    const html = rendererModule.renderOptInPage(simpleTemplate);
    assert(html.includes('Simple Brand'), 'Simple template not rendered correctly');
    assert(html.includes('Enter Email'), 'Form headline not found');
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Test Results:`);
console.log(`   ✅ Passed: ${testsPassed}`);
console.log(`   ❌ Failed: ${testsFailed}`);
console.log(`   📈 Total:  ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
}

