/**
 * User Bio API Tests
 * 
 * Tests the user bio feature including:
 * - Setting/updating bio via PATCH /v1/me
 * - Retrieving bio via GET /v1/me
 * - Bio integration in AI message generation
 * - Bio integration in goal suggestions
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeTestContext,
  getTestContext,
  cleanupTestData,
  makeAuthenticatedRequest,
} from '../setup-v1-tests';

let testContactId: string;

beforeAll(async () => {
  await initializeTestContext();
  
  // Create a test contact for AI tests
  const response = await makeAuthenticatedRequest('/v1/contacts', {
    method: 'POST',
    body: JSON.stringify({
      display_name: 'Bio Test Contact',
      email: 'biotest@example.com',
    }),
  });
  
  if (response.ok) {
    const data = await response.json();
    testContactId = data.contact.id;
  }
  
  console.log('✅ User Bio tests initialized');
});

afterAll(async () => {
  const context = getTestContext();
  
  // Clean up test contact
  if (testContactId) {
    await cleanupTestData('contacts', { id: testContactId });
  }
  
  // Reset user bio
  await makeAuthenticatedRequest('/v1/me', {
    method: 'PATCH',
    body: JSON.stringify({ bio: null }),
  });
  
  console.log('🧹 User Bio tests cleaned up');
});

describe('GET /v1/me - Bio Retrieval', () => {
  test('should return null bio by default', async () => {
    // Reset bio first
    await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: null }),
    });
    
    const response = await makeAuthenticatedRequest('/v1/me', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.user).toBeDefined();
    expect(data.user.bio).toBeNull();
    
    console.log('✅ Bio is null by default');
  });

  test('should return bio field in response', async () => {
    const testBio = 'Founder @ AI Startup. Building tools for creators.';
    
    // Set bio
    await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: testBio }),
    });
    
    // Fetch profile
    const response = await makeAuthenticatedRequest('/v1/me', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.user).toBeDefined();
    expect(data.user.bio).toBe(testBio);
    
    console.log('✅ Bio retrieved successfully');
  });
});

describe('PATCH /v1/me - Bio Updates', () => {
  test('should set bio successfully', async () => {
    const testBio = 'Product Manager @ Google. Former startup founder.';
    
    const response = await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: testBio }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.user).toBeDefined();
    expect(data.user.bio).toBe(testBio);
    
    console.log('✅ Bio set successfully');
  });

  test('should update existing bio', async () => {
    const initialBio = 'Software Engineer';
    const updatedBio = 'Senior Software Engineer @ Tech Co. 10 years experience.';
    
    // Set initial bio
    await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: initialBio }),
    });
    
    // Update bio
    const response = await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: updatedBio }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.user.bio).toBe(updatedBio);
    
    console.log('✅ Bio updated successfully');
  });

  test('should remove bio when set to null', async () => {
    // Set a bio first
    await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: 'Test bio to be removed' }),
    });
    
    // Remove bio
    const response = await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: null }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.user.bio).toBeNull();
    
    console.log('✅ Bio removed successfully');
  });

  test('should handle empty string bio', async () => {
    const response = await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: '' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.user.bio).toBe('');
    
    console.log('✅ Empty bio handled successfully');
  });

  test('should not affect other profile fields when updating bio', async () => {
    const displayName = 'Test User';
    
    // Set display name
    await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: displayName }),
    });
    
    // Update bio
    const response = await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: 'New bio' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.user.display_name).toBe(displayName);
    expect(data.user.bio).toBe('New bio');
    
    console.log('✅ Bio update does not affect other fields');
  });
});

describe('POST /v1/agent/compose/smart - Bio Integration in AI Messages', () => {
  test('should generate message without bio when not set', async () => {
    if (!testContactId) {
      console.log('⚠️ Skipping test - no test contact');
      return;
    }
    
    // Clear bio
    await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: null }),
    });
    
    const response = await makeAuthenticatedRequest('/v1/agent/compose/smart', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: testContactId,
        goal_type: 'business',
        goal_description: 'Request meeting',
        channel: 'email',
        tone: 'professional',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.message).toBeDefined();
    
    console.log('✅ Message generated without bio');
  });

  test('should generate message with bio context when set', async () => {
    if (!testContactId) {
      console.log('⚠️ Skipping test - no test contact');
      return;
    }
    
    const testBio = 'CEO @ AI Startup. Raising Series A funding.';
    
    // Set bio
    await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: testBio }),
    });
    
    const response = await makeAuthenticatedRequest('/v1/agent/compose/smart', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: testContactId,
        goal_type: 'business',
        goal_description: 'Request intro to investors',
        channel: 'email',
        tone: 'professional',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.message).toBeDefined();
    
    // Bio should influence the message content
    console.log('✅ Message generated with bio context');
    console.log('   Generated message length:', data.message.length);
  });
});

describe('GET /v1/contacts/:id/goal-suggestions - Bio Integration in Goals', () => {
  test('should generate goal suggestions without bio when not set', async () => {
    if (!testContactId) {
      console.log('⚠️ Skipping test - no test contact');
      return;
    }
    
    // Clear bio
    await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: null }),
    });
    
    // Add interactions for minimum data requirement
    await makeAuthenticatedRequest('/v1/interactions', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: testContactId,
        kind: 'email',
        content: 'Discussed partnership opportunities',
        occurred_at: new Date().toISOString(),
      }),
    });
    
    await makeAuthenticatedRequest('/v1/interactions', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: testContactId,
        kind: 'email',
        content: 'Follow-up on partnership discussion',
        occurred_at: new Date().toISOString(),
      }),
    });
    
    const response = await makeAuthenticatedRequest(
      `/v1/contacts/${testContactId}/goal-suggestions`,
      { method: 'GET' }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    
    if (!data.needs_more_data) {
      expect(data.suggestions).toBeDefined();
      expect(Array.isArray(data.suggestions)).toBe(true);
      console.log('✅ Goal suggestions generated without bio');
    } else {
      console.log('⚠️ Needs more interaction data for suggestions');
    }
  });

  test('should generate goal suggestions with bio context when set', async () => {
    if (!testContactId) {
      console.log('⚠️ Skipping test - no test contact');
      return;
    }
    
    const testBio = 'Full-stack developer specializing in React and Node.js. Looking for freelance projects.';
    
    // Set bio
    await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: testBio }),
    });
    
    const response = await makeAuthenticatedRequest(
      `/v1/contacts/${testContactId}/goal-suggestions`,
      { method: 'GET' }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    
    if (!data.needs_more_data) {
      expect(data.suggestions).toBeDefined();
      expect(Array.isArray(data.suggestions)).toBe(true);
      
      console.log('✅ Goal suggestions generated with bio context');
      console.log(`   Received ${data.suggestions.length} suggestions`);
      
      if (data.suggestions.length > 0) {
        console.log('   Sample suggestion:', data.suggestions[0].goal);
      }
    } else {
      console.log('⚠️ Needs more interaction data for suggestions');
    }
  });
});

describe('Bio Data Validation', () => {
  test('should handle long bio text', async () => {
    const longBio = 'A'.repeat(1000); // 1000 character bio
    
    const response = await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: longBio }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.user.bio).toBe(longBio);
    expect(data.user.bio.length).toBe(1000);
    
    console.log('✅ Long bio (1000 chars) handled successfully');
  });

  test('should handle special characters in bio', async () => {
    const specialBio = 'CEO @ Company™. Building AI/ML tools for developers & creators. 🚀';
    
    const response = await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: specialBio }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.user.bio).toBe(specialBio);
    
    console.log('✅ Bio with special characters handled successfully');
  });

  test('should handle newlines in bio', async () => {
    const multilineBio = 'Line 1: Founder @ Startup\nLine 2: Former Engineer @ BigCo\nLine 3: Angel Investor';
    
    const response = await makeAuthenticatedRequest('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio: multilineBio }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.user.bio).toBe(multilineBio);
    
    console.log('✅ Multi-line bio handled successfully');
  });
});
