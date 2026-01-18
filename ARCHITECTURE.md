# Personal RAG-based AI Agent Platform
## System Architecture Document v1.0

> **Philosophy:** Local-first, minimal cost, production-ready when you need it.

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Component Breakdown](#3-component-breakdown)
4. [Database Schema](#4-database-schema)
5. [Vector Schema & Chunking Strategy](#5-vector-schema--chunking-strategy)
6. [RAG Orchestration Logic](#6-rag-orchestration-logic)
7. [Agent Tool Definitions](#7-agent-tool-definitions)
8. [Job Scoring Algorithm](#8-job-scoring-algorithm)
9. [API Contracts](#9-api-contracts)
10. [Frontend Page Structure](#10-frontend-page-structure)
11. [Local Development Setup](#11-local-development-setup)
12. [Production Deployment (When Ready)](#12-production-deployment-when-ready)
13. [Build Roadmap](#13-build-roadmap)
14. [Technology Decisions & Rationale](#14-technology-decisions--rationale)
15. [Cost Breakdown](#15-cost-breakdown)

---

## 1. Executive Summary

This platform is a **Personal Career & Life AI Operating System** that:
- Acts as a single source of truth for all personal, career, and job-search data
- Uses RAG to ground all AI responses in your actual data
- Provides intelligent job discovery, ranking, and tracking
- Supports tool-calling agents for autonomous actions
- Never hallucinates personal data

### Core Design Principles
1. **Local-First:** Everything runs on your machine during development
2. **Minimal Dependencies:** Only what's necessary, avoid over-engineering
3. **Zero Cloud Cost Initially:** No AWS/GCP until you're ready to scale
4. **Simple to Production:** One command to deploy when ready
5. **Data Sovereignty:** Your data stays on your machine

### Cost Philosophy
| Phase | Monthly Cost |
|-------|--------------|
| Development | $0 (local) + ~$5-20 LLM API |
| MVP Production | ~$10-15/month (VPS) + LLM API |
| Scale | Increase as needed |

---

## 2. High-Level System Architecture

### Local Development Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              YOUR LOCAL MACHINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         FRONTEND (Next.js 14)                        │   │
│  │                         http://localhost:3000                        │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐ │   │
│  │  │    Chat    │  │    Jobs    │  │  Profile   │  │   Documents    │ │   │
│  │  │  Interface │  │ Dashboard  │  │  Manager   │  │    Upload      │ │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        BACKEND (NestJS)                              │   │
│  │                       http://localhost:3001                          │   │
│  │                                                                      │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                    AGENT ORCHESTRATION                         │  │   │
│  │  │  Intent Router → Tool Executor → Context Manager → Response   │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                      DOMAIN SERVICES                           │  │   │
│  │  │  Profile │ Plans │ Jobs │ Documents │ Embeddings │ Scraper    │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                      RAG PIPELINE                              │  │   │
│  │  │  Query Parser → Retriever → Reranker → Context Compiler       │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │              │              │                    │
│              ┌───────────┴──────────────┴──────────────┴───────────┐       │
│              ▼                          ▼                          ▼       │
│  ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────┐  │
│  │      SQLite         │   │   Qdrant (Docker)   │   │   Local Files   │  │
│  │   ./data/app.db     │   │   localhost:6333    │   │   ./uploads/    │  │
│  │                     │   │                     │   │                 │  │
│  │  - Users            │   │  - Profile vectors  │   │  - Resumes      │  │
│  │  - Experience       │   │  - Job vectors      │   │  - Documents    │  │
│  │  - Skills           │   │  - Document chunks  │   │  - Certificates │  │
│  │  - Jobs             │   │                     │   │                 │  │
│  │  - Applications     │   │                     │   │                 │  │
│  │  - Plans            │   │                     │   │                 │  │
│  └─────────────────────┘   └─────────────────────┘   └─────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────┐
                    │         EXTERNAL APIs (Only)        │
                    │                                     │
                    │  - OpenAI API (LLM + Embeddings)    │
                    │  - Job Portals (scraping)           │
                    │  - Web Search (optional)            │
                    └─────────────────────────────────────┘
```

### Data Flow

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────┐
│              INTENT CLASSIFICATION              │
│  "What jobs match my Python skills?"            │
│  → Intent: job_search                           │
│  → Entities: [Python]                           │
│  → Sources: [jobs_vector, skills_sql]           │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│              PARALLEL RETRIEVAL                 │
│  SQL: Get user skills where name = 'Python'    │
│  Vector: Search jobs similar to user profile   │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│              CONTEXT ASSEMBLY                   │
│  - User's Python experience (from SQL)         │
│  - Top 10 matching jobs (from Vector)          │
│  - Score breakdown for each                    │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│              LLM RESPONSE                       │
│  Grounded answer with citations                │
└─────────────────────────────────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 Frontend (Next.js 14)

| Component | Purpose |
|-----------|---------|
| **Chat Interface** | AI agent interaction with streaming |
| **Job Dashboard** | View, filter, and rank jobs |
| **Profile Manager** | CRUD for education, experience, skills |
| **Plans Manager** | Daily/weekly/study/workout plans |
| **Document Uploader** | Upload and process resumes, certs |

**Tech Stack:**
- Next.js 14 (App Router)
- TailwindCSS (styling)
- Shadcn/ui (components)
- Zustand (state management)
- React Query (data fetching)

### 3.2 Backend (NestJS)

| Module | Responsibility |
|--------|----------------|
| **AuthModule** | JWT authentication |
| **ProfileModule** | Education, experience, skills CRUD |
| **PlansModule** | Plans and plan items CRUD |
| **JobsModule** | Jobs, scoring, applications |
| **DocumentsModule** | Upload, parsing, embedding |
| **AgentModule** | Chat, tool execution, streaming |
| **RAGModule** | Retrieval pipeline |
| **ScraperModule** | Job portal scraping |

**Tech Stack:**
- NestJS with TypeScript
- Prisma ORM (SQLite for dev, PostgreSQL for prod)
- BullMQ with in-memory adapter (no Redis needed locally)

### 3.3 Storage (Local)

| Storage | Technology | Purpose |
|---------|------------|---------|
| **Structured Data** | SQLite | All relational data |
| **Vector Data** | Qdrant (Docker) | Embeddings for semantic search |
| **Files** | Local filesystem | Uploaded documents |

**Why SQLite for Development:**
- Zero configuration
- Single file database
- Easy to backup (copy file)
- Swap to PostgreSQL for production with one env change

---

## 4. Database Schema

### 4.1 Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │────<│  Education  │     │   Skills    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │            ┌─────────────┐           │
       └───────────>│  Experience │<──────────┘
                    └─────────────┘
       │
       │            ┌─────────────┐     ┌─────────────┐
       ├───────────>│ Job Targets │     │    Jobs     │
       │            └─────────────┘     └─────────────┘
       │                                       │
       │            ┌─────────────┐           │
       └───────────>│Applications │<──────────┘
                    └─────────────┘
       │
       ├───────────>│    Plans    │───>│ Plan Items  │
       │            └─────────────┘    └─────────────┘
       │
       └───────────>│  Documents  │───>│   Chunks    │
                    └─────────────┘    └─────────────┘
```

### 4.2 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite" // Change to "postgresql" for production
  url      = env("DATABASE_URL")
}

// ============================================
// USER & AUTHENTICATION
// ============================================

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  fullName     String   @map("full_name")
  phone        String?
  location     String?
  linkedinUrl  String?  @map("linkedin_url")
  githubUrl    String?  @map("github_url")
  portfolioUrl String?  @map("portfolio_url")
  bio          String?
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  education     Education[]
  experience    Experience[]
  skills        Skill[]
  jobTargets    JobTarget?
  applications  JobApplication[]
  plans         Plan[]
  documents     Document[]
  conversations Conversation[]

  @@map("users")
}

// ============================================
// EDUCATION
// ============================================

model Education {
  id           String    @id @default(cuid())
  userId       String    @map("user_id")
  institution  String
  degree       String
  fieldOfStudy String?   @map("field_of_study")
  startDate    DateTime? @map("start_date")
  endDate      DateTime? @map("end_date")
  grade        String?
  description  String?
  isCurrent    Boolean   @default(false) @map("is_current")
  embeddingId  String?   @map("embedding_id")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("education")
}

// ============================================
// WORK EXPERIENCE
// ============================================

model Experience {
  id              String    @id @default(cuid())
  userId          String    @map("user_id")
  company         String
  title           String
  location        String?
  employmentType  String?   @map("employment_type") // full-time, part-time, contract
  startDate       DateTime  @map("start_date")
  endDate         DateTime? @map("end_date")
  isCurrent       Boolean   @default(false) @map("is_current")
  description     String?
  achievements    String?   // JSON array stored as string
  technologies    String?   // JSON array stored as string
  embeddingId     String?   @map("embedding_id")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("experience")
}

// ============================================
// SKILLS
// ============================================

model SkillCategory {
  id           String  @id @default(cuid())
  name         String  @unique
  displayOrder Int     @default(0) @map("display_order")
  skills       Skill[]

  @@map("skill_categories")
}

model Skill {
  id                String    @id @default(cuid())
  userId            String    @map("user_id")
  categoryId        String?   @map("category_id")
  name              String
  proficiencyLevel  Int       @map("proficiency_level") // 1-5
  yearsOfExperience Float?    @map("years_of_experience")
  lastUsedDate      DateTime? @map("last_used_date")
  isPrimary         Boolean   @default(false) @map("is_primary")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  user     User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  category SkillCategory? @relation(fields: [categoryId], references: [id])

  @@unique([userId, name])
  @@map("skills")
}

// ============================================
// JOB TARGETS
// ============================================

model JobTarget {
  id                  String   @id @default(cuid())
  userId              String   @unique @map("user_id")
  targetRoles         String?  @map("target_roles") // JSON array
  targetCompanies     String?  @map("target_companies") // JSON array
  excludedCompanies   String?  @map("excluded_companies") // JSON array
  minSalary           Int?     @map("min_salary")
  maxSalary           Int?     @map("max_salary")
  salaryCurrency      String   @default("INR") @map("salary_currency")
  preferredLocations  String?  @map("preferred_locations") // JSON array
  remotePreference    String?  @map("remote_preference") // remote, hybrid, onsite, any
  minCompanySize      Int?     @map("min_company_size")
  maxCompanySize      Int?     @map("max_company_size")
  preferredIndustries String?  @map("preferred_industries") // JSON array
  noticePeriodDays    Int?     @map("notice_period_days")
  isActive            Boolean  @default(true) @map("is_active")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("job_targets")
}

// ============================================
// JOBS (Scraped)
// ============================================

model Job {
  id             String    @id @default(cuid())
  externalId     String?   @map("external_id")
  source         String    // linkedin, naukri, indeed, etc.
  sourceUrl      String?   @map("source_url")
  title          String
  company        String
  companyLogoUrl String?   @map("company_logo_url")
  location       String?
  isRemote       Boolean?  @map("is_remote")
  employmentType String?   @map("employment_type")
  experienceMin  Int?      @map("experience_min")
  experienceMax  Int?      @map("experience_max")
  salaryMin      Int?      @map("salary_min")
  salaryMax      Int?      @map("salary_max")
  salaryCurrency String?   @map("salary_currency")
  salaryPeriod   String?   @map("salary_period")
  description    String?
  requirements   String?
  responsibilities String?
  benefits       String?
  skillsRequired String?   @map("skills_required") // JSON array
  postedDate     DateTime? @map("posted_date")
  expiryDate     DateTime? @map("expiry_date")
  companySize    String?   @map("company_size")
  industry       String?
  isProcessed    Boolean   @default(false) @map("is_processed")
  embeddingId    String?   @map("embedding_id")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  scores       JobScore[]
  applications JobApplication[]

  @@unique([source, externalId])
  @@map("jobs")
}

// ============================================
// JOB SCORES
// ============================================

model JobScore {
  id                   String   @id @default(cuid())
  jobId                String   @map("job_id")
  userId               String   @map("user_id")
  semanticScore        Float?   @map("semantic_score")
  skillMatchScore      Float?   @map("skill_match_score")
  experienceMatchScore Float?   @map("experience_match_score")
  salaryMatchScore     Float?   @map("salary_match_score")
  locationMatchScore   Float?   @map("location_match_score")
  overallScore         Float    @map("overall_score")
  scoreBreakdown       String?  @map("score_breakdown") // JSON
  matchedSkills        String?  @map("matched_skills") // JSON array
  missingSkills        String?  @map("missing_skills") // JSON array
  calculatedAt         DateTime @default(now()) @map("calculated_at")

  job Job @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@unique([jobId, userId])
  @@map("job_scores")
}

// ============================================
// JOB APPLICATIONS
// ============================================

model JobApplication {
  id             String    @id @default(cuid())
  userId         String    @map("user_id")
  jobId          String?   @map("job_id")
  externalJobUrl String?   @map("external_job_url")
  companyName    String?   @map("company_name")
  jobTitle       String?   @map("job_title")
  status         String    @default("applied") // saved, applied, screening, interview, offer, rejected, withdrawn
  appliedDate    DateTime? @map("applied_date")
  coverLetter    String?   @map("cover_letter")
  notes          String?
  nextAction     String?   @map("next_action")
  nextActionDate DateTime? @map("next_action_date")
  interviews     String?   // JSON array
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  job  Job? @relation(fields: [jobId], references: [id], onDelete: SetNull)

  @@map("job_applications")
}

// ============================================
// PLANS
// ============================================

model Plan {
  id          String     @id @default(cuid())
  userId      String     @map("user_id")
  planType    String     @map("plan_type") // daily, weekly, monthly, study, workout, career
  title       String
  description String?
  startDate   DateTime?  @map("start_date")
  endDate     DateTime?  @map("end_date")
  status      String     @default("active") // active, completed, paused, cancelled
  metadata    String?    // JSON
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items PlanItem[]

  @@map("plans")
}

model PlanItem {
  id              String    @id @default(cuid())
  planId          String    @map("plan_id")
  title           String
  description     String?
  scheduledDate   DateTime? @map("scheduled_date")
  scheduledTime   String?   @map("scheduled_time")
  durationMinutes Int?      @map("duration_minutes")
  isCompleted     Boolean   @default(false) @map("is_completed")
  completedAt     DateTime? @map("completed_at")
  priority        Int       @default(0)
  tags            String?   // JSON array
  metadata        String?   // JSON
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  plan Plan @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@map("plan_items")
}

// ============================================
// DOCUMENTS
// ============================================

model Document {
  id               String   @id @default(cuid())
  userId           String   @map("user_id")
  filename         String
  originalFilename String   @map("original_filename")
  mimeType         String   @map("mime_type")
  fileSize         Int?     @map("file_size")
  storagePath      String   @map("storage_path")
  documentType     String?  @map("document_type") // resume, cover_letter, certificate, job_description, notes
  extractedText    String?  @map("extracted_text")
  isProcessed      Boolean  @default(false) @map("is_processed")
  processingError  String?  @map("processing_error")
  metadata         String?  // JSON
  tags             String?  // JSON array
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  user   User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  chunks DocumentChunk[]

  @@map("documents")
}

model DocumentChunk {
  id          String   @id @default(cuid())
  documentId  String   @map("document_id")
  chunkIndex  Int      @map("chunk_index")
  content     String
  tokenCount  Int?     @map("token_count")
  embeddingId String?  @map("embedding_id")
  metadata    String?  // JSON
  createdAt   DateTime @default(now()) @map("created_at")

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@map("document_chunks")
}

// ============================================
// CONVERSATIONS
// ============================================

model Conversation {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  title     String?
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages Message[]

  @@map("conversations")
}

model Message {
  id             String   @id @default(cuid())
  conversationId String   @map("conversation_id")
  role           String   // user, assistant, system, tool
  content        String
  toolCalls      String?  @map("tool_calls") // JSON
  toolResults    String?  @map("tool_results") // JSON
  contextUsed    String?  @map("context_used") // JSON
  tokensUsed     Int?     @map("tokens_used")
  createdAt      DateTime @default(now()) @map("created_at")

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@map("messages")
}

// ============================================
// SCRAPER STATE
// ============================================

model ScraperRun {
  id           String    @id @default(cuid())
  source       String
  status       String    // running, completed, failed
  startedAt    DateTime  @default(now()) @map("started_at")
  completedAt  DateTime? @map("completed_at")
  jobsFound    Int       @default(0) @map("jobs_found")
  jobsNew      Int       @default(0) @map("jobs_new")
  jobsUpdated  Int       @default(0) @map("jobs_updated")
  errorMessage String?   @map("error_message")
  metadata     String?   // JSON

  @@map("scraper_runs")
}
```

---

## 5. Vector Schema & Chunking Strategy

### 5.1 Qdrant Collections

```
Collections:
├── personal_profile    (education, experience embeddings)
├── skills             (skill embeddings)
├── jobs               (job description embeddings)
└── documents          (uploaded document chunks)
```

### 5.2 Collection Payload Schema

```typescript
// personal_profile collection
interface ProfilePoint {
  id: string;
  vector: number[]; // 1536 dimensions (OpenAI)
  payload: {
    user_id: string;
    entity_type: 'education' | 'experience' | 'summary';
    entity_id: string;
    content: string;
    company?: string;
    role?: string;
    skills?: string[];
  };
}

// jobs collection
interface JobPoint {
  id: string;
  vector: number[];
  payload: {
    job_id: string;
    source: string;
    title: string;
    company: string;
    location?: string;
    skills_required: string[];
    posted_date?: string;
  };
}

// documents collection
interface DocumentPoint {
  id: string;
  vector: number[];
  payload: {
    document_id: string;
    user_id: string;
    document_type: string;
    chunk_index: number;
    filename: string;
  };
}
```

### 5.3 Chunking Strategy

| Document Type | Strategy | Chunk Size | Overlap |
|--------------|----------|------------|---------|
| Resume/CV | Section-based | ~500 tokens | 0 |
| Job Description | Full + sections | ~512 tokens | 50 tokens |
| General Docs | Recursive split | 512 tokens | 50 tokens |
| Structured Data | Entity-based | N/A | N/A |

### 5.4 Text Templates for Embedding

```typescript
const EMBEDDING_TEMPLATES = {
  experience: `
Role: {{title}} at {{company}}
Duration: {{startDate}} to {{endDate}}
Location: {{location}}
Description: {{description}}
Technologies: {{technologies}}
  `.trim(),

  education: `
{{degree}} in {{fieldOfStudy}}
{{institution}}
{{startDate}} - {{endDate}}
{{description}}
  `.trim(),

  skill: `
{{name}} - {{proficiencyLevel}}/5 proficiency
{{yearsOfExperience}} years of experience
Category: {{category}}
  `.trim(),
};
```

---

## 6. RAG Orchestration Logic

### 6.1 Query Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER QUERY                               │
│  "What jobs match my backend experience?"                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 STEP 1: INTENT CLASSIFICATION               │
│                                                             │
│  LLM classifies query:                                      │
│  {                                                          │
│    intent: "job_search",                                    │
│    entities: ["backend"],                                   │
│    requires_personal_data: true,                            │
│    requires_external: false                                 │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               STEP 2: SOURCE SELECTION                      │
│                                                             │
│  Based on intent, select data sources:                      │
│  - SQL: user skills, experience                             │
│  - Vector: jobs collection (semantic search)                │
│  - Vector: personal_profile (for context)                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 3: PARALLEL RETRIEVAL                     │
│                                                             │
│  SQL Query:                                                 │
│    SELECT * FROM skills WHERE user_id = ? AND               │
│    name LIKE '%backend%' OR category = 'Backend'            │
│                                                             │
│  Vector Search (jobs):                                      │
│    Query: user's aggregated profile embedding               │
│    Filter: skills_required contains backend terms           │
│    Limit: 20                                                │
│                                                             │
│  Vector Search (profile):                                   │
│    Query: "backend experience"                              │
│    Filter: entity_type = 'experience'                       │
│    Limit: 5                                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               STEP 4: RERANKING                             │
│                                                             │
│  - Score jobs using scoring algorithm                       │
│  - Sort by overall_score descending                         │
│  - Take top 10                                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│             STEP 5: CONTEXT ASSEMBLY                        │
│                                                             │
│  Token Budget: 4000                                         │
│                                                             │
│  Context:                                                   │
│  """                                                        │
│  YOUR PROFILE:                                              │
│  - Skills: Node.js (5/5), Python (4/5), PostgreSQL (4/5)    │
│  - Experience: 5 years backend development                  │
│                                                             │
│  MATCHING JOBS:                                             │
│  1. Senior Backend Engineer at TechCorp (Score: 92)         │
│     - Skills match: Node.js, PostgreSQL                     │
│     - Salary: ₹30-40 LPA                                    │
│  2. ...                                                     │
│  """                                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 6: LLM GENERATION                         │
│                                                             │
│  System: You are a career AI assistant. Answer based        │
│          ONLY on the provided context. Never invent data.   │
│                                                             │
│  Context: [assembled context]                               │
│                                                             │
│  User: What jobs match my backend experience?               │
│                                                             │
│  Response: Based on your profile, I found 10 matching       │
│           jobs. The top match is Senior Backend Engineer    │
│           at TechCorp with a 92% fit score...               │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Intent Types

```typescript
enum QueryIntent {
  // Read operations
  PROFILE_QUERY = 'profile_query',
  JOB_SEARCH = 'job_search',
  JOB_RANKING = 'job_ranking',
  DOCUMENT_QUERY = 'document_query',
  PLAN_QUERY = 'plan_query',

  // Write operations
  UPDATE_PROFILE = 'update_profile',
  UPDATE_PLAN = 'update_plan',
  TRACK_APPLICATION = 'track_application',

  // External
  WEB_SEARCH = 'web_search',

  // Hybrid
  COMPARISON = 'comparison',
  RECOMMENDATION = 'recommendation',
}
```

### 6.3 Anti-Hallucination Rules

```typescript
const SYSTEM_PROMPT = `
You are a personal career AI assistant with access to the user's data.

CRITICAL RULES:
1. ONLY use information from the provided context
2. If data is not in context, say "I don't have that information in your profile"
3. NEVER invent skills, experiences, companies, or achievements
4. ALWAYS cite which data source information came from
5. Distinguish between "your profile shows X" vs "generally, X is true"
6. If asked to update data, confirm the change before executing

When uncertain, ask for clarification rather than guessing.
`;
```

---

## 7. Agent Tool Definitions

### 7.1 Tool Categories

```
TOOLS
├── READ (no confirmation needed)
│   ├── get_profile
│   ├── get_skills
│   ├── get_experience
│   ├── get_education
│   ├── get_job_targets
│   ├── get_plans
│   └── get_applications
│
├── SEARCH (no confirmation needed)
│   ├── search_jobs
│   ├── rank_jobs
│   ├── search_documents
│   └── semantic_search
│
├── WRITE (confirmation for important changes)
│   ├── add_skill
│   ├── update_skill
│   ├── add_experience
│   ├── update_plan
│   ├── track_application
│   └── update_job_targets
│
└── EXTERNAL (may have latency)
    ├── web_search
    ├── fetch_jobs_from_portal
    └── ingest_document
```

### 7.2 Tool Definitions

```typescript
const AGENT_TOOLS = [
  // ==================== READ TOOLS ====================
  {
    name: 'get_profile',
    description: 'Get user profile (bio, contact info, links)',
    parameters: {
      type: 'object',
      properties: {},
    },
  },

  {
    name: 'get_skills',
    description: 'Get user skills with proficiency levels',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category' },
        min_proficiency: { type: 'number', description: 'Minimum level (1-5)' },
      },
    },
  },

  {
    name: 'get_experience',
    description: 'Get work experience history',
    parameters: {
      type: 'object',
      properties: {
        company: { type: 'string' },
        current_only: { type: 'boolean' },
      },
    },
  },

  {
    name: 'get_education',
    description: 'Get education history',
    parameters: { type: 'object', properties: {} },
  },

  {
    name: 'get_job_targets',
    description: 'Get job search preferences',
    parameters: { type: 'object', properties: {} },
  },

  {
    name: 'get_plans',
    description: 'Get plans (daily, weekly, study, workout)',
    parameters: {
      type: 'object',
      properties: {
        plan_type: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'study', 'workout', 'career'] },
        status: { type: 'string', enum: ['active', 'completed', 'all'] },
      },
    },
  },

  {
    name: 'get_applications',
    description: 'Get job applications',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        limit: { type: 'number' },
      },
    },
  },

  // ==================== SEARCH TOOLS ====================
  {
    name: 'search_jobs',
    description: 'Search for jobs matching criteria',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        skills: { type: 'array', items: { type: 'string' } },
        location: { type: 'string' },
        remote_only: { type: 'boolean' },
        min_salary: { type: 'number' },
        limit: { type: 'number', default: 20 },
      },
      required: ['query'],
    },
  },

  {
    name: 'rank_jobs',
    description: 'Rank jobs by fit with user profile',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 10 },
        sort_by: { type: 'string', enum: ['overall', 'salary', 'skills'], default: 'overall' },
      },
    },
  },

  {
    name: 'search_documents',
    description: 'Search uploaded documents',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        document_type: { type: 'string' },
      },
      required: ['query'],
    },
  },

  // ==================== WRITE TOOLS ====================
  {
    name: 'add_skill',
    description: 'Add a new skill',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        category: { type: 'string' },
        proficiency_level: { type: 'number', minimum: 1, maximum: 5 },
        years_of_experience: { type: 'number' },
      },
      required: ['name', 'proficiency_level'],
    },
    requiresConfirmation: true,
  },

  {
    name: 'update_plan',
    description: 'Update plan or mark items complete',
    parameters: {
      type: 'object',
      properties: {
        plan_id: { type: 'string' },
        item_id: { type: 'string' },
        action: { type: 'string', enum: ['complete', 'uncomplete', 'reschedule'] },
        new_date: { type: 'string', format: 'date' },
      },
      required: ['action'],
    },
  },

  {
    name: 'track_application',
    description: 'Track a job application',
    parameters: {
      type: 'object',
      properties: {
        job_id: { type: 'string' },
        company_name: { type: 'string' },
        job_title: { type: 'string' },
        status: { type: 'string', enum: ['saved', 'applied', 'screening', 'interview', 'offer', 'rejected'] },
        notes: { type: 'string' },
      },
    },
  },

  // ==================== EXTERNAL TOOLS ====================
  {
    name: 'web_search',
    description: 'Search the web (use only when personal data is insufficient)',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
  },

  {
    name: 'fetch_jobs_from_portal',
    description: 'Fetch new jobs from job portals',
    parameters: {
      type: 'object',
      properties: {
        portals: {
          type: 'array',
          items: { type: 'string', enum: ['linkedin', 'naukri', 'indeed', 'wellfound', 'hirist', 'cutshort', 'uplers'] },
        },
        search_query: { type: 'string' },
      },
      required: ['portals'],
    },
  },
];
```

---

## 8. Job Scoring Algorithm

### 8.1 Score Components

| Component | Weight | Range | Description |
|-----------|--------|-------|-------------|
| Semantic Similarity | 30% | 0-100 | Resume vs JD embedding similarity |
| Skill Match | 30% | 0-100 | % of required skills matched |
| Experience Match | 20% | 0-100 | Years of experience fit |
| Salary Match | 10% | 0-100 | Salary range alignment |
| Location Match | 10% | 0-100 | Location/remote preference fit |

### 8.2 Algorithm Implementation

```typescript
interface JobScore {
  overallScore: number;
  semanticScore: number;
  skillMatchScore: number;
  experienceMatchScore: number;
  salaryMatchScore: number;
  locationMatchScore: number;
  breakdown: {
    matchedSkills: string[];
    missingSkills: string[];
    experienceAnalysis: string;
    salaryAnalysis: string;
    locationAnalysis: string;
    pros: string[];
    cons: string[];
  };
}

async function calculateJobScore(
  job: Job,
  userProfile: UserProfile,
  userSkills: Skill[],
  jobTargets: JobTarget
): Promise<JobScore> {
  // 1. Semantic Score (30%)
  const semanticScore = await calculateSemanticScore(job, userProfile);

  // 2. Skill Match Score (30%)
  const skillScore = calculateSkillMatch(job.skillsRequired, userSkills);

  // 3. Experience Match Score (20%)
  const experienceScore = calculateExperienceMatch(
    job.experienceMin,
    job.experienceMax,
    getTotalExperience(userProfile)
  );

  // 4. Salary Match Score (10%)
  const salaryScore = calculateSalaryMatch(
    job.salaryMin,
    job.salaryMax,
    jobTargets.minSalary,
    jobTargets.maxSalary
  );

  // 5. Location Match Score (10%)
  const locationScore = calculateLocationMatch(
    job.location,
    job.isRemote,
    jobTargets.preferredLocations,
    jobTargets.remotePreference
  );

  // Weighted overall
  const overallScore = Math.round(
    semanticScore.score * 0.3 +
    skillScore.score * 0.3 +
    experienceScore.score * 0.2 +
    salaryScore.score * 0.1 +
    locationScore.score * 0.1
  );

  return {
    overallScore,
    semanticScore: semanticScore.score,
    skillMatchScore: skillScore.score,
    experienceMatchScore: experienceScore.score,
    salaryMatchScore: salaryScore.score,
    locationMatchScore: locationScore.score,
    breakdown: {
      matchedSkills: skillScore.matched,
      missingSkills: skillScore.missing,
      experienceAnalysis: experienceScore.analysis,
      salaryAnalysis: salaryScore.analysis,
      locationAnalysis: locationScore.analysis,
      pros: compilePros(skillScore, experienceScore, salaryScore, locationScore),
      cons: compileCons(skillScore, experienceScore, salaryScore, locationScore),
    },
  };
}
```

### 8.3 Skill Matching with Synonyms

```typescript
const SKILL_SYNONYMS: Record<string, string[]> = {
  'javascript': ['js', 'ecmascript', 'es6'],
  'typescript': ['ts'],
  'react': ['reactjs', 'react.js'],
  'node.js': ['nodejs', 'node'],
  'postgresql': ['postgres', 'psql'],
  'mongodb': ['mongo'],
  'aws': ['amazon web services'],
  'gcp': ['google cloud', 'google cloud platform'],
  'kubernetes': ['k8s'],
  'machine learning': ['ml'],
  'artificial intelligence': ['ai'],
  'ci/cd': ['cicd', 'continuous integration'],
};

function normalizeSkill(skill: string): string {
  const lower = skill.toLowerCase().trim();

  for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    if (lower === canonical || synonyms.includes(lower)) {
      return canonical;
    }
  }

  return lower;
}
```

---

## 9. API Contracts

### 9.1 REST Endpoints

```yaml
# Authentication
POST   /api/auth/register     # Register new user
POST   /api/auth/login        # Login
POST   /api/auth/refresh      # Refresh token

# Profile
GET    /api/profile           # Get full profile
PATCH  /api/profile           # Update profile

# Education
GET    /api/education         # List education
POST   /api/education         # Add education
PUT    /api/education/:id     # Update education
DELETE /api/education/:id     # Delete education

# Experience
GET    /api/experience        # List experience
POST   /api/experience        # Add experience
PUT    /api/experience/:id    # Update experience
DELETE /api/experience/:id    # Delete experience

# Skills
GET    /api/skills            # List skills
POST   /api/skills            # Add skill
PUT    /api/skills/:id        # Update skill
DELETE /api/skills/:id        # Delete skill
POST   /api/skills/bulk       # Bulk add skills

# Job Targets
GET    /api/job-targets       # Get job targets
PUT    /api/job-targets       # Update job targets

# Jobs
GET    /api/jobs              # List jobs (with filters)
GET    /api/jobs/:id          # Get job detail
GET    /api/jobs/ranked       # Get ranked jobs
POST   /api/jobs/score        # Score specific jobs

# Applications
GET    /api/applications      # List applications
POST   /api/applications      # Create application
PUT    /api/applications/:id  # Update application
DELETE /api/applications/:id  # Delete application

# Plans
GET    /api/plans             # List plans
POST   /api/plans             # Create plan
PUT    /api/plans/:id         # Update plan
DELETE /api/plans/:id         # Delete plan
POST   /api/plans/:id/items   # Add plan item
PUT    /api/plans/:id/items/:itemId    # Update item
DELETE /api/plans/:id/items/:itemId    # Delete item

# Documents
GET    /api/documents         # List documents
POST   /api/documents/upload  # Upload document
DELETE /api/documents/:id     # Delete document

# Chat
POST   /api/chat              # Send message (streaming response)
GET    /api/conversations     # List conversations
GET    /api/conversations/:id # Get conversation messages
DELETE /api/conversations/:id # Delete conversation

# Scraper
POST   /api/scraper/trigger   # Trigger job scraping
GET    /api/scraper/status/:id # Check scraper status
```

### 9.2 Response Formats

```typescript
// Success response
interface ApiResponse<T> {
  success: true;
  data: T;
}

// Error response
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// Paginated response
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

---

## 10. Frontend Page Structure

### 10.1 Routes

```
/                           → Landing/Login
/dashboard                  → Main dashboard
/chat                       → AI chat interface
/chat/:conversationId       → Specific conversation
/jobs                       → Job listings
/jobs/:id                   → Job detail
/jobs/ranked                → Ranked jobs view
/jobs/applications          → Application tracker
/profile                    → Profile overview
/profile/experience         → Experience manager
/profile/education          → Education manager
/profile/skills             → Skills manager
/profile/targets            → Job preferences
/plans                      → Plans overview
/plans/daily                → Daily planner
/plans/study                → Study plan
/plans/workout              → Workout tracker
/documents                  → Document manager
/settings                   → App settings
```

### 10.2 Component Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login, register)
│   ├── (dashboard)/       # Protected routes
│   │   ├── dashboard/
│   │   ├── chat/
│   │   ├── jobs/
│   │   ├── profile/
│   │   ├── plans/
│   │   └── documents/
│   └── api/               # API routes (if needed)
│
├── components/
│   ├── ui/                # Shadcn components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── AppShell.tsx
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageList.tsx
│   │   └── ChatInput.tsx
│   ├── jobs/
│   │   ├── JobCard.tsx
│   │   ├── JobFilters.tsx
│   │   └── ScoreBreakdown.tsx
│   ├── profile/
│   │   ├── ExperienceForm.tsx
│   │   ├── SkillsManager.tsx
│   │   └── ProfileHeader.tsx
│   └── plans/
│       ├── PlanCard.tsx
│       └── PlanItemList.tsx
│
├── lib/
│   ├── api.ts             # API client
│   ├── auth.ts            # Auth utilities
│   └── utils.ts           # Helpers
│
├── stores/
│   ├── authStore.ts       # Auth state (Zustand)
│   ├── profileStore.ts    # Profile state
│   └── chatStore.ts       # Chat state
│
└── types/
    └── index.ts           # TypeScript types
```

---

## 11. Local Development Setup

### 11.1 Prerequisites

```bash
# Required
- Node.js 18+ (recommend using nvm)
- Docker Desktop (for Qdrant)
- Git

# Optional
- VS Code with recommended extensions
```

### 11.2 Project Structure

```
personal-rag-agent/
├── apps/
│   ├── backend/           # NestJS API
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/          # Next.js App
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/              # Shared packages (optional)
│   └── shared/            # Shared types, utils
│
├── docker-compose.yml     # Local services (Qdrant only)
├── package.json           # Root package.json
├── turbo.json            # Turborepo config (optional)
└── README.md
```

### 11.3 Docker Compose (Minimal)

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Qdrant Vector Database
  qdrant:
    image: qdrant/qdrant:latest
    container_name: rag-qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped

volumes:
  qdrant_data:
```

### 11.4 Environment Variables

```bash
# apps/backend/.env
NODE_ENV=development

# Database (SQLite for local dev)
DATABASE_URL="file:./data/dev.db"

# Qdrant
QDRANT_URL="http://localhost:6333"

# OpenAI
OPENAI_API_KEY="sk-..."

# JWT
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# File uploads
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760  # 10MB

# Optional: Web search
TAVILY_API_KEY=""
```

```bash
# apps/frontend/.env.local
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 11.5 Quick Start Commands

```bash
# 1. Clone and install
git clone <repo>
cd personal-rag-agent
npm install

# 2. Start Qdrant
docker-compose up -d

# 3. Setup database
cd apps/backend
npx prisma generate
npx prisma db push
cd ../..

# 4. Start development
npm run dev  # Starts both backend and frontend

# Access:
# - Frontend: http://localhost:3000
# - Backend:  http://localhost:3001
# - Qdrant:   http://localhost:6333/dashboard
```

### 11.6 Development Scripts

```json
// Root package.json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd apps/backend && npm run start:dev",
    "dev:frontend": "cd apps/frontend && npm run dev",
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "cd apps/backend && npm run build",
    "build:frontend": "cd apps/frontend && npm run build",
    "db:push": "cd apps/backend && npx prisma db push",
    "db:studio": "cd apps/backend && npx prisma studio",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down"
  }
}
```

---

## 12. Production Deployment (When Ready)

### 12.1 Minimal Production Setup

When you're ready to deploy, here's the simplest path:

```
┌─────────────────────────────────────────────────────────────┐
│                   PRODUCTION (Single VPS)                    │
│                    $6-12/month VPS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Provider Options:                                         │
│   - Hetzner Cloud (€4.5/month for 2 vCPU, 4GB)             │
│   - DigitalOcean ($6/month for 1 vCPU, 1GB)                │
│   - Contabo ($6/month for 4 vCPU, 8GB)                     │
│   - Railway/Render (free tier to start)                     │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │                     Caddy/Nginx                      │  │
│   │              (Reverse Proxy + Auto SSL)             │  │
│   └─────────────────────────────────────────────────────┘  │
│                           │                                 │
│            ┌──────────────┴──────────────┐                 │
│            ▼                             ▼                  │
│   ┌─────────────────┐         ┌─────────────────┐         │
│   │    Frontend     │         │     Backend     │         │
│   │   (Next.js)     │         │    (NestJS)     │         │
│   │   Port 3000     │         │    Port 3001    │         │
│   └─────────────────┘         └─────────────────┘         │
│                                       │                    │
│            ┌──────────────────────────┴─────────┐         │
│            ▼                                    ▼          │
│   ┌─────────────────────┐         ┌─────────────────────┐ │
│   │     PostgreSQL      │         │       Qdrant        │ │
│   │   (Docker or VPS)   │         │      (Docker)       │ │
│   └─────────────────────┘         └─────────────────────┘ │
│                                                             │
│   Storage: Local disk or S3-compatible (Backblaze $0.005/GB)│
└─────────────────────────────────────────────────────────────┘
```

### 12.2 Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # PostgreSQL (production)
  postgres:
    image: postgres:16-alpine
    container_name: rag-postgres
    environment:
      POSTGRES_DB: ragagent
      POSTGRES_USER: ragagent
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  # Qdrant
  qdrant:
    image: qdrant/qdrant:latest
    container_name: rag-qdrant
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped

  # Backend
  backend:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile
    container_name: rag-backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://ragagent:${DB_PASSWORD}@postgres:5432/ragagent
      - QDRANT_URL=http://qdrant:6333
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - qdrant
    restart: unless-stopped

  # Frontend
  frontend:
    build:
      context: ./apps/frontend
      dockerfile: Dockerfile
    container_name: rag-frontend
    environment:
      - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
    restart: unless-stopped

  # Caddy (reverse proxy with auto SSL)
  caddy:
    image: caddy:2-alpine
    container_name: rag-caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

volumes:
  postgres_data:
  qdrant_data:
  caddy_data:
  caddy_config:
```

### 12.3 Caddyfile (Auto SSL)

```
# Caddyfile
yourdomain.com {
    reverse_proxy frontend:3000
}

api.yourdomain.com {
    reverse_proxy backend:3001
}
```

### 12.4 One-Command Deploy

```bash
# On your VPS
git clone <repo>
cd personal-rag-agent

# Create .env file with production values
cp .env.example .env.production
nano .env.production

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose exec backend npx prisma migrate deploy
```

### 12.5 Free/Cheap Alternatives

| Service | Free Tier | Paid |
|---------|-----------|------|
| **Vercel** (Frontend) | Unlimited | - |
| **Railway** | $5 credit/month | $5+ |
| **Render** | 750 hrs/month | $7+ |
| **Fly.io** | 3 shared VMs | $2+ |
| **Supabase** (PostgreSQL) | 500MB | $25+ |
| **Qdrant Cloud** | 1GB free | $25+ |
| **Backblaze B2** (Storage) | 10GB | $0.005/GB |

---

## 13. Build Roadmap

### Phase 1: Foundation (Week 1-2)
```
□ Project Setup
  ├── Initialize monorepo (npm workspaces)
  ├── Setup NestJS backend
  ├── Setup Next.js frontend
  ├── Configure Docker for Qdrant
  └── Setup ESLint, Prettier

□ Database & Auth
  ├── Prisma schema setup
  ├── SQLite configuration
  ├── JWT authentication
  └── User registration/login

□ Basic UI
  ├── Layout components (sidebar, header)
  ├── Auth pages (login, register)
  └── Dashboard skeleton
```

### Phase 2: Core Data (Week 3-4)
```
□ Profile Module
  ├── Education CRUD
  ├── Experience CRUD
  ├── Skills CRUD
  └── Profile API endpoints

□ Profile UI
  ├── Profile overview page
  ├── Experience form/list
  ├── Education form/list
  ├── Skills manager component
  └── Job targets form

□ Plans Module
  ├── Plans CRUD
  ├── Plan items CRUD
  └── Plans UI
```

### Phase 3: Embeddings (Week 5-6)
```
□ Embedding Service
  ├── OpenAI integration
  ├── Text templates
  ├── Chunking logic
  └── Qdrant client

□ Sync Logic
  ├── On-save embedding
  ├── Collection management
  └── Document processing

□ Documents Module
  ├── File upload
  ├── Text extraction (PDF, DOCX)
  ├── Chunk and embed
  └── Document UI
```

### Phase 4: RAG Pipeline (Week 7-8)
```
□ RAG Core
  ├── Intent classification
  ├── Multi-source retrieval
  ├── Context assembly
  └── Token management

□ Chat Integration
  ├── Streaming responses
  ├── Conversation storage
  ├── Chat UI
  └── Message history
```

### Phase 5: Agent Tools (Week 9-10)
```
□ Tool Framework
  ├── Tool registry
  ├── Parameter validation
  ├── Execution engine
  └── Result formatting

□ Implement Tools
  ├── Read tools (profile, skills, etc.)
  ├── Search tools (jobs, documents)
  ├── Write tools (add skill, update plan)
  └── Tool call UI display
```

### Phase 6: Job Intelligence (Week 11-13)
```
□ Scraper Framework
  ├── Pluggable architecture
  ├── Rate limiting
  ├── Job normalization
  └── Error handling

□ Portal Scrapers
  ├── LinkedIn (if feasible)
  ├── Naukri
  ├── Indeed
  ├── Others as needed
  └── Scheduled scraping

□ Scoring Engine
  ├── Score calculations
  ├── Skill matching
  ├── Score storage
  └── Ranked jobs UI

□ Applications Tracker
  ├── Application CRUD
  ├── Status updates
  └── Tracker UI
```

### Phase 7: Polish (Week 14-15)
```
□ Testing
  ├── Unit tests for services
  ├── API integration tests
  ├── Frontend component tests
  └── E2E critical paths

□ UI Polish
  ├── Loading states
  ├── Error handling
  ├── Empty states
  ├── Responsive design
  └── Dark mode (optional)

□ Performance
  ├── API caching
  ├── Query optimization
  ├── Bundle optimization
  └── Lazy loading
```

### Phase 8: Deploy (Week 16)
```
□ Production Prep
  ├── Environment configs
  ├── Docker builds
  ├── Migration scripts
  └── Backup strategy

□ Deploy
  ├── VPS setup
  ├── Docker deployment
  ├── SSL configuration
  └── Monitoring setup

□ Documentation
  ├── README
  ├── API docs
  └── Setup guide
```

---

## 14. Technology Decisions & Rationale

### Backend: NestJS

| Pros | Cons |
|------|------|
| Strong TypeScript | Slight learning curve |
| Modular architecture | More boilerplate than Express |
| Built-in DI | - |
| Native WebSocket | - |
| Great testing support | - |

**Why not Express?** NestJS provides structure that scales better for this size project.

### Database: SQLite → PostgreSQL

| Aspect | SQLite (Dev) | PostgreSQL (Prod) |
|--------|--------------|-------------------|
| Setup | Zero config | Docker or managed |
| Cost | Free | Free-$25/month |
| Performance | Good for single user | Great for scale |
| Features | Basic | Full JSON, arrays |

**Why this approach?** Develop fast locally, swap provider in one env change for production.

### Vector DB: Qdrant

| Pros | Cons |
|------|------|
| Self-hosted (free) | Need to run Docker |
| Excellent filtering | - |
| Great performance | - |
| Simple API | - |
| Active development | - |

**Why not Pinecone?** Qdrant is free and self-hosted. Pinecone is $70+/month.

### Frontend: Next.js 14

| Pros | Cons |
|------|------|
| Server Components | Learning curve for App Router |
| Great DX | - |
| Streaming support | - |
| Huge ecosystem | - |
| Easy deployment | - |

### ORM: Prisma

| Pros | Cons |
|------|------|
| Type-safe queries | Slightly heavier than Drizzle |
| Great migrations | - |
| SQLite + PostgreSQL | - |
| Prisma Studio | - |

### LLM: OpenAI

| Aspect | Decision |
|--------|----------|
| Model | gpt-4o-mini (cheap) or gpt-4o (quality) |
| Embeddings | text-embedding-3-small (cheap, good) |
| Cost | ~$5-20/month for personal use |

**Alternative:** Ollama for local LLM (free, but slower and lower quality)

---

## 15. Cost Breakdown

### Development Phase (Local)
| Item | Cost |
|------|------|
| Hardware | Your existing machine |
| SQLite | Free |
| Qdrant (Docker) | Free |
| Node.js | Free |
| OpenAI API | ~$5-20/month (usage) |
| **Total** | **~$5-20/month** |

### MVP Production
| Item | Cost |
|------|------|
| VPS (Hetzner/Contabo) | $6-12/month |
| Domain | ~$12/year ($1/month) |
| OpenAI API | ~$10-30/month |
| Backblaze B2 (optional) | ~$1/month |
| **Total** | **~$18-44/month** |

### Scale (When Needed)
| Item | Cost |
|------|------|
| Better VPS | $20-40/month |
| Managed PostgreSQL | $15-25/month |
| Qdrant Cloud (optional) | $25/month |
| OpenAI API (higher usage) | $30-100/month |
| **Total** | **~$90-190/month** |

---

## Approval Checklist

Before implementing, confirm:

- [ ] **Local-first approach** works for your development
- [ ] **SQLite for dev** is acceptable
- [ ] **Technology stack** is approved (NestJS, Next.js, Qdrant)
- [ ] **16-week timeline** is realistic for your availability
- [ ] **Cost estimates** align with your budget
- [ ] **Database schema** covers all your needs
- [ ] **Agent tools** are sufficient
- [ ] **Job scoring weights** are acceptable

---

**Ready to start building? Let me know if you want any changes to this plan!**
