/**
 * Paywall Config & Feature Requests Test Suite
 * 
 * Tests the recently implemented endpoints:
 * - GET /api/v1/config/paywall (remote paywall configuration)
 * - GET /api/v1/feature-requests (list all requests)
 * - POST /api/v1/feature-requests (create request)
 * - PATCH /api/v1/feature-requests/:id (update request)
 * - DELETE /api/v1/feature-requests/:id (delete request)
 * - POST /api/v1/feature-requests/:id/vote (vote on request)
 */

import { apiFetch, getAccessToken, writeReport } from './agent/_shared.mjs';

const BASE = process.env.BACKEND_URL || 'https://ever-reach-be.vercel.app';

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🧪 PAYWALL CONFIG & FEATURE REQUESTS TEST SUITE');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(`🌐 Backend: ${BASE}\n`);

const results = {
  passed: 0,
  failed: 0,
  tests: [],
  totalTime: 0
};

const reportLines = [];

function logTest(name, passed, details = '', time = 0) {
  const icon = passed ? '✅' : '❌';
  const status = passed ? 'PASS' : 'FAIL';
  const line = `${icon} ${name} - ${status}`;
  console.log(line);
  if (details) console.log(`   ${details}`);
  if (time) console.log(`   ⏱️  ${time}ms`);
  
  reportLines.push(line);
  if (details) reportLines.push(`   ${details}`);
  
  results.tests.push({ name, passed, details, time });
  results.totalTime += time;
  if (passed) results.passed++;
  else results.failed++;
}

// =============================================================================
// PAYWALL CONFIG TESTS
// =============================================================================

async function testPaywallConfigPublic() {
  console.log('\n─────────────────────────────────────────────────────────');
  console.log('TEST 1: GET /api/v1/config/paywall (public, no auth)');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const { res, json, ms } = await apiFetch(BASE, '/api/v1/config/paywall', {
      method: 'GET'
    });
    
    console.log(`📊 Status: ${res.status}`);
    console.log(`📦 Response:`, JSON.stringify(json, null, 2).slice(0, 200));
    
    if (res.status === 200 && json) {
      // Verify all required fields are present
      const requiredFields = [
        'hard_paywall_mode',
        'show_paywall_after_onboarding',
        'show_paywall_on_trial_end',
        'show_video_onboarding_on_gate',
        'show_review_prompt_after_payment',
        'paywall_variant',
        'video_onboarding_url',
        'review_prompt_delay_ms'
      ];
      
      const missingFields = requiredFields.filter(field => !(field in json));
      
      if (missingFields.length === 0) {
        logTest(
          'Paywall Config - Public Access',
          true,
          `All 8 fields present: ${Object.keys(json).length} fields`,
          ms
        );
        
        // Verify data types
        const typeChecks = [
          typeof json.hard_paywall_mode === 'boolean',
          typeof json.show_paywall_after_onboarding === 'boolean',
          typeof json.show_paywall_on_trial_end === 'boolean',
          typeof json.show_video_onboarding_on_gate === 'boolean',
          typeof json.show_review_prompt_after_payment === 'boolean',
          typeof json.paywall_variant === 'string',
          typeof json.video_onboarding_url === 'string',
          typeof json.review_prompt_delay_ms === 'number'
        ];
        
        const allTypesCorrect = typeChecks.every(Boolean);
        logTest(
          'Paywall Config - Type Validation',
          allTypesCorrect,
          allTypesCorrect ? 'All types correct' : 'Some types incorrect'
        );
        
        return json;
      } else {
        logTest(
          'Paywall Config - Public Access',
          false,
          `Missing fields: ${missingFields.join(', ')}`,
          ms
        );
        return null;
      }
    } else {
      logTest(
        'Paywall Config - Public Access',
        false,
        `Status ${res.status}: ${JSON.stringify(json).slice(0, 100)}`,
        ms
      );
      return null;
    }
  } catch (err) {
    logTest('Paywall Config - Public Access', false, err.message);
    return null;
  }
}

async function testPaywallConfigCORS() {
  console.log('\n─────────────────────────────────────────────────────────');
  console.log('TEST 2: GET /api/v1/config/paywall (CORS headers)');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const { res, json, ms } = await apiFetch(BASE, '/api/v1/config/paywall', {
      method: 'GET',
      origin: 'https://everreach.app'
    });
    
    console.log(`📊 Status: ${res.status}`);
    console.log(`🔒 CORS Headers:`);
    console.log(`   Access-Control-Allow-Origin: ${res.headers.get('access-control-allow-origin')}`);
    console.log(`   Vary: ${res.headers.get('vary')}`);
    console.log(`   X-Request-ID: ${res.headers.get('x-request-id')}`);
    
    const hasCORS = res.headers.get('access-control-allow-origin');
    const hasRequestId = res.headers.get('x-request-id');
    const hasVary = res.headers.get('vary');
    
    if (hasCORS && hasRequestId) {
      logTest(
        'Paywall Config - CORS Support',
        true,
        `CORS headers present, Request ID: ${hasRequestId.slice(0, 16)}...`,
        ms
      );
    } else {
      logTest(
        'Paywall Config - CORS Support',
        false,
        `Missing headers: ${!hasCORS ? 'CORS ' : ''}${!hasRequestId ? 'Request-ID' : ''}`,
        ms
      );
    }
    
    return { hasCORS, hasRequestId, hasVary };
  } catch (err) {
    logTest('Paywall Config - CORS Support', false, err.message);
    return null;
  }
}

async function testPaywallConfigCache() {
  console.log('\n─────────────────────────────────────────────────────────');
  console.log('TEST 3: GET /api/v1/config/paywall (caching headers)');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const { res, json, ms } = await apiFetch(BASE, '/api/v1/config/paywall', {
      method: 'GET'
    });
    
    const cacheControl = res.headers.get('cache-control');
    console.log(`📦 Cache-Control: ${cacheControl}`);
    
    const hasCaching = cacheControl && cacheControl.includes('max-age=60');
    
    if (hasCaching) {
      logTest(
        'Paywall Config - Cache Headers',
        true,
        `Cache-Control: ${cacheControl}`,
        ms
      );
    } else {
      logTest(
        'Paywall Config - Cache Headers',
        false,
        `Expected "max-age=60", got: ${cacheControl}`,
        ms
      );
    }
    
    return hasCaching;
  } catch (err) {
    logTest('Paywall Config - Cache Headers', false, err.message);
    return false;
  }
}

// =============================================================================
// FEATURE REQUESTS TESTS
// =============================================================================

async function testFeatureRequestsList(token) {
  console.log('\n─────────────────────────────────────────────────────────');
  console.log('TEST 4: GET /api/v1/feature-requests (list all)');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const { res, json, ms } = await apiFetch(BASE, '/api/v1/feature-requests', {
      method: 'GET',
      token
    });
    
    console.log(`📊 Status: ${res.status}`);
    
    if (res.status === 200 && json) {
      const hasRequests = json.requests && Array.isArray(json.requests);
      const hasStats = json.stats && typeof json.stats === 'object';
      
      console.log(`📦 Requests: ${hasRequests ? json.requests.length : 0}`);
      console.log(`📊 Stats: ${hasStats ? JSON.stringify(json.stats) : 'none'}`);
      
      if (hasRequests && hasStats) {
        logTest(
          'Feature Requests - List All',
          true,
          `Got ${json.requests.length} requests with stats`,
          ms
        );
        return json.requests;
      } else {
        logTest(
          'Feature Requests - List All',
          false,
          `Missing: ${!hasRequests ? 'requests array ' : ''}${!hasStats ? 'stats object' : ''}`,
          ms
        );
        return null;
      }
    } else if (res.status === 401) {
      logTest(
        'Feature Requests - List All',
        false,
        'Authentication required',
        ms
      );
      return null;
    } else {
      logTest(
        'Feature Requests - List All',
        false,
        `Status ${res.status}: ${JSON.stringify(json).slice(0, 100)}`,
        ms
      );
      return null;
    }
  } catch (err) {
    logTest('Feature Requests - List All', false, err.message);
    return null;
  }
}

async function testFeatureRequestCreate(token) {
  console.log('\n─────────────────────────────────────────────────────────');
  console.log('TEST 5: POST /api/v1/feature-requests (create)');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const testId = Date.now();
    const payload = {
      title: `Test Feature Request ${testId}`,
      description: 'This is a test feature request created by automated tests.',
      category: 'enhancement',
      priority: 'medium',
      tags: ['automated-test', 'paywall-test']
    };
    
    const { res, json, ms } = await apiFetch(BASE, '/api/v1/feature-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
      token
    });
    
    console.log(`📊 Status: ${res.status}`);
    console.log(`📦 Response:`, JSON.stringify(json, null, 2).slice(0, 300));
    
    if (res.status === 201 || res.status === 200) {
      const hasId = json.request && json.request.id;
      const hasTitle = json.request && json.request.title === payload.title;
      
      if (hasId && hasTitle) {
        logTest(
          'Feature Requests - Create',
          true,
          `Created request ID: ${json.request.id}`,
          ms
        );
        return json.request;
      } else {
        logTest(
          'Feature Requests - Create',
          false,
          `Missing: ${!hasId ? 'ID ' : ''}${!hasTitle ? 'title match' : ''}`,
          ms
        );
        return null;
      }
    } else if (res.status === 401) {
      logTest(
        'Feature Requests - Create',
        false,
        'Authentication required',
        ms
      );
      return null;
    } else if (res.status === 422) {
      logTest(
        'Feature Requests - Create',
        false,
        `Validation error: ${JSON.stringify(json.error || json)}`,
        ms
      );
      return null;
    } else {
      logTest(
        'Feature Requests - Create',
        false,
        `Status ${res.status}: ${JSON.stringify(json).slice(0, 100)}`,
        ms
      );
      return null;
    }
  } catch (err) {
    logTest('Feature Requests - Create', false, err.message);
    return null;
  }
}

async function testFeatureRequestUpdate(token, requestId) {
  console.log('\n─────────────────────────────────────────────────────────');
  console.log(`TEST 6: PATCH /api/v1/feature-requests/${requestId} (update)`);
  console.log('─────────────────────────────────────────────────────────');
  
  if (!requestId) {
    logTest('Feature Requests - Update', false, 'No request ID available (create test failed)');
    return null;
  }
  
  try {
    const payload = {
      status: 'in_progress',
      priority: 'high',
      description: 'Updated description for automated test'
    };
    
    const { res, json, ms } = await apiFetch(BASE, `/api/v1/feature-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      token
    });
    
    console.log(`📊 Status: ${res.status}`);
    console.log(`📦 Response:`, JSON.stringify(json, null, 2).slice(0, 200));
    
    if (res.status === 200) {
      const statusUpdated = json.request && json.request.status === 'in_progress';
      const priorityUpdated = json.request && json.request.priority === 'high';
      
      if (statusUpdated && priorityUpdated) {
        logTest(
          'Feature Requests - Update',
          true,
          `Updated status and priority`,
          ms
        );
        return json.request;
      } else {
        logTest(
          'Feature Requests - Update',
          false,
          `Update incomplete: status=${json.request?.status}, priority=${json.request?.priority}`,
          ms
        );
        return null;
      }
    } else if (res.status === 404) {
      logTest(
        'Feature Requests - Update',
        false,
        'Request not found',
        ms
      );
      return null;
    } else {
      logTest(
        'Feature Requests - Update',
        false,
        `Status ${res.status}: ${JSON.stringify(json).slice(0, 100)}`,
        ms
      );
      return null;
    }
  } catch (err) {
    logTest('Feature Requests - Update', false, err.message);
    return null;
  }
}

async function testFeatureRequestVote(token, requestId) {
  console.log('\n─────────────────────────────────────────────────────────');
  console.log(`TEST 7: POST /api/v1/feature-requests/${requestId}/vote`);
  console.log('─────────────────────────────────────────────────────────');
  
  if (!requestId) {
    logTest('Feature Requests - Vote', false, 'No request ID available (create test failed)');
    return null;
  }
  
  try {
    const { res, json, ms } = await apiFetch(BASE, `/api/v1/feature-requests/${requestId}/vote`, {
      method: 'POST',
      token
    });
    
    console.log(`📊 Status: ${res.status}`);
    console.log(`📦 Response:`, JSON.stringify(json, null, 2).slice(0, 200));
    
    if (res.status === 200) {
      const hasVoteCount = json.request && typeof json.request.votes_count === 'number';
      
      if (hasVoteCount) {
        logTest(
          'Feature Requests - Vote',
          true,
          `Vote registered, count: ${json.request.votes_count}`,
          ms
        );
        return json.request;
      } else {
        logTest(
          'Feature Requests - Vote',
          false,
          `Vote count not returned (expected votes_count field)`,
          ms
        );
        return null;
      }
    } else if (res.status === 409) {
      logTest(
        'Feature Requests - Vote',
        true,
        'Already voted (expected for duplicate vote)',
        ms
      );
      return null;
    } else {
      logTest(
        'Feature Requests - Vote',
        false,
        `Status ${res.status}: ${JSON.stringify(json).slice(0, 100)}`,
        ms
      );
      return null;
    }
  } catch (err) {
    logTest('Feature Requests - Vote', false, err.message);
    return null;
  }
}

async function testFeatureRequestDelete(token, requestId) {
  console.log('\n─────────────────────────────────────────────────────────');
  console.log(`TEST 8: DELETE /api/v1/feature-requests/${requestId}`);
  console.log('─────────────────────────────────────────────────────────');
  
  if (!requestId) {
    logTest('Feature Requests - Delete', false, 'No request ID available (create test failed)');
    return false;
  }
  
  try {
    const { res, json, ms } = await apiFetch(BASE, `/api/v1/feature-requests/${requestId}`, {
      method: 'DELETE',
      token
    });
    
    console.log(`📊 Status: ${res.status}`);
    
    if (res.status === 200 || res.status === 204) {
      logTest(
        'Feature Requests - Delete',
        true,
        `Deleted request ${requestId}`,
        ms
      );
      return true;
    } else if (res.status === 404) {
      logTest(
        'Feature Requests - Delete',
        false,
        'Request not found (may have been already deleted)',
        ms
      );
      return false;
    } else {
      logTest(
        'Feature Requests - Delete',
        false,
        `Status ${res.status}: ${JSON.stringify(json).slice(0, 100)}`,
        ms
      );
      return false;
    }
  } catch (err) {
    logTest('Feature Requests - Delete', false, err.message);
    return false;
  }
}

// =============================================================================
// RUN ALL TESTS
// =============================================================================

async function runTests() {
  const startTime = Date.now();
  
  try {
    // Test 1-3: Paywall Config (no auth required)
    console.log('\n🔓 TESTING PAYWALL CONFIG (PUBLIC ENDPOINTS)');
    const paywallConfig = await testPaywallConfigPublic();
    await testPaywallConfigCORS();
    await testPaywallConfigCache();
    
    // Get auth token for authenticated endpoints
    console.log('\n🔐 GETTING AUTHENTICATION TOKEN');
    const token = await getAccessToken();
    if (!token) {
      console.log('❌ No auth token found. Skipping authenticated tests.');
      console.log('   Set TEST_EMAIL and TEST_PASSWORD in .env');
    } else {
      console.log('✅ Auth token acquired\n');
      
      // Test 4-8: Feature Requests (auth required)
      console.log('\n🔐 TESTING FEATURE REQUESTS (AUTHENTICATED ENDPOINTS)');
      await testFeatureRequestsList(token);
      const createdRequest = await testFeatureRequestCreate(token);
      
      if (createdRequest && createdRequest.id) {
        await testFeatureRequestUpdate(token, createdRequest.id);
        await testFeatureRequestVote(token, createdRequest.id);
        await testFeatureRequestDelete(token, createdRequest.id);
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    // Generate Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⏱️  Total Time: ${totalTime}ms`);
    console.log(`⚡ Avg Time: ${Math.round(results.totalTime / results.tests.length)}ms per test`);
    console.log(`📈 Success Rate: ${Math.round(results.passed / (results.passed + results.failed) * 100)}%\n`);
    
    // Detailed Results
    if (results.failed > 0) {
      console.log('⚠️  Failed Tests:');
      results.tests.filter(t => !t.passed).forEach(t => {
        console.log(`  ❌ ${t.name}`);
        if (t.details) console.log(`     ${t.details}`);
      });
      console.log('');
    }
    
    if (results.passed === results.tests.length) {
      console.log('🎉 ALL TESTS PASSED! 🎉\n');
    }
    
    // Write Report
    reportLines.push('', '## Summary', '');
    reportLines.push(`- Total Tests: ${results.tests.length}`);
    reportLines.push(`- Passed: ${results.passed}`);
    reportLines.push(`- Failed: ${results.failed}`);
    reportLines.push(`- Success Rate: ${Math.round(results.passed / results.tests.length * 100)}%`);
    reportLines.push(`- Total Time: ${totalTime}ms`);
    
    await writeReport('paywall_feature_requests_test', reportLines, results.tests, results.failed > 0 ? 1 : 0);
    
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (err) {
    console.error('\n❌ FATAL ERROR:', err);
    console.error(err.stack);
    process.exit(1);
  }
}

runTests();
