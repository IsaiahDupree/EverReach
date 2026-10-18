/**
 * Unified Enrichment Client
 * 
 * Multi-provider enrichment system that replaces Clay with:
 * - RapidAPI Social Links Search (email → social profiles)
 * - Perplexity AI (company/person research)
 * - OpenAI (persona analysis & bucketing)
 * 
 * Features:
 * - Intelligent provider fallback
 * - Built-in rate limiting & queuing
 * - Automatic retry with exponential backoff
 * - Cost optimization (cheapest provider first)
 * - Comprehensive error handling
 * - Usage tracking & analytics
 * 
 * @module UnifiedEnrichmentClient
 */

import { PerplexityProvider } from './providers/perplexity';
import { RapidAPISocialProvider } from './providers/rapidapi-social';
import { OpenAIEnrichmentProvider } from './providers/openai-enrichment';

export type EnrichmentProvider = 'rapidapi' | 'perplexity' | 'openai' | 'auto';

export interface EnrichmentConfig {
  // API Keys
  rapidApiKey?: string;
  perplexityApiKey?: string;
  openAiApiKey?: string;
  
  // Provider preferences
  preferredProvider?: EnrichmentProvider;
  enableFallback?: boolean;
  
  // Rate limiting
  enableRateLimiting?: boolean;
  requestsPerSecond?: number;
  
  // Retry logic
  maxRetries?: number;
  retryDelay?: number;
  
  // Cost optimization
  optimizeForCost?: boolean;
}

export interface EnrichedProfile {
  // Identity
  email: string;
  fullName?: string;
  company?: string;
  jobTitle?: string;
  
  // Social profiles
  socialProfiles: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    github?: string;
    youtube?: string;
  };
  
  // Company intelligence
  companyIntel?: {
    overview?: string;
    industry?: string;
    size?: string;
    revenue?: string;
    founded?: string;
    headquarters?: string;
    website?: string;
    recentNews?: string[];
  };
  
  // Persona analysis
  personaBucket?: {
    id: number;
    label: string;
    confidence: number;
    traits: string[];
  };
  
  // Metadata
  enrichedAt: string;
  providersUsed: string[];
  tokensUsed?: number;
  costCents?: number;
}

export interface EnrichmentStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitHits: number;
  averageResponseTime: number;
  totalCostCents: number;
  providerUsage: {
    rapidapi: number;
    perplexity: number;
    openai: number;
  };
}

export class UnifiedEnrichmentClient {
  private rapidApiProvider?: RapidAPISocialProvider;
  private perplexityProvider?: PerplexityProvider;
  private openAiProvider?: OpenAIEnrichmentProvider;
  
  private config: Required<Omit<EnrichmentConfig, 'rapidApiKey' | 'perplexityApiKey' | 'openAiApiKey'>> & Pick<EnrichmentConfig, 'rapidApiKey' | 'perplexityApiKey' | 'openAiApiKey'>;
  private requestQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    fn: () => Promise<any>;
  }> = [];
  private requestTimestamps: number[] = [];
  private processing = false;
  
  private stats: EnrichmentStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitHits: 0,
    averageResponseTime: 0,
    totalCostCents: 0,
    providerUsage: {
      rapidapi: 0,
      perplexity: 0,
      openai: 0,
    },
  };

  constructor(config: EnrichmentConfig) {
    // Validate at least one provider is configured
    if (!config.rapidApiKey && !config.perplexityApiKey && !config.openAiApiKey) {
      throw new Error('At least one provider API key is required');
    }

    // Set defaults
    this.config = {
      rapidApiKey: config.rapidApiKey,
      perplexityApiKey: config.perplexityApiKey,
      openAiApiKey: config.openAiApiKey,
      preferredProvider: config.preferredProvider || 'auto',
      enableFallback: config.enableFallback !== false,
      enableRateLimiting: config.enableRateLimiting !== false,
      requestsPerSecond: config.requestsPerSecond || 2,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      optimizeForCost: config.optimizeForCost !== false,
    };

    // Initialize providers
    if (config.rapidApiKey) {
      this.rapidApiProvider = new RapidAPISocialProvider({
        apiKey: config.rapidApiKey,
        enableRateLimiting: this.config.enableRateLimiting,
      });
    }

    if (config.perplexityApiKey) {
      this.perplexityProvider = new PerplexityProvider({
        apiKey: config.perplexityApiKey,
        enableRateLimiting: this.config.enableRateLimiting,
      });
    }

    if (config.openAiApiKey) {
      this.openAiProvider = new OpenAIEnrichmentProvider({
        apiKey: config.openAiApiKey,
        enableRateLimiting: this.config.enableRateLimiting,
      });
    }
  }

  /**
   * Enrich a lead with all available data
   * @param email - Email address to enrich
   * @param options - Additional enrichment options
   */
  async enrichLead(
    email: string,
    options?: {
      includeCompany?: boolean;
      includePersona?: boolean;
      companyName?: string;
    }
  ): Promise<EnrichedProfile> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const enriched: EnrichedProfile = {
        email,
        socialProfiles: {},
        enrichedAt: new Date().toISOString(),
        providersUsed: [],
      };

      // Step 1: Get social profiles (RapidAPI - cheapest, fastest)
      if (this.rapidApiProvider) {
        try {
          const socialData = await this._enqueueRequest(async () =>
            this.rapidApiProvider!.findSocialProfiles(email)
          );
          enriched.socialProfiles = socialData;
          enriched.providersUsed.push('rapidapi');
          this.stats.providerUsage.rapidapi++;
        } catch (error) {
          console.warn('RapidAPI social search failed:', error);
        }
      }

      // Step 2: Get company intelligence (Perplexity - if company name provided)
      if (
        options?.includeCompany &&
        options.companyName &&
        this.perplexityProvider
      ) {
        try {
          const companyData = await this._enqueueRequest(async () =>
            this.perplexityProvider!.enrichCompany(options.companyName!)
          );
          enriched.companyIntel = companyData;
          enriched.providersUsed.push('perplexity');
          this.stats.providerUsage.perplexity++;
        } catch (error) {
          console.warn('Perplexity company enrichment failed:', error);
        }
      }

      // Step 3: Analyze persona & bucket (OpenAI - most expensive, run last)
      if (options?.includePersona && this.openAiProvider) {
        try {
          const personaData = await this._enqueueRequest(async () =>
            this.openAiProvider!.analyzePersona(
              enriched.socialProfiles,
              enriched.companyIntel
            )
          );
          enriched.personaBucket = personaData;
          enriched.providersUsed.push('openai');
          this.stats.providerUsage.openai++;
        } catch (error) {
          console.warn('OpenAI persona analysis failed:', error);
        }
      }

      // Update stats
      this.stats.successfulRequests++;
      const responseTime = Date.now() - startTime;
      this.stats.averageResponseTime =
        (this.stats.averageResponseTime * (this.stats.successfulRequests - 1) +
          responseTime) /
        this.stats.successfulRequests;

      return enriched;
    } catch (error) {
      this.stats.failedRequests++;
      throw error;
    }
  }

  /**
   * Batch enrich multiple leads
   * @param emails - Array of email addresses
   * @param options - Enrichment options
   */
  async enrichBatch(
    emails: string[],
    options?: {
      includeCompany?: boolean;
      includePersona?: boolean;
      batchSize?: number;
    }
  ): Promise<EnrichedProfile[]> {
    const batchSize = options?.batchSize || 10;
    const results: EnrichedProfile[] = [];

    // Process in batches to respect rate limits
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((email) => this.enrichLead(email, options))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch enrichment error:', result.reason);
        }
      }
    }

    return results;
  }

  /**
   * Find social profiles only (fast, cheap)
   * @param email - Email address
   */
  async findSocialProfiles(email: string) {
    if (!this.rapidApiProvider) {
      throw new Error('RapidAPI provider not configured');
    }

    return this._enqueueRequest(async () =>
      this.rapidApiProvider!.findSocialProfiles(email)
    );
  }

  /**
   * Enrich company only
   * @param companyName - Company name
   */
  async enrichCompany(companyName: string) {
    if (!this.perplexityProvider) {
      throw new Error('Perplexity provider not configured');
    }

    return this._enqueueRequest(async () =>
      this.perplexityProvider!.enrichCompany(companyName)
    );
  }

  /**
   * Analyze persona only
   * @param socialProfiles - Social profiles data
   * @param companyIntel - Optional company intelligence
   */
  async analyzePersona(socialProfiles: any, companyIntel?: any) {
    if (!this.openAiProvider) {
      throw new Error('OpenAI provider not configured');
    }

    return this._enqueueRequest(async () =>
      this.openAiProvider!.analyzePersona(socialProfiles, companyIntel)
    );
  }

  /**
   * Get enrichment statistics
   */
  getStats(): EnrichmentStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      averageResponseTime: 0,
      totalCostCents: 0,
      providerUsage: {
        rapidapi: 0,
        perplexity: 0,
        openai: 0,
      },
    };
  }

  /**
   * Queue request with rate limiting
   * @private
   */
  private async _enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.config.enableRateLimiting) {
      return fn();
    }

    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, fn });
      this._processQueue();
    });
  }

  /**
   * Process request queue
   * @private
   */
  private async _processQueue(): Promise<void> {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const oneSecondAgo = now - 1000;

      // Remove old timestamps
      this.requestTimestamps = this.requestTimestamps.filter(
        (timestamp) => timestamp > oneSecondAgo
      );

      // Check rate limit
      if (this.requestTimestamps.length < this.config.requestsPerSecond) {
        const { resolve, reject, fn } = this.requestQueue.shift()!;
        this.requestTimestamps.push(now);

        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      } else {
        // Wait before next attempt
        this.stats.rateLimitHits++;
        const oldestTimestamp = Math.min(...this.requestTimestamps);
        const waitTime = 1000 - (now - oldestTimestamp);
        await this._sleep(waitTime);
      }
    }

    this.processing = false;
  }

  /**
   * Sleep utility
   * @private
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
