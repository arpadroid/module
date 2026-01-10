#!/bin/bash
# Helper script to run Jest tests directly with proper configuration

# Run Jest with experimental VM modules support
node --experimental-vm-modules \
  node_modules/.bin/jest \
  "$@" \
  -c jest.config.cjs
