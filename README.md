# Career AI - Personal RAG-based AI Agent Platform

A personal AI-powered career and life management platform that uses RAG (Retrieval-Augmented Generation) to provide intelligent assistance based on your profile, documents, and career goals.

## Features

- **Personal Knowledge System**: Store and manage your education, experience, skills, plans, and documents
- **RAG-powered AI Chat**: Get personalized career advice based on your profile and uploaded documents
- **Job Matching**: Intelligent job scoring and ranking based on your profile fit
- **Application Tracking**: Track your job applications through the entire process
- **Document Analysis**: Upload resumes and documents for AI-powered analysis

## Quick Start (TL;DR)

If you already have Node.js 18+, Docker, and an OpenAI API key:

```bash
# 1. Install dependencies
npm install

# 2. Setup environment (copy and edit with your OpenAI key)
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env and set OPENAI_API_KEY="sk-your-key"

# 3. Start Qdrant (vector database)
npm run docker:up

# 4. Initialize database
npm run db:generate && npm run db:push

# 5. Start the app
npm run dev

# 6. Open http://localhost:3000
```

For detailed instructions, see the [Complete Setup Guide](#complete-setup-guide-first-time-installation) below.

---

## Tech Stack

### Backend
- **NestJS** - Node.js framework
- **Prisma** - ORM with SQLite (dev) / PostgreSQL (prod)
- **Qdrant** - Vector database for semantic search
- **OpenAI** - LLM and embeddings
- **JWT** - Authentication

### Frontend
- **Next.js 14** - React framework with App Router
- **Tailwind CSS** - Styling
- **Radix UI** - UI primitives
- **TanStack Query** - Data fetching
- **Zustand** - State management

---

## Complete Setup Guide (First Time Installation)

### Prerequisites

Before you begin, ensure you have the following installed on your machine:

| Tool | Version | Download Link |
|------|---------|---------------|
| Node.js | 18.0.0 or higher | [nodejs.org](https://nodejs.org/) |
| Docker Desktop | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Git | Latest | [git-scm.com](https://git-scm.com/downloads) |
| OpenAI API Key | - | [platform.openai.com](https://platform.openai.com/api-keys) |

---

### Step 1: Install Node.js

1. Download Node.js from [nodejs.org](https://nodejs.org/) (LTS version recommended)
2. Run the installer and follow the prompts
3. Verify installation by opening a terminal and running:
   ```bash
   node --version
   # Should show v18.x.x or higher

   npm --version
   # Should show 9.x.x or higher
   ```

---

### Step 2: Install Docker Desktop

Docker is required to run the Qdrant vector database.

#### Windows
1. Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)
2. Run the installer
3. **Important**: Enable WSL 2 when prompted (Windows Subsystem for Linux)
4. Restart your computer after installation
5. Start Docker Desktop from the Start menu
6. Wait for Docker to fully start (the whale icon in the system tray should be steady, not animated)
7. Verify installation:
   ```bash
   docker --version
   # Should show Docker version 24.x.x or higher

   docker-compose --version
   # Should show Docker Compose version 2.x.x or higher
   ```

#### macOS
1. Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)
2. Open the `.dmg` file and drag Docker to Applications
3. Open Docker from Applications
4. Grant necessary permissions when prompted
5. Wait for Docker to fully start

#### Linux (Ubuntu/Debian)
```bash
# Update package index
sudo apt-get update

# Install Docker
sudo apt-get install docker.io docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Log out and log back in for group changes to take effect
```

---

### Step 3: Get an OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section (or go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys))
4. Click **"Create new secret key"**
5. Give it a name (e.g., "Career AI")
6. Copy the key immediately (you won't be able to see it again!)
7. **Important**: Add billing/credits to your OpenAI account if you haven't already

> **Note**: The API key starts with `sk-` (older format) or `sk-proj-` (newer project-based format)

---

### Step 4: Clone and Install the Project

```bash
# Clone the repository (if you haven't already)
git clone <repository-url>
cd customRAGAIAgentForJOB

# Install all dependencies (this installs both frontend and backend)
npm install
```

This will install:
- Root workspace dependencies
- Backend dependencies (`apps/backend`)
- Frontend dependencies (`apps/frontend`)

---

### Step 5: Configure Environment Variables

#### Backend Environment

1. Create the `.env` file in the backend directory:

   **Windows (Command Prompt):**
   ```cmd
   copy apps\backend\.env.example apps\backend\.env
   ```

   **Windows (PowerShell) / macOS / Linux:**
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```

2. Open `apps/backend/.env` in a text editor and update the following:

   ```env
   NODE_ENV=development

   # Database (SQLite for development - no changes needed)
   DATABASE_URL="file:./prisma/data/dev.db"

   # Qdrant Vector Database (no changes needed for local development)
   QDRANT_URL="http://localhost:6333"

   # OpenAI API - REPLACE WITH YOUR API KEY
   OPENAI_API_KEY="sk-your-actual-openai-api-key-here"

   # JWT Authentication - Change this to a random string
   JWT_SECRET="change-this-to-a-random-secure-string-at-least-32-characters"
   JWT_EXPIRES_IN="7d"

   # File Uploads (no changes needed)
   UPLOAD_DIR="./uploads"
   MAX_FILE_SIZE=10485760

   # Frontend URL for CORS (no changes needed for local development)
   FRONTEND_URL="http://localhost:3000"
   ```

   > **Important**: Replace `sk-your-actual-openai-api-key-here` with your actual OpenAI API key!

---

### Step 6: Start Qdrant (Vector Database)

Qdrant is used for semantic search and vector embeddings.

```bash
# Start Qdrant using Docker Compose
npm run docker:up

# Or alternatively:
docker-compose up -d
```

Verify Qdrant is running:
- Open [http://localhost:6333/dashboard](http://localhost:6333/dashboard) in your browser
- You should see the Qdrant dashboard

> **Troubleshooting**: If Qdrant doesn't start, make sure Docker Desktop is running first!

---

### Step 7: Initialize the Database

```bash
# Generate Prisma client
npm run db:generate

# Create database tables
npm run db:push
```

This creates:
- SQLite database file at `apps/backend/prisma/data/dev.db`
- All required tables (users, skills, experience, jobs, etc.)

---

### Step 8: Start the Application

You have two options to start the application:

#### Option A: Start Both Services Together (Recommended)
```bash
npm run dev
```
This starts both backend and frontend concurrently.

#### Option B: Start Services Separately (for debugging)

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

---

### Step 9: Access the Application

Once both services are running, open your browser:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | [http://localhost:3000](http://localhost:3000) | Main application UI |
| **Backend API** | [http://localhost:3001](http://localhost:3001) | REST API |
| **API Docs** | [http://localhost:3001/api/docs](http://localhost:3001/api/docs) | Swagger documentation |
| **Qdrant Dashboard** | [http://localhost:6333/dashboard](http://localhost:6333/dashboard) | Vector database UI |

---

### Step 10: Create Your Account

1. Go to [http://localhost:3000](http://localhost:3000)
2. Click **"Register"** or **"Sign Up"**
3. Fill in your details:
   - Full Name
   - Email
   - Password
4. Click **Register**
5. You'll be logged in automatically and redirected to the dashboard

---

## Using the Application

### Dashboard
The dashboard provides an overview of your profile completeness, recent activity, and quick access to all features.

### Profile Setup
1. Navigate to **Profile** from the sidebar
2. Fill in your personal information:
   - Name, email, phone
   - Location and job preferences
   - Target job titles and salary expectations
3. Add your **Skills** with proficiency levels
4. Add your **Work Experience** with descriptions
5. Add your **Education** history

### Jobs - Add, Edit, Score & Track
1. Navigate to **Jobs** from the sidebar
2. Click **"+ Add Job"** to manually add a job listing
3. Fill in job details:
   - Job title and company (required)
   - Location, salary range, employment type
   - Job description and requirements
   - Required skills
   - Link to original posting
4. Click **"Add Job"** to save
5. Select a job to view details
6. Use the action buttons:
   - **Score Job** - Calculate match score against your profile
   - **Apply** - Mark job as applied (tracks in Applications)
   - **Edit** - Modify job details
   - **Delete** - Remove the job
7. Click **"Score All"** to score all jobs at once

### Documents
1. Navigate to **Documents** from the sidebar
2. Upload your resume, cover letters, or other documents
3. Documents are analyzed and used by the AI chat for personalized advice

### Chat with AI
1. Navigate to **Chat** from the sidebar
2. Ask questions about your career, get resume feedback, or interview prep
3. The AI uses your profile, skills, experience, and documents to give personalized answers
4. Example prompts:
   - "Review my experience and suggest improvements"
   - "What skills should I learn for a senior developer role?"
   - "Help me prepare for a technical interview"

### Applications
1. Navigate to **Applications** from the sidebar
2. Track all jobs you've applied to
3. Update application status as you progress

### Plans
1. Navigate to **Plans** from the sidebar
2. Create career goals and action plans
3. Track progress on your objectives

---

## Quick Reference Commands

```bash
# Start everything (Qdrant + Backend + Frontend)
npm run docker:up && npm run dev

# Stop Qdrant
npm run docker:down

# View database in Prisma Studio
npm run db:studio

# Build for production
npm run build

# Clean all dependencies and build files
npm run clean
```

---

## Project Structure

```
customRAGAIAgentForJOB/
├── apps/
│   ├── backend/           # NestJS API
│   │   ├── prisma/        # Database schema & migrations
│   │   │   └── data/      # SQLite database file (created after db:push)
│   │   ├── src/
│   │   │   ├── auth/      # Authentication (JWT)
│   │   │   ├── chat/      # AI chat & RAG
│   │   │   ├── embeddings/# Vector embeddings
│   │   │   ├── profile/   # User profile
│   │   │   ├── skills/    # Skills management
│   │   │   ├── experience/# Work experience
│   │   │   ├── education/ # Education history
│   │   │   ├── jobs/      # Job listings & scoring
│   │   │   ├── applications/# Job applications
│   │   │   ├── plans/     # Career/life plans
│   │   │   └── documents/ # Document uploads
│   │   ├── uploads/       # Uploaded files (created automatically)
│   │   └── .env           # Environment variables (create from .env.example)
│   │
│   └── frontend/          # Next.js UI
│       └── src/
│           ├── app/       # Pages (App Router)
│           ├── components/# React components
│           ├── lib/       # Utilities & API client
│           └── stores/    # Zustand stores
│
├── docker-compose.yml     # Qdrant service
├── package.json           # Monorepo config
└── README.md              # This file
```

---

## Troubleshooting

### Common Issues

#### 1. "Docker is not running"
**Error**: `Cannot connect to the Docker daemon`

**Solution**:
- Make sure Docker Desktop is installed and running
- On Windows, check the system tray for the Docker whale icon
- Try restarting Docker Desktop

#### 2. "Port 3000/3001/6333 is already in use"
**Error**: `EADDRINUSE: address already in use`

**Solution**:
```bash
# Windows - Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

#### 3. "OpenAI API key is invalid"
**Error**: `401 Unauthorized` or `Invalid API key`

**Solution**:
- Double-check your API key in `apps/backend/.env`
- Ensure there are no extra spaces or quotes around the key
- Verify you have credits/billing set up on OpenAI

#### 4. "Qdrant connection refused"
**Error**: `ECONNREFUSED 127.0.0.1:6333`

**Solution**:
```bash
# Check if Qdrant container is running
docker ps

# Restart Qdrant
npm run docker:down
npm run docker:up
```

#### 5. "Database does not exist"
**Error**: `Database file not found`

**Solution**:
```bash
# Re-run database setup
npm run db:generate
npm run db:push
```

#### 6. "Module not found" errors
**Error**: `Cannot find module 'xxx'`

**Solution**:
```bash
# Clean and reinstall dependencies
npm run clean
npm install
```

#### 7. Chat returns "Sorry, an error occurred"
**Possible causes**:
- OpenAI API key not set or invalid
- Qdrant not running
- Backend not running

**Check the backend console for actual error messages.**

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Profile
- `GET /api/profile` - Get user profile
- `PATCH /api/profile` - Update profile

### Skills
- `GET /api/skills` - List skills
- `POST /api/skills` - Add skill
- `PATCH /api/skills/:id` - Update skill
- `DELETE /api/skills/:id` - Delete skill

### Experience
- `GET /api/experience` - List experiences
- `POST /api/experience` - Add experience
- `PATCH /api/experience/:id` - Update experience
- `DELETE /api/experience/:id` - Delete experience

### Education
- `GET /api/education` - List education
- `POST /api/education` - Add education
- `PATCH /api/education/:id` - Update education
- `DELETE /api/education/:id` - Delete education

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents/upload` - Upload document
- `DELETE /api/documents/:id` - Delete document

### Jobs
- `GET /api/jobs` - List jobs
- `GET /api/jobs/:id` - Get a single job
- `GET /api/jobs/ranked` - Get ranked jobs
- `POST /api/jobs` - Create a new job
- `PATCH /api/jobs/:id` - Update a job
- `DELETE /api/jobs/:id` - Delete a job
- `POST /api/jobs/score` - Score jobs against profile

### Chat
- `POST /api/chat` - Send chat message (streaming SSE)
- `GET /api/chat/conversations` - List conversations
- `GET /api/chat/conversations/:id` - Get conversation with messages
- `DELETE /api/chat/conversations/:id` - Delete conversation

---

## Job Scoring Algorithm

Jobs are scored on 5 weighted components:
- **Semantic Match (30%)**: Vector similarity between your profile and job description
- **Skill Match (30%)**: Percentage of required skills you have
- **Experience Match (20%)**: Years of experience alignment
- **Salary Match (10%)**: Salary expectations alignment
- **Location Match (10%)**: Location preference alignment

---

## Production Deployment

### Environment Variables for Production

```env
# Database (Use PostgreSQL in production)
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Auth
JWT_SECRET="generate-a-secure-random-string-at-least-64-characters"
JWT_EXPIRES_IN="7d"

# OpenAI
OPENAI_API_KEY="sk-..."

# Qdrant (Use Qdrant Cloud in production)
QDRANT_URL="https://your-cluster.qdrant.io"
QDRANT_API_KEY="your-qdrant-api-key"

# Frontend URL
FRONTEND_URL="https://yourdomain.com"
```

### Estimated Monthly Costs

**Development**: $0-20/month
- SQLite: Free
- Qdrant Docker: Free
- OpenAI: ~$5-20 depending on usage

**Production MVP**: $18-44/month
- Railway/Render: $5-10
- Qdrant Cloud Free Tier: $0
- PostgreSQL (Supabase free): $0
- OpenAI: $10-30
- Domain: $1-2

---

## Development Tips

### View Database Content
```bash
npm run db:studio
```
Opens Prisma Studio at [http://localhost:5555](http://localhost:5555)

### Reset Database
```bash
# Delete the database file
rm apps/backend/prisma/data/dev.db

# Recreate
npm run db:push
```

### View Backend Logs
Backend logs are written to:
- Console (development)
- `apps/backend/logs/` directory (error and combined logs)

---

## License

MIT
