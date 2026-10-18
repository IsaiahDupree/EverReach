#!/usr/bin/env node
/**
 * Comprehensive Test Runner with Environment Setup
 * 
 * This script:
 * 1. Loads environment variables from backend-vercel/.env
 * 2. Runs all comprehensive tests
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment from backend-vercel/.env
const envPath = path.join(__dirname, '../../backend-vercel/.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;

        const [key, ...valueParts] = line.split('=');
        let value = valueParts.join('=').trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        process.env[key] = value;
    });

    console.log('✅ Loaded environment variables from backend-vercel/.env');
} else {
    console.warn('⚠️  Warning: backend-vercel/.env not found. Tests may fail without proper configuration.');
}

// Map EXPO_PUBLIC variables to test-friendly names
if (process.env.EXPO_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
}
if (process.env.EXPO_PUBLIC_SUPABASE_KEY) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
    process.env.SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
}
if (process.env.EXPO_PUBLIC_API_URL) {
    process.env.NEXT_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;
}
if (process.env.SUPABASE_ANON_KEY) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
}
if (process.env.SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
}

// Set test user credentials (use existing or defaults)
if (!process.env.TEST_USER_EMAIL) {
    process.env.TEST_USER_EMAIL = 'test@example.com';
}
if (!process.env.TEST_USER_PASSWORD) {
    process.env.TEST_USER_PASSWORD = 'testpassword123';
}

// Set base URL for tests (default to localhost if not set)
if (!process.env.TEST_BASE_URL && !process.env.NEXT_PUBLIC_API_URL) {
    process.env.TEST_BASE_URL = 'http://localhost:3000';
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
}

console.log('\\n📋 Test Configuration:');
console.log(`  - Backend URL: ${process.env.NEXT_PUBLIC_API_URL || process.env.TEST_BASE_URL}`);
console.log(`  - Supabase URL: ${process.env.SUPABASE_URL}`);
console.log(`  - Test User: ${process.env.TEST_USER_EMAIL}`);
console.log('');

// Run the comprehensive test suite
const testProcess = spawn('node', [path.join(__dirname, 'run-all.mjs')], {
    stdio: 'inherit',
    env: process.env
});

testProcess.on('close', (code) => {
    process.exit(code);
});
