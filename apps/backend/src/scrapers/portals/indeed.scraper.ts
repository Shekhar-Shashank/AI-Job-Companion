import { BaseScraper } from './base.scraper';
import { ScraperConfig, ScrapedJob } from '../interfaces/scraper.interface';

/**
 * Indeed Job Scraper
 * Uses Indeed's RSS feeds for job search results
 * RSS feeds are more reliable than web scraping and less likely to be blocked
 */
export class IndeedScraper extends BaseScraper {
  readonly name = 'indeed';

  // Indeed RSS feed base URL
  private readonly rssBaseUrl = 'https://www.indeed.com/rss';

  /**
   * Scrape jobs from Indeed using RSS feeds
   */
  async scrape(config: ScraperConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      const query = this.buildSearchQuery(config);
      const location = config.location || config.locations?.[0] || '';

      // Build RSS feed URL
      const params = new URLSearchParams({
        q: query,
        l: location,
        sort: 'date',
        limit: '50',
      });

      const feedUrl = `${this.rssBaseUrl}?${params.toString()}`;
      console.log(`[${this.name}] Fetching RSS: ${feedUrl}`);

      const response = await this.fetchWithRetry(feedUrl, {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml',
        },
      });

      const xml = await response.text();
      const parsedJobs = this.parseRssFeed(xml);

      for (const job of parsedJobs) {
        jobs.push(this.normalizeJob(job, this.name));
      }

      console.log(`[${this.name}] Found ${jobs.length} jobs`);
    } catch (error) {
      console.error(`[${this.name}] Scrape error:`, error);
      throw error;
    }

    return jobs;
  }

  /**
   * Parse Indeed RSS feed XML
   */
  private parseRssFeed(xml: string): Partial<ScrapedJob>[] {
    const jobs: Partial<ScrapedJob>[] = [];

    // Simple XML parsing without external dependencies
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const title = this.extractTag(itemXml, 'title');
      const link = this.extractTag(itemXml, 'link');
      const pubDate = this.extractTag(itemXml, 'pubDate');
      const description = this.extractTag(itemXml, 'description');

      // Indeed includes company and location in specific ways
      const source = this.extractTag(itemXml, 'source');
      const company = source || this.extractCompanyFromDescription(description);
      const location = this.extractLocationFromDescription(description);

      if (!title || !link) continue;

      // Extract external ID from URL
      const externalId = this.extractJobId(link);

      jobs.push({
        externalId,
        sourceUrl: link,
        title,
        company: company || 'Unknown Company',
        location,
        isRemote: this.detectRemote(title + ' ' + location + ' ' + description),
        description: this.cleanDescription(description),
        skillsRequired: this.extractSkills(description).join(', '),
        postedDate: pubDate ? new Date(pubDate) : undefined,
      });
    }

    return jobs;
  }

  /**
   * Extract XML tag content
   */
  private extractTag(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? (match[1] || match[2] || '').trim() : '';
  }

  /**
   * Extract job ID from Indeed URL
   */
  private extractJobId(url: string): string {
    // Indeed URLs contain job key like: jk=abc123def456
    const match = url.match(/jk=([a-zA-Z0-9]+)/);
    if (match) return match[1];

    // Fallback to using URL hash
    return this.generateExternalId(url, '', url);
  }

  /**
   * Extract company name from description
   */
  private extractCompanyFromDescription(description: string): string {
    // Indeed often formats as "Company Name - Location..."
    const match = description.match(/^([^-–]+)[-–]/);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract location from description
   */
  private extractLocationFromDescription(description: string): string {
    // Look for common location patterns
    const locationPatterns = [
      /(?:in|at)\s+([A-Za-z\s,]+?)(?:\.|,|$)/i,
      /([A-Za-z]+,\s*[A-Z]{2})/,
      /([A-Za-z]+,\s*[A-Za-z]+)/,
    ];

    for (const pattern of locationPatterns) {
      const match = description.match(pattern);
      if (match) return match[1].trim();
    }

    return '';
  }

  /**
   * Clean HTML from description
   */
  private cleanDescription(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Test connection to Indeed RSS
   */
  async testConnection(): Promise<boolean> {
    try {
      const testUrl = `${this.rssBaseUrl}?q=software+engineer&l=&limit=1`;
      const response = await this.fetchWithRetry(testUrl, {
        headers: { Accept: 'application/rss+xml' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
