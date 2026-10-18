/**
 * Environment Setup
 * Loads .env file BEFORE any test files are imported
 * Must be in setupFiles (not setupFilesAfterEnv)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from backend-vercel directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Also try loading from parent directory (PersonalCRM root)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('[E2E Setup] Environment variables loaded');
console.log('[E2E Setup] TEST_EMAIL:', process.env.TEST_EMAIL ? '✓ Set' : '✗ Not set');
console.log('[E2E Setup] TEST_PASSWORD:', process.env.TEST_PASSWORD ? '✓ Set' : '✗ Not set');
console.log('[E2E Setup] SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not set');
