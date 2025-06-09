#!/bin/bash

# Check if we have changes
if git diff --quiet && git diff --cached --quiet; then
  echo "No changes to commit"
  exit 0
fi

# Add all changes
git add .

# Commit with a descriptive message
git commit -m "Fix admin car management endpoints and Railway deployment issues

- Added missing PUT /api/admin/cars/:id endpoint for updating cars
- Added missing DELETE /api/admin/cars/:id endpoint for deleting cars
- Updated Railway configuration for more robust deployment
- Added postinstall script to ensure XLSX is installed
- Created nixpacks.toml for better build process"

# Push to the default branch
git push

echo "Changes committed and pushed successfully!" 