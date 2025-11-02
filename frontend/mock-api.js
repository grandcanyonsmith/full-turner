/**
 * Simple mock API server for testing frontend
 * Run with: node mock-api.js
 */

import http from 'http';

const PORT = process.env.PORT || 8080;

// Mock runs data
const mockRuns = [
    {
        runId: 'run-001',
        templateId: 'boxing-course-template',
        status: 'completed',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date(Date.now() - 86400000 + 5000).toISOString(),
        duration: 5000,
        input: {
            input_as_text: 'Please rewrite the funnel JSON according to the brand style guide and avatar provided.'
        },
        output: {
            output_text: JSON.stringify({
                funnel_json: [
                    { element_id: 'opt_brand_name', type: 'character', text: 'Canyon Smith Boxing' },
                    { element_id: 'opt_logo_url', type: 'image', url: 'https://via.placeholder.com/277x100.png' },
                    { element_id: 'opt_meta_title', type: 'character', text: 'Learn How to Box | Canyon Smith Boxing' },
                    { element_id: 'opt_image_url', type: 'image', url: 'https://via.placeholder.com/800x400.png' },
                    { element_id: 'opt_form_headline', type: 'character', text: 'Enter Your Email to Get Started' },
                    { element_id: 'opt_form_subtext', type: 'character', text: 'Start your boxing journey today!' },
                    { element_id: 'opt_form_button_text', type: 'character', text: 'Get Started' },
                    { element_id: 'opt_color_brand', type: 'character', text: '#E74C3C' },
                    { element_id: 'opt_color_text_primary', type: 'character', text: '#2C3E50' },
                    { element_id: 'ty_headline', type: 'character', text: 'Thank You!' },
                    { element_id: 'ty_message', type: 'character', text: 'Check your email for next steps.' },
                    { element_id: 'dl_headline', type: 'character', text: 'Download Your Guide' },
                    { element_id: 'email_subject', type: 'character', text: 'Welcome to Canyon Smith Boxing' },
                    { element_id: 'email_headline', type: 'character', text: 'Welcome!' },
                    { element_id: 'email_body', type: 'character', text: '<p>Thank you for joining!</p>' }
                ],
                asset_map: [],
                notes: [],
                problems: []
            }, null, 2)
        },
        cost: {
            total: 0.14,
            agent: {
                cost: 0.10,
                tokens: {
                    input: 1500,
                    output: 800,
                    total: 2300
                }
            },
            images: {
                cost: 0.04,
                imagesGenerated: 2
            }
        },
        imageProcessingResults: [
            {
                elementId: 'opt_logo_url',
                success: true,
                s3Url: 'https://cc360-pages.s3.us-west-2.amazonaws.com/mock-logo.png'
            },
            {
                elementId: 'opt_image_url',
                success: true,
                s3Url: 'https://cc360-pages.s3.us-west-2.amazonaws.com/mock-hero.png'
            }
        ]
    },
    {
        runId: 'run-002',
        templateId: 'test-template-1',
        status: 'pending',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        cost: { total: 0 },
        input: {
            input_as_text: 'Test run'
        }
    },
    {
        runId: 'run-003',
        templateId: 'boxing-course-template',
        status: 'completed',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        startTime: new Date(Date.now() - 7200000).toISOString(),
        endTime: new Date(Date.now() - 7200000 + 8000).toISOString(),
        duration: 8000,
        input: {
            input_as_text: 'Another test'
        },
        output: {
            output_text: '{"funnel_json": [], "asset_map": [], "notes": [], "problems": []}'
        },
        cost: {
            total: 0.08,
            agent: { cost: 0.05 },
            images: { cost: 0.03 }
        },
        imageProcessingResults: []
    }
];

// Mock funnel templates data
const mockFunnelTemplates = [
    {
        funnelTemplateId: 'funnel-001',
        name: 'Hospital Bag Checklist Template',
        description: 'Template for hospital bag checklist lead magnet',
        funnelJson: [
            { "element_id": "opt_brand_name", "type": "character", "text": "Built to Birth" },
            { "element_id": "opt_logo_url", "type": "image", "url": "https://assets.cdn.filesafe.space/p9xZlSGZDreM38qWt8rE/media/65d399e8408181aae169906e.png", "width": 277, "height": 100, "alt_text": "Built to Birth logo", "transparent_bg": false },
            { "element_id": "opt_form_headline", "type": "character", "text": "Enter Your Email to Get Instant Access" },
            { "element_id": "opt_form_subtext", "type": "character", "text": "Your toolkit will be sent immediately. No spam, ever." },
            { "element_id": "opt_form_button_text", "type": "character", "text": "Send Me The Toolkit" },
            { "element_id": "ty_headline", "type": "character", "text": "Your Hospital Bag Checklist Is On Its Way!" },
            { "element_id": "ty_message", "type": "character", "text": "We just emailed you the link to the checklist." },
            { "element_id": "opt_color_brand", "type": "character", "text": "#DC6B82" },
            { "element_id": "opt_color_brand_2", "type": "character", "text": "#F2A6B7" }
        ],
        status: 'active',
        createdAt: new Date().toISOString()
    },
    {
        funnelTemplateId: 'funnel-002',
        name: 'Boxing Course Template',
        description: 'Template for boxing course lead magnet',
        funnelJson: [
            { "element_id": "opt_brand_name", "type": "character", "text": "Canyon Smith Boxing" },
            { "element_id": "opt_logo_url", "type": "image", "url": "https://via.placeholder.com/277x100.png", "width": 277, "height": 100, "alt_text": "Boxing Logo", "transparent_bg": true },
            { "element_id": "opt_form_headline", "type": "character", "text": "Enter Your Email to Get Started" },
            { "element_id": "opt_form_subtext", "type": "character", "text": "Start your boxing journey today!" },
            { "element_id": "opt_form_button_text", "type": "character", "text": "Get Started" },
            { "element_id": "ty_headline", "type": "character", "text": "Thank You!" },
            { "element_id": "ty_message", "type": "character", "text": "Check your email for next steps." },
            { "element_id": "opt_color_brand", "type": "character", "text": "#E74C3C" },
            { "element_id": "opt_color_text_primary", "type": "character", "text": "#2C3E50" }
        ],
        status: 'active',
        createdAt: new Date().toISOString()
    }
];

// Mock brand guides data
const mockBrandGuides = [
    {
        brandGuideId: 'brand-001',
        name: 'Built to Birth Brand Guide',
        description: 'Brand style guide for Built to Birth',
        content: `Brand Style Guide & Avatar:
================================================================================
Built to Birth - Brand Style Guide
================================================================================

Brand Colors:
- Primary: #DC6B82
- Secondary: #F2A6B7
- Background Hero: #0A0C14
- Background Section: #0E1422

Brand Voice:
- Trusted advisor
- Supportive and empowering
- Evidence-based
- Professional yet warm

Tone Guidelines:
- Use clear, direct language
- Avoid hype or condescending tone
- Focus on practical, actionable advice
- Maintain professional sophistication`,
        status: 'active',
        createdAt: new Date().toISOString()
    },
    {
        brandGuideId: 'brand-002',
        name: 'Canyon Smith Boxing Brand Guide',
        description: 'Brand style guide for Canyon Smith Boxing',
        content: `Brand Style Guide & Avatar:
================================================================================
Canyon Smith Boxing - Brand Style Guide
================================================================================

Brand Colors:
- Primary: #E74C3C
- Text Primary: #2C3E50
- Background: #FFFFFF

Brand Voice:
- Athletic and motivational
- Direct and action-oriented
- Empowering
- Professional coaching tone

Tone Guidelines:
- Use energetic, motivating language
- Focus on achievement and progress
- Maintain professional coaching standards
- Inspire confidence and determination`,
        status: 'active',
        createdAt: new Date().toISOString()
    }
];

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const queryParams = url.searchParams;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // GET /api/runs - List all runs
    if (path === '/api/runs' && req.method === 'GET') {
        const limit = parseInt(queryParams.get('limit') || '100', 10);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            runs: mockRuns.slice(0, limit),
            lastKey: null,
            count: mockRuns.length
        }));
        return;
    }

    // GET /api/runs/:runId - Get single run
    const runMatch = path.match(/^\/api\/runs\/(.+)$/);
    if (runMatch && req.method === 'GET') {
        const runId = runMatch[1];
        const run = mockRuns.find(r => r.runId === runId);
        
        if (run) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                run
            }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Run not found',
                message: `Run with ID ${runId} not found`
            }));
        }
        return;
    }

    // GET /api/funnel-templates - List funnel templates
    if (path === '/api/funnel-templates' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            funnelTemplates: mockFunnelTemplates
        }));
        return;
    }

    // GET /api/brand-guides - List brand guides
    if (path === '/api/brand-guides' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            brandGuides: mockBrandGuides
        }));
        return;
    }

    // POST /api/runs - Create new run
    if (path === '/api/runs' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                if (!data.funnelTemplateId || !data.brandGuideId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'Missing required fields',
                        message: 'funnelTemplateId and brandGuideId are required'
                    }));
                    return;
                }

                // Create new run
                const newRun = {
                    runId: `run-${Date.now()}`,
                    templateId: data.funnelTemplateId,
                    status: 'pending',
                    timestamp: new Date().toISOString(),
                    startTime: new Date().toISOString(),
                    input: {
                        funnelTemplateId: data.funnelTemplateId,
                        brandGuideId: data.brandGuideId,
                        customInstructions: data.customInstructions || ''
                    },
                    cost: { total: 0 }
                };

                mockRuns.unshift(newRun); // Add to beginning

                res.writeHead(202, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    runId: newRun.runId,
                    message: 'Run created and processing started',
                    timestamp: new Date().toISOString()
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'Invalid JSON',
                    message: e.message
                }));
            }
        });
        return;
    }

    // 404 for other paths
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        error: 'Not found',
        message: `Endpoint ${path} not found`
    }));
});

server.listen(PORT, () => {
    console.log(`Mock API server running on http://localhost:${PORT}`);
    console.log(`Available endpoints:`);
    console.log(`  GET /api/runs - List all runs`);
    console.log(`  GET /api/runs/:runId - Get single run`);
    console.log(`  POST /api/runs - Create new run`);
    console.log(`  GET /api/funnel-templates - List funnel templates`);
    console.log(`  GET /api/brand-guides - List brand guides`);
});

