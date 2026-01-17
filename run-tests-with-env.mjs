#!/usr/bin/env node
import { config } from 'dotenv';
import { spawn } from 'node:child_process';

// Load .env file
config();

// Run the test suite
const proc = spawn(process.execPath, ['test/agent/run-all-recent-features.mjs'], {
  stdio: 'inherit',
  env: process.env,
});

proc.on('exit', (code) => process.exit(code));
