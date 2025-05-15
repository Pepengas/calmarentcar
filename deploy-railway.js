/**
 * Railway Deployment Helper Script
 * This script ensures the required modules are installed before starting the server
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

process.env.PORT = 3030;

console.log('🚂 Running Railway deployment helper script...');

// Check if XLSX module is available
try {
  require.resolve('xlsx');
  console.log('✅ XLSX module is already installed');
} catch (error) {
  console.log('⚠️ XLSX module not found, installing...');
  
  try {
    // Install the xlsx module
    execSync('npm install xlsx --save', { stdio: 'inherit' });
    console.log('✅ XLSX module installed successfully');
  } catch (installError) {
    console.error('❌ Failed to install XLSX module:', installError.message);
    console.log('⚠️ Continuing with server startup - fallback car data will be used');
  }
}

// Log environment information
console.log('📊 Environment Information:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Not set ✗');
console.log('- PORT:', process.env.PORT || '3000 (default)');

// Start the main server
console.log('🚀 Starting server...');
require('./server.js'); 