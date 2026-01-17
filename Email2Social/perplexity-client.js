import fetch from 'node-fetch';

/**
 * Perplexity AI API Client for Lead Enrichment
 * 
 * A comprehensive client for interacting with the Perplexity AI API via RapidAPI.
 * Optimized for lead enrichment, research, and intelligent information gathering.
 * 
 * Features:
 * - Built-in rate limiting with token tracking
 * - Request queuing for handling bursts
 * - Automatic retry with exponential backoff
 * - Token usage monitoring
 * - Comprehensive error handling
 * - Lead enrichment templates
 * 
 * @class PerplexityClient
 */
class PerplexityClient {
  /**
   * Available Perplexity models
   * @static
   * @readonly
   */
  static MODELS = {
    SONAR_SMALL: 'llama-3.1-sonar-small-128k-online',
    SONAR_LARGE: 'llama-3.1-sonar-large-128k-online',
    SONAR_HUGE: 'llama-3.1-sonar-huge-128k-online'
  };

  /**
   * API pricing tiers and their limits
   * @static
   * @readonly
   */
  static RATE_LIMITS = {
    BASIC: { 
      requestsPerSecond: 1,
      requestsPerHour: 1000,
      requestsPerMonth: 50,
      tokensPerMonth: 100000
    },
    PRO: { 
      requestsPerSecond: 1,
      requestsPerMonth: 3000,
      tokensPerMonth: 5000000
    },
    ULTRA: { 
      requestsPerSecond: 2,
      requestsPerMonth: 50000,
      tokensPerMonth: 100000000
    },
    MEGA: { 
      requestsPerSecond: 5,
      requestsPerMonth: 250000,
      tokensPerMonth: 250000000
    }
  };

  /**
   * Lead enrichment prompt templates
   * @static
   * @readonly
   */
  static ENRICHMENT_TEMPLATES = {
    COMPANY_INFO: (companyName) => 
      `Provide detailed, current information about ${companyName} including: company overview, industry, size, headquarters location, key executives, recent news, and main products/services. Format as structured data.`,
    
    PERSON_INFO: (personName, company = null) => 
      `Find professional information about ${personName}${company ? ` who works at ${company}` : ''} including: current role, professional background, education, notable achievements, and social media presence. Format as structured data.`,
    
    CONTACT_ENRICHMENT: (email) => 
      `Based on the email address ${email}, find: associated person's name, company, job title, professional background, and any publicly available contact information.`,
    
    INDUSTRY_RESEARCH: (industry, topic) => 
      `Provide comprehensive research about ${topic} in the ${industry} industry, including: key trends, major players, market size, challenges, and opportunities.`,
    
    COMPETITOR_ANALYSIS: (companyName) => 
      `Identify and analyze the main competitors of ${companyName}, including: competitor names, market positioning, strengths/weaknesses, and differentiation factors.`,
    
    LEAD_QUALIFICATION: (companyName, criteria) => 
      `Evaluate ${companyName} as a potential lead based on: ${criteria}. Provide a qualification score and reasoning.`,
    
    NEWS_SUMMARY: (companyName, timeframe = 'last 3 months') => 
      `Summarize recent news and developments about ${companyName} from the ${timeframe}, focusing on: funding, partnerships, product launches, and leadership changes.`
  };

  /**
   * Creates an instance of PerplexityClient
   * 
   * @param {Object} config - Configuration object
   * @param {string} config.apiKey - Your RapidAPI key
   * @param {string} [config.apiHost='perplexity2.p.rapidapi.com'] - API host
   * @param {string} [config.model='llama-3.1-sonar-small-128k-online'] - Default model to use
   * @param {number} [config.requestsPerSecond=1] - Max requests per second (rate limit)
   * @param {number} [config.maxRetries=3] - Maximum number of retry attempts
   * @param {number} [config.retryDelay=1000] - Initial retry delay in milliseconds
   * @param {boolean} [config.enableRateLimiting=true] - Enable/disable rate limiting
   * @param {number} [config.maxTokens=4096] - Maximum tokens per request
   * @param {number} [config.temperature=0.2] - Model temperature (0-2)
   * @throws {Error} If apiKey is not provided
   */
  constructor(config) {
    if (!config || !config.apiKey) {
      throw new Error('API key is required. Get your key from https://rapidapi.com/');
    }

    this.apiKey = config.apiKey;
    this.apiHost = config.apiHost || 'perplexity2.p.rapidapi.com';
    this.baseUrl = `https://${this.apiHost}`;
    this.model = config.model || PerplexityClient.MODELS.SONAR_SMALL;
    this.requestsPerSecond = config.requestsPerSecond || 1;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.enableRateLimiting = config.enableRateLimiting !== false;
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature !== undefined ? config.temperature : 0.2;

    // Rate limiting state
    this.requestQueue = [];
    this.requestTimestamps = [];
    this.processing = false;

    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      totalTokensUsed: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      averageResponseTime: 0,
      averageTokensPerRequest: 0
    };
  }

  /**
   * Process the request queue with rate limiting
   * @private
   */
  async _processQueue() {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const oneSecondAgo = now - 1000;

      // Remove timestamps older than 1 second
      this.requestTimestamps = this.requestTimestamps.filter(
        timestamp => timestamp > oneSecondAgo
      );

      // Check if we can make a request
      if (this.requestTimestamps.length < this.requestsPerSecond) {
        const { resolve, reject, fn } = this.requestQueue.shift();
        this.requestTimestamps.push(now);

        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      } else {
        // Wait before checking again
        const oldestTimestamp = Math.min(...this.requestTimestamps);
        const waitTime = 1000 - (now - oldestTimestamp);
        await this._sleep(waitTime);
      }
    }

    this.processing = false;
  }

  /**
   * Add a request to the queue (with rate limiting)
   * @private
   * @param {Function} fn - Function to execute
   * @returns {Promise} Promise that resolves with the function result
   */
  _enqueueRequest(fn) {
    if (!this.enableRateLimiting) {
      return fn();
    }

    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, fn });
      this._processQueue();
    });
  }

  /**
   * Sleep utility function
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after the specified time
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make an HTTP request with retry logic
   * @private
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @param {number} [retryCount=0] - Current retry attempt
   * @returns {Promise<Object>} Response data
   * @throws {Error} If request fails after all retries
   */
  async _makeRequest(url, options, retryCount = 0) {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const response = await fetch(url, options);
      const responseTime = Date.now() - startTime;

      // Update average response time
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime * (this.stats.successfulRequests) + responseTime) / 
        (this.stats.successfulRequests + 1);

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          this.stats.rateLimitHits++;
          
          if (retryCount < this.maxRetries) {
            const delay = this.retryDelay * Math.pow(2, retryCount);
            await this._sleep(delay);
            return this._makeRequest(url, options, retryCount + 1);
          }
          throw new Error('Rate limit exceeded. Please upgrade your plan or wait before retrying.');
        }

        // Handle other HTTP errors
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      
      // Track token usage
      if (data.usage) {
        this.stats.totalTokensUsed += data.usage.total_tokens || 0;
        this.stats.totalPromptTokens += data.usage.prompt_tokens || 0;
        this.stats.totalCompletionTokens += data.usage.completion_tokens || 0;
        this.stats.averageTokensPerRequest = 
          this.stats.totalTokensUsed / (this.stats.successfulRequests + 1);
      }

      this.stats.successfulRequests++;
      return data;

    } catch (error) {
      this.stats.failedRequests++;

      // Retry on network errors
      if (retryCount < this.maxRetries && error.name === 'FetchError') {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        await this._sleep(delay);
        return this._makeRequest(url, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Send a chat completion request to Perplexity AI
   * 
   * @param {Object} params - Request parameters
   * @param {string|Array} params.messages - Message(s) to send (string or array of message objects)
   * @param {string} [params.model] - Model to use (defaults to client's default model)
   * @param {number} [params.maxTokens] - Maximum tokens to generate
   * @param {number} [params.temperature] - Sampling temperature (0-2)
   * @param {number} [params.topP] - Nucleus sampling parameter
   * @param {boolean} [params.returnCitations=false] - Whether to return citations
   * @param {boolean} [params.returnImages=false] - Whether to return related images
   * @param {boolean} [params.returnRelatedQuestions=false] - Whether to return related questions
   * @param {string} [params.searchDomainFilter] - Filter results to specific domains
   * @param {number} [params.searchRecencyFilter] - Filter by recency (e.g., "day", "week", "month")
   * @returns {Promise<Object>} API response with completion
   * 
   * @example
   * const result = await client.chat({
   *   messages: "Tell me about Tesla Inc."
   * });
   */
  async chat(params) {
    if (!params || (!params.messages && !params.message)) {
      throw new Error('Messages parameter is required');
    }

    // Normalize messages to array format
    let messages;
    if (typeof params.messages === 'string') {
      messages = [{ role: 'user', content: params.messages }];
    } else if (typeof params.message === 'string') {
      messages = [{ role: 'user', content: params.message }];
    } else {
      messages = params.messages;
    }

    const requestBody = {
      model: params.model || this.model,
      messages: messages,
      max_tokens: params.maxTokens || this.maxTokens,
      temperature: params.temperature !== undefined ? params.temperature : this.temperature,
      top_p: params.topP || 0.9,
      return_citations: params.returnCitations || false,
      return_images: params.returnImages || false,
      return_related_questions: params.returnRelatedQuestions || false,
      search_domain_filter: params.searchDomainFilter ? [params.searchDomainFilter] : undefined,
      search_recency_filter: params.searchRecencyFilter || undefined
    };

    // Remove undefined values
    Object.keys(requestBody).forEach(key => 
      requestBody[key] === undefined && delete requestBody[key]
    );

    const url = `${this.baseUrl}/`;
    const options = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-rapidapi-host': this.apiHost,
        'x-rapidapi-key': this.apiKey
      },
      body: JSON.stringify(requestBody)
    };

    return this._enqueueRequest(() => this._makeRequest(url, options));
  }

  /**
   * Enrich a company with detailed information
   * 
   * @param {string} companyName - Name of the company to research
   * @param {Object} [options] - Additional options
   * @returns {Promise<Object>} Enriched company data
   * 
   * @example
   * const companyData = await client.enrichCompany("Tesla Inc");
   */
  async enrichCompany(companyName, options = {}) {
    const prompt = PerplexityClient.ENRICHMENT_TEMPLATES.COMPANY_INFO(companyName);
    return this.chat({
      messages: prompt,
      returnCitations: true,
      ...options
    });
  }

  /**
   * Enrich a person's professional information
   * 
   * @param {string} personName - Name of the person
   * @param {string} [company] - Optional company name for context
   * @param {Object} [options] - Additional options
   * @returns {Promise<Object>} Enriched person data
   * 
   * @example
   * const personData = await client.enrichPerson("Elon Musk", "Tesla");
   */
  async enrichPerson(personName, company = null, options = {}) {
    const prompt = PerplexityClient.ENRICHMENT_TEMPLATES.PERSON_INFO(personName, company);
    return this.chat({
      messages: prompt,
      returnCitations: true,
      ...options
    });
  }

  /**
   * Enrich contact information from an email address
   * 
   * @param {string} email - Email address to research
   * @param {Object} [options] - Additional options
   * @returns {Promise<Object>} Enriched contact data
   * 
   * @example
   * const contactData = await client.enrichContact("john@company.com");
   */
  async enrichContact(email, options = {}) {
    const prompt = PerplexityClient.ENRICHMENT_TEMPLATES.CONTACT_ENRICHMENT(email);
    return this.chat({
      messages: prompt,
      returnCitations: true,
      ...options
    });
  }

  /**
   * Get recent news and developments about a company
   * 
   * @param {string} companyName - Company name
   * @param {string} [timeframe='last 3 months'] - Time period for news
   * @param {Object} [options] - Additional options
   * @returns {Promise<Object>} News summary
   * 
   * @example
   * const news = await client.getCompanyNews("Apple", "last week");
   */
  async getCompanyNews(companyName, timeframe = 'last 3 months', options = {}) {
    const prompt = PerplexityClient.ENRICHMENT_TEMPLATES.NEWS_SUMMARY(companyName, timeframe);
    return this.chat({
      messages: prompt,
      returnCitations: true,
      searchRecencyFilter: timeframe.includes('week') ? 'week' : 
                          timeframe.includes('month') ? 'month' : 'year',
      ...options
    });
  }

  /**
   * Perform competitor analysis
   * 
   * @param {string} companyName - Company to analyze
   * @param {Object} [options] - Additional options
   * @returns {Promise<Object>} Competitor analysis
   * 
   * @example
   * const competitors = await client.analyzeCompetitors("Salesforce");
   */
  async analyzeCompetitors(companyName, options = {}) {
    const prompt = PerplexityClient.ENRICHMENT_TEMPLATES.COMPETITOR_ANALYSIS(companyName);
    return this.chat({
      messages: prompt,
      returnCitations: true,
      ...options
    });
  }

  /**
   * Qualify a lead based on criteria
   * 
   * @param {string} companyName - Company to qualify
   * @param {string} criteria - Qualification criteria
   * @param {Object} [options] - Additional options
   * @returns {Promise<Object>} Lead qualification score and reasoning
   * 
   * @example
   * const qualification = await client.qualifyLead(
   *   "Acme Corp",
   *   "annual revenue >$10M, 50-500 employees, technology sector"
   * );
   */
  async qualifyLead(companyName, criteria, options = {}) {
    const prompt = PerplexityClient.ENRICHMENT_TEMPLATES.LEAD_QUALIFICATION(companyName, criteria);
    return this.chat({
      messages: prompt,
      returnCitations: true,
      ...options
    });
  }

  /**
   * Research an industry topic
   * 
   * @param {string} industry - Industry name
   * @param {string} topic - Specific topic to research
   * @param {Object} [options] - Additional options
   * @returns {Promise<Object>} Industry research data
   * 
   * @example
   * const research = await client.researchIndustry("SaaS", "AI adoption trends");
   */
  async researchIndustry(industry, topic, options = {}) {
    const prompt = PerplexityClient.ENRICHMENT_TEMPLATES.INDUSTRY_RESEARCH(industry, topic);
    return this.chat({
      messages: prompt,
      returnCitations: true,
      ...options
    });
  }

  /**
   * Extract the main text content from a chat response
   * 
   * @param {Object} response - API response
   * @returns {string} Extracted text content
   */
  extractContent(response) {
    if (response.choices && response.choices[0] && response.choices[0].message) {
      return response.choices[0].message.content;
    }
    return '';
  }

  /**
   * Extract citations from a response
   * 
   * @param {Object} response - API response
   * @returns {Array} Array of citations
   */
  extractCitations(response) {
    return response.citations || [];
  }

  /**
   * Get client statistics including token usage
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.requestQueue.length,
      rateLimitingEnabled: this.enableRateLimiting,
      requestsPerSecond: this.requestsPerSecond,
      model: this.model
    };
  }

  /**
   * Reset client statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      totalTokensUsed: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      averageResponseTime: 0,
      averageTokensPerRequest: 0
    };
  }

  /**
   * Wait for all pending requests in the queue to complete
   * @returns {Promise<void>}
   */
  async flush() {
    while (this.requestQueue.length > 0 || this.processing) {
      await this._sleep(100);
    }
  }

  /**
   * Clear the request queue
   */
  clearQueue() {
    this.requestQueue = [];
  }

  /**
   * Update rate limiting configuration
   * @param {number} requestsPerSecond - New rate limit
   */
  setRateLimit(requestsPerSecond) {
    if (requestsPerSecond <= 0) {
      throw new Error('Rate limit must be greater than 0');
    }
    this.requestsPerSecond = requestsPerSecond;
  }

  /**
   * Configure client based on pricing tier
   * @param {string} tier - Pricing tier ('BASIC', 'PRO', 'ULTRA', 'MEGA')
   */
  setTier(tier) {
    const tierConfig = PerplexityClient.RATE_LIMITS[tier.toUpperCase()];
    if (!tierConfig) {
      throw new Error(
        `Invalid tier: ${tier}. Valid tiers: ${Object.keys(PerplexityClient.RATE_LIMITS).join(', ')}`
      );
    }
    this.setRateLimit(tierConfig.requestsPerSecond);
  }

  /**
   * Set the default model for requests
   * @param {string} model - Model name
   */
  setModel(model) {
    const validModels = Object.values(PerplexityClient.MODELS);
    if (!validModels.includes(model)) {
      throw new Error(
        `Invalid model: ${model}. Valid models: ${validModels.join(', ')}`
      );
    }
    this.model = model;
  }
}

export default PerplexityClient;
