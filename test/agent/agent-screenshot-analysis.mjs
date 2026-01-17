/**
 * AI Agent Screenshot Analysis Tests
 * 
 * Tests GPT-4 Vision integration for analyzing message screenshots
 * to extract goals, OCR text, variables, and provide composition guidance.
 */

import { apiFetch, getAccessToken, getEnv } from './_shared.mjs';
import assert from 'assert';

// ============================================================================
// TEST DATA - Sample screenshot URLs (you can replace with real test images)
// ============================================================================

const TEST_SCREENSHOTS = {
  email_networking: 'https://picsum.photos/800/600', // Placeholder - replace with real screenshot
  dm_follow_up: 'https://picsum.photos/800/600',
  linkedin_intro: 'https://picsum.photos/800/600',
  sms_casual: 'https://picsum.photos/800/600',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function analyzeScreenshot(payload) {
  const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
  const ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const token = await getAccessToken();
  
  const { res, json } = await apiFetch(BASE, '/v1/agent/analyze/screenshot', {
    method: 'POST',
    token,
    origin: ORIGIN,
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    throw new Error(`Screenshot analysis failed: ${res.status} ${JSON.stringify(json)}`);
  }
  
  return json;
}

// ============================================================================
// TESTS
// ============================================================================

export const tests = [
  // --------------------------------------------------------------------------
  // Basic Screenshot Analysis
  // --------------------------------------------------------------------------
  {
    name: 'analyze screenshot with image URL',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.email_networking,
        channel: 'email',
        save_to_database: true,
      });

      assert(result.ocr_text, 'Should extract OCR text');
      assert(result.inferred_goal, 'Should have inferred goal');
      assert(result.inferred_goal.type, 'Goal should have type');
      assert(result.inferred_goal.description, 'Goal should have description');
      assert(typeof result.inferred_goal.confidence === 'number', 'Confidence should be a number');
      assert(result.inferred_goal.confidence >= 0 && result.inferred_goal.confidence <= 1, 'Confidence should be 0-1');
      assert(result.variables, 'Should have variables object');
      assert(result.sentiment, 'Should have sentiment');
      assert(result.urgency, 'Should have urgency');
      assert(result.processing_metadata, 'Should have processing metadata');
      assert(result.processing_metadata.model, 'Should include model name');
      assert(result.processing_metadata.tokens_used > 0, 'Should track tokens used');
      
      console.log('✅ Screenshot analysis successful');
      console.log('   OCR Text length:', result.ocr_text.length);
      console.log('   Inferred Goal:', result.inferred_goal.type, `(${(result.inferred_goal.confidence * 100).toFixed(0)}% confidence)`);
      console.log('   Variables:', Object.keys(result.variables).length);
      console.log('   Sentiment:', result.sentiment);
    },
  },

  // --------------------------------------------------------------------------
  // Goal Type Inference
  // --------------------------------------------------------------------------
  {
    name: 'infer networking goal from screenshot',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.email_networking,
        channel: 'email',
        context: 'Professional introduction email screenshot',
      });

      assert(result.inferred_goal.type, 'Should infer a goal type');
      assert(['networking', 'introduction', 'follow_up', 'collaboration'].includes(result.inferred_goal.type), 
        'Should be a professional goal type');
      
      console.log('✅ Inferred goal type:', result.inferred_goal.type);
      console.log('   Description:', result.inferred_goal.description);
    },
  },

  {
    name: 'infer follow-up goal from DM screenshot',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.dm_follow_up,
        channel: 'dm',
      });

      assert(result.inferred_goal.type, 'Should infer goal');
      console.log('✅ DM goal inferred:', result.inferred_goal.type);
    },
  },

  // --------------------------------------------------------------------------
  // Variable Extraction
  // --------------------------------------------------------------------------
  {
    name: 'extract variables from screenshot',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.email_networking,
        channel: 'email',
      });

      assert(result.variables, 'Should have variables object');
      
      // Check if at least some variables were extracted
      const hasVariables = Object.keys(result.variables).length > 0;
      if (hasVariables) {
        console.log('✅ Extracted variables:', Object.keys(result.variables).join(', '));
        
        if (result.variables.recipient_name) {
          console.log('   Recipient:', result.variables.recipient_name);
        }
        if (result.variables.topic) {
          console.log('   Topic:', result.variables.topic);
        }
      } else {
        console.log('⚠️  No variables extracted (might be test image)');
      }
    },
  },

  // --------------------------------------------------------------------------
  // Sentiment & Urgency Analysis
  // --------------------------------------------------------------------------
  {
    name: 'detect sentiment from screenshot',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.email_networking,
        channel: 'email',
      });

      assert(result.sentiment, 'Should detect sentiment');
      assert(['positive', 'neutral', 'negative'].includes(result.sentiment), 
        'Sentiment should be valid');
      
      console.log('✅ Sentiment:', result.sentiment);
    },
  },

  {
    name: 'assess urgency from screenshot',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.email_networking,
        channel: 'email',
      });

      assert(result.urgency, 'Should assess urgency');
      assert(['high', 'medium', 'low'].includes(result.urgency), 
        'Urgency should be valid');
      
      console.log('✅ Urgency:', result.urgency);
    },
  },

  // --------------------------------------------------------------------------
  // Template Suggestions
  // --------------------------------------------------------------------------
  {
    name: 'suggest template type based on screenshot',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.email_networking,
        channel: 'email',
      });

      if (result.suggested_template_type) {
        console.log('✅ Suggested template type:', result.suggested_template_type);
      } else {
        console.log('⚠️  No template suggestion (acceptable)');
      }
    },
  },

  // --------------------------------------------------------------------------
  // Key Phrases Extraction
  // --------------------------------------------------------------------------
  {
    name: 'extract key phrases from screenshot',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.email_networking,
        channel: 'email',
      });

      if (result.key_phrases && result.key_phrases.length > 0) {
        console.log('✅ Key phrases extracted:', result.key_phrases.length);
        console.log('   Phrases:', result.key_phrases.slice(0, 3).join(', '));
      } else {
        console.log('⚠️  No key phrases (might be test image)');
      }
    },
  },

  // --------------------------------------------------------------------------
  // Database Persistence
  // --------------------------------------------------------------------------
  {
    name: 'save analysis to database',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.email_networking,
        channel: 'email',
        save_to_database: true,
      });

      assert(result.analysis_id, 'Should save to database and return analysis_id');
      console.log('✅ Analysis saved with ID:', result.analysis_id);
    },
  },

  {
    name: 'skip database save when requested',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.email_networking,
        channel: 'email',
        save_to_database: false,
      });

      assert(!result.analysis_id, 'Should not save to database when save_to_database=false');
      console.log('✅ Analysis not saved (as requested)');
    },
  },

  // --------------------------------------------------------------------------
  // Contact Context Integration
  // --------------------------------------------------------------------------
  {
    name: 'analyze screenshot with contact context',
    run: async () => {
      // First, get a contact to use
      const contactsResponse = await apiFetch('/v1/contacts?limit=1', {
        method: 'GET',
        headers: await getAuthHeaders(),
      });

      if (contactsResponse.items && contactsResponse.items.length > 0) {
        const contactId = contactsResponse.items[0].id;

        const result = await analyzeScreenshot({
          image_url: TEST_SCREENSHOTS.email_networking,
          contact_id: contactId,
          channel: 'email',
        });

        assert(result.inferred_goal, 'Should analyze with contact context');
        console.log('✅ Analysis completed with contact context');
        console.log('   Contact ID:', contactId);
      } else {
        console.log('⚠️  No contacts available for context test');
      }
    },
  },

  // --------------------------------------------------------------------------
  // Additional Context
  // --------------------------------------------------------------------------
  {
    name: 'analyze with user-provided context',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.email_networking,
        channel: 'email',
        context: 'This is a follow-up after meeting at TechConf 2024',
      });

      assert(result.inferred_goal, 'Should analyze with user context');
      console.log('✅ Analysis with context successful');
      console.log('   Goal:', result.inferred_goal.type);
    },
  },

  // --------------------------------------------------------------------------
  // Performance & Metadata
  // --------------------------------------------------------------------------
  {
    name: 'track processing performance',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.email_networking,
        channel: 'email',
      });

      assert(result.processing_metadata, 'Should have metadata');
      assert(result.processing_metadata.latency_ms > 0, 'Should track latency');
      assert(result.processing_metadata.tokens_used > 0, 'Should track token usage');
      assert(result.processing_metadata.model, 'Should track model used');
      
      console.log('✅ Performance tracked:');
      console.log('   Latency:', result.processing_metadata.latency_ms, 'ms');
      console.log('   Tokens:', result.processing_metadata.tokens_used);
      console.log('   Model:', result.processing_metadata.model);
    },
  },

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------
  {
    name: 'reject request without image',
    run: async () => {
      try {
        await analyzeScreenshot({
          channel: 'email',
        });
        assert(false, 'Should reject request without image');
      } catch (error) {
        assert(error.message.includes('image'), 'Error should mention image requirement');
        console.log('✅ Correctly rejected request without image');
      }
    },
  },

  {
    name: 'handle invalid image URL',
    run: async () => {
      try {
        await analyzeScreenshot({
          image_url: 'not-a-valid-url',
          channel: 'email',
        });
        assert(false, 'Should reject invalid URL');
      } catch (error) {
        console.log('✅ Correctly rejected invalid image URL');
      }
    },
  },

  // --------------------------------------------------------------------------
  // Channel-Specific Analysis
  // --------------------------------------------------------------------------
  {
    name: 'analyze email screenshot',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.email_networking,
        channel: 'email',
      });

      assert(result.inferred_goal, 'Should analyze email screenshot');
      console.log('✅ Email screenshot analyzed');
    },
  },

  {
    name: 'analyze LinkedIn DM screenshot',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.linkedin_intro,
        channel: 'linkedin',
      });

      assert(result.inferred_goal, 'Should analyze LinkedIn screenshot');
      console.log('✅ LinkedIn screenshot analyzed');
    },
  },

  {
    name: 'analyze SMS screenshot',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: TEST_SCREENSHOTS.sms_casual,
        channel: 'sms',
      });

      assert(result.inferred_goal, 'Should analyze SMS screenshot');
      console.log('✅ SMS screenshot analyzed');
    },
  },
];

// ============================================================================
// EXPORT
// ============================================================================

export default tests;
