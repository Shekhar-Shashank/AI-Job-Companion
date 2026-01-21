import {
  IScraper,
  ScraperConfig,
  ScrapedJob,
} from '../interfaces/scraper.interface';

/**
 * Abstract base class for all job portal scrapers
 * Provides common functionality like retries, delays, and user agent rotation
 */
export abstract class BaseScraper implements IScraper {
  abstract readonly name: string;
  enabled: boolean = true;

  // Rotating user agents to avoid detection
  protected readonly userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];

  // Delay between requests (2 seconds minimum)
  protected readonly minRequestDelay = 2000;
  protected readonly maxRequestDelay = 5000;

  // Retry configuration
  protected retryCount = 3;
  protected retryDelay = 5000;

  // Request timeout
  protected timeout = 30000;

  /**
   * Scrape jobs from the portal - must be implemented by each portal
   */
  abstract scrape(config: ScraperConfig): Promise<ScrapedJob[]>;

  /**
   * Fetch URL with retry logic and error handling
   */
  protected async fetchWithRetry(
    url: string,
    options?: RequestInit,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            Connection: 'keep-alive',
            ...options?.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return response;
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : this.retryDelay * attempt;
          console.warn(
            `[${this.name}] Rate limited, waiting ${waitTime}ms before retry`,
          );
          await this.delay(waitTime);
          continue;
        }

        // Handle server errors
        if (response.status >= 500) {
          lastError = new Error(`Server error: ${response.status}`);
          await this.delay(this.retryDelay * attempt);
          continue;
        }

        // Client errors - don't retry
        throw new Error(`Request failed: ${response.status}`);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error('Request timeout');
        } else {
          lastError = error instanceof Error ? error : new Error(String(error));
        }

        if (attempt < this.retryCount) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Random delay between requests to avoid detection
   */
  protected async randomDelay(): Promise<void> {
    const delay =
      this.minRequestDelay +
      Math.random() * (this.maxRequestDelay - this.minRequestDelay);
    await this.delay(delay);
  }

  /**
   * Fixed delay
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get a random user agent from the pool
   */
  protected getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Build search keywords from config
   */
  protected buildSearchQuery(config: ScraperConfig): string {
    return config.keywords.filter((k) => k).join(' ');
  }

  /**
   * Normalize job data to standard format
   */
  protected normalizeJob(
    rawJob: Partial<ScrapedJob>,
    source: string,
  ): ScrapedJob {
    return {
      externalId: rawJob.externalId || '',
      source,
      sourceUrl: rawJob.sourceUrl || '',
      title: this.cleanText(rawJob.title || ''),
      company: this.cleanText(rawJob.company || ''),
      location: rawJob.location ? this.cleanText(rawJob.location) : undefined,
      isRemote: rawJob.isRemote,
      description: rawJob.description
        ? this.cleanText(rawJob.description)
        : undefined,
      requirements: rawJob.requirements
        ? this.cleanText(rawJob.requirements)
        : undefined,
      responsibilities: rawJob.responsibilities
        ? this.cleanText(rawJob.responsibilities)
        : undefined,
      skillsRequired: rawJob.skillsRequired,
      salaryMin: rawJob.salaryMin,
      salaryMax: rawJob.salaryMax,
      salaryCurrency: rawJob.salaryCurrency,
      experienceMin: rawJob.experienceMin,
      experienceMax: rawJob.experienceMax,
      employmentType: rawJob.employmentType,
      postedDate: rawJob.postedDate,
      companyLogoUrl: rawJob.companyLogoUrl,
      benefits: rawJob.benefits,
      industry: rawJob.industry,
      companySize: rawJob.companySize,
    };
  }

  /**
   * Clean text by removing extra whitespace and special characters
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, '\n')
      .trim();
  }

  /**
   * Parse salary string into min/max values
   * Handles formats like: "$50k-$70k", "50,000 - 70,000", "₹10LPA", etc.
   */
  protected parseSalary(salaryText: string): {
    min?: number;
    max?: number;
    currency?: string;
  } {
    if (!salaryText) return {};

    const text = salaryText.toLowerCase().replace(/,/g, '');
    let currency: string | undefined;

    // Detect currency
    if (text.includes('$') || text.includes('usd')) currency = 'USD';
    else if (text.includes('₹') || text.includes('inr')) currency = 'INR';
    else if (text.includes('€') || text.includes('eur')) currency = 'EUR';
    else if (text.includes('£') || text.includes('gbp')) currency = 'GBP';

    // Extract numbers
    const numbers = text.match(/[\d.]+/g)?.map((n) => parseFloat(n)) || [];

    // Handle multipliers
    const multiplier =
      text.includes('lpa') || text.includes('lakhs') || text.includes('lac')
        ? 100000
        : text.includes('k')
          ? 1000
          : 1;

    if (numbers.length >= 2) {
      return {
        min: Math.round(numbers[0] * multiplier),
        max: Math.round(numbers[1] * multiplier),
        currency,
      };
    } else if (numbers.length === 1) {
      return {
        min: Math.round(numbers[0] * multiplier),
        max: Math.round(numbers[0] * multiplier),
        currency,
      };
    }

    return { currency };
  }

  /**
   * Parse experience string into min/max years
   * Handles formats like: "3-5 years", "5+ years", "Senior", etc.
   */
  protected parseExperience(expText: string): {
    min?: number;
    max?: number;
  } {
    if (!expText) return {};

    const text = expText.toLowerCase();

    // Handle ranges like "3-5 years"
    const rangeMatch = text.match(/(\d+)\s*[-–to]\s*(\d+)/);
    if (rangeMatch) {
      return {
        min: parseInt(rangeMatch[1], 10),
        max: parseInt(rangeMatch[2], 10),
      };
    }

    // Handle "X+ years"
    const plusMatch = text.match(/(\d+)\+/);
    if (plusMatch) {
      return {
        min: parseInt(plusMatch[1], 10),
      };
    }

    // Handle single number
    const singleMatch = text.match(/(\d+)\s*(?:year|yr)/);
    if (singleMatch) {
      return {
        min: parseInt(singleMatch[1], 10),
        max: parseInt(singleMatch[1], 10),
      };
    }

    // Handle levels
    if (text.includes('entry') || text.includes('junior') || text.includes('fresher')) {
      return { min: 0, max: 2 };
    }
    if (text.includes('mid') || text.includes('intermediate')) {
      return { min: 3, max: 5 };
    }
    if (text.includes('senior') || text.includes('lead')) {
      return { min: 5, max: 10 };
    }
    if (text.includes('principal') || text.includes('staff') || text.includes('architect')) {
      return { min: 8 };
    }

    return {};
  }

  /**
   * Detect if job is remote based on location/title text
   */
  protected detectRemote(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    return (
      lower.includes('remote') ||
      lower.includes('work from home') ||
      lower.includes('wfh') ||
      lower.includes('anywhere')
    );
  }

  /**
   * Test if the scraper can connect to the portal
   */
  async testConnection(): Promise<boolean> {
    try {
      // Subclasses should override with portal-specific test
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract skills from job description
   */
  protected extractSkills(text: string): string[] {
    if (!text) return [];

    const skillPatterns = [
      // Programming languages
      /\b(javascript|typescript|python|java|c\+\+|c#|ruby|go|golang|rust|php|swift|kotlin|scala|perl|r)\b/gi,
      // Frameworks
      /\b(react|angular|vue|next\.?js|node\.?js|express|django|flask|spring|rails|laravel|asp\.net|fastapi)\b/gi,
      // Databases
      /\b(mysql|postgresql|mongodb|redis|elasticsearch|oracle|sql server|dynamodb|cassandra|firebase)\b/gi,
      // Cloud
      /\b(aws|azure|gcp|google cloud|kubernetes|docker|terraform|jenkins|ci\/cd)\b/gi,
      // Other tech
      /\b(git|linux|rest|graphql|microservices|agile|scrum|devops|machine learning|ai|data science)\b/gi,
    ];

    const skills = new Set<string>();

    for (const pattern of skillPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((m) => skills.add(m.toLowerCase()));
      }
    }

    return Array.from(skills);
  }

  /**
   * Generate a unique external ID if not provided
   */
  protected generateExternalId(title: string, company: string, url?: string): string {
    const combined = `${title}-${company}-${url || Date.now()}`;
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
