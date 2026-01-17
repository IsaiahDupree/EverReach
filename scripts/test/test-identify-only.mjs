#!/usr/bin/env node
import { config } from 'dotenv';
import { spawn } from 'node:child_process';

// Load .env file
config();

// Run the identify test
const proc = spawn(process.execPath, ['test/agent/backend-tracking-identify.mjs'], {
  stdio: 'inherit',
  env: process.env,
});

proc.on('exit', (code) => process.exit(code || 0));
