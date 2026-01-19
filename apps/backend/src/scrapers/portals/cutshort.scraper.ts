import { BaseScraper } from './base.scraper';
import { ScraperConfig, ScrapedJob } from '../interfaces/scraper.interface';

/**
 * Cutshort.io Job Scraper
 * Startup and remote jobs platform in India
 * Known for tech/startup job listings
 */
export class CutshortScraper extends BaseScraper {
  readonly name = 'cutshort';

  private readonly baseUrl = 'https://cutshort.io';
  private readonly apiUrl = 'https://cutshort.io/api/jobs/search';

  /**
   * Scrape jobs from Cutshort
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
   * Scrape using Cutshort API
   */
  private async scrapeApi(query: string, location: string, config: ScraperConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    const requestBody = {
      keywords: query.split(' '),
      location: location || undefined,
      remote: config.remote,
      experience: config.experienceYears ? {
        min: Math.max(0, config.experienceYears - 2),
        max: config.experienceYears + 3,
      } : undefined,
      salary: config.salaryMin ? {
        min: config.salaryMin,
      } : undefined,
      page: 1,
      limit: 50,
    };

    const response = await this.fetchWithRetry(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data?.jobs) {
      for (const job of data.jobs) {
        jobs.push(this.normalizeJob({
          externalId: job.id || job._id,
          sourceUrl: job.url || `${this.baseUrl}/jobs/${job.slug || job.id}`,
          title: job.title,
          company: job.company?.name || job.companyName,
          location: job.location || job.locations?.join(', '),
          isRemote: job.isRemote || job.remote,
          description: job.description,
          requirements: job.requirements,
          skillsRequired: job.skills?.map((s: any) => typeof s === 'string' ? s : s.name).join(', '),
          salaryMin: job.salary?.min || job.minSalary,
          salaryMax: job.salary?.max || job.maxSalary,
          salaryCurrency: job.salary?.currency || 'INR',
          experienceMin: job.experience?.min || job.minExperience,
          experienceMax: job.experience?.max || job.maxExperience,
          employmentType: job.employmentType || job.type,
          postedDate: job.createdAt ? new Date(job.createdAt) : undefined,
          companyLogoUrl: job.company?.logo || job.companyLogo,
          industry: job.industry,
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

    const searchUrl = `${this.baseUrl}/jobs?q=${encodeURIComponent(query)}${location ? `&location=${encodeURIComponent(location)}` : ''}`;

    const response = await this.fetchWithRetry(searchUrl);
    const html = await response.text();

    // Parse job cards
    const jobCardRegex = /<div[^>]*class="[^"]*job-card[^"]*"[^>]*>([\s\S]*?)<\/div>(?=<div[^>]*class="[^"]*job-card|$)/gi;
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

    // Alternative: look for job listing elements
    if (jobs.length === 0) {
      const altRegex = /<a[^>]*href="(\/jobs\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      while ((match = altRegex.exec(html)) !== null) {
        try {
          const url = match[1];
          const cardHtml = match[2];

          // Skip if not a job card
          if (!cardHtml.includes('title') && !cardHtml.includes('company')) {
            continue;
          }

          const job = this.parseJobCardAlt(cardHtml, url);
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
    const titleMatch = cardHtml.match(/<h2[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h2>/i) ||
                      cardHtml.match(/<a[^>]*class="[^"]*job-title[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                      cardHtml.match(/<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/i);
    const title = titleMatch ? this.cleanText(titleMatch[1]) : '';

    // URL
    const urlMatch = cardHtml.match(/href="(\/jobs\/[^"]+)"/i);
    const sourceUrl = urlMatch ? `${this.baseUrl}${urlMatch[1]}` : '';

    // Company
    const companyMatch = cardHtml.match(/<span[^>]*class="[^"]*company[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                        cardHtml.match(/<a[^>]*class="[^"]*company[^"]*"[^>]*>([^<]+)<\/a>/i);
    const company = companyMatch ? this.cleanText(companyMatch[1]) : '';

    // Location
    const locationMatch = cardHtml.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i);
    const location = locationMatch ? this.cleanText(locationMatch[1]) : '';

    // Remote badge
    const isRemote = cardHtml.toLowerCase().includes('remote') ||
                    cardHtml.includes('work from home') ||
                    /<span[^>]*class="[^"]*remote[^"]*"/i.test(cardHtml);

    // Skills
    const skillsMatch = cardHtml.match(/<div[^>]*class="[^"]*skills[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const skills = skillsMatch ? this.extractSkillsFromHtml(skillsMatch[1]) : [];

    // Salary
    const salaryMatch = cardHtml.match(/<span[^>]*class="[^"]*salary[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                       cardHtml.match(/₹\s*[\d,.]+\s*(?:[-–]\s*₹?\s*[\d,.]+)?(?:\s*(?:LPA|Lakh|L))?/i);
    const salary = salaryMatch ? this.parseSalary(salaryMatch[1] || salaryMatch[0]) : {};

    // Experience
    const expMatch = cardHtml.match(/<span[^>]*class="[^"]*exp[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                    cardHtml.match(/(\d+[-–]\d+\s*(?:yrs?|years?))/i);
    const experience = expMatch ? this.parseExperience(expMatch[1]) : {};

    const externalId = this.extractJobId(sourceUrl);

    return {
      externalId,
      sourceUrl,
      title,
      company,
      location,
      isRemote,
      skillsRequired: skills.join(', '),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency || 'INR',
      experienceMin: experience.min,
      experienceMax: experience.max,
    };
  }

  /**
   * Alternative parsing for link-based cards
   */
  private parseJobCardAlt(cardHtml: string, url: string): Partial<ScrapedJob> {
    // Simple extraction from anchor content
    const lines = cardHtml.replace(/<[^>]+>/g, '\n').split('\n').filter(l => l.trim());

    const title = lines[0]?.trim() || '';
    const company = lines[1]?.trim() || '';
    const location = lines.find(l =>
      l.includes('India') || l.includes('Remote') || l.includes('Bangalore') ||
      l.includes('Mumbai') || l.includes('Delhi') || l.includes('Hyderabad')
    )?.trim() || '';

    return {
      externalId: this.extractJobId(url),
      sourceUrl: `${this.baseUrl}${url}`,
      title,
      company,
      location,
      isRemote: this.detectRemote(title + ' ' + location + ' ' + cardHtml),
    };
  }

  /**
   * Extract job ID from URL
   */
  private extractJobId(url: string): string {
    const match = url.match(/\/jobs\/([^\/\?]+)/i);
    return match ? match[1] : this.generateExternalId('', '', url);
  }

  /**
   * Extract skills from HTML
   */
  private extractSkillsFromHtml(html: string): string[] {
    const skills: string[] = [];

    const tagRegex = /<(?:span|li|a)[^>]*>([^<]+)<\/(?:span|li|a)>/gi;
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
      const skill = this.cleanText(match[1]);
      if (skill && skill.length > 1 && skill.length < 50) {
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
      const response = await this.fetchWithRetry(`${this.baseUrl}/jobs`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
