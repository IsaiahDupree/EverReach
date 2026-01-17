import fetch from 'node-fetch';

/**
 * Social Links Search API Client
 * 
 * A comprehensive client for interacting with the RapidAPI Social Links Search API.
 * Supports searching for social media profile links across multiple platforms including
 * Facebook, TikTok, Instagram, Snapchat, Twitter, LinkedIn, YouTube, Pinterest, and GitHub.
 * 
 * Features:
 * - Built-in rate limiting with configurable limits
 * - Request queuing for handling bursts
 * - Automatic retry with exponential backoff
 * - Comprehensive error handling
 * - TypeScript-style JSDoc annotations
 * 
 * @class SocialLinksSearchClient
 */
class SocialLinksSearchClient {
  /**
   * Available social networks supported by the API
   * @static
   * @readonly
   */
  static SUPPORTED_NETWORKS = [
    'facebook',
    'tiktok',
    'instagram',
    'snapchat',
    'twitter',
    'youtube',
    'linkedin',
    'github',
    'pinterest'
  ];

  /**
   * API pricing tiers and their rate limits
   * @static
   * @readonly
   */
  static RATE_LIMITS = {
    BASIC: { requestsPerSecond: 1, requestsPerMonth: 50 },
    PRO: { requestsPerSecond: 5, requestsPerMonth: 10000 },
    ULTRA: { requestsPerSecond: 10, requestsPerMonth: 50000 },
    MEGA: { requestsPerSecond: 20, requestsPerMonth: 200000 }
  };

  /**
   * Creates an instance of SocialLinksSearchClient
   * 
   * @param {Object} config - Configuration object
   * @param {string} config.apiKey - Your RapidAPI key
   * @param {string} [config.apiHost='social-links-search.p.rapidapi.com'] - API host
   * @param {number} [config.requestsPerSecond=1] - Max requests per second (rate limit)
   * @param {number} [config.maxRetries=3] - Maximum number of retry attempts
   * @param {number} [config.retryDelay=1000] - Initial retry delay in milliseconds
   * @param {boolean} [config.enableRateLimiting=true] - Enable/disable rate limiting
   * @throws {Error} If apiKey is not provided
   */
  constructor(config) {
    if (!config || !config.apiKey) {
      throw new Error('API key is required. Get your key from https://rapidapi.com/');
    }

    this.apiKey = config.apiKey;
    this.apiHost = config.apiHost || 'social-links-search.p.rapidapi.com';
    this.baseUrl = `https://${this.apiHost}`;
    this.requestsPerSecond = config.requestsPerSecond || 1;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.enableRateLimiting = config.enableRateLimiting !== false;

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
      averageResponseTime: 0
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
   * Search for social links based on a query
   * 
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query (e.g., "John Smith", "example@email.com")
   * @param {string|string[]} [params.socialNetworks] - Specific social networks to search
   *   Can be a comma-separated string or an array. 
   *   Default: all supported networks
   * @returns {Promise<Object>} Search results containing social links
   * 
   * @example
   * // Search all networks
   * const results = await client.search({ query: "John Smith" });
   * 
   * @example
   * // Search specific networks
   * const results = await client.search({ 
   *   query: "example@email.com",
   *   socialNetworks: ["facebook", "linkedin"]
   * });
   */
  async search(params) {
    if (!params || !params.query) {
      throw new Error('Query parameter is required');
    }

    // Validate social networks if provided
    if (params.socialNetworks) {
      const networks = Array.isArray(params.socialNetworks) 
        ? params.socialNetworks 
        : params.socialNetworks.split(',').map(n => n.trim());

      const invalidNetworks = networks.filter(
        network => !SocialLinksSearchClient.SUPPORTED_NETWORKS.includes(network)
      );

      if (invalidNetworks.length > 0) {
        throw new Error(
          `Invalid social networks: ${invalidNetworks.join(', ')}. ` +
          `Supported networks: ${SocialLinksSearchClient.SUPPORTED_NETWORKS.join(', ')}`
        );
      }
    }

    const queryParams = new URLSearchParams({
      query: params.query
    });

    if (params.socialNetworks) {
      const networksString = Array.isArray(params.socialNetworks)
        ? params.socialNetworks.join(',')
        : params.socialNetworks;
      queryParams.append('social_networks', networksString);
    }

    const url = `${this.baseUrl}/search-social-links?${queryParams.toString()}`;
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-host': this.apiHost,
        'x-rapidapi-key': this.apiKey
      }
    };

    return this._enqueueRequest(() => this._makeRequest(url, options));
  }

  /**
   * Search for social links with filtering by specific networks
   * This is a convenience method that wraps the search method
   * 
   * @param {string} query - Search query
   * @param {...string} networks - Social networks to search (as separate arguments)
   * @returns {Promise<Object>} Search results
   * 
   * @example
   * const results = await client.searchNetworks("John Smith", "facebook", "linkedin");
   */
  async searchNetworks(query, ...networks) {
    return this.search({
      query,
      socialNetworks: networks.length > 0 ? networks : undefined
    });
  }

  /**
   * Get client statistics
   * @returns {Object} Statistics object with request counts and performance metrics
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.requestQueue.length,
      rateLimitingEnabled: this.enableRateLimiting,
      requestsPerSecond: this.requestsPerSecond
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
      averageResponseTime: 0
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
    const tierConfig = SocialLinksSearchClient.RATE_LIMITS[tier.toUpperCase()];
    if (!tierConfig) {
      throw new Error(
        `Invalid tier: ${tier}. Valid tiers: ${Object.keys(SocialLinksSearchClient.RATE_LIMITS).join(', ')}`
      );
    }
    this.setRateLimit(tierConfig.requestsPerSecond);
  }
}

export default SocialLinksSearchClient;
