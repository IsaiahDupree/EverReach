import PerplexityClient from './perplexity-client.js';
import SocialLinksSearchClient from './social-links-search.js';

/**
 * Unified Enrichment Service with Provider Abstraction
 * 
 * Supports multiple AI providers for lead enrichment:
 * - Perplexity AI (via RapidAPI)
 * - OpenAI (direct or via RapidAPI)
 * - Anthropic Claude (future)
 * - Custom providers
 * 
 * Features:
 * - Easy provider switching
 * - Unified interface across providers
 * - Automatic fallback to alternate providers
 * - Combined social + AI enrichment
 * - Rate limiting across all providers
 * 
 * @class EnrichmentService
 */
class EnrichmentService {
  /**
   * Available AI providers
   */
  static PROVIDERS = {
    PERPLEXITY: 'perplexity',
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    CUSTOM: 'custom'
  };

  /**
   * Provider configurations and endpoints
   */
  static PROVIDER_CONFIGS = {
    perplexity: {
      name: 'Perplexity AI',
      host: 'perplexity-api.p.rapidapi.com',
      requiresRapidAPI: true,
      supportsSearch: true,
      models: {
        small: 'llama-3.1-sonar-small-128k-online',
        large: 'llama-3.1-sonar-large-128k-online',
        huge: 'llama-3.1-sonar-huge-128k-online'
      }
    },
    openai: {
      name: 'OpenAI',
      host: 'api.openai.com',
      requiresRapidAPI: false,
      supportsSearch: false,
      models: {
        small: 'gpt-3.5-turbo',
        large: 'gpt-4',
        huge: 'gpt-4-turbo'
      }
    },
    anthropic: {
      name: 'Anthropic Claude',
      host: 'api.anthropic.com',
      requiresRapidAPI: false,
      supportsSearch: false,
      models: {
        small: 'claude-3-haiku',
        large: 'claude-3-sonnet',
        huge: 'claude-3-opus'
      }
    }
  };

  /**
   * Create an enrichment service with specified providers
   * 
   * @param {Object} config - Configuration
   * @param {string} [config.aiProvider='perplexity'] - AI provider to use
   * @param {string} [config.aiApiKey] - API key for AI provider
   * @param {string} [config.socialApiKey] - API key for social search
   * @param {string} [config.aiModel] - Specific AI model to use
   * @param {number} [config.requestsPerSecond=1] - Rate limit
   * @param {boolean} [config.enableFallback=false] - Enable fallback providers
   * @param {Array} [config.fallbackProviders] - List of fallback providers
   * @param {Object} [config.customProvider] - Custom provider implementation
   */
  constructor(config = {}) {
    this.config = config;
    this.aiProvider = config.aiProvider || EnrichmentService.PROVIDERS.PERPLEXITY;
    this.enableFallback = config.enableFallback || false;
    this.fallbackProviders = config.fallbackProviders || [];
    
    // Initialize AI client based on provider
    this.aiClient = this._initializeAIClient(
      this.aiProvider,
      config.aiApiKey,
      config
    );

    // Initialize social search client
    if (config.socialApiKey) {
      this.socialClient = new SocialLinksSearchClient({
        apiKey: config.socialApiKey,
        requestsPerSecond: config.requestsPerSecond || 1,
        enableRateLimiting: config.enableRateLimiting !== false
      });
    }

    // Stats
    this.stats = {
      totalEnrichments: 0,
      successfulEnrichments: 0,
      failedEnrichments: 0,
      providerUsage: {},
      averageEnrichmentTime: 0
    };
  }

  /**
   * Initialize AI client based on provider
   * @private
   */
  _initializeAIClient(provider, apiKey, config) {
    if (!apiKey) {
      console.warn(`Warning: No API key provided for ${provider}`);
      return null;
    }

    const providerConfig = EnrichmentService.PROVIDER_CONFIGS[provider];
    
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${provider}. Valid providers: ${Object.keys(EnrichmentService.PROVIDERS).join(', ')}`);
    }

    switch (provider) {
      case EnrichmentService.PROVIDERS.PERPLEXITY:
        return new PerplexityClient({
          apiKey,
          apiHost: config.apiHost || providerConfig.host,
          model: config.aiModel || providerConfig.models.small,
          requestsPerSecond: config.requestsPerSecond || 1,
          maxTokens: config.maxTokens || 4096,
          temperature: config.temperature || 0.2,
          enableRateLimiting: config.enableRateLimiting !== false
        });

      case EnrichmentService.PROVIDERS.OPENAI:
        // Future: Initialize OpenAI client
        throw new Error('OpenAI provider not yet implemented. Coming soon!');

      case EnrichmentService.PROVIDERS.ANTHROPIC:
        // Future: Initialize Anthropic client
        throw new Error('Anthropic provider not yet implemented. Coming soon!');

      case EnrichmentService.PROVIDERS.CUSTOM:
        if (!config.customProvider) {
          throw new Error('Custom provider specified but no customProvider implementation provided');
        }
        return config.customProvider;

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Switch to a different AI provider
   * @param {string} provider - Provider name
   * @param {string} apiKey - API key for the provider
   * @param {Object} [options] - Additional options
   */
  switchProvider(provider, apiKey, options = {}) {
    this.aiProvider = provider;
    this.aiClient = this._initializeAIClient(provider, apiKey, {
      ...this.config,
      ...options
    });
    console.log(`Switched to ${provider} provider`);
  }

  /**
   * Complete lead enrichment with AI + Social data
   * 
   * @param {Object} params - Enrichment parameters
   * @param {string} [params.companyName] - Company to enrich
   * @param {string} [params.personName] - Person to enrich
   * @param {string} [params.email] - Email to search
   * @param {string} [params.query] - General search query
   * @param {boolean} [params.includeSocial=true] - Include social profiles
   * @param {boolean} [params.includeNews=true] - Include news
   * @param {boolean} [params.includeCompetitors=false] - Include competitors
   * @returns {Promise<Object>} Enriched data
   */
  async enrich(params) {
    const startTime = Date.now();
    this.stats.totalEnrichments++;

    try {
      const result = {
        query: params,
        timestamp: new Date().toISOString(),
        provider: this.aiProvider,
        intelligence: {},
        social: {},
        metadata: {}
      };

      // AI-powered intelligence
      if (this.aiClient && params.companyName) {
        result.intelligence.company = await this._enrichCompanyIntelligence(
          params.companyName,
          params
        );
      }

      if (this.aiClient && params.personName) {
        result.intelligence.person = await this._enrichPersonIntelligence(
          params.personName,
          params.companyName,
          params
        );
      }

      if (this.aiClient && params.email) {
        result.intelligence.contact = await this._enrichContactIntelligence(
          params.email,
          params
        );
      }

      // Social profiles
      if (this.socialClient && params.includeSocial !== false) {
        const searchQuery = params.email || params.query || params.companyName || params.personName;
        if (searchQuery) {
          result.social = await this._enrichSocialProfiles(searchQuery, params);
        }
      }

      // Track success
      this.stats.successfulEnrichments++;
      const enrichmentTime = Date.now() - startTime;
      this.stats.averageEnrichmentTime = 
        (this.stats.averageEnrichmentTime * (this.stats.successfulEnrichments - 1) + enrichmentTime) / 
        this.stats.successfulEnrichments;

      result.metadata.processingTime = enrichmentTime;
      result.metadata.tokensUsed = this.aiClient ? this.aiClient.getStats().totalTokensUsed : 0;

      return result;

    } catch (error) {
      this.stats.failedEnrichments++;
      
      // Try fallback providers if enabled
      if (this.enableFallback && this.fallbackProviders.length > 0) {
        return this._tryFallbackProviders(params, error);
      }

      throw error;
    }
  }

  /**
   * Enrich company intelligence
   * @private
   */
  async _enrichCompanyIntelligence(companyName, params) {
    const intelligence = {};

    // Basic company info
    const companyInfo = await this.aiClient.enrichCompany(companyName);
    intelligence.profile = this._extractContent(companyInfo);
    intelligence.sources = this._extractCitations(companyInfo);

    // News if requested
    if (params.includeNews !== false) {
      const news = await this.aiClient.getCompanyNews(
        companyName,
        params.newsTimeframe || 'last month'
      );
      intelligence.news = this._extractContent(news);
    }

    // Competitors if requested
    if (params.includeCompetitors) {
      const competitors = await this.aiClient.analyzeCompetitors(companyName);
      intelligence.competitors = this._extractContent(competitors);
    }

    return intelligence;
  }

  /**
   * Enrich person intelligence
   * @private
   */
  async _enrichPersonIntelligence(personName, company, params) {
    const personInfo = await this.aiClient.enrichPerson(personName, company);
    return {
      profile: this._extractContent(personInfo),
      sources: this._extractCitations(personInfo)
    };
  }

  /**
   * Enrich contact intelligence from email
   * @private
   */
  async _enrichContactIntelligence(email, params) {
    const contactInfo = await this.aiClient.enrichContact(email);
    return {
      profile: this._extractContent(contactInfo),
      sources: this._extractCitations(contactInfo)
    };
  }

  /**
   * Enrich social profiles
   * @private
   */
  async _enrichSocialProfiles(query, params) {
    const searchParams = {
      query,
      socialNetworks: params.socialNetworks
    };

    const result = await this.socialClient.search(searchParams);
    return result.data || {};
  }

  /**
   * Try fallback providers on failure
   * @private
   */
  async _tryFallbackProviders(params, originalError) {
    for (const fallbackProvider of this.fallbackProviders) {
      try {
        console.log(`Trying fallback provider: ${fallbackProvider.name}`);
        this.switchProvider(
          fallbackProvider.provider,
          fallbackProvider.apiKey,
          fallbackProvider.options || {}
        );
        return await this.enrich(params);
      } catch (error) {
        console.error(`Fallback provider ${fallbackProvider.name} also failed:`, error.message);
      }
    }

    throw new Error(`All providers failed. Original error: ${originalError.message}`);
  }

  /**
   * Extract content based on provider
   * @private
   */
  _extractContent(response) {
    if (this.aiClient && this.aiClient.extractContent) {
      return this.aiClient.extractContent(response);
    }
    return response;
  }

  /**
   * Extract citations based on provider
   * @private
   */
  _extractCitations(response) {
    if (this.aiClient && this.aiClient.extractCitations) {
      return this.aiClient.extractCitations(response);
    }
    return [];
  }

  /**
   * Get enrichment statistics
   */
  getStats() {
    return {
      ...this.stats,
      aiProvider: this.aiProvider,
      aiStats: this.aiClient ? this.aiClient.getStats() : null,
      socialStats: this.socialClient ? this.socialClient.getStats() : null
    };
  }

  /**
   * Get current provider info
   */
  getProviderInfo() {
    return {
      currentProvider: this.aiProvider,
      providerConfig: EnrichmentService.PROVIDER_CONFIGS[this.aiProvider],
      hasAIClient: !!this.aiClient,
      hasSocialClient: !!this.socialClient,
      fallbackEnabled: this.enableFallback,
      fallbackProviders: this.fallbackProviders.map(f => f.name)
    };
  }
}

export default EnrichmentService;
