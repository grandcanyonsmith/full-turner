# Local Testing Guide

## Quick Start

All Lambda handlers can be tested locally without AWS/OpenAI calls using the `LOCAL_TEST` mode.

## Available Commands

```bash
# Initialize a run
npm run local:init

# Load template
npm run local:load

# Process images batch
npm run local:batch

# Process single image
npm run local:process-image

# Aggregate image results
npm run local:aggregate

# Execute agent
npm run local:execute

# Save output
npm run local:save

# Handle failure
npm run local:failure
```

## How It Works

When `LOCAL_TEST=true` is set (automatically set by `invoke-local.js`):

- **DynamoDB**: Uses in-memory storage (no AWS calls)
- **S3**: Returns mock URLs (no uploads)
- **Secrets Manager**: Returns mock API keys
- **OpenAI**: Returns mock responses (no API calls)

## Event Files

Sample event files are in `events/` directory. Edit them to test different scenarios.

## Custom Invocation

```bash
node scripts/invoke-local.js <FunctionName> <event.json>
```

Example:
```bash
node scripts/invoke-local.js ProcessImageFunction events/processImage.json
```

## Benefits

- ⚡ **Instant iteration** - No 20-minute uploads
- 💰 **No costs** - No AWS/OpenAI API calls
- 🐛 **Easy debugging** - Test logic locally
- 🔄 **Fast feedback** - See results in seconds

