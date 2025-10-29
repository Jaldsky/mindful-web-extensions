#!/usr/bin/env node

/**
 * Post-install script to setup Husky git hooks
 * Skips in CI environments to avoid errors
 */

const { execSync } = require('child_process');
const path = require('path');

// Skip in CI environments
if (process.env.CI === 'true' || process.env.HUSKY === '0') {
  console.log('CI environment detected, skipping husky installation');
  process.exit(0);
}

try {
  // Check if we're in a git repository
  execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  
  // Go to repository root
  const repoRoot = path.resolve(__dirname, '..');
  process.chdir(repoRoot);
  
  console.log('Installing Husky git hooks...');
  
  // Install husky and configure git hooks path
  execSync('npx husky install', { stdio: 'inherit' });
  execSync('git config core.hooksPath .husky', { stdio: 'inherit' });
  
  console.log('✅ Husky git hooks installed successfully');
} catch (error) {
  // Silently fail - not a critical error
  // This can happen if:
  // - Not in a git repository
  // - Husky not installed
  // - Running in CI
  console.log('ℹ️  Husky installation skipped (not in git repo or CI environment)');
}

