import { BaseScraper } from './base.scraper';
import { ScraperConfig, ScrapedJob } from '../interfaces/scraper.interface';

/**
 * Wellfound (formerly AngelList) Job Scraper
 * Uses Wellfound's public GraphQL API for startup job listings
 */
export class WellfoundScraper extends BaseScraper {
  readonly name = 'wellfound';

  private readonly baseUrl = 'https://wellfound.com';
  private readonly graphqlUrl = 'https://wellfound.com/graphql';

  /**
   * Scrape jobs from Wellfound using GraphQL API
   */
  async scrape(config: ScraperConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      const query = this.buildSearchQuery(config);
      const location = config.location || config.locations?.[0] || '';

      // Try GraphQL API first
      try {
        const graphqlJobs = await this.scrapeGraphQL(query, location, config.remote);
        jobs.push(...graphqlJobs);
      } catch (e) {
        console.warn(`[${this.name}] GraphQL failed, falling back to web scraping`);
        // Fallback to web scraping
        const webJobs = await this.scrapeWeb(query, location);
        jobs.push(...webJobs);
      }

      console.log(`[${this.name}] Found ${jobs.length} jobs`);
    } catch (error) {
      console.error(`[${this.name}] Scrape error:`, error);
      throw error;
    }

    return jobs;
  }

  /**
   * Scrape using GraphQL API
   */
  private async scrapeGraphQL(query: string, location: string, remote?: boolean): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    const graphqlQuery = {
      operationName: 'JobSearchResults',
      variables: {
        query: query,
        location: location || null,
        remote: remote || false,
        page: 1,
        perPage: 50,
      },
      query: `
        query JobSearchResults($query: String, $location: String, $remote: Boolean, $page: Int, $perPage: Int) {
          jobListings(
            query: $query
            locationQuery: $location
            remote: $remote
            page: $page
            perPage: $perPage
          ) {
            edges {
              node {
                id
                title
                slug
                description
                remotePolicy
                locationNames
                compensation
                jobType
                experience
                postedAt
                startup {
                  name
                  slug
                  logoUrl
                  companySize
                  highConcept
                }
                skills {
                  name
                }
              }
            }
          }
        }
      `,
    };

    const response = await this.fetchWithRetry(this.graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(graphqlQuery),
    });

    const data = await response.json();

    if (data?.data?.jobListings?.edges) {
      for (const edge of data.data.jobListings.edges) {
        const node = edge.node;
        if (!node) continue;

        const salary = this.parseWellfoundCompensation(node.compensation);

        jobs.push(this.normalizeJob({
          externalId: node.id,
          sourceUrl: `${this.baseUrl}/jobs/${node.slug}`,
          title: node.title,
          company: node.startup?.name || 'Unknown Startup',
          location: node.locationNames?.join(', '),
          isRemote: node.remotePolicy === 'REMOTE' || node.remotePolicy === 'REMOTE_ONLY',
          description: node.description,
          skillsRequired: node.skills?.map((s: { name: string }) => s.name).join(', '),
          salaryMin: salary.min,
          salaryMax: salary.max,
          salaryCurrency: salary.currency,
          employmentType: this.mapJobType(node.jobType),
          postedDate: node.postedAt ? new Date(node.postedAt) : undefined,
          companyLogoUrl: node.startup?.logoUrl,
          companySize: node.startup?.companySize,
          industry: node.startup?.highConcept,
        }, this.name));
      }
    }

    return jobs;
  }

  /**
   * Fallback web scraping
   */
  private async scrapeWeb(query: string, location: string): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    const searchUrl = `${this.baseUrl}/jobs?q=${encodeURIComponent(query)}${location ? `&l=${encodeURIComponent(location)}` : ''}`;

    const response = await this.fetchWithRetry(searchUrl);
    const html = await response.text();

    // Parse job cards from HTML
    const jobCardRegex = /<div[^>]*class="[^"]*styles_jobListingCard[^"]*"[^>]*>([\s\S]*?)<\/div>(?=<div[^>]*class="[^"]*styles_jobListingCard|$)/gi;
    let match;

    while ((match = jobCardRegex.exec(html)) !== null) {
      try {
        const cardHtml = match[1];
        const job = this.parseWebJobCard(cardHtml);
        if (job.title && job.company) {
          jobs.push(this.normalizeJob(job, this.name));
        }
      } catch (e) {
        continue;
      }
    }

    return jobs;
  }

  /**
   * Parse job card from web HTML
   */
  private parseWebJobCard(cardHtml: string): Partial<ScrapedJob> {
    const titleMatch = cardHtml.match(/<a[^>]*>([^<]+)<\/a>/i);
    const title = titleMatch ? this.cleanText(titleMatch[1]) : '';

    const urlMatch = cardHtml.match(/href="([^"]+)"/i);
    const sourceUrl = urlMatch ? `${this.baseUrl}${urlMatch[1]}` : '';

    const companyMatch = cardHtml.match(/<span[^>]*class="[^"]*company[^"]*"[^>]*>([^<]+)<\/span>/i);
    const company = companyMatch ? this.cleanText(companyMatch[1]) : '';

    const locationMatch = cardHtml.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i);
    const location = locationMatch ? this.cleanText(locationMatch[1]) : '';

    const externalId = this.extractJobIdFromUrl(sourceUrl);

    return {
      externalId,
      sourceUrl,
      title,
      company,
      location,
      isRemote: this.detectRemote(title + ' ' + location),
    };
  }

  /**
   * Parse Wellfound compensation string
   */
  private parseWellfoundCompensation(comp: string | null): { min?: number; max?: number; currency?: string } {
    if (!comp) return {};

    // Format: "$120K – $180K" or "₹15L – ₹25L"
    const match = comp.match(/([₹$€£])?(\d+)([KLM])?[\s–-]+([₹$€£])?(\d+)([KLM])?/i);

    if (match) {
      const currency = match[1] || match[4];
      const minNum = parseInt(match[2], 10);
      const maxNum = parseInt(match[5], 10);

      const minMult = match[3]?.toUpperCase() === 'L' ? 100000 :
                     match[3]?.toUpperCase() === 'M' ? 1000000 :
                     match[3]?.toUpperCase() === 'K' ? 1000 : 1;
      const maxMult = match[6]?.toUpperCase() === 'L' ? 100000 :
                     match[6]?.toUpperCase() === 'M' ? 1000000 :
                     match[6]?.toUpperCase() === 'K' ? 1000 : 1;

      return {
        min: minNum * minMult,
        max: maxNum * maxMult,
        currency: currency === '₹' ? 'INR' : currency === '$' ? 'USD' : currency === '€' ? 'EUR' : currency === '£' ? 'GBP' : undefined,
      };
    }

    return this.parseSalary(comp);
  }

  /**
   * Map Wellfound job type to standard format
   */
  private mapJobType(jobType: string | null): string | undefined {
    if (!jobType) return undefined;

    const mapping: Record<string, string> = {
      FULL_TIME: 'Full-time',
      PART_TIME: 'Part-time',
      CONTRACT: 'Contract',
      INTERNSHIP: 'Internship',
      COFOUNDER: 'Co-founder',
    };

    return mapping[jobType] || jobType;
  }

  /**
   * Extract job ID from URL
   */
  private extractJobIdFromUrl(url: string): string {
    const match = url.match(/\/jobs\/([^\/]+)/);
    return match ? match[1] : this.generateExternalId('', '', url);
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/jobs`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
