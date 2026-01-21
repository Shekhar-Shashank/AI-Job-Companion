import { BaseScraper } from './base.scraper';
import { ScraperConfig, ScrapedJob } from '../interfaces/scraper.interface';

/**
 * Naukri.com Job Scraper
 * Most popular job portal in India
 * Uses web scraping to fetch job listings
 */
export class NaukriScraper extends BaseScraper {
  readonly name = 'naukri';

  private readonly baseUrl = 'https://www.naukri.com';

  /**
   * Scrape jobs from Naukri
   */
  async scrape(config: ScraperConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      const query = this.buildSearchQuery(config);
      const location = config.location || config.locations?.[0] || '';

      // Build search URL
      const searchSlug = query.toLowerCase().replace(/\s+/g, '-');
      const locationSlug = location ? `-in-${location.toLowerCase().replace(/\s+/g, '-')}` : '';

      // Naukri uses slug-based URLs
      const searchUrl = `${this.baseUrl}/${searchSlug}-jobs${locationSlug}`;
      console.log(`[${this.name}] Fetching: ${searchUrl}`);

      const response = await this.fetchWithRetry(searchUrl);
      const html = await response.text();

      // Parse job listings from HTML
      const parsedJobs = this.parseJobListings(html);

      for (const job of parsedJobs) {
        jobs.push(this.normalizeJob(job, this.name));
        await this.randomDelay(); // Be nice to the server
      }

      console.log(`[${this.name}] Found ${jobs.length} jobs`);
    } catch (error) {
      console.error(`[${this.name}] Scrape error:`, error);
      throw error;
    }

    return jobs;
  }

  /**
   * Parse job listings from Naukri HTML
   */
  private parseJobListings(html: string): Partial<ScrapedJob>[] {
    const jobs: Partial<ScrapedJob>[] = [];

    // Look for job card elements using regex
    // Naukri uses article elements with job data
    const jobCardRegex = /<article[^>]*class="[^"]*jobTuple[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    let match;

    while ((match = jobCardRegex.exec(html)) !== null) {
      try {
        const cardHtml = match[1];
        const job = this.parseJobCard(cardHtml);
        if (job.title && job.company) {
          jobs.push(job);
        }
      } catch (e) {
        // Skip malformed cards
        continue;
      }
    }

    // Alternative parsing for newer Naukri layout
    if (jobs.length === 0) {
      const altJobRegex = /<div[^>]*class="[^"]*srp-jobtuple-wrapper[^"]*"[^>]*>([\s\S]*?)<\/div>(?=<div[^>]*class="[^"]*srp-jobtuple-wrapper|$)/gi;
      while ((match = altJobRegex.exec(html)) !== null) {
        try {
          const cardHtml = match[1];
          const job = this.parseJobCardAlt(cardHtml);
          if (job.title && job.company) {
            jobs.push(job);
          }
        } catch (e) {
          continue;
        }
      }
    }

    return jobs;
  }

  /**
   * Parse individual job card
   */
  private parseJobCard(cardHtml: string): Partial<ScrapedJob> {
    // Extract title
    const titleMatch = cardHtml.match(/<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/i);
    const title = titleMatch ? this.cleanText(titleMatch[1]) : '';

    // Extract URL
    const urlMatch = cardHtml.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*title[^"]*"/i);
    const sourceUrl = urlMatch ? urlMatch[1] : '';

    // Extract company
    const companyMatch = cardHtml.match(/<a[^>]*class="[^"]*subTitle[^"]*"[^>]*>([^<]+)<\/a>/i);
    const company = companyMatch ? this.cleanText(companyMatch[1]) : '';

    // Extract experience
    const expMatch = cardHtml.match(/<span[^>]*class="[^"]*expwdth[^"]*"[^>]*>([^<]+)<\/span>/i);
    const expText = expMatch ? expMatch[1] : '';
    const experience = this.parseExperience(expText);

    // Extract salary
    const salaryMatch = cardHtml.match(/<span[^>]*class="[^"]*salary[^"]*"[^>]*>([^<]+)<\/span>/i);
    const salaryText = salaryMatch ? salaryMatch[1] : '';
    const salary = this.parseSalary(salaryText);

    // Extract location
    const locationMatch = cardHtml.match(/<span[^>]*class="[^"]*locWdth[^"]*"[^>]*>([^<]+)<\/span>/i);
    const location = locationMatch ? this.cleanText(locationMatch[1]) : '';

    // Extract skills
    const skillsMatch = cardHtml.match(/<ul[^>]*class="[^"]*tags[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
    const skillsHtml = skillsMatch ? skillsMatch[1] : '';
    const skills = this.extractSkillsFromTags(skillsHtml);

    // Extract description
    const descMatch = cardHtml.match(/<div[^>]*class="[^"]*job-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const description = descMatch ? this.cleanHtml(descMatch[1]) : '';

    // Extract job ID from URL
    const externalId = this.extractJobId(sourceUrl);

    return {
      externalId,
      sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : `${this.baseUrl}${sourceUrl}`,
      title,
      company,
      location,
      isRemote: this.detectRemote(title + ' ' + location),
      description,
      skillsRequired: skills.join(', '),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency || 'INR',
      experienceMin: experience.min,
      experienceMax: experience.max,
    };
  }

  /**
   * Alternative parsing for newer layout
   */
  private parseJobCardAlt(cardHtml: string): Partial<ScrapedJob> {
    // Title with data attribute
    const titleMatch = cardHtml.match(/title="([^"]+)"/i);
    const title = titleMatch ? this.cleanText(titleMatch[1]) : '';

    // URL from href
    const urlMatch = cardHtml.match(/href="([^"]+)"/i);
    const sourceUrl = urlMatch ? urlMatch[1] : '';

    // Company name
    const companyMatch = cardHtml.match(/<a[^>]*class="[^"]*comp-name[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                        cardHtml.match(/<span[^>]*class="[^"]*comp-name[^"]*"[^>]*>([^<]+)<\/span>/i);
    const company = companyMatch ? this.cleanText(companyMatch[1]) : '';

    // Location
    const locMatch = cardHtml.match(/<span[^>]*class="[^"]*loc[^"]*"[^>]*>([^<]+)<\/span>/i);
    const location = locMatch ? this.cleanText(locMatch[1]) : '';

    // Experience
    const expMatch = cardHtml.match(/<span[^>]*class="[^"]*exp[^"]*"[^>]*>([^<]+)<\/span>/i);
    const experience = expMatch ? this.parseExperience(expMatch[1]) : {};

    // Salary
    const salMatch = cardHtml.match(/<span[^>]*class="[^"]*sal[^"]*"[^>]*>([^<]+)<\/span>/i);
    const salary = salMatch ? this.parseSalary(salMatch[1]) : {};

    const externalId = this.extractJobId(sourceUrl);

    return {
      externalId,
      sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : `${this.baseUrl}${sourceUrl}`,
      title,
      company,
      location,
      isRemote: this.detectRemote(title + ' ' + location),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency || 'INR',
      experienceMin: experience.min,
      experienceMax: experience.max,
    };
  }

  /**
   * Extract job ID from Naukri URL
   */
  private extractJobId(url: string): string {
    // Naukri URLs: /job-listing/...-jid-123456789
    const match = url.match(/jid[-_]?(\d+)/i);
    if (match) return match[1];

    // Alternative format
    const altMatch = url.match(/\/(\d+)\/?$/);
    if (altMatch) return altMatch[1];

    return this.generateExternalId('', '', url);
  }

  /**
   * Extract skills from tags HTML
   */
  private extractSkillsFromTags(html: string): string[] {
    const skills: string[] = [];
    const tagRegex = /<li[^>]*>([^<]+)<\/li>/gi;
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
      const skill = this.cleanText(match[1]);
      if (skill && skill.length < 50) {
        skills.push(skill);
      }
    }

    return skills;
  }

  /**
   * Clean HTML tags and entities
   */
  private cleanHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Test connection to Naukri
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
