/**
 * Configuration for scraping jobs based on user's profile and preferences
 */
export interface ScraperConfig {
  keywords: string[]; // From user's target roles + skills
  location?: string; // From user's preferred locations
  locations?: string[]; // Multiple preferred locations
  remote?: boolean; // From user's remote preference
  experienceYears?: number; // From user's experience
  salaryMin?: number; // From user's salary expectations
  salaryCurrency?: string; // Currency preference
}

/**
 * Standardized job data returned by all scrapers
 */
export interface ScrapedJob {
  externalId: string;
  source: string;
  sourceUrl: string;
  title: string;
  company: string;
  location?: string;
  isRemote?: boolean;
  description?: string;
  requirements?: string;
  responsibilities?: string;
  skillsRequired?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  experienceMin?: number;
  experienceMax?: number;
  employmentType?: string;
  postedDate?: Date;
  companyLogoUrl?: string;
  benefits?: string;
  industry?: string;
  companySize?: string;
}

/**
 * Result of a scraper run
 */
export interface ScraperResult {
  source: string;
  success: boolean;
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
  error?: string;
  blocked?: boolean;
  duration?: number; // ms
}

/**
 * Health status of a scraper source
 */
export interface SourceHealth {
  source: string;
  enabled: boolean;
  isBlocked: boolean;
  blockedAt?: Date;
  consecutiveFailures: number;
  lastSuccess?: Date;
  lastRun?: Date;
}

/**
 * Interface that all portal scrapers must implement
 */
export interface IScraper {
  readonly name: string;
  readonly enabled: boolean;

  /**
   * Scrape jobs from the portal based on configuration
   */
  scrape(config: ScraperConfig): Promise<ScrapedJob[]>;

  /**
   * Test if the scraper can connect to the portal
   */
  testConnection(): Promise<boolean>;
}
