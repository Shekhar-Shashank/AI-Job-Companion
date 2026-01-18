import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Job, Skill, JobTarget } from '@prisma/client';

interface ScoreResult {
  overallScore: number;
  semanticScore: number;
  skillMatchScore: number;
  experienceMatchScore: number;
  salaryMatchScore: number;
  locationMatchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  breakdown: {
    experienceAnalysis: string;
    salaryAnalysis: string;
    locationAnalysis: string;
    pros: string[];
    cons: string[];
  };
}

// Skill synonyms for matching
const SKILL_SYNONYMS: Record<string, string[]> = {
  javascript: ['js', 'ecmascript', 'es6'],
  typescript: ['ts'],
  react: ['reactjs', 'react.js'],
  'node.js': ['nodejs', 'node'],
  postgresql: ['postgres', 'psql'],
  mongodb: ['mongo'],
  aws: ['amazon web services'],
  gcp: ['google cloud', 'google cloud platform'],
  kubernetes: ['k8s'],
  'machine learning': ['ml'],
  'artificial intelligence': ['ai'],
  'ci/cd': ['cicd', 'continuous integration'],
};

@Injectable()
export class JobScoringService {
  constructor(private prisma: PrismaService) {}

  async scoreJob(userId: string, job: Job): Promise<ScoreResult> {
    try {
      const [skills, jobTargets, experiences] = await Promise.all([
        this.prisma.skill.findMany({ where: { userId } }),
        this.prisma.jobTarget.findUnique({ where: { userId } }),
        this.prisma.experience.findMany({ where: { userId } }),
      ]);

      // Calculate individual scores with error handling
      const skillScore = this.calculateSkillMatch(job, skills || []);
      const experienceScore = this.calculateExperienceMatch(job, experiences || []);
      const salaryScore = this.calculateSalaryMatch(job, jobTargets);
      const locationScore = this.calculateLocationMatch(job, jobTargets);

    // Semantic score placeholder (would use embeddings in production)
    const semanticScore = { score: 70 };

    // Weighted overall score
    const overallScore = Math.round(
      semanticScore.score * 0.3 +
        skillScore.score * 0.3 +
        experienceScore.score * 0.2 +
        salaryScore.score * 0.1 +
        locationScore.score * 0.1,
    );

    // Compile pros and cons
    const pros: string[] = [];
    const cons: string[] = [];

    if (skillScore.score >= 70)
      pros.push(`${skillScore.matchedSkills.length} skills match`);
    else if (skillScore.missingSkills.length > 0)
      cons.push(`Missing ${skillScore.missingSkills.length} skills`);

    if (experienceScore.score >= 80)
      pros.push('Experience level matches well');
    else if (experienceScore.score < 50)
      cons.push('Experience level mismatch');

    if (salaryScore.score >= 80) pros.push('Salary range aligns');
    else if (salaryScore.score < 50) cons.push('Salary below expectations');

    if (locationScore.score >= 80) pros.push('Location/remote preference matches');

    // Save score to database
    await this.prisma.jobScore.upsert({
      where: { jobId_userId: { jobId: job.id, userId } },
      update: {
        overallScore,
        semanticScore: semanticScore.score,
        skillMatchScore: skillScore.score,
        experienceMatchScore: experienceScore.score,
        salaryMatchScore: salaryScore.score,
        locationMatchScore: locationScore.score,
        matchedSkills: JSON.stringify(skillScore.matchedSkills),
        missingSkills: JSON.stringify(skillScore.missingSkills),
        scoreBreakdown: JSON.stringify({
          experienceAnalysis: experienceScore.analysis,
          salaryAnalysis: salaryScore.analysis,
          locationAnalysis: locationScore.analysis,
          pros,
          cons,
        }),
      },
      create: {
        jobId: job.id,
        userId,
        overallScore,
        semanticScore: semanticScore.score,
        skillMatchScore: skillScore.score,
        experienceMatchScore: experienceScore.score,
        salaryMatchScore: salaryScore.score,
        locationMatchScore: locationScore.score,
        matchedSkills: JSON.stringify(skillScore.matchedSkills),
        missingSkills: JSON.stringify(skillScore.missingSkills),
        scoreBreakdown: JSON.stringify({
          experienceAnalysis: experienceScore.analysis,
          salaryAnalysis: salaryScore.analysis,
          locationAnalysis: locationScore.analysis,
          pros,
          cons,
        }),
      },
    });

    return {
      overallScore,
      semanticScore: semanticScore.score,
      skillMatchScore: skillScore.score,
      experienceMatchScore: experienceScore.score,
      salaryMatchScore: salaryScore.score,
      locationMatchScore: locationScore.score,
      matchedSkills: skillScore.matchedSkills,
      missingSkills: skillScore.missingSkills,
      breakdown: {
        experienceAnalysis: experienceScore.analysis,
        salaryAnalysis: salaryScore.analysis,
        locationAnalysis: locationScore.analysis,
        pros,
        cons,
      },
    };
    } catch (error) {
      console.error('Error scoring job:', error);
      // Return default scores on error
      return {
        overallScore: 50,
        semanticScore: 50,
        skillMatchScore: 50,
        experienceMatchScore: 50,
        salaryMatchScore: 50,
        locationMatchScore: 50,
        matchedSkills: [],
        missingSkills: [],
        breakdown: {
          experienceAnalysis: 'Unable to analyze',
          salaryAnalysis: 'Unable to analyze',
          locationAnalysis: 'Unable to analyze',
          pros: [],
          cons: ['Error occurred during scoring'],
        },
      };
    }
  }

  private parseSkillsString(skills: string | null): string[] {
    if (!skills || skills.trim() === '') {
      return [];
    }

    // Try parsing as JSON first
    try {
      const parsed = JSON.parse(skills);
      if (Array.isArray(parsed)) {
        return parsed.map(s => String(s).trim()).filter(s => s.length > 0);
      }
      // If it's a string, treat it as comma-separated
      if (typeof parsed === 'string') {
        return parsed.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
      return [];
    } catch {
      // Not valid JSON, treat as comma-separated string
      return skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
  }

  private calculateSkillMatch(
    job: Job,
    userSkills: Skill[],
  ): { score: number; matchedSkills: string[]; missingSkills: string[] } {
    const requiredSkills: string[] = this.parseSkillsString(job.skillsRequired);

    if (requiredSkills.length === 0) {
      return { score: 75, matchedSkills: [], missingSkills: [] };
    }

    const userSkillNames = userSkills.map((s) => this.normalizeSkill(s.name));
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const required of requiredSkills) {
      const normalized = this.normalizeSkill(required);
      if (this.skillMatches(normalized, userSkillNames)) {
        matchedSkills.push(required);
      } else {
        missingSkills.push(required);
      }
    }

    const matchRatio = matchedSkills.length / requiredSkills.length;
    const score = Math.round(matchRatio * 100);

    return { score, matchedSkills, missingSkills };
  }

  private normalizeSkill(skill: string): string {
    const lower = skill.toLowerCase().trim();
    for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
      if (lower === canonical || synonyms.includes(lower)) {
        return canonical;
      }
    }
    return lower;
  }

  private skillMatches(skill: string, userSkills: string[]): boolean {
    if (userSkills.includes(skill)) return true;

    // Check synonyms
    const synonyms = SKILL_SYNONYMS[skill] || [];
    for (const syn of synonyms) {
      if (userSkills.includes(syn)) return true;
    }

    // Fuzzy match
    for (const userSkill of userSkills) {
      if (
        userSkill.includes(skill) ||
        skill.includes(userSkill) ||
        this.levenshteinDistance(skill, userSkill) <= 2
      ) {
        return true;
      }
    }

    return false;
  }

  private calculateExperienceMatch(
    job: Job,
    experiences: any[],
  ): { score: number; analysis: string } {
    const totalYears = this.calculateTotalYears(experiences);

    if (!job.experienceMin && !job.experienceMax) {
      return { score: 80, analysis: 'No experience requirement specified' };
    }

    const min = job.experienceMin || 0;
    const max = job.experienceMax || Infinity;

    if (totalYears >= min && totalYears <= max) {
      return {
        score: 100,
        analysis: `Your ${totalYears} years matches the ${min}-${max || '+'} year requirement`,
      };
    } else if (totalYears < min) {
      const gap = min - totalYears;
      const score = Math.max(0, 100 - gap * 15);
      return {
        score,
        analysis: `You have ${totalYears} years but ${min}+ is required (${gap} year gap)`,
      };
    } else {
      const excess = totalYears - max;
      const score = Math.max(60, 100 - excess * 5);
      return {
        score,
        analysis: `You have ${totalYears} years which exceeds the ${max} year max`,
      };
    }
  }

  private calculateSalaryMatch(
    job: Job,
    targets: JobTarget | null,
  ): { score: number; analysis: string } {
    if (!job.salaryMin && !job.salaryMax) {
      return { score: 70, analysis: 'Salary not disclosed' };
    }

    if (!targets?.minSalary) {
      return { score: 80, analysis: 'No salary preference set' };
    }

    if (job.salaryMax && job.salaryMax < targets.minSalary) {
      const gap =
        ((targets.minSalary - job.salaryMax) / targets.minSalary) * 100;
      const score = Math.max(0, 100 - gap);
      return {
        score,
        analysis: `Max salary is below your minimum expectation`,
      };
    }

    if (
      job.salaryMin &&
      targets.maxSalary &&
      job.salaryMin > targets.maxSalary
    ) {
      return { score: 95, analysis: 'Salary exceeds your target range' };
    }

    return { score: 85, analysis: 'Salary range aligns with your target' };
  }

  private parseLocationsString(locations: string | null): string[] {
    if (!locations || locations.trim() === '') {
      return [];
    }

    try {
      const parsed = JSON.parse(locations);
      if (Array.isArray(parsed)) {
        return parsed.map(s => String(s).trim()).filter(s => s.length > 0);
      }
      if (typeof parsed === 'string') {
        return parsed.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
      return [];
    } catch {
      return locations.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
  }

  private calculateLocationMatch(
    job: Job,
    targets: JobTarget | null,
  ): { score: number; analysis: string } {
    if (targets?.remotePreference === 'remote') {
      if (job.isRemote) {
        return { score: 100, analysis: 'Remote position matches your preference' };
      }
      return { score: 30, analysis: 'Not remote, but you prefer remote work' };
    }

    if (targets?.remotePreference === 'any') {
      return { score: 90, analysis: 'You are flexible on location' };
    }

    if (!targets?.preferredLocations) {
      return { score: 80, analysis: 'No location preference set' };
    }

    const preferredLocations: string[] = this.parseLocationsString(targets.preferredLocations);
    const jobLocation = job.location?.toLowerCase() || '';

    if (preferredLocations.length === 0) {
      return { score: 80, analysis: 'No location preference set' };
    }

    for (const loc of preferredLocations) {
      if (jobLocation.includes(loc.toLowerCase())) {
        return { score: 100, analysis: `Location matches your preferences` };
      }
    }

    return { score: 40, analysis: 'Location not in your preferred locations' };
  }

  private calculateTotalYears(experiences: any[]): number {
    let totalMonths = 0;
    for (const exp of experiences) {
      try {
        if (!exp.startDate) continue;
        const startDate = new Date(exp.startDate);
        const endDate = exp.isCurrent ? new Date() : (exp.endDate ? new Date(exp.endDate) : new Date());

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) continue;

        const months =
          (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth());
        if (months > 0) {
          totalMonths += months;
        }
      } catch {
        // Skip invalid experience entries
        continue;
      }
    }
    return Math.round((totalMonths / 12) * 10) / 10;
  }

  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
