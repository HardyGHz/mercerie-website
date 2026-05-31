# Novusolv Repository Context

This repository contains the core assets, internal tools, and project management files for Novusolv SRL, an AI-driven business automation and operations optimization company.

## 1. Project Overview

### A. Novusolv CRM (`/novusolv-crm`)
- **Purpose:** Internal CRM and lead management application.
- **Stack:** React, Supabase, Tailwind CSS, TypeScript (Vite).
- **Key Functionality:** Manages lead pipelines, call lists, and Supabase database interactions.

### B. Executive Assistant & Research (`/Executive Asisstant`)
- **Purpose:** Central management hub, outreach automation, and sales process management.
- **Projects:**
    - `sales-process`: Definitions of Grand Slam Offer framework and outreach SOPs.

### C. NovuResearch (`/apps/research-backend`, `/apps/research-frontend`)
- **Purpose:** AI-powered "Research OS" for biomedical literature, genomics, and proteomics.
- **Stack:** React 19, FastAPI, Google AI Python SDK.
- **Monorepo location:** `apps/research-backend` and `apps/research-frontend` (migrated from `/Executive Asisstant/projects/NovuResearch` on 2026-05-31).

## 2. Development Conventions

- **Language:** Hungarian is the primary communication language with Hardy (CEO). Technical documentation can be in English.
- **Style:** Concise, direct, no fluff.
- **Rules:** 
    - NO em dashes (—). Use commas.
    - Professional/Decisive tone for external content.
    - Mirror Hardy's mood for internal communication.
- **AI Integration:** Heavy reliance on function calling for tool execution in research workflows.

## 3. Key Commands & Procedures

### Novusolv CRM
- Build/Dev: `npm run dev` (Vite)
- Database: Supabase CLI / migrations in `migration.sql`

### Novu Research
- Backend: `cd apps/research-backend && uvicorn main:app --reload`
- Frontend: `cd apps/research-frontend && npm run dev`
- Agent Logic: Located in `apps/research-backend/agent.py` (Gemini Flash Lite + Tool calling).

## 4. Operational Guidelines

- **Professional Memory (Vault):** The repository uses a dedicated Obsidian Vault (`/vault`) as its long-term memory and strategy hub. 
    - AI agents MUST reference `vault/` for technical solutions, architectural decisions, and project goals.
    - Technical fixes and complex logic changes MUST be documented in `vault/architecture/`.
    - Spontaneous ideas and future plans are buffered in `vault/idea-buffer/`.
- **Agent Orchestration:** For complex engineering tasks, refactoring, or architectural changes, primary agents SHOULD invoke specialized sub-agents (e.g., `generalist`, `codebase_investigator`) to leverage their focused capabilities. This ensures higher quality and more robust implementations.
- **Always confirm before destructive actions:** When modifying source code, if in doubt, ask for permission first.
- **Security:** Never expose Supabase keys or Gemini API keys.
- **Updates:** Update `context/current-priorities.md` when project focus shifts. Log important decisions in `decisions/log.md`.
