import { BaseScraper } from './base.scraper';
import { ScraperConfig, ScrapedJob } from '../interfaces/scraper.interface';

/**
 * Foundit (formerly Monster India) Job Scraper
 * Popular job portal in India
 */
export class FounditScraper extends BaseScraper {
  readonly name = 'foundit';

  private readonly baseUrl = 'https://www.foundit.in';
  private readonly searchUrl = 'https://www.foundit.in/middleware/jobsearch';

  /**
   * Scrape jobs from Foundit
   */
  async scrape(config: ScraperConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      const query = this.buildSearchQuery(config);
      const location = config.location || config.locations?.[0] || '';

      // Try API first
      try {
        const apiJobs = await this.scrapeApi(query, location, config);
        jobs.push(...apiJobs);
      } catch (e) {
        console.warn(`[${this.name}] API failed, falling back to web scraping`);
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
   * Scrape using Foundit API
   */
  private async scrapeApi(query: string, location: string, config: ScraperConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    const requestBody = {
      query: query,
      locations: location ? [location] : [],
      experienceRanges: config.experienceYears ? [{
        min: Math.max(0, config.experienceYears - 2),
        max: config.experienceYears + 2,
      }] : [],
      salaryRanges: config.salaryMin ? [{
        min: config.salaryMin,
        max: config.salaryMin * 2,
      }] : [],
      limit: 50,
      offset: 0,
      sortBy: 'relevance',
    };

    const response = await this.fetchWithRetry(this.searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data?.jobSearchResults) {
      for (const job of data.jobSearchResults) {
        const salary = this.parseSalary(job.salary || '');

        jobs.push(this.normalizeJob({
          externalId: job.jobId || job.id,
          sourceUrl: job.url || `${this.baseUrl}/job/${job.jobId}`,
          title: job.title,
          company: job.company?.name || job.companyName,
          location: job.locations?.join(', ') || job.location,
          isRemote: job.isRemote || this.detectRemote(job.title + ' ' + job.location),
          description: job.description,
          requirements: job.requirements,
          skillsRequired: job.skills?.join(', '),
          salaryMin: salary.min || job.salaryMin,
          salaryMax: salary.max || job.salaryMax,
          salaryCurrency: salary.currency || 'INR',
          experienceMin: job.experienceMin,
          experienceMax: job.experienceMax,
          employmentType: job.employmentType,
          postedDate: job.postedDate ? new Date(job.postedDate) : undefined,
          companyLogoUrl: job.company?.logo,
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

    const searchSlug = query.toLowerCase().replace(/\s+/g, '-');
    const locationSlug = location ? `-in-${location.toLowerCase().replace(/\s+/g, '-')}` : '';
    const searchUrl = `${this.baseUrl}/srp/results?query=${encodeURIComponent(query)}&locations=${encodeURIComponent(location)}`;

    const response = await this.fetchWithRetry(searchUrl);
    const html = await response.text();

    // Parse job cards
    const jobCardRegex = /<div[^>]*class="[^"]*card-apply-content[^"]*"[^>]*>([\s\S]*?)<\/div>(?=<div[^>]*class="[^"]*card-apply-content|$)/gi;
    let match;

    while ((match = jobCardRegex.exec(html)) !== null) {
      try {
        const cardHtml = match[1];
        const job = this.parseJobCard(cardHtml);
        if (job.title && job.company) {
          jobs.push(this.normalizeJob(job, this.name));
        }
      } catch (e) {
        continue;
      }
    }

    // Alternative parsing
    if (jobs.length === 0) {
      const altRegex = /<div[^>]*data-job-id="([^"]+)"[^>]*>([\s\S]*?)<\/div>(?=<div[^>]*data-job-id|$)/gi;
      while ((match = altRegex.exec(html)) !== null) {
        try {
          const jobId = match[1];
          const cardHtml = match[2];
          const job = this.parseJobCard(cardHtml);
          job.externalId = jobId;
          if (job.title && job.company) {
            jobs.push(this.normalizeJob(job, this.name));
          }
        } catch (e) {
          continue;
        }
      }
    }

    return jobs;
  }

  /**
   * Parse job card from HTML
   */
  private parseJobCard(cardHtml: string): Partial<ScrapedJob> {
    // Title
    const titleMatch = cardHtml.match(/<a[^>]*class="[^"]*card-title[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                      cardHtml.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    const title = titleMatch ? this.cleanText(titleMatch[1]) : '';

    // URL
    const urlMatch = cardHtml.match(/href="([^"]+)"/i);
    const sourceUrl = urlMatch ? (urlMatch[1].startsWith('http') ? urlMatch[1] : `${this.baseUrl}${urlMatch[1]}`) : '';

    // Company
    const companyMatch = cardHtml.match(/<span[^>]*class="[^"]*company-name[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                        cardHtml.match(/<a[^>]*class="[^"]*company[^"]*"[^>]*>([^<]+)<\/a>/i);
    const company = companyMatch ? this.cleanText(companyMatch[1]) : '';

    // Location
    const locationMatch = cardHtml.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i);
    const location = locationMatch ? this.cleanText(locationMatch[1]) : '';

    // Experience
    const expMatch = cardHtml.match(/<span[^>]*class="[^"]*experience[^"]*"[^>]*>([^<]+)<\/span>/i);
    const experience = expMatch ? this.parseExperience(expMatch[1]) : {};

    // Salary
    const salaryMatch = cardHtml.match(/<span[^>]*class="[^"]*salary[^"]*"[^>]*>([^<]+)<\/span>/i);
    const salary = salaryMatch ? this.parseSalary(salaryMatch[1]) : {};

    // Skills
    const skillsMatch = cardHtml.match(/<div[^>]*class="[^"]*skills[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const skills = skillsMatch ? this.extractSkillTags(skillsMatch[1]) : [];

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
    };
  }

  /**
   * Extract job ID from URL
   */
  private extractJobId(url: string): string {
    const match = url.match(/\/job\/(\d+)/i) || url.match(/jobId=(\d+)/i);
    return match ? match[1] : this.generateExternalId('', '', url);
  }

  /**
   * Extract skills from tags HTML
   */
  private extractSkillTags(html: string): string[] {
    const skills: string[] = [];
    const tagRegex = /<span[^>]*>([^<]+)<\/span>/gi;
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
