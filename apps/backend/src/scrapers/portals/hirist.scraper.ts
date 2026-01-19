import { BaseScraper } from './base.scraper';
import { ScraperConfig, ScrapedJob } from '../interfaces/scraper.interface';

/**
 * Hirist.com Job Scraper
 * Tech-focused job portal in India (TimesJobs network)
 */
export class HiristScraper extends BaseScraper {
  readonly name = 'hirist';

  private readonly baseUrl = 'https://www.hirist.com';

  /**
   * Scrape jobs from Hirist
   */
  async scrape(config: ScraperConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      const query = this.buildSearchQuery(config);
      const location = config.location || config.locations?.[0] || '';

      // Build search URL - Hirist uses query parameters
      const params = new URLSearchParams({
        q: query,
        loc: location,
        exp: config.experienceYears?.toString() || '',
        sort: 'date',
      });

      const searchUrl = `${this.baseUrl}/jobs?${params.toString()}`;
      console.log(`[${this.name}] Fetching: ${searchUrl}`);

      const response = await this.fetchWithRetry(searchUrl);
      const html = await response.text();

      // Parse job listings
      const parsedJobs = this.parseJobListings(html);

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
   * Parse job listings from Hirist HTML
   */
  private parseJobListings(html: string): Partial<ScrapedJob>[] {
    const jobs: Partial<ScrapedJob>[] = [];

    // Hirist job cards
    const jobCardRegex = /<div[^>]*class="[^"]*job-card[^"]*"[^>]*>([\s\S]*?)<\/div>(?=<div[^>]*class="[^"]*job-card|<\/section|$)/gi;
    let match;

    while ((match = jobCardRegex.exec(html)) !== null) {
      try {
        const cardHtml = match[1];
        const job = this.parseJobCard(cardHtml);
        if (job.title && job.company) {
          jobs.push(job);
        }
      } catch (e) {
        continue;
      }
    }

    // Alternative parsing for different layout
    if (jobs.length === 0) {
      const altRegex = /<article[^>]*class="[^"]*job-listing[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
      while ((match = altRegex.exec(html)) !== null) {
        try {
          const cardHtml = match[1];
          const job = this.parseJobCard(cardHtml);
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
    // Title
    const titleMatch = cardHtml.match(/<a[^>]*class="[^"]*job-title[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                      cardHtml.match(/<h2[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i) ||
                      cardHtml.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    const title = titleMatch ? this.cleanText(titleMatch[1]) : '';

    // URL
    const urlMatch = cardHtml.match(/href="([^"]*\/job[^"]+)"/i);
    const sourceUrl = urlMatch ? (urlMatch[1].startsWith('http') ? urlMatch[1] : `${this.baseUrl}${urlMatch[1]}`) : '';

    // Company
    const companyMatch = cardHtml.match(/<a[^>]*class="[^"]*company[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                        cardHtml.match(/<span[^>]*class="[^"]*company[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                        cardHtml.match(/<div[^>]*class="[^"]*employer[^"]*"[^>]*>([^<]+)<\/div>/i);
    const company = companyMatch ? this.cleanText(companyMatch[1]) : '';

    // Location
    const locationMatch = cardHtml.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                         cardHtml.match(/<i[^>]*class="[^"]*location[^"]*"[^>]*><\/i>\s*([^<]+)/i);
    const location = locationMatch ? this.cleanText(locationMatch[1]) : '';

    // Experience
    const expMatch = cardHtml.match(/<span[^>]*class="[^"]*exp[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                    cardHtml.match(/(\d+[-–]\d+\s*(?:yrs?|years?))/i);
    const experience = expMatch ? this.parseExperience(expMatch[1]) : {};

    // Salary
    const salaryMatch = cardHtml.match(/<span[^>]*class="[^"]*salary[^"]*"[^>]*>([^<]+)<\/span>/i);
    const salary = salaryMatch ? this.parseSalary(salaryMatch[1]) : {};

    // Skills
    const skillsMatch = cardHtml.match(/<div[^>]*class="[^"]*skills[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                       cardHtml.match(/<ul[^>]*class="[^"]*tags[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
    const skills = skillsMatch ? this.extractSkillsFromHtml(skillsMatch[1]) : [];

    // Posted date
    const dateMatch = cardHtml.match(/(\d+)\s*(?:day|hr|hour|min)s?\s*ago/i);
    let postedDate: Date | undefined;
    if (dateMatch) {
      const value = parseInt(dateMatch[1], 10);
      const now = new Date();
      if (cardHtml.toLowerCase().includes('day')) {
        postedDate = new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      } else if (cardHtml.toLowerCase().includes('hr') || cardHtml.toLowerCase().includes('hour')) {
        postedDate = new Date(now.getTime() - value * 60 * 60 * 1000);
      } else {
        postedDate = new Date(now.getTime() - value * 60 * 1000);
      }
    }

    const externalId = this.extractJobId(sourceUrl);

    return {
      externalId,
      sourceUrl,
      title,
      company,
      location,
      isRemote: this.detectRemote(title + ' ' + location),
      skillsRequired: skills.join(', '),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency || 'INR',
      experienceMin: experience.min,
      experienceMax: experience.max,
      postedDate,
    };
  }

  /**
   * Extract job ID from URL
   */
  private extractJobId(url: string): string {
    const match = url.match(/\/job\/(\d+)/i) || url.match(/[-_](\d{6,})/);
    return match ? match[1] : this.generateExternalId('', '', url);
  }

  /**
   * Extract skills from HTML
   */
  private extractSkillsFromHtml(html: string): string[] {
    const skills: string[] = [];

    // Match li, span, or anchor tags
    const tagRegex = /<(?:li|span|a)[^>]*>([^<]+)<\/(?:li|span|a)>/gi;
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
      const skill = this.cleanText(match[1]);
      if (skill && skill.length > 1 && skill.length < 50 && !skill.includes('...')) {
        skills.push(skill);
      }
    }

    return skills;
  }

  /**
   * Test connection
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
