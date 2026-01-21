const API_BASE = '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

// Helper to get token from Zustand persisted storage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.token || null;
    }
  } catch {
    // Failed to get auth token from localStorage
  }
  return null;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private getToken(): string | null {
    // First try instance token, then try localStorage
    return this.token || getAuthToken();
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;

    let url = `${API_BASE}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP error ${response.status}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Streaming support for chat
  async *stream(endpoint: string, data: unknown): AsyncGenerator<string> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorBody = await response.json();
        if (errorBody.message) {
          errorMessage = Array.isArray(errorBody.message)
            ? errorBody.message.join(', ')
            : errorBody.message;
        }
      } catch {
        // Couldn't parse error body
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          yield data;
        }
      }
    }
  }
}

export const api = new ApiClient();

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post<{ accessToken: string; user: { id: string; email: string; fullName: string }; expiresIn: string }>('/auth/register', {
      email: data.email,
      password: data.password,
      fullName: data.name,
    }),

  login: (data: { email: string; password: string; rememberMe?: boolean }) =>
    api.post<{ accessToken: string; user: { id: string; email: string; fullName: string }; expiresIn: string }>('/auth/login', data),
};

// Profile API
export const profileApi = {
  get: async () => {
    const data = await api.get<any>('/profile');
    // Transform backend fields to frontend fields
    return {
      ...data,
      name: data.fullName,
      linkedin: data.linkedinUrl,
      github: data.githubUrl,
      website: data.portfolioUrl,
      // Transform skills to include string level
      skills: data.skills?.map((s: any) => ({
        ...s,
        level: proficiencyToLevel(s.proficiencyLevel),
      })) || [],
      // Transform experience
      experience: data.experience?.map((e: any) => ({
        ...e,
        current: e.isCurrent,
        achievements: parseJsonArray(e.achievements),
        technologies: parseJsonArray(e.technologies),
      })) || [],
      // Transform education
      education: data.education?.map((e: any) => ({
        ...e,
        field: e.fieldOfStudy,
      })) || [],
    } as UserProfile;
  },
  update: (data: Partial<UserProfile>) => {
    // Transform frontend fields to backend fields
    const backendData: Record<string, any> = {};
    if (data.name !== undefined) backendData.fullName = data.name;
    if (data.title !== undefined) backendData.title = data.title;
    if (data.bio !== undefined) backendData.bio = data.bio;
    if (data.location !== undefined) backendData.location = data.location;
    if (data.phone !== undefined) backendData.phone = data.phone;
    if (data.linkedin !== undefined) backendData.linkedinUrl = data.linkedin || null;
    if (data.github !== undefined) backendData.githubUrl = data.github || null;
    if (data.website !== undefined) backendData.portfolioUrl = data.website || null;
    return api.patch<UserProfile>('/profile', backendData);
  },
};

// Helper to convert proficiency level number to string
function proficiencyToLevel(level: number): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' {
  switch (level) {
    case 1: return 'BEGINNER';
    case 2: return 'INTERMEDIATE';
    case 3: return 'ADVANCED';
    case 4:
    case 5: return 'EXPERT';
    default: return 'INTERMEDIATE';
  }
}

// Helper to convert level string to proficiency number
function levelToProficiency(level: string): number {
  switch (level) {
    case 'BEGINNER': return 1;
    case 'INTERMEDIATE': return 2;
    case 'ADVANCED': return 3;
    case 'EXPERT': return 4;
    default: return 2;
  }
}

// Helper to safely parse JSON arrays from backend
function parseJsonArray(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Skills API
export const skillsApi = {
  list: () => api.get<Skill[]>('/skills'),
  create: (data: CreateSkillDto) => {
    // Transform level string to proficiencyLevel number
    const backendData = {
      name: data.name,
      proficiencyLevel: levelToProficiency(data.level),
      yearsOfExperience: data.yearsOfExperience,
      categoryId: data.categoryId,
    };
    return api.post<Skill>('/skills', backendData);
  },
  update: (id: string, data: Partial<CreateSkillDto>) => {
    const backendData: Record<string, any> = {};
    if (data.name !== undefined) backendData.name = data.name;
    if (data.level !== undefined) backendData.proficiencyLevel = levelToProficiency(data.level);
    if (data.yearsOfExperience !== undefined) backendData.yearsOfExperience = data.yearsOfExperience;
    if (data.categoryId !== undefined) backendData.categoryId = data.categoryId;
    return api.patch<Skill>(`/skills/${id}`, backendData);
  },
  delete: (id: string) => api.delete(`/skills/${id}`),
};

// Experience API
export const experienceApi = {
  list: () => api.get<Experience[]>('/experience'),
  create: (data: CreateExperienceDto) => {
    // Transform frontend fields to backend fields
    const backendData: Record<string, any> = {
      company: data.company,
      title: data.title,
      location: data.location,
      startDate: data.startDate,
      endDate: data.endDate,
      isCurrent: data.current,
      description: data.description,
      achievements: data.achievements,
      technologies: data.technologies,
    };
    return api.post<Experience>('/experience', backendData);
  },
  update: (id: string, data: Partial<CreateExperienceDto>) => {
    const backendData: Record<string, any> = {};
    if (data.company !== undefined) backendData.company = data.company;
    if (data.title !== undefined) backendData.title = data.title;
    if (data.location !== undefined) backendData.location = data.location;
    if (data.startDate !== undefined) backendData.startDate = data.startDate;
    if (data.endDate !== undefined) backendData.endDate = data.endDate;
    if (data.current !== undefined) backendData.isCurrent = data.current;
    if (data.description !== undefined) backendData.description = data.description;
    if (data.achievements !== undefined) backendData.achievements = data.achievements;
    if (data.technologies !== undefined) backendData.technologies = data.technologies;
    return api.patch<Experience>(`/experience/${id}`, backendData);
  },
  delete: (id: string) => api.delete(`/experience/${id}`),
};

// Education API
export const educationApi = {
  list: () => api.get<Education[]>('/education'),
  create: (data: CreateEducationDto) => {
    // Transform frontend fields to backend fields
    const backendData: Record<string, any> = {
      institution: data.institution,
      degree: data.degree,
      fieldOfStudy: data.field,
      startDate: data.startDate,
      endDate: data.endDate,
      grade: data.gpa !== undefined ? String(data.gpa) : undefined,
    };
    return api.post<Education>('/education', backendData);
  },
  update: (id: string, data: Partial<CreateEducationDto>) => {
    const backendData: Record<string, any> = {};
    if (data.institution !== undefined) backendData.institution = data.institution;
    if (data.degree !== undefined) backendData.degree = data.degree;
    if (data.field !== undefined) backendData.fieldOfStudy = data.field;
    if (data.startDate !== undefined) backendData.startDate = data.startDate;
    if (data.endDate !== undefined) backendData.endDate = data.endDate;
    if (data.gpa !== undefined) backendData.grade = String(data.gpa);
    return api.patch<Education>(`/education/${id}`, backendData);
  },
  delete: (id: string) => api.delete(`/education/${id}`),
};

// Jobs API
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const jobsApi = {
  list: (params?: { status?: string; scored?: string; page?: string; limit?: string }) =>
    api.get<PaginatedResponse<Job>>('/jobs', { params: params as Record<string, string> }),
  ranked: (limit?: number) =>
    api.get<Job[]>('/jobs/ranked', { params: limit ? { limit: String(limit) } : undefined }),
  get: (id: string) => api.get<Job>(`/jobs/${id}`),
  score: (jobIds?: string[]) => api.post<{ jobId: string; overallScore: number }[]>('/jobs/score', { jobIds }),
  create: (data: CreateJobDto) => api.post<Job>('/jobs', data),
  update: (id: string, data: Partial<CreateJobDto>) => api.patch<Job>(`/jobs/${id}`, data),
  delete: (id: string) => api.delete(`/jobs/${id}`),
};

// Applications API
export const applicationsApi = {
  list: () => api.get<Application[]>('/applications'),
  get: (id: string) => api.get<Application>(`/applications/${id}`),
  create: (data: CreateApplicationDto) => api.post<Application>('/applications', data),
  update: (id: string, data: Partial<CreateApplicationDto>) => api.put<Application>(`/applications/${id}`, data),
  delete: (id: string) => api.delete(`/applications/${id}`),
};

// Plans API
export const plansApi = {
  list: () => api.get<Plan[]>('/plans'),
  get: (id: string) => api.get<Plan>(`/plans/${id}`),
  create: (data: CreatePlanDto) => api.post<Plan>('/plans', data),
  update: (id: string, data: Partial<CreatePlanDto>) => api.patch<Plan>(`/plans/${id}`, data),
  delete: (id: string) => api.delete(`/plans/${id}`),
};

// Documents API
export const documentsApi = {
  list: () => api.get<Document[]>('/documents'),
  upload: async (file: File, type: string) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getAuthToken() || '';

    const response = await fetch(`${API_BASE}/documents/upload?type=${encodeURIComponent(type)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }
    return response.json();
  },
  delete: (id: string) => api.delete(`/documents/${id}`),
};

// Chat API
export const chatApi = {
  conversations: () => api.get<Conversation[]>('/chat/conversations'),
  history: (conversationId: string) => api.get<Message[]>(`/chat/conversations/${conversationId}`),
  stream: (message: string, conversationId?: string) =>
    api.stream('/chat', { message, conversationId }),
};

// Types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  title?: string;
  bio?: string;
  location?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
}

export interface Skill {
  id: string;
  name: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  yearsOfExperience?: number;
  category?: { id: string; name: string };
}

export interface CreateSkillDto {
  name: string;
  level: string;
  yearsOfExperience?: number;
  categoryId?: string;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
  achievements: string[];
  technologies: string[];
}

export interface CreateExperienceDto {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  achievements?: string[];
  technologies?: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: number;
  achievements: string[];
}

export interface CreateEducationDto {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: number;
  achievements?: string[];
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  salary?: string;
  description: string;
  requirements: string[];
  source: string;
  sourceUrl?: string;
  postedAt?: string;
  score?: JobScore;
}

export interface JobScore {
  id: string;
  overallScore: number;
  semanticScore: number;
  skillMatchScore: number;
  experienceScore: number;
  salaryScore: number;
  locationScore: number;
  breakdown: Record<string, unknown>;
}

export interface CreateJobDto {
  title: string;
  company: string;
  location?: string;
  isRemote?: boolean;
  description?: string;
  requirements?: string;
  skillsRequired?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  sourceUrl?: string;
  employmentType?: string;
}

export interface Application {
  id: string;
  jobId?: string;
  job?: Job;
  externalJobUrl?: string;
  companyName?: string;
  jobTitle?: string;
  status: string;
  appliedDate?: string;
  coverLetter?: string;
  notes?: string;
  nextAction?: string;
  nextActionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationDto {
  jobId: string;
  status?: string;
  notes?: string;
}

export interface Plan {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  startDate?: string;
  endDate?: string;
  items: PlanItem[];
}

export interface PlanItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  dueDate?: string;
}

export interface CreatePlanDto {
  title: string;
  description?: string;
  planType: string;
  startDate?: string;
  endDate?: string;
}

export interface Document {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number | null;
  documentType: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

// Scraper Types
export interface ScraperStatus {
  source: string;
  enabled: boolean;
  isBlocked: boolean;
  blockedAt?: string;
  consecutiveFailures: number;
  lastSuccess?: string;
  lastRun?: string;
}

export interface ScraperRunResult {
  source: string;
  success: boolean;
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
  error?: string;
  blocked?: boolean;
  duration?: number;
}

export interface ScrapeResult {
  results: ScraperRunResult[];
  totalJobsNew: number;
  totalJobsUpdated: number;
  sourcesSucceeded: number;
  sourcesFailed: number;
}

export interface ScrapeJobsRequest {
  sources?: string[];
  keywords?: string[];
  location?: string;
  remoteOnly?: boolean;
  salaryMin?: number;
  scoreAfterScrape?: boolean;
}

export interface ScraperHistory {
  id: string;
  source: string;
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  completedAt?: string;
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
  errorMessage?: string;
}

// Scrapers API
export const scrapersApi = {
  // Run all or specific scrapers
  run: (data?: ScrapeJobsRequest) =>
    api.post<ScrapeResult>('/scrapers/run', data || {}),

  // Run a specific scraper
  runSource: (source: string, data?: ScrapeJobsRequest) =>
    api.post<ScrapeResult>(`/scrapers/run/${source}`, data || {}),

  // Get status of all scrapers
  status: () => api.get<ScraperStatus[]>('/scrapers/status'),

  // Get available sources
  sources: () => api.get<{ sources: string[] }>('/scrapers/sources'),

  // Get scraper run history
  history: (limit?: number) =>
    api.get<ScraperHistory[]>('/scrapers/history', {
      params: limit ? { limit: String(limit) } : undefined,
    }),

  // Test a scraper connection
  test: (source: string) =>
    api.post<{ success: boolean; message: string }>(`/scrapers/test/${source}`),

  // Enable a scraper
  enable: (source: string) =>
    api.post<{ success: boolean }>(`/scrapers/enable/${source}`),

  // Disable a scraper
  disable: (source: string) =>
    api.post<{ success: boolean }>(`/scrapers/disable/${source}`),

  // Unblock a blocked scraper
  unblock: (source: string) =>
    api.post<{ success: boolean }>(`/scrapers/unblock/${source}`),

  // Score unscored jobs
  score: (limit?: number) =>
    api.post<{ scored: number }>('/scrapers/score', undefined, {
      params: limit ? { limit: String(limit) } : undefined,
    }),
}
