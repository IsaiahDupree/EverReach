/**
 * OpenAI Enrichment Provider
 * 
 * Uses OpenAI GPT-4 for:
 * - Social profile content analysis
 * - Persona bucketing & classification
 * - Psychographic insights
 * 
 * Cost: ~$0.03-0.10 per analysis (most expensive)
 * Speed: Fast (500ms-2s)
 * Best for: Persona analysis, content classification, bucketing
 */

import OpenAI from 'openai';

export interface OpenAIEnrichmentConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  requestsPerSecond?: number;
  maxRetries?: number;
  enableRateLimiting?: boolean;
}

export interface PersonaBucket {
  id: number;
  label: string;
  confidence: number;
  traits: string[];
}

// Predefined persona buckets (can be customized)
const PERSONA_BUCKETS = {
  AUTOMATION_PRO: {
    id: 1,
    label: 'Automation Pro / Marketing Strategist',
    traits: ['active on LinkedIn/Twitter', 'shares AI/tech content', 'mid-size audience', 'talks ROI'],
  },
  CREATIVE_TRANSITION: {
    id: 2,
    label: 'Creative in Transition',
    traits: ['Instagram-first', 'aesthetic focus', 'low AI familiarity', 'visual storytelling'],
  },
  TECH_ENTREPRENEUR: {
    id: 3,
    label: 'Tech Entrepreneur / Product Builder',
    traits: ['cross-platform presence', 'product-focused', 'discusses growth/automation', 'technical'],
  },
  CORPORATE_EXEC: {
    id: 4,
    label: 'Corporate Executive',
    traits: ['LinkedIn-dominant', 'industry thought leader', 'formal tone', 'business-focused'],
  },
  STUDENT_EARLY_CAREER: {
    id: 5,
    label: 'Student / Early Career',
    traits: ['learning-focused', 'seeks mentorship', 'active on multiple platforms', 'younger demographic'],
  },
  NETWORKING_ENTHUSIAST: {
    id: 6,
    label: 'Networking Enthusiast',
    traits: ['high connection count', 'event-focused', 'relationship-builder', 'social engagement'],
  },
};

export class OpenAIEnrichmentProvider {
  private openai: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private requestsPerSecond: number;
  private maxRetries: number;
  private enableRateLimiting: boolean;

  constructor(config: OpenAIEnrichmentConfig) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
    });
    this.model = config.model || 'gpt-4o-mini'; // Use mini for cost efficiency
    this.temperature = config.temperature !== undefined ? config.temperature : 0.3;
    this.maxTokens = config.maxTokens || 1000;
    this.requestsPerSecond = config.requestsPerSecond || 3;
    this.maxRetries = config.maxRetries || 3;
    this.enableRateLimiting = config.enableRateLimiting !== false;
  }

  /**
   * Analyze persona and assign to bucket
   * @param socialProfiles - Social profile URLs
   * @param companyIntel - Optional company data
   * @returns Persona bucket assignment
   */
  async analyzePersona(
    socialProfiles: any,
    companyIntel?: any
  ): Promise<PersonaBucket> {
    // Build analysis prompt
    const profileSummary = this._buildProfileSummary(socialProfiles, companyIntel);
    
    const bucketDescriptions = Object.entries(PERSONA_BUCKETS)
      .map(([key, bucket]) => `${bucket.id}. ${bucket.label}: ${bucket.traits.join(', ')}`)
      .join('\n');

    const prompt = `Analyze this user profile and assign them to the best-fitting persona bucket:

USER PROFILE:
${profileSummary}

AVAILABLE PERSONA BUCKETS:
${bucketDescriptions}

Based on the profile data, which bucket fits best? Respond with ONLY a JSON object:
{
  "bucketId": <number>,
  "confidence": <0-1>,
  "reasoning": "<brief explanation>",
  "traits": ["<observed trait 1>", "<observed trait 2>", ...]
}`;

    try {
      const response = await this._query(prompt);
      const content = response.choices[0]?.message?.content || '';
      
      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from OpenAI');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      
      // Find matching bucket
      const bucket = Object.values(PERSONA_BUCKETS).find(
        (b) => b.id === analysis.bucketId
      );

      if (!bucket) {
        throw new Error(`Invalid bucket ID: ${analysis.bucketId}`);
      }

      return {
        id: bucket.id,
        label: bucket.label,
        confidence: analysis.confidence,
        traits: analysis.traits || bucket.traits,
      };
    } catch (error) {
      console.error('OpenAI persona analysis error:', error);
      
      // Fallback to default bucket
      return {
        id: 6,
        label: 'Networking Enthusiast',
        confidence: 0.3,
        traits: ['general user'],
      };
    }
  }

  /**
   * Analyze social content for demographic insights
   * @param socialProfiles - Social profile data
   */
  async analyzeContent(socialProfiles: any): Promise<{
    topics: string[];
    tone: string;
    audienceType: string;
  }> {
    const prompt = `Analyze these social profiles and identify:
1. Top 3-5 content topics/themes
2. Overall tone (professional, casual, educational, motivational, etc.)
3. Likely audience type

Social Profiles:
${JSON.stringify(socialProfiles, null, 2)}

Respond in JSON format:
{
  "topics": ["topic1", "topic2", ...],
  "tone": "tone description",
  "audienceType": "audience description"
}`;

    try {
      const response = await this._query(prompt);
      const content = response.choices[0]?.message?.content || '';
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('OpenAI content analysis error:', error);
      return {
        topics: [],
        tone: 'unknown',
        audienceType: 'general',
      };
    }
  }

  /**
   * Query OpenAI with retry logic
   * @private
   */
  private async _query(prompt: string, retryCount = 0): Promise<any> {
    try {
      return await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a persona analysis expert. Analyze user profiles and classify them accurately.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });
    } catch (error) {
      if (retryCount < this.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        await this._sleep(delay);
        return this._query(prompt, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Build profile summary for analysis
   * @private
   */
  private _buildProfileSummary(socialProfiles: any, companyIntel?: any): string {
    let summary = 'Social Profiles:\n';
    
    if (socialProfiles.linkedin) summary += `- LinkedIn: ${socialProfiles.linkedin}\n`;
    if (socialProfiles.twitter) summary += `- Twitter: ${socialProfiles.twitter}\n`;
    if (socialProfiles.instagram) summary += `- Instagram: ${socialProfiles.instagram}\n`;
    if (socialProfiles.github) summary += `- GitHub: ${socialProfiles.github}\n`;
    
    if (!Object.keys(socialProfiles).length) {
      summary += '- No social profiles found\n';
    }

    if (companyIntel) {
      summary += '\nCompany Information:\n';
      if (companyIntel.industry) summary += `- Industry: ${companyIntel.industry}\n`;
      if (companyIntel.size) summary += `- Company Size: ${companyIntel.size}\n`;
      if (companyIntel.overview) summary += `- Overview: ${companyIntel.overview}\n`;
    }

    return summary;
  }

  /**
   * Sleep utility
   * @private
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
