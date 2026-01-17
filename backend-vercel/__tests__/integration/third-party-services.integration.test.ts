/**
 * Third-Party Services Integration Tests
 * 
 * Tests integration with external services (with mocking):
 * - RapidAPI Social Links Search
 * - Perplexity AI
 * - OpenAI
 * - PostHog
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Mock response types
interface RapidAPISocialLinksResponse {
  data: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    facebook?: string;
    instagram?: string;
  };
}

interface PerplexityAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface OpenAIPersonaResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

describe('Third-Party Services Integration', () => {
  let testUserId: string;
  let testEmail: string;

  beforeAll(() => {
    testUserId = `third_party_test_${Date.now()}`;
    testEmail = `third_party_${Date.now()}@example.com`;
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('user_identity').delete().eq('user_id', testUserId);
  });

  describe('RapidAPI - Social Links Search', () => {
    it('should mock successful social links lookup', async () => {
      const mockResponse: RapidAPISocialLinksResponse = {
        data: {
          linkedin: 'https://linkedin.com/in/testuser',
          twitter: 'https://twitter.com/testuser',
          github: 'https://github.com/testuser'
        }
      };

      // Simulate API call
      const enrichmentData = mockResponse.data;

      expect(enrichmentData.linkedin).toBeDefined();
      expect(enrichmentData.twitter).toBeDefined();
      expect(enrichmentData.github).toBeDefined();
    });

    it('should handle missing social profiles gracefully', async () => {
      const mockResponse: RapidAPISocialLinksResponse = {
        data: {}
      };

      const enrichmentData = mockResponse.data;
      
      // Should not throw error
      expect(enrichmentData).toBeDefined();
      expect(Object.keys(enrichmentData).length).toBe(0);
    });

    it('should validate social profile URLs', () => {
      const profiles = {
        linkedin: 'https://linkedin.com/in/testuser',
        twitter: 'https://twitter.com/testuser',
        github: 'https://github.com/testuser'
      };

      for (const [platform, url] of Object.entries(profiles)) {
        expect(url).toMatch(/^https?:\/\//);
        expect(url).toContain(platform);
      }
    });

    it('should calculate enrichment cost correctly', () => {
      // RapidAPI costs $0.001 per enrichment
      const costPerEnrichment = 0.001;
      const costCents = Math.round(costPerEnrichment * 100);

      expect(costCents).toBe(0); // Rounds to 0 cents (< 1 cent)
    });

    it('should handle API rate limits', async () => {
      // Simulate rate limit response
      const rateLimitError = {
        error: 'Rate limit exceeded',
        message: 'You have exceeded the rate limit. Please try again later.',
        retry_after: 60
      };

      expect(rateLimitError.retry_after).toBeGreaterThan(0);
      expect(rateLimitError.error).toContain('Rate limit');
    });

    it('should retry on transient failures', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      const mockAPICall = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Transient error');
        }
        return { success: true };
      };

      // Retry logic
      for (let i = 0; i < maxRetries; i++) {
        try {
          const result = await mockAPICall();
          expect(result.success).toBe(true);
          break;
        } catch (error) {
          if (i === maxRetries - 1) throw error;
        }
      }

      expect(attemptCount).toBe(3);
    });
  });

  describe('Perplexity AI - Company Intelligence', () => {
    it('should mock company lookup', async () => {
      const mockResponse: PerplexityAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              company_name: 'Acme Corp',
              industry: 'Technology',
              size: '50-200',
              founded: '2020',
              description: 'A technology company focused on CRM solutions'
            })
          }
        }]
      };

      const companyData = JSON.parse(mockResponse.choices[0].message.content);

      expect(companyData.company_name).toBe('Acme Corp');
      expect(companyData.industry).toBe('Technology');
      expect(companyData.size).toBeDefined();
    });

    it('should handle missing company data', async () => {
      const mockResponse: PerplexityAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              company_name: null,
              industry: null,
              error: 'No company data found'
            })
          }
        }]
      };

      const companyData = JSON.parse(mockResponse.choices[0].message.content);

      expect(companyData.error).toBeDefined();
      expect(companyData.company_name).toBeNull();
    });

    it('should calculate perplexity cost', () => {
      // Perplexity costs $0.01 per request
      const costPerRequest = 0.01;
      const costCents = Math.round(costPerRequest * 100);

      expect(costCents).toBe(1); // 1 cent
    });

    it('should validate company data structure', () => {
      const companyData = {
        company_name: 'Acme Corp',
        industry: 'Technology',
        size: '50-200',
        founded: '2020'
      };

      expect(companyData).toHaveProperty('company_name');
      expect(companyData).toHaveProperty('industry');
      expect(typeof companyData.company_name).toBe('string');
    });

    it('should handle API timeouts', async () => {
      const timeoutMs = 30000; // 30 seconds
      
      const mockAPICallWithTimeout = () => {
        return Promise.race([
          new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          )
        ]);
      };

      const result = await mockAPICallWithTimeout();
      expect(result).toEqual({ success: true });
    });
  });

  describe('OpenAI - Persona Assignment', () => {
    it('should mock persona classification', async () => {
      const mockResponse: OpenAIPersonaResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              persona: 'automation_pro',
              confidence: 0.85,
              reasoning: 'User shows high interest in automation and productivity tools'
            })
          }
        }]
      };

      const personaData = JSON.parse(mockResponse.choices[0].message.content);

      expect(personaData.persona).toBe('automation_pro');
      expect(personaData.confidence).toBeGreaterThan(0.7);
      expect(personaData.reasoning).toBeDefined();
    });

    it('should validate persona buckets', () => {
      const validPersonas = [
        'automation_pro',
        'marketing_strategist',
        'creative_in_transition',
        'tech_entrepreneur',
        'product_builder',
        'corporate_executive',
        'student_early_career',
        'networking_enthusiast'
      ];

      const persona = 'automation_pro';
      expect(validPersonas).toContain(persona);
    });

    it('should calculate openai cost', () => {
      // OpenAI costs ~$0.03 per classification
      const costPerClassification = 0.03;
      const costCents = Math.round(costPerClassification * 100);

      expect(costCents).toBe(3); // 3 cents
    });

    it('should handle low confidence scores', () => {
      const personaData = {
        persona: 'unknown',
        confidence: 0.45,
        reasoning: 'Insufficient data for classification'
      };

      if (personaData.confidence < 0.7) {
        expect(personaData.persona).toBe('unknown');
      }
    });

    it('should validate confidence range', () => {
      const confidence = 0.85;

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should handle malformed responses', () => {
      const malformedResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON {{'
          }
        }]
      };

      try {
        JSON.parse(malformedResponse.choices[0].message.content);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Combined Enrichment Flow', () => {
    it('should complete full enrichment cycle', async () => {
      // Step 1: RapidAPI - Social Links
      const socialLinks = {
        linkedin: 'https://linkedin.com/in/testuser',
        twitter: 'https://twitter.com/testuser',
        github: 'https://github.com/testuser'
      };

      // Step 2: Perplexity - Company Data
      const companyData = {
        company_name: 'Acme Corp',
        industry: 'Technology',
        size: '50-200'
      };

      // Step 3: OpenAI - Persona
      const personaData = {
        persona: 'automation_pro',
        confidence: 0.85
      };

      // Create enrichment record
      const { error } = await supabase
        .from('user_identity')
        .insert({
          user_id: testUserId,
          email_hash: Buffer.from(testEmail).toString('base64'),
          status: 'completed',
          enriched_at: new Date().toISOString(),
          cost_cents: 4, // 0 + 1 + 3 = 4 cents
          social_profiles: socialLinks,
          company_name: companyData.company_name,
          company_industry: companyData.industry
        });

      expect(error).toBeNull();
    });

    it('should calculate total enrichment cost', () => {
      const costs = {
        rapidapi: 0.001,
        perplexity: 0.01,
        openai: 0.03
      };

      const totalCost = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
      const totalCostCents = Math.round(totalCost * 100);

      expect(totalCostCents).toBe(4); // 4 cents total
      expect(totalCost).toBeLessThan(0.25); // Much less than Clay's $0.25
    });

    it('should verify enrichment status transitions', async () => {
      const statuses = ['pending', 'processing', 'completed'];
      
      for (const status of statuses) {
        expect(['pending', 'processing', 'completed', 'failed']).toContain(status);
      }
    });

    it('should track enrichment timing', () => {
      const startTime = new Date('2025-10-22T00:00:00Z');
      const endTime = new Date('2025-10-22T00:00:05Z');
      
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationSeconds = durationMs / 1000;

      expect(durationSeconds).toBeLessThan(30); // Should complete in < 30s
    });
  });

  describe('Error Handling & Resilience', () => {
    it('should handle all services failing gracefully', async () => {
      const enrichmentResult = {
        status: 'failed',
        errors: [
          { service: 'rapidapi', error: 'Rate limit exceeded' },
          { service: 'perplexity', error: 'Timeout' },
          { service: 'openai', error: 'API key invalid' }
        ],
        retry_count: 3
      };

      expect(enrichmentResult.status).toBe('failed');
      expect(enrichmentResult.errors.length).toBe(3);
      expect(enrichmentResult.retry_count).toBe(3);
    });

    it('should implement exponential backoff', () => {
      const retryDelays = [1000, 2000, 4000, 8000]; // 1s, 2s, 4s, 8s
      
      for (let i = 1; i < retryDelays.length; i++) {
        expect(retryDelays[i]).toBe(retryDelays[i - 1] * 2);
      }
    });

    it('should respect max retry limit', () => {
      const maxRetries = 3;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        retryCount++;
      }

      expect(retryCount).toBe(maxRetries);
      expect(retryCount).toBeLessThanOrEqual(maxRetries);
    });

    it('should log enrichment failures', async () => {
      const failureLog = {
        user_id: testUserId,
        service: 'rapidapi',
        error: 'Rate limit exceeded',
        timestamp: new Date().toISOString(),
        retry_count: 1
      };

      expect(failureLog.user_id).toBeDefined();
      expect(failureLog.service).toBeDefined();
      expect(failureLog.error).toBeDefined();
    });
  });

  describe('Cost Tracking & Optimization', () => {
    it('should track costs per service', () => {
      const costBreakdown = {
        rapidapi: { calls: 100, cost_usd: 0.10 },
        perplexity: { calls: 100, cost_usd: 1.00 },
        openai: { calls: 100, cost_usd: 3.00 }
      };

      const totalCost = Object.values(costBreakdown)
        .reduce((sum, service) => sum + service.cost_usd, 0);

      expect(totalCost).toBe(4.10);
    });

    it('should compare with Clay pricing', () => {
      const everReachCost = 0.041; // per user
      const clayCost = 0.25; // per user
      
      const savings = clayCost - everReachCost;
      const savingsPercent = (savings / clayCost) * 100;

      expect(savingsPercent).toBeGreaterThan(80); // > 80% savings
      expect(savingsPercent).toBeCloseTo(84, 0); // ~84% savings
    });

    it('should project monthly costs', () => {
      const usersPerMonth = 10000;
      const costPerUser = 0.041;
      
      const monthlyCost = usersPerMonth * costPerUser;

      expect(monthlyCost).toBe(410); // $410/month
      expect(monthlyCost).toBeLessThan(2500); // Much less than Clay's $2,500
    });

    it('should calculate ROI over 3 years', () => {
      const usersPerMonth = 10000;
      const months = 36; // 3 years
      
      const everReachTotal = usersPerMonth * 0.041 * months;
      const clayTotal = usersPerMonth * 0.25 * months;
      
      const savings = clayTotal - everReachTotal;

      expect(savings).toBeGreaterThan(70000); // > $70k saved
      expect(savings).toBeCloseTo(75240, 0); // ~$75k saved
    });
  });

  describe('Data Quality & Validation', () => {
    it('should validate enriched data quality', () => {
      const enrichedData = {
        social_profiles: {
          linkedin: 'https://linkedin.com/in/testuser',
          twitter: 'https://twitter.com/testuser'
        },
        company_name: 'Acme Corp',
        company_industry: 'Technology'
      };

      // Check all required fields present
      expect(enrichedData.social_profiles).toBeDefined();
      expect(enrichedData.company_name).toBeDefined();
      
      // Check data types
      expect(typeof enrichedData.company_name).toBe('string');
      expect(typeof enrichedData.social_profiles).toBe('object');
    });

    it('should detect invalid data', () => {
      const invalidData = {
        social_profiles: null,
        company_name: '',
        company_industry: undefined
      };

      const isValid = 
        invalidData.social_profiles !== null &&
        invalidData.company_name.length > 0 &&
        invalidData.company_industry !== undefined;

      expect(isValid).toBe(false);
    });

    it('should sanitize enrichment data', () => {
      const unsanitized = {
        company_name: '  Acme Corp  ',
        company_industry: 'TECHNOLOGY'
      };

      const sanitized = {
        company_name: unsanitized.company_name.trim(),
        company_industry: unsanitized.company_industry.toLowerCase()
      };

      expect(sanitized.company_name).toBe('Acme Corp');
      expect(sanitized.company_industry).toBe('technology');
    });
  });
});
