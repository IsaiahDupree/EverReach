/**
 * RapidAPI Social Links Search Provider
 * 
 * Finds social media profiles across 9 platforms:
 * LinkedIn, Twitter, Instagram, Facebook, TikTok, YouTube, GitHub, Pinterest, Snapchat
 * 
 * Cost: ~$0.01-0.05 per search
 * Speed: Fast (200-500ms)
 * Best for: Email → social profile discovery
 */

export interface RapidAPISocialConfig {
  apiKey: string;
  apiHost?: string;
  requestsPerSecond?: number;
  maxRetries?: number;
  enableRateLimiting?: boolean;
}

export interface SocialProfiles {
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  github?: string;
  pinterest?: string;
  snapchat?: string;
}

export class RapidAPISocialProvider {
  private apiKey: string;
  private apiHost: string;
  private baseUrl: string;
  private requestsPerSecond: number;
  private maxRetries: number;
  private enableRateLimiting: boolean;

  constructor(config: RapidAPISocialConfig) {
    this.apiKey = config.apiKey;
    this.apiHost = config.apiHost || 'social-links-search.p.rapidapi.com';
    this.baseUrl = `https://${this.apiHost}`;
    this.requestsPerSecond = config.requestsPerSecond || 5;
    this.maxRetries = config.maxRetries || 3;
    this.enableRateLimiting = config.enableRateLimiting !== false;
  }

  /**
   * Find social profiles for an email address
   * @param email - Email address to search
   * @returns Social profile URLs
   */
  async findSocialProfiles(email: string): Promise<SocialProfiles> {
    const url = `${this.baseUrl}/`;
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': this.apiKey,
        'x-rapidapi-host': this.apiHost,
      },
      params: new URLSearchParams({
        query: email,
        social_networks: 'linkedin,twitter,instagram,facebook,tiktok,youtube,github,pinterest,snapchat',
      }),
    };

    try {
      const response = await this._makeRequest(url, options);
      
      // Parse response and extract URLs
      const profiles: SocialProfiles = {};
      
      if (response.data) {
        if (response.data.linkedin && response.data.linkedin.length > 0) {
          profiles.linkedin = response.data.linkedin[0];
        }
        if (response.data.twitter && response.data.twitter.length > 0) {
          profiles.twitter = response.data.twitter[0];
        }
        if (response.data.instagram && response.data.instagram.length > 0) {
          profiles.instagram = response.data.instagram[0];
        }
        if (response.data.facebook && response.data.facebook.length > 0) {
          profiles.facebook = response.data.facebook[0];
        }
        if (response.data.tiktok && response.data.tiktok.length > 0) {
          profiles.tiktok = response.data.tiktok[0];
        }
        if (response.data.youtube && response.data.youtube.length > 0) {
          profiles.youtube = response.data.youtube[0];
        }
        if (response.data.github && response.data.github.length > 0) {
          profiles.github = response.data.github[0];
        }
        if (response.data.pinterest && response.data.pinterest.length > 0) {
          profiles.pinterest = response.data.pinterest[0];
        }
        if (response.data.snapchat && response.data.snapchat.length > 0) {
          profiles.snapchat = response.data.snapchat[0];
        }
      }

      return profiles;
    } catch (error) {
      console.error('RapidAPI Social search error:', error);
      throw new Error(`RapidAPI social search failed: ${error}`);
    }
  }

  /**
   * Make HTTP request with retry logic
   * @private
   */
  private async _makeRequest(url: string, options: any, retryCount = 0): Promise<any> {
    try {
      const fullUrl = `${url}?${options.params.toString()}`;
      const response = await fetch(fullUrl, {
        method: options.method,
        headers: options.headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (retryCount < this.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await this._sleep(delay);
        return this._makeRequest(url, options, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Sleep utility
   * @private
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
