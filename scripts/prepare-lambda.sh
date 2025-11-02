#!/bin/bash
# Create a minimal package.json for Lambda functions (without dependencies)
# Dependencies will come from the layer

cat > lambda-package.json << 'EOF'
{
  "name": "full-turner-lambda",
  "version": "1.0.0",
  "type": "module",
  "scripts": {},
  "dependencies": {}
}
EOF

echo "Created lambda-package.json for Lambda functions (dependencies in layer)"

