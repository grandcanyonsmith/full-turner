# Frontend Dashboard for Runs

A web dashboard to view all processing runs, their inputs/outputs, and visualize funnel JSON outputs as HTML.

## Files

- `index.html` - Main dashboard page
- `styles.css` - Styling
- `app.js` - Main application logic (API calls, state management)
- `renderer.js` - Funnel JSON to HTML renderer

## Setup

### Local Development

1. Serve the frontend files using a local web server:
   ```bash
   # Using Python
   cd frontend
   python3 -m http.server 8000
   
   # Or using Node.js http-server
   npx http-server frontend -p 8000
   ```

2. Configure the API endpoint in `app.js`:
   - Update `API_BASE_URL` to point to your API endpoint
   - For local development with SAM: `http://localhost:3000/api`
   - For production: Your API Gateway URL

3. Update CORS settings in your API if needed to allow requests from your frontend origin.

### API Configuration

The frontend expects the following API endpoints:

- `GET /api/runs` - List all runs (supports `?limit=100&lastKey=...` query params)
- `GET /api/runs/{runId}` - Get single run details

The API should return JSON with CORS headers enabled.

### Production Deployment

1. Upload the frontend files to a static hosting service (S3, CloudFront, etc.)
2. Set `window.API_BASE_URL` in your HTML or configure the API endpoint in `app.js`
3. Ensure CORS is configured on your API Gateway to allow requests from your frontend domain

## Features

- **Run List**: View all processing runs in a table with status, timestamp, and cost
- **Run Details**: Click any run to see:
  - Basic information (Run ID, Template ID, Status, Timestamps)
  - Input JSON (formatted)
  - Output JSON (formatted)
  - HTML Visualization (rendered funnel pages)
  - Image Processing Results
  - Cost Breakdown
- **HTML Visualization**: Preview funnel pages:
  - Opt-in Page
  - Thank You Page
  - Download Page
  - Email Preview

## Usage

1. Open `index.html` in a browser or serve via web server
2. The dashboard will automatically load all runs
3. Click "View" or click on a row to see run details
4. Use tabs to switch between different funnel page previews
5. Click "Close" to return to the runs list

## Customization

### API URL Configuration

Set `window.API_BASE_URL` before loading `app.js`:

```html
<script>
    window.API_BASE_URL = 'https://your-api-gateway-url.amazonaws.com/prod';
</script>
<script src="app.js"></script>
```

### Styling

Modify `styles.css` to customize the appearance.

### Funnel Rendering

Modify functions in `renderer.js` to customize how funnel JSON is rendered to HTML.

