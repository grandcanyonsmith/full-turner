/**
 * Main application logic for Runs Dashboard
 */

// Configure your API endpoint URL here
// For local development: 'http://localhost:8080/api' (mock API server)
// For production: Uses Lambda Function URL from Vercel environment variable
const API_BASE_URL = (() => {
    // Check if API_BASE_URL is set via window (from Vercel env var or manual config)
    if (window.API_BASE_URL && window.API_BASE_URL !== '%API_BASE_URL%') {
        const url = window.API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
        console.log('Using API_BASE_URL from window:', url);
        return url;
    }
    
    // Try to detect API URL from current location
    const origin = window.location.origin;
    
    // If running locally, use mock API server on port 8080
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        console.log('Using local API:', 'http://localhost:8080/api');
        return 'http://localhost:8080/api';
    }
    
    // For production, use the Lambda Function URL
    const lambdaUrl = 'https://i5of4xggwlglu3f477pzq24o7u0jrwms.lambda-url.us-west-2.on.aws';
    console.log('Using Lambda Function URL:', lambdaUrl);
    return lambdaUrl;
})();

console.log('API_BASE_URL initialized to:', API_BASE_URL);

let currentRuns = [];
let selectedRun = null;
let funnelTemplates = [];
let brandGuides = [];
let refreshInterval = null;
let detailRefreshInterval = null;

/**
 * Initialize the application
 */
async function init() {
    setupEventListeners();
    await Promise.all([
        loadRuns(),
        loadFunnelTemplates(),
        loadBrandGuides()
    ]);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', loadRuns);
    document.getElementById('closeDetailBtn').addEventListener('click', closeRunDetail);
    document.getElementById('newRunBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await showNewRunForm();
        } catch (error) {
            console.error('Error showing new run form:', error);
            showError('Failed to load form: ' + error.message);
        }
    });
    document.getElementById('closeFormBtn').addEventListener('click', hideNewRunForm);
    document.getElementById('cancelFormBtn').addEventListener('click', hideNewRunForm);
    
    // Form submission
    document.getElementById('createRunForm').addEventListener('submit', handleCreateRun);
    
    // Preview buttons - re-attach when form is shown
    const previewFunnelBtn = document.getElementById('previewFunnelBtn');
    const previewBrandBtn = document.getElementById('previewBrandBtn');
    
    if (previewFunnelBtn) {
        previewFunnelBtn.onclick = () => previewFunnelTemplate();
    }
    
    if (previewBrandBtn) {
        previewBrandBtn.onclick = () => previewBrandGuide();
    }
    
    document.getElementById('closePreviewBtn').addEventListener('click', hidePreview);
    
    // Enable preview buttons when selections change
    const funnelSelect = document.getElementById('funnelTemplateSelect');
    const brandSelect = document.getElementById('brandGuideSelect');
    
    if (funnelSelect) {
        funnelSelect.addEventListener('change', (e) => {
            document.getElementById('previewFunnelBtn').disabled = !e.target.value;
        });
    }
    
    if (brandSelect) {
        brandSelect.addEventListener('change', (e) => {
            document.getElementById('previewBrandBtn').disabled = !e.target.value;
        });
    }
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabType = e.target.dataset.tab;
            switchTab(tabType);
        });
    });
}

/**
 * Load runs from API
 */
async function loadRuns() {
    showLoading();
    hideError();
    hideRunsContainer();

    let timeoutId;
    try {
        console.log('Fetching runs from:', `${API_BASE_URL}/runs?limit=100`);
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${API_BASE_URL}/runs?limit=100`, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to load runs'}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);

        if (!data.success) {
            throw new Error(data.message || 'Failed to load runs');
        }

        currentRuns = data.runs || [];
        displayRuns(currentRuns);
        hideLoading();
        showRunsContainer();
        
        // Auto-refresh if there are pending/processing runs
        const hasActiveRuns = currentRuns.some(run => 
            run.status === 'pending' || run.status === 'processing'
        );
        
        if (hasActiveRuns && !refreshInterval) {
            console.log('Starting auto-refresh for active runs...');
            refreshInterval = setInterval(() => {
                console.log('Auto-refreshing runs list...');
                loadRuns().catch(error => {
                    console.error('Auto-refresh error:', error);
                });
            }, 10000); // Refresh every 10 seconds
        } else if (!hasActiveRuns && refreshInterval) {
            console.log('Stopping auto-refresh - no active runs');
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        console.error('Error loading runs:', error);
        
        let errorMessage = 'Failed to load runs. ';
        if (error.name === 'AbortError') {
            errorMessage += 'Request timed out. The API may be slow or unavailable.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Network error. Check if the API is accessible.';
        } else {
            errorMessage += error.message || 'Check console for details.';
        }
        
        showError(errorMessage);
        hideLoading();
        // Still show the container even if there's an error
        showRunsContainer();
    }
}

/**
 * Display runs in table
 */
function displayRuns(runs) {
    const tbody = document.getElementById('runsTableBody');
    tbody.innerHTML = '';

    if (runs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No runs found</td></tr>';
        return;
    }

    runs.forEach(run => {
        const tr = document.createElement('tr');
        tr.addEventListener('click', () => showRunDetail(run.runId));

        const statusClass = `status-${run.status || 'pending'}`;
        const statusText = (run.status || 'pending').charAt(0).toUpperCase() + (run.status || 'pending').slice(1);
        const cost = run.cost?.total || run.cost?.agent?.cost || 0;
        const timestamp = run.timestamp ? new Date(run.timestamp).toLocaleString() : 'N/A';

        tr.innerHTML = `
            <td>${truncate(run.runId, 20)}</td>
            <td>${run.templateId || 'N/A'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${timestamp}</td>
            <td>$${cost.toFixed(4)}</td>
            <td><button class="btn btn-primary btn-small" onclick="event.stopPropagation(); showRunDetail('${run.runId}')">View</button></td>
        `;

        tbody.appendChild(tr);
    });
}

/**
 * Show run detail
 */
async function showRunDetail(runId) {
    showLoading();
    hideError();
    
    // Clear any existing detail refresh interval
    if (detailRefreshInterval) {
        clearInterval(detailRefreshInterval);
        detailRefreshInterval = null;
    }

    try {
        await loadRunDetail(runId);
        
        // If run is pending or processing, auto-refresh every 5 seconds
        if (selectedRun && (selectedRun.status === 'pending' || selectedRun.status === 'processing')) {
            detailRefreshInterval = setInterval(async () => {
                console.log('Auto-refreshing run detail...');
                await loadRunDetail(runId);
                
                // Stop auto-refresh if run is completed or failed
                if (selectedRun && (selectedRun.status === 'completed' || selectedRun.status === 'failed')) {
                    clearInterval(detailRefreshInterval);
                    detailRefreshInterval = null;
                }
            }, 5000); // Refresh every 5 seconds
        }
        
        hideLoading();
        showRunDetailView();
    } catch (error) {
        console.error('Error loading run detail:', error);
        showError(error.message || 'Failed to load run details');
        hideLoading();
    }
}

/**
 * Load run detail data
 */
async function loadRunDetail(runId) {
    const response = await fetch(`${API_BASE_URL}/runs/${runId}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Failed to load run details');
    }

    selectedRun = data.run;
    displayRunDetail(selectedRun);
    
    // Also refresh the runs list if we're viewing the detail
    if (document.getElementById('runDetail').style.display !== 'none') {
        // Update the run in the current runs list
        const index = currentRuns.findIndex(r => r.runId === runId);
        if (index !== -1) {
            currentRuns[index] = selectedRun;
            displayRuns(currentRuns);
        }
    }
}

/**
 * Display run detail
 */
function displayRunDetail(run) {
    // Basic info
    const basicInfo = document.getElementById('basicInfo');
    basicInfo.innerHTML = `
        <div class="info-item">
            <div class="info-label">Run ID</div>
            <div class="info-value">${run.runId}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Template ID</div>
            <div class="info-value">${run.templateId || 'N/A'}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value"><span class="status-badge status-${run.status || 'pending'}">${(run.status || 'pending').charAt(0).toUpperCase() + (run.status || 'pending').slice(1)}</span></div>
        </div>
        <div class="info-item">
            <div class="info-label">Timestamp</div>
            <div class="info-value">${run.timestamp ? new Date(run.timestamp).toLocaleString() : 'N/A'}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Start Time</div>
            <div class="info-value">${run.startTime ? new Date(run.startTime).toLocaleString() : 'N/A'}</div>
        </div>
        <div class="info-item">
            <div class="info-label">End Time</div>
            <div class="info-value">${run.endTime ? new Date(run.endTime).toLocaleString() : 'N/A'}</div>
        </div>
        ${run.duration ? `
        <div class="info-item">
            <div class="info-label">Duration</div>
            <div class="info-value">${formatDuration(run.duration)}</div>
        </div>
        ` : ''}
    `;

    // Input
    const inputViewer = document.getElementById('inputViewer');
    inputViewer.textContent = JSON.stringify(run.input || {}, null, 2);

    // Output
    const outputViewer = document.getElementById('outputViewer');
    const outputRaw = run.output?.output_text || run.output || '';
    // Ensure outputText is always a string for parseOutput
    const outputText = typeof outputRaw === 'string' ? outputRaw : JSON.stringify(outputRaw, null, 2);
    outputViewer.textContent = outputText;

    // Parse and render funnel HTML
    const parsedOutput = parseOutput(outputText);
    if (parsedOutput && parsedOutput.funnel_json) {
        renderFunnelVisualization(parsedOutput.funnel_json);
    } else {
        // Try to render with raw output text
        renderFunnelVisualization([]);
    }

    // Image processing results
    displayImageResults(run.imageProcessingResults || []);

    // Cost breakdown
    displayCostBreakdown(run.cost || {});
}

/**
 * Render funnel visualization
 */
function renderFunnelVisualization(funnelJson) {
    const frame = document.getElementById('visualizationFrame');
    
    // Set default tab to opt-in page
    switchTab('opt');
    
    // Store funnel JSON for tab switching
    window.currentFunnelJson = funnelJson;
}

/**
 * Switch visualization tab
 */
function switchTab(tabType) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabType) {
            btn.classList.add('active');
        }
    });

    // Render HTML for selected tab
    const frame = document.getElementById('visualizationFrame');
    const funnelJson = window.currentFunnelJson || [];
    const html = renderFunnelHTML(funnelJson, tabType);
    
    // Write HTML to iframe
    frame.srcdoc = html;
}

/**
 * Display image processing results
 */
function displayImageResults(results) {
    const container = document.getElementById('imageResults');
    
    if (!results || results.length === 0) {
        container.innerHTML = '<p>No image processing results</p>';
        return;
    }

    container.innerHTML = '<div class="image-results"></div>';
    const resultsDiv = container.querySelector('.image-results');

    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'image-result-item';
        
        const success = result.success !== false;
        const s3Url = result.s3Url || result.url || '';
        
        item.innerHTML = `
            ${s3Url ? `<img src="${s3Url}" alt="${result.elementId || 'Image'}" onerror="this.style.display='none'">` : ''}
            <div class="image-info">
                <strong>Element ID:</strong> ${result.elementId || 'N/A'}<br>
                <strong>Status:</strong> ${success ? '<span style="color: green;">Success</span>' : '<span style="color: red;">Failed</span>'}<br>
                ${s3Url ? `<strong>S3 URL:</strong><br><span class="image-url">${s3Url}</span>` : ''}
            </div>
        `;

        resultsDiv.appendChild(item);
    });
}

/**
 * Display cost breakdown
 */
function displayCostBreakdown(cost) {
    const container = document.getElementById('costInfo');
    
    const total = cost.total || 0;
    const agentCost = cost.agent?.cost || cost.agent || 0;
    const imageCost = cost.images?.cost || cost.image || 0;
    const agentTokens = cost.agent?.tokens || {};
    const imagesGenerated = cost.images?.imagesGenerated || 0;

    container.innerHTML = `
        <div class="info-item">
            <div class="info-label">Total Cost</div>
            <div class="info-value">$${total.toFixed(4)}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Agent Cost</div>
            <div class="info-value">$${agentCost.toFixed(4)}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Image Cost</div>
            <div class="info-value">$${imageCost.toFixed(4)}</div>
        </div>
        ${agentTokens.input ? `
        <div class="info-item">
            <div class="info-label">Input Tokens</div>
            <div class="info-value">${agentTokens.input.toLocaleString()}</div>
        </div>
        ` : ''}
        ${agentTokens.output ? `
        <div class="info-item">
            <div class="info-label">Output Tokens</div>
            <div class="info-value">${agentTokens.output.toLocaleString()}</div>
        </div>
        ` : ''}
        ${imagesGenerated > 0 ? `
        <div class="info-item">
            <div class="info-label">Images Generated</div>
            <div class="info-value">${imagesGenerated}</div>
        </div>
        ` : ''}
    `;
}

/**
 * Utility functions
 */
function truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '...' : str;
}

function formatDuration(ms) {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.style.display = 'block';
    errorDiv.style.background = '#fee';
    errorDiv.style.borderColor = '#fcc';
    errorDiv.style.color = '#c33';
    document.getElementById('errorMessage').textContent = message;
}

function hideError() {
    const errorDiv = document.getElementById('error');
    errorDiv.style.display = 'none';
    errorDiv.style.background = '#fee';
    errorDiv.style.borderColor = '#fcc';
    errorDiv.style.color = '#c33';
}

function showRunsContainer() {
    document.getElementById('runsContainer').style.display = 'block';
}

function hideRunsContainer() {
    document.getElementById('runsContainer').style.display = 'none';
}

function showRunDetailView() {
    document.getElementById('runDetail').style.display = 'block';
    document.getElementById('runsContainer').style.display = 'none';
}

function closeRunDetail() {
    // Clear detail refresh interval when closing
    if (detailRefreshInterval) {
        clearInterval(detailRefreshInterval);
        detailRefreshInterval = null;
    }
    
    document.getElementById('runDetail').style.display = 'none';
    document.getElementById('runsContainer').style.display = 'block';
}

async function loadFunnelTemplates() {
    try {
        console.log('Fetching funnel templates from:', `${API_BASE_URL}/funnel-templates`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${API_BASE_URL}/funnel-templates`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok && response.status === 200) {
            const data = await response.json();
            if (data.success) {
                funnelTemplates = data.funnelTemplates || [];
                populateFunnelTemplateSelect();
            }
        }
    } catch (error) {
        console.error('Error loading funnel templates:', error);
    }
}

/**
 * Load brand guides from API
 */
async function loadBrandGuides() {
    try {
        console.log('Fetching brand guides from:', `${API_BASE_URL}/brand-guides`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${API_BASE_URL}/brand-guides`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok && response.status === 200) {
            const data = await response.json();
            if (data.success) {
                brandGuides = data.brandGuides || [];
                populateBrandGuideSelect();
            }
        }
    } catch (error) {
        console.error('Error loading brand guides:', error);
    }
}

/**
 * Populate funnel template select dropdown
 */
function populateFunnelTemplateSelect() {
    const select = document.getElementById('funnelTemplateSelect');
    if (!select) {
        console.warn('funnelTemplateSelect element not found');
        return;
    }
    
    // Clear existing options except the first one
    select.innerHTML = '<option value="">Select a funnel template...</option>';
    
    funnelTemplates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.funnelTemplateId;
        option.textContent = `${template.name}${template.description ? ` - ${template.description}` : ''}`;
        select.appendChild(option);
    });
}

/**
 * Populate brand guide select dropdown
 */
function populateBrandGuideSelect() {
    const select = document.getElementById('brandGuideSelect');
    if (!select) {
        console.warn('brandGuideSelect element not found');
        return;
    }
    
    // Clear existing options except the first one
    select.innerHTML = '<option value="">Select a brand guide...</option>';
    
    brandGuides.forEach(guide => {
        const option = document.createElement('option');
        option.value = guide.brandGuideId;
        option.textContent = `${guide.name}${guide.description ? ` - ${guide.description}` : ''}`;
        select.appendChild(option);
    });
}

/**
 * Show new run form
 */
async function showNewRunForm() {
    // Load templates and brand guides if not already loaded
    if (funnelTemplates.length === 0) {
        await loadFunnelTemplates();
    }
    if (brandGuides.length === 0) {
        await loadBrandGuides();
    }
    
    // Populate dropdowns
    populateFunnelTemplateSelect();
    populateBrandGuideSelect();
    
    document.getElementById('newRunForm').style.display = 'block';
    document.getElementById('runsContainer').style.display = 'none';
    document.getElementById('runDetail').style.display = 'none';
    
    // Reset form
    document.getElementById('createRunForm').reset();
    
    // Reset and re-attach change listeners
    const funnelSelect = document.getElementById('funnelTemplateSelect');
    const brandSelect = document.getElementById('brandGuideSelect');
    
    document.getElementById('previewFunnelBtn').disabled = true;
    document.getElementById('previewBrandBtn').disabled = true;
    
    // Re-attach change listeners to ensure they work
    funnelSelect.onchange = (e) => {
        document.getElementById('previewFunnelBtn').disabled = !e.target.value;
    };
    
    brandSelect.onchange = (e) => {
        document.getElementById('previewBrandBtn').disabled = !e.target.value;
    };
    
    // Re-attach preview button click handlers
    document.getElementById('previewFunnelBtn').onclick = () => previewFunnelTemplate();
    document.getElementById('previewBrandBtn').onclick = () => previewBrandGuide();
}

/**
 * Hide new run form
 */
function hideNewRunForm() {
    document.getElementById('newRunForm').style.display = 'none';
    document.getElementById('runsContainer').style.display = 'block';
    document.getElementById('createRunForm').reset();
}

/**
 * Handle create run form submission
 */
async function handleCreateRun(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        funnelTemplateId: formData.get('funnelTemplateId'),
        brandGuideId: formData.get('brandGuideId'),
        customInstructions: formData.get('customInstructions') || ''
    };

    if (!data.funnelTemplateId || !data.brandGuideId) {
        showError('Please select both a funnel template and brand guide');
        return;
    }

    showLoading();
    hideError();

    try {
        const response = await fetch(`${API_BASE_URL}/runs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to create run');
        }

        hideLoading();
        hideNewRunForm();
        await loadRuns();
        showSuccess(`Run created successfully! Run ID: ${result.runId}`);
    } catch (error) {
        console.error('Error creating run:', error);
        showError(error.message || 'Failed to create run');
        hideLoading();
    }
}

/**
 * Show success message
 */
function showSuccess(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.style.display = 'block';
    errorDiv.style.background = '#d4edda';
    errorDiv.style.borderColor = '#c3e6cb';
    errorDiv.style.color = '#155724';
    document.getElementById('errorMessage').textContent = message;
    
    // Hide after 5 seconds
    setTimeout(() => {
        hideError();
    }, 5000);
}

/**
 * Preview funnel template
 */
async function previewFunnelTemplate() {
    const select = document.getElementById('funnelTemplateSelect');
    const funnelTemplateId = select.value;
    
    if (!funnelTemplateId) {
        return;
    }
    
    // Fetch template data directly from API
    try {
        const response = await fetch(`${API_BASE_URL}/funnel-templates`);
        const data = await response.json();
        
        if (!data.success || !data.funnelTemplates) {
            showError('Failed to load templates');
            return;
        }
        
        const template = data.funnelTemplates.find(t => t.funnelTemplateId === funnelTemplateId);
        if (!template) {
            showError('Template not found');
            return;
        }
        
        showPreview('Funnel Template: ' + template.name, {
            description: template.description,
            funnelJson: template.funnelJson
        });
    } catch (error) {
        console.error('Error loading template:', error);
        showError('Failed to load template: ' + error.message);
    }
}

/**
 * Preview brand guide
 */
async function previewBrandGuide() {
    const select = document.getElementById('brandGuideSelect');
    const brandGuideId = select.value;
    
    if (!brandGuideId) {
        return;
    }
    
    // Fetch brand guide data directly from API
    try {
        const response = await fetch(`${API_BASE_URL}/brand-guides`);
        const data = await response.json();
        
        if (!data.success || !data.brandGuides) {
            showError('Failed to load brand guides');
            return;
        }
        
        const guide = data.brandGuides.find(g => g.brandGuideId === brandGuideId);
        if (!guide) {
            showError('Brand guide not found');
            return;
        }
        
        showPreview('Brand Guide: ' + guide.name, {
            description: guide.description,
            content: guide.content
        });
    } catch (error) {
        console.error('Error loading brand guide:', error);
        showError('Failed to load brand guide: ' + error.message);
    }
}

/**
 * Show preview modal
 */
function showPreview(title, data) {
    document.getElementById('previewTitle').textContent = title;
    const contentDiv = document.getElementById('previewContent');
    
    let html = '';
    
    if (data.description) {
        html += `<div style="margin-bottom: 20px;"><strong>Description:</strong> ${escapeHtml(data.description)}</div>`;
    }
    
    if (data.funnelJson) {
        html += '<div style="margin-bottom: 10px;"><strong>Funnel JSON:</strong></div>';
        html += `<div class="preview-content json"><pre>${escapeHtml(JSON.stringify(data.funnelJson, null, 2))}</pre></div>`;
    }
    
    if (data.content) {
        html += '<div style="margin-bottom: 10px;"><strong>Content:</strong></div>';
        html += `<div class="preview-content">${escapeHtml(data.content)}</div>`;
    }
    
    contentDiv.innerHTML = html;
    document.getElementById('previewModal').style.display = 'flex';
}

/**
 * Hide preview modal
 */
function hidePreview() {
    document.getElementById('previewModal').style.display = 'none';
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

