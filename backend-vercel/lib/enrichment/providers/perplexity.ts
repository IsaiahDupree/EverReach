/**
 * Perplexity AI Provider
 * 
 * AI-powered company and person research using Perplexity via RapidAPI
 * 
 * Cost: ~$0.01-0.05 per query (token-based)
 * Speed: Moderate (1-3s)
 * Best for: Company intelligence, person research, competitive analysis
 */

export interface PerplexityConfig {
  apiKey: string;
  apiHost?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  requestsPerSecond?: number;
  maxRetries?: number;
  enableRateLimiting?: boolean;
}

export interface CompanyIntel {
  overview?: string;
  industry?: string;
  size?: string;
  revenue?: string;
  founded?: string;
  headquarters?: string;
  website?: string;
  recentNews?: string[];
}

export class PerplexityProvider {
  private apiKey: string;
  private apiHost: string;
  private baseUrl: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private requestsPerSecond: number;
  private maxRetries: number;
  private enableRateLimiting: boolean;

  constructor(config: PerplexityConfig) {
    this.apiKey = config.apiKey;
    this.apiHost = config.apiHost || 'perplexity2.p.rapidapi.com';
    this.baseUrl = `https://${this.apiHost}`;
    this.model = config.model || 'llama-3.1-sonar-small-128k-online';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature !== undefined ? config.temperature : 0.2;
    this.requestsPerSecond = config.requestsPerSecond || 2;
    this.maxRetries = config.maxRetries || 3;
    this.enableRateLimiting = config.enableRateLimiting !== false;
  }

  /**
   * Enrich company with AI-powered research
   * @param companyName - Name of the company
   * @returns Company intelligence data
   */
  async enrichCompany(companyName: string): Promise<CompanyIntel> {
    const prompt = `Provide detailed, current information about ${companyName} including: 
    1. Company overview (1-2 sentences)
    2. Industry/sector
    3. Company size (employees)
    4. Revenue/funding (if public)
    5. Founded year
    6. Headquarters location
    7. Website URL
    8. Recent news (last 3 months)
    
    Format as structured JSON.`;

    try {
      const response = await this._query(prompt);
      
      // Parse AI response into structured format
      const content = response.choices?.[0]?.message?.content || '';
      
      // Extract structured data (simplified parsing)
      const intel: CompanyIntel = {
        overview: this._extractField(content, 'overview'),
        industry: this._extractField(content, 'industry'),
        size: this._extractField(content, 'size'),
        revenue: this._extractField(content, 'revenue'),
        founded: this._extractField(content, 'founded'),
        headquarters: this._extractField(content, 'headquarters'),
        website: this._extractField(content, 'website'),
        recentNews: this._extractNews(content),
      };

      return intel;
    } catch (error) {
      console.error('Perplexity enrichment error:', error);
      throw new Error(`Perplexity company enrichment failed: ${error}`);
    }
  }

  /**
   * Get company news
   * @param companyName - Company name
   * @param timeframe - Timeframe for news
   */
  async getCompanyNews(companyName: string, timeframe = 'last 3 months'): Promise<string[]> {
    const prompt = `Summarize recent news and developments about ${companyName} from the ${timeframe}, focusing on: funding, partnerships, product launches, and leadership changes. List as bullet points.`;

    try {
      const response = await this._query(prompt);
      const content = response.choices?.[0]?.message?.content || '';
      
      // Parse bullet points
      return content
        .split('\n')
        .filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map((line: string) => line.replace(/^[-•]\s*/, '').trim());
    } catch (error) {
      console.error('Perplexity news error:', error);
      return [];
    }
  }

  /**
   * Query Perplexity AI
   * @private
   */
  private async _query(prompt: string, retryCount = 0): Promise<any> {
    const url = `${this.baseUrl}/`;
    const body = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a precise business intelligence assistant. Provide structured, factual information.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      return_citations: false,
      return_images: false,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': this.apiHost,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
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
   * Extract field from AI response
   * @private
   */
  private _extractField(content: string, field: string): string | undefined {
    const regex = new RegExp(`${field}[:\\s]+([^\\n]+)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Extract news items from response
   * @private
   */
  private _extractNews(content: string): string[] {
    return content
      .split('\n')
      .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('•'))
      .map((line) => line.replace(/^[-•]\s*/, '').trim())
      .slice(0, 5); // Limit to 5 news items
  }

  /**
   * Sleep utility
   * @private
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
