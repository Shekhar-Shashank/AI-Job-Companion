import { BaseScraper } from './base.scraper';
import { ScraperConfig, ScrapedJob } from '../interfaces/scraper.interface';

/**
 * LinkedIn Job Scraper
 * Uses LinkedIn's public job search pages (no authentication required)
 * Note: LinkedIn is strict about scraping, so this uses public guest access only
 */
export class LinkedInScraper extends BaseScraper {
  readonly name = 'linkedin';

  private readonly baseUrl = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';

  /**
   * Scrape jobs from LinkedIn's public job search
   */
  async scrape(config: ScraperConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      const query = this.buildSearchQuery(config);
      const location = config.location || config.locations?.[0] || '';

      // Build search params
      const params = new URLSearchParams({
        keywords: query,
        location: location,
        start: '0',
        sortBy: 'DD', // Date descending
      });

      // Add remote filter if needed
      if (config.remote) {
        params.set('f_WT', '2'); // Remote work type
      }

      const searchUrl = `${this.baseUrl}?${params.toString()}`;
      console.log(`[${this.name}] Fetching: ${searchUrl}`);

      const response = await this.fetchWithRetry(searchUrl);
      const html = await response.text();

      // Parse job listings
      const parsedJobs = this.parseJobListings(html);

      for (const job of parsedJobs) {
        jobs.push(this.normalizeJob(job, this.name));
      }

      // Fetch additional pages (up to 3 pages = 75 jobs)
      for (let page = 1; page <= 2; page++) {
        await this.randomDelay();

        params.set('start', String(page * 25));
        const pageUrl = `${this.baseUrl}?${params.toString()}`;

        try {
          const pageResponse = await this.fetchWithRetry(pageUrl);
          const pageHtml = await pageResponse.text();
          const pageJobs = this.parseJobListings(pageHtml);

          for (const job of pageJobs) {
            jobs.push(this.normalizeJob(job, this.name));
          }
        } catch (e) {
          console.warn(`[${this.name}] Failed to fetch page ${page + 1}`);
          break;
        }
      }

      console.log(`[${this.name}] Found ${jobs.length} jobs`);
    } catch (error) {
      console.error(`[${this.name}] Scrape error:`, error);
      throw error;
    }

    return jobs;
  }

  /**
   * Parse job listings from LinkedIn HTML
   */
  private parseJobListings(html: string): Partial<ScrapedJob>[] {
    const jobs: Partial<ScrapedJob>[] = [];

    // LinkedIn job cards are in li elements with base-card class
    const jobCardRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let match;

    while ((match = jobCardRegex.exec(html)) !== null) {
      try {
        const cardHtml = match[1];

        // Check if it's actually a job card
        if (!cardHtml.includes('base-card') && !cardHtml.includes('job-card')) {
          continue;
        }

        const job = this.parseJobCard(cardHtml);
        if (job.title && job.company) {
          jobs.push(job);
        }
      } catch (e) {
        continue;
      }
    }

    return jobs;
  }

  /**
   * Parse individual job card
   */
  private parseJobCard(cardHtml: string): Partial<ScrapedJob> {
    // Extract title
    const titleMatch = cardHtml.match(/<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([^<]+)<\/h3>/i) ||
                      cardHtml.match(/<span[^>]*class="[^"]*job-card-list__title[^"]*"[^>]*>([^<]+)<\/span>/i);
    const title = titleMatch ? this.cleanText(titleMatch[1]) : '';

    // Extract URL
    const urlMatch = cardHtml.match(/<a[^>]*href="([^"]*linkedin\.com\/jobs\/view\/[^"]+)"[^>]*/i);
    const sourceUrl = urlMatch ? urlMatch[1].split('?')[0] : '';

    // Extract company
    const companyMatch = cardHtml.match(/<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i) ||
                        cardHtml.match(/<span[^>]*class="[^"]*job-card-container__primary-description[^"]*"[^>]*>([^<]+)<\/span>/i);
    const company = companyMatch ? this.cleanText(companyMatch[1]) : '';

    // Extract location
    const locationMatch = cardHtml.match(/<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                         cardHtml.match(/<span[^>]*class="[^"]*job-card-container__metadata-item[^"]*"[^>]*>([^<]+)<\/span>/i);
    const location = locationMatch ? this.cleanText(locationMatch[1]) : '';

    // Extract posted date
    const dateMatch = cardHtml.match(/<time[^>]*datetime="([^"]+)"[^>]*>/i);
    const postedDate = dateMatch ? new Date(dateMatch[1]) : undefined;

    // Extract job ID from URL
    const externalId = this.extractJobId(sourceUrl);

    // Check for remote
    const isRemote = this.detectRemote(title + ' ' + location);

    // Extract company logo
    const logoMatch = cardHtml.match(/<img[^>]*data-delayed-url="([^"]+)"[^>]*>/i) ||
                     cardHtml.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*artdeco-entity-image[^"]*"/i);
    const companyLogoUrl = logoMatch ? logoMatch[1] : undefined;

    return {
      externalId,
      sourceUrl,
      title,
      company,
      location,
      isRemote,
      postedDate,
      companyLogoUrl,
    };
  }

  /**
   * Extract job ID from LinkedIn URL
   */
  private extractJobId(url: string): string {
    // LinkedIn URLs: /jobs/view/123456789
    const match = url.match(/\/jobs\/view\/(\d+)/);
    if (match) return match[1];

    return this.generateExternalId('', '', url);
  }

  /**
   * Test connection to LinkedIn
   */
  async testConnection(): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        keywords: 'software engineer',
        location: '',
        start: '0',
      });
      const response = await this.fetchWithRetry(`${this.baseUrl}?${params.toString()}`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
