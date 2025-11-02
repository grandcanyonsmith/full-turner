# Full Turner - AWS Lambda + Step Functions Architecture

## Overview

This application has been transformed into a serverless architecture using AWS Lambda functions orchestrated by Step Functions, with DynamoDB for data persistence and CloudWatch for structured logging.

## Architecture Components

### DynamoDB Tables

1. **Templates Table** (`templates`)
   - Stores template definitions with brand guides and funnel JSON
   - Partition Key: `templateId`
   - Sort Key: `version`
   - Fields: `name`, `description`, `brandGuideContent`, `templateFunnelJson`, `status`, `metadata`

2. **Processing Runs Table** (`processingRuns`)
   - Tracks each workflow execution
   - Partition Key: `runId`
   - Sort Key: `timestamp`
   - GSI: `templateId-timestamp-index` for querying runs by template
   - Fields: `templateId`, `status`, `input`, `output`, `cost`, `imageProcessingResults`, `duration`

3. **Output Logs Table** (`outputLogs`)
   - Stores detailed logs for each run
   - Partition Key: `runId`
   - Sort Key: `logType`
   - Fields: `level`, `message`, `data`, `timestamp`, `requestId`

### Lambda Functions

1. **InitializeRun** - Creates a new processing run record
2. **LoadTemplate** - Fetches template from DynamoDB
3. **ProcessImagesBatch** - Prepares images for parallel processing
4. **ProcessImage** - Processes a single image (called in parallel via Map state)
5. **AggregateImageResults** - Aggregates image processing results
6. **ExecuteAgent** - Runs OpenAI agent to rewrite funnel content
7. **SaveOutput** - Saves final output and updates run status
8. **HandleFailure** - Handles errors and updates run status

### Step Functions Workflow

The workflow orchestrates the following steps:

1. **InitializeRun** → Create run record
2. **LoadTemplate** → Fetch template data
3. **ProcessImagesBatch** → Prepare image processing
4. **ProcessImagesMap** → Process images in parallel (max 3 concurrent)
5. **AggregateImageResults** → Aggregate results
6. **ExecuteAgent** → Execute OpenAI agent
7. **SaveOutput** → Save output and costs

Each step has error handling that routes to **HandleFailure** on errors.

## Cost Tracking

### Features

- **Token Usage Tracking**: Tracks input, output, and reasoning tokens from OpenAI API calls
- **Image Generation Costs**: Tracks costs per image generation call
- **Cost Aggregation**: Aggregates costs across agent execution and image processing
- **Cost Storage**: Stores cost breakdown in DynamoDB for each run

### Cost Calculation

Costs are calculated based on OpenAI pricing:
- **GPT-5**: $30/1M input tokens, $120/1M output tokens
- **GPT-Image-1**: $0.04 per standard image, $0.08 per HD image

Costs are stored in the `processingRuns` table with breakdown:
```json
{
  "total": 0.15,
  "agent": 0.10,
  "image": 0.05,
  "details": {
    "agent": {
      "calls": 1,
      "tokens": { "input": 1000, "output": 500, "reasoning": 200 },
      "cost": 0.10
    },
    "images": {
      "calls": 3,
      "imagesGenerated": 3,
      "cost": 0.05
    }
  }
}
```

## Structured Logging

### Log Format

All logs are structured JSON sent to CloudWatch Logs:

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "INFO",
  "requestId": "abc123",
  "runId": "run-123",
  "templateId": "template-456",
  "message": "Processing image",
  "data": { "elementId": "opt_logo_url" },
  "duration": 1234
}
```

### Log Levels

- **DEBUG**: Detailed debugging information
- **INFO**: General informational messages
- **WARN**: Warning messages
- **ERROR**: Error messages with stack traces

### Special Log Types

- **metric**: Performance metrics with duration
- **cost**: Cost tracking logs

## Deployment

### Prerequisites

- AWS SAM CLI installed
- AWS CLI configured with appropriate credentials
- Node.js 20.x

### Build and Deploy

```bash
# Install dependencies
npm install

# Build the application
sam build

# Deploy
sam deploy --guided
```

### Environment Variables

Set via SAM template parameters or Lambda environment variables:

- `TEMPLATES_TABLE`: DynamoDB table name for templates
- `PROCESSING_RUNS_TABLE`: DynamoDB table name for runs
- `OUTPUT_LOGS_TABLE`: DynamoDB table name for logs
- `S3_BUCKET`: S3 bucket for images
- `OPENAI_MODEL`: OpenAI model (default: gpt-5)
- `OPENAI_IMAGE_MODEL`: Image model (default: gpt-image-1)

## Usage

### Starting a Workflow Execution

```javascript
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

const client = new SFNClient({ region: 'us-west-2' });

const result = await client.send(new StartExecutionCommand({
  stateMachineArn: 'arn:aws:states:...',
  input: JSON.stringify({
    templateId: 'template-123',
    templateVersion: 'latest',
    input: {
      input_as_text: 'Please rewrite the funnel JSON...'
    }
  })
}));
```

### Querying Run History

```javascript
import { getRunHistory } from './src/services/database.js';

const runs = await getRunHistory('template-123', 10);
runs.forEach(run => {
  console.log(`Run ${run.runId}: ${run.status}, Cost: $${run.cost.total}`);
});
```

### Viewing Logs

Logs are automatically sent to CloudWatch Logs. You can query them:

```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/full-turner \
  --filter-pattern '{ $.runId = "run-123" }'
```

## Cost Tracking in Database

Each processing run includes cost information:

```javascript
const run = await getRun('run-123');
console.log(`Total Cost: $${run.cost.total}`);
console.log(`Agent Cost: $${run.cost.agent}`);
console.log(`Image Cost: $${run.cost.image}`);
console.log(`Details:`, run.cost.details);
```

## Monitoring

- **CloudWatch Metrics**: Automatic Lambda metrics (invocations, errors, duration)
- **CloudWatch Logs**: Structured logs with request correlation
- **DynamoDB Metrics**: Table read/write metrics
- **Step Functions**: Execution history and visual workflow

## Benefits

1. **Scalability**: Automatic scaling with Lambda
2. **Cost Tracking**: Per-run cost tracking and aggregation
3. **Reliability**: Error handling and retries at each step
4. **Observability**: Structured logging and CloudWatch integration
5. **Auditability**: Complete history in DynamoDB
6. **Parallel Processing**: Images processed in parallel for speed
7. **State Management**: Step Functions manages workflow state

