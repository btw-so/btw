#!/bin/bash
# Start script for btw tasks backend

# Export environment variables
set -a
source "$(dirname "$0")/.env"
set +a

# Start the Node.js server
cd "$(dirname "$0")"
exec node bin/www
