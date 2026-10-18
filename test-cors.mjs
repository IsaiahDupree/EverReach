#!/usr/bin/env node
/**
 * Quick CORS Test Runner
 * 
 * Run this script to quickly validate CORS configuration on all endpoints
 * 
 * Usage:
 *   node test-cors.mjs
 * 
 * Or with custom backend:
 *   TEST_BASE_URL=https://your-backend.vercel.app node test-cors.mjs
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFile = join(__dirname, 'test', 'agent', 'cors-validation.mjs');

console.log('🔒 Running CORS Validation Tests...\n');

const proc = spawn(process.execPath, [testFile], {
  stdio: 'inherit',
  env: process.env,
});

proc.on('exit', (code) => {
  process.exit(code);
});
