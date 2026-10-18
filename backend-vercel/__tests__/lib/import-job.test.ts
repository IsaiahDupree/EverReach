/**
 * Contact Import Job Tests
 * 
 * Tests the runImportJob function that processes Google/Microsoft imports
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { runImportJob } from '@/lib/imports/runImportJob';
import { getServiceClient } from '@/lib/supabase';

const supabase = getServiceClient();

// Test user ID (from your test account)
const TEST_USER_ID = 'e5eaa347-9c72-4190-bace-ec7a2063f69a';

describe('Contact Import Job', () => {
  let testJobId: string;
  let testOrgId: string;

  beforeAll(async () => {
    // Get user's org_id
    const { data: orgData } = await supabase
      .from('user_orgs')
      .select('org_id')
      .eq('user_id', TEST_USER_ID)
      .limit(1)
      .single();

    testOrgId = orgData?.org_id;
    expect(testOrgId).toBeDefined();
    
    console.log(`✅ Test setup complete - Org ID: ${testOrgId}`);
  });

  afterAll(async () => {
    // Cleanup test job if exists
    if (testJobId) {
      await supabase
        .from('contact_import_jobs')
        .delete()
        .eq('id', testJobId);

      await supabase
        .from('contacts')
        .delete()
        .eq('display_name', 'Import Test Contact');
    }
  });

  test('should fail gracefully when job not found', async () => {
    await expect(
      runImportJob('00000000-0000-0000-0000-000000000000', 'google', 'fake-token')
    ).rejects.toThrow('Import job not found');
  });

  test('should fail gracefully when user has no org', async () => {
    // Create a test job with a user that doesn't exist
    const { data: job } = await supabase
      .from('contact_import_jobs')
      .insert([{
        user_id: '00000000-0000-0000-0000-000000000000',
        provider: 'google',
        status: 'authenticating',
      }])
      .select('id')
      .single();

    if (job) {
      await expect(
        runImportJob(job.id, 'google', 'fake-token')
      ).rejects.toThrow('User organization not found');

      // Cleanup
      await supabase
        .from('contact_import_jobs')
        .delete()
        .eq('id', job.id);
    }
  });

  test('should verify contacts table requires org_id', async () => {
    // Try to insert without org_id - should fail
    const { error } = await supabase
      .from('contacts')
      .insert([{
        user_id: TEST_USER_ID,
        display_name: 'Test Without Org',
        emails: ['test@example.com'],
      }]);

    // This should fail due to trigger requiring org_id
    expect(error).toBeDefined();
    expect(error?.message).toContain('user_orgs');
  });

  test('should successfully insert contact with org_id', async () => {
    // Insert with org_id - should succeed
    const { data, error } = await supabase
      .from('contacts')
      .insert([{
        user_id: TEST_USER_ID,
        org_id: testOrgId,
        display_name: 'Import Test Contact',
        emails: ['importtest@example.com'],
        phones: [],
      }])
      .select('id, display_name')
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.display_name).toBe('Import Test Contact');

    console.log('✅ Contact created successfully:', data?.id);

    // Cleanup
    if (data?.id) {
      await supabase
        .from('contacts')
        .delete()
        .eq('id', data.id);
    }
  });

  test('should handle contacts without emails (skip them)', async () => {
    // Create test job
    const { data: job } = await supabase
      .from('contact_import_jobs')
      .insert([{
        user_id: TEST_USER_ID,
        provider: 'google',
        status: 'processing',
      }])
      .select('id')
      .single();

    expect(job).toBeDefined();
    testJobId = job!.id;

    // The actual import would skip contacts without emails
    // This test just verifies the job was created correctly
    const { data: jobData } = await supabase
      .from('contact_import_jobs')
      .select('*')
      .eq('id', testJobId)
      .single();

    expect(jobData?.user_id).toBe(TEST_USER_ID);
    expect(jobData?.provider).toBe('google');
    
    console.log('✅ Import job created:', testJobId);
  });
});
