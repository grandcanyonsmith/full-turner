# Full Turner

A workflow application that processes funnel templates and brand guidelines to generate brand-aligned content and images using OpenAI's GPT-5 and image generation capabilities.

## Features

- **Brand Alignment**: Automatically rewrites funnel content to match brand style guides
- **Image Processing**: Redesigns images using OpenAI's gpt-image-1 to match brand guidelines
- **AWS Integration**: Secure secret management via AWS Secrets Manager and S3 storage
- **Retry Logic**: Built-in retry with exponential backoff for resilient API calls
- **Timeout Handling**: Prevents hanging operations with configurable timeouts
- **Modular Architecture**: Clean separation of concerns with organized modules

## Project Structure

```
src/
├── config/          # Configuration management
├── services/        # External service integrations (AWS, OpenAI)
├── utils/           # Utility functions (file I/O, retry logic, image utils)
├── image/           # Image processing logic
├── agent/           # Agent configuration and workflow orchestration
└── index.js         # Main entry point
```

## Prerequisites

- Node.js 18+ (ES modules support)
- AWS CLI configured with appropriate credentials
- AWS Secrets Manager access for API keys
- S3 bucket access for image storage

## Installation

```bash
npm install
```

## Configuration

Configuration is managed through environment variables with sensible defaults. See `src/config/index.js` for all available options.

### Environment Variables

#### AWS Configuration
- `AWS_REGION` - AWS region (default: `us-west-2`)
- `S3_BUCKET` - S3 bucket name (default: `cc360-pages`)
- `S3_REGION` - S3 region (default: same as `AWS_REGION`)

#### AWS Secrets Manager
- `OPENAI_API_KEY_SECRET_NAME` - Secret name for OpenAI API key
- `OPENAI_TRACING_API_KEY_SECRET_NAME` - Secret name for tracing API key

#### OpenAI Configuration
- `OPENAI_MODEL` - Model to use (default: `gpt-5`)
- `OPENAI_IMAGE_MODEL` - Image generation model (default: `gpt-image-1`)
- `OPENAI_REASONING_EFFORT` - Reasoning effort level (default: `medium`)
- `OPENAI_REASONING_SUMMARY` - Reasoning summary mode (default: `auto`)

#### Image Processing
- `IMAGE_QUALITY` - Default image quality (default: `auto`)
- `IMAGE_TRANSPARENCY_QUALITY` - Quality for transparent images (default: `medium`)
- `IMAGE_OUTPUT_FORMAT` - Output format (default: `png`)
- `IMAGE_PARTIAL_IMAGES` - Number of partial images (default: `3`)

#### File Paths
- `BRAND_GUIDE_PATH` - Path to brand guide file (default: `brandguide.txt`)
- `TEMPLATE_FUNNEL_PATH` - Path to template funnel JSON (default: `template_funnel.json`)

#### Workflow
- `TRACE_SOURCE` - Trace source identifier (default: `agent-builder`)
- `WORKFLOW_ID` - Workflow ID for tracing (default: predefined ID)

## Usage

### Running the Workflow

```bash
node src/index.js
```

The workflow will:
1. Fetch API keys from AWS Secrets Manager
2. Read brand guide and template funnel files
3. Process all images (download, redesign, upload to S3)
4. Execute the agent to rewrite funnel content
5. Output the final result

### Programmatic Usage

```javascript
import { runWorkflow } from './src/agent/workflow.js';
import { getOpenAIKeyFromAWS } from './src/services/aws.js';

const apiKey = await getOpenAIKeyFromAWS();
const result = await runWorkflow({
  input_as_text: "Please rewrite the funnel JSON according to the brand style guide."
}, apiKey);

console.log(result.output_text);
```

## Architecture

### Modules

#### Config (`src/config/`)
Centralized configuration management with environment variable support and defaults.

#### Services (`src/services/`)
- **AWS**: Secrets Manager and S3 operations with retry logic
- Handles credential fetching, S3 uploads with retry on failures

#### Utils (`src/utils/`)
- **fileUtils**: File reading utilities with project root detection
- **imageUtils**: Image URL extraction, downloading, format conversion
- **retry**: Retry logic with exponential backoff and timeout handling

#### Image Processing (`src/image/`)
- **brandExtraction**: Parses brand guide for colors, typography, visual style
- **imageGeneration**: OpenAI image generation with streaming and timeout handling
- **index**: Orchestrates the image processing pipeline

#### Agent (`src/agent/`)
- **agent**: Agent configuration and instructions
- **workflow**: Main workflow orchestration

## Error Handling

The application includes comprehensive error handling:

- **Retry Logic**: AWS API calls automatically retry on transient failures (throttling, network errors)
- **Timeout Protection**: Image generation has a 5-minute timeout to prevent hanging
- **Error Context**: Errors include context about what operation failed
- **Graceful Degradation**: Image processing failures don't stop the entire workflow

## Development

### Code Organization

The codebase follows a modular structure:
- Each module has a single responsibility
- Configuration is centralized
- Services are abstracted for easy testing
- Utilities are reusable across modules

### Adding New Features

1. **Configuration**: Add new config options to `src/config/index.js`
2. **Services**: Add new service integrations to `src/services/`
3. **Utils**: Add reusable utilities to `src/utils/`
4. **Main Logic**: Extend modules in their respective directories

## Testing

Run syntax checks:
```bash
node --check src/index.js
```

## Troubleshooting

### AWS Credentials
Ensure AWS CLI is configured or environment variables are set:
```bash
aws configure
```

### Secret Names
If secrets aren't found, check the secret names in AWS Secrets Manager and update `src/config/index.js` or set environment variables.

### Image Processing Failures
- Check network connectivity
- Verify OpenAI API key has image generation permissions
- Ensure S3 bucket permissions allow uploads

## License

[Your License Here]

