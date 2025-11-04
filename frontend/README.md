# Frontend Dashboard for Runs

A React + TypeScript web dashboard to view all processing runs, their inputs/outputs, and visualize funnel JSON outputs as HTML.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server

## Setup

### Local Development

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. The app will be available at `http://localhost:5173`

4. For local API testing, start the mock API server:
   ```bash
   node mock-api.js
   ```

### Building for Production

```bash
cd frontend
npm run build
```

The built files will be in the `frontend/dist` directory.

### API Configuration

The frontend expects the following API endpoints:

- `GET /runs` - List all runs (supports `?limit=100&lastKey=...` query params)
- `GET /runs/{runId}` - Get single run details
- `POST /runs` - Create new run
- `GET /funnel-templates` - List funnel templates
- `GET /funnel-templates/{id}` - Get single funnel template
- `POST /funnel-templates` - Create funnel template
- `PUT /funnel-templates/{id}` - Update funnel template
- `DELETE /funnel-templates/{id}` - Delete funnel template
- `GET /brand-guides` - List brand guides
- `GET /brand-guides/{id}` - Get single brand guide
- `POST /brand-guides` - Create brand guide
- `PUT /brand-guides/{id}` - Update brand guide
- `DELETE /brand-guides/{id}` - Delete brand guide

The API URL is automatically detected:
- Local development: `http://localhost:8080/api` (when running mock API)
- Production: Uses `window.API_BASE_URL` or Lambda Function URL

## Features

- **Run List**: View all processing runs in a table with status, timestamp, and cost
- **Run Details**: Click any run to see:
  - Basic information (Run ID, Template ID, Status, Timestamps)
  - Input JSON (formatted)
  - Output JSON (formatted)
  - HTML Visualization (rendered funnel pages)
  - Image Processing Results
  - Cost Breakdown
- **Create Runs**: Create new processing runs with template and brand guide selection
- **HTML Visualization**: Preview funnel pages:
  - Opt-in Page
  - Thank You Page
  - Download Page
  - Email Preview
- **Template Management**: Create, edit, and delete funnel templates
- **Brand Guide Management**: Create, edit, and delete brand guides

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── RunsList.tsx
│   │   ├── RunDetail.tsx
│   │   ├── NewRunForm.tsx
│   │   ├── ManagementModal.tsx
│   │   ├── PreviewModal.tsx
│   │   ├── EditFunnelTemplateModal.tsx
│   │   └── EditBrandGuideModal.tsx
│   ├── utils/               # Utility functions
│   │   ├── api.ts           # API client
│   │   ├── renderer.ts      # Funnel HTML renderer
│   │   └── helpers.ts       # Helper functions
│   ├── types.ts             # TypeScript type definitions
│   ├── types.d.ts           # Global type declarations
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── index.html               # HTML template
├── styles.css               # Global styles
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

## Customization

### API URL Configuration

Set `window.API_BASE_URL` in `index.html`:

```html
<script>
    window.API_BASE_URL = 'https://your-api-url.com';
</script>
```

### Styling

Modify `styles.css` to customize the appearance.

### Funnel Rendering

Modify functions in `src/utils/renderer.ts` to customize how funnel JSON is rendered to HTML.
