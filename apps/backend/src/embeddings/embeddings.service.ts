import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingsService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    return response.data.map((d) => d.embedding);
  }

  // Templates for converting structured data to text
  experienceToText(experience: any): string {
    const parts = [
      `Role: ${experience.title} at ${experience.company}`,
      `Duration: ${this.formatDate(experience.startDate)} to ${experience.isCurrent ? 'Present' : this.formatDate(experience.endDate)}`,
    ];

    if (experience.location) {
      parts.push(`Location: ${experience.location}`);
    }

    if (experience.description) {
      parts.push(`Description: ${experience.description}`);
    }

    if (experience.technologies) {
      const techs =
        typeof experience.technologies === 'string'
          ? JSON.parse(experience.technologies)
          : experience.technologies;
      if (techs.length > 0) {
        parts.push(`Technologies: ${techs.join(', ')}`);
      }
    }

    if (experience.achievements) {
      const achievements =
        typeof experience.achievements === 'string'
          ? JSON.parse(experience.achievements)
          : experience.achievements;
      if (achievements.length > 0) {
        parts.push(`Key Achievements:\n- ${achievements.join('\n- ')}`);
      }
    }

    return parts.join('\n');
  }

  educationToText(education: any): string {
    const parts = [
      `${education.degree}${education.fieldOfStudy ? ` in ${education.fieldOfStudy}` : ''}`,
      education.institution,
    ];

    if (education.startDate || education.endDate) {
      parts.push(
        `${this.formatDate(education.startDate)} - ${education.isCurrent ? 'Present' : this.formatDate(education.endDate)}`,
      );
    }

    if (education.grade) {
      parts.push(`Grade: ${education.grade}`);
    }

    if (education.description) {
      parts.push(education.description);
    }

    return parts.join('\n');
  }

  skillToText(skill: any): string {
    const parts = [
      `${skill.name} - ${skill.proficiencyLevel}/5 proficiency`,
    ];

    if (skill.yearsOfExperience) {
      parts.push(`${skill.yearsOfExperience} years of experience`);
    }

    if (skill.category?.name) {
      parts.push(`Category: ${skill.category.name}`);
    }

    return parts.join('\n');
  }

  jobToText(job: any): string {
    const parts = [
      `${job.title} at ${job.company}`,
    ];

    if (job.location) {
      parts.push(`Location: ${job.location}${job.isRemote ? ' (Remote)' : ''}`);
    }

    if (job.description) {
      parts.push(`Description: ${job.description}`);
    }

    if (job.requirements) {
      parts.push(`Requirements: ${job.requirements}`);
    }

    if (job.skillsRequired) {
      const skills =
        typeof job.skillsRequired === 'string'
          ? JSON.parse(job.skillsRequired)
          : job.skillsRequired;
      if (skills.length > 0) {
        parts.push(`Skills Required: ${skills.join(', ')}`);
      }
    }

    if (job.salaryMin || job.salaryMax) {
      parts.push(
        `Salary: ${job.salaryMin || '?'} - ${job.salaryMax || '?'} ${job.salaryCurrency || ''}`,
      );
    }

    return parts.join('\n');
  }

  private formatDate(date: Date | string | null): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }

  // Chunking utilities
  chunkText(
    text: string,
    chunkSize: number = 500,
    overlap: number = 50,
  ): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    let i = 0;
    while (i < words.length) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push(chunk);
      i += chunkSize - overlap;
    }

    return chunks;
  }

  // Estimate token count (rough approximation)
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
