# AGENTS.md

# Synoro Founder OS

AI-native founder operating system for automating startup workflows.

This codebase powers a visual AI agent platform where founders create, customize, schedule, and run AI agents that perform operational work such as:

- founder daily briefings
- investor research
- candidate sourcing
- email triage
- startup intelligence
- competitor monitoring
- Telegram summaries
- planning and prioritization

The system is NOT a chatbot product.

The system IS an AI operational workflow platform.

---

# Mission

Build AI agents that reduce operational overhead for founders and startup teams.

The platform should:
- save founders time
- reduce repetitive work
- improve decision-making
- centralize company memory
- automate research and communication workflows

The platform should always prioritize:
- reliability
- explainability
- human approval
- structured outputs
- reusable workflows
- modular architecture

---

# Product Philosophy

We do NOT build:
- generic AI assistants
- entertainment chatbots
- “AI that does everything”

We DO build:
- specialized operational AI agents
- founder workflow automation
- AI Chief of Staff infrastructure
- AI-native business workflows

Every agent must solve a REAL workflow problem.

---

# Core Stack

## Frontend
- Next.js
- TypeScript
- TailwindCSS
- shadcn/ui
- React Flow

## Hosting
- Vercel

## Backend Runtime
- Next.js API routes
- LangGraph
- OpenAI Agents SDK
- Trigger.dev

## Database
- Supabase Postgres
- pgvector

## Auth
- Supabase Auth

## AI Models
- OpenAI models

## Search
- Exa
- Tavily

## Integrations
- Gmail API
- Google Calendar API
- Google Drive API
- Telegram Bot API

## Monitoring
- Sentry
- PostHog

---

# System Philosophy

IMPORTANT:

Do NOT hardcode individual agents in the codebase.

The codebase provides:
- runtime engine
- workflow execution
- node executors
- tool adapters
- schemas
- permissions
- orchestration
- memory services

The database stores:
- agents
- nodes
- edges
- prompts
- schedules
- workflows
- approvals
- memory scopes
- tool configurations

Think of the system like this:

Codebase = operating system  
Database = AI agents/workflows  
UI = workflow builder  
LangGraph = runtime execution engine

---

# System Architecture

Frontend UI:
- visual workflow builder
- dashboard
- approval inbox
- run history
- memory management

Backend:
- API routes
- LangGraph workflows
- agent execution
- tool orchestration
- scheduled jobs

Storage:
- Supabase stores:
  - agents
  - nodes
  - edges
  - runs
  - approvals
  - memory
  - integrations
  - contacts
  - investors
  - candidates

Execution:
- Trigger.dev runs long-running workflows
- LangGraph executes workflows
- OpenAI Agents SDK powers reasoning/tool calling

---

# Core Product Concepts

## Agent
A database-driven AI workflow with:
- mission
- tools
- graph
- schedule
- memory access
- approval rules

Agents are NOT hardcoded.

---

## Node
A visual workflow block.

Examples:
- trigger node
- search node
- AI reasoning node
- condition node
- approval node
- database node
- notification node

---

## Edge
A connection between nodes.

---

## Tool
External integration or internal capability.

Examples:
- web search
- Gmail
- Telegram
- database access
- calendar access

---

## Run
One execution instance of an agent.

---

## Approval
Human review required before risky actions.

---

# Folder Structure

```txt
/app
  /(dashboard)
  /(agents)
  /(runs)
  /(approvals)
  /(settings)

  /api
    /agents
    /runs
    /approvals
    /integrations
    /memory

/components
  /ui
  /agents
  /graph
  /dashboard
  /approvals
  /layout

/lib
  /agents
  /langgraph
  /tools
  /memory
  /db
  /auth
  /integrations
  /utils
  /schemas

/lib/agents
  runtime.ts
  execute-graph.ts
  load-agent.ts
  save-results.ts

/lib/langgraph
  graphs/
  nodes/
  executors/
  workflows/

/lib/tools
  search/
  gmail/
  calendar/
  telegram/
  drive/

/lib/memory
  embeddings.ts
  retrieval.ts
  memory-service.ts

/lib/integrations
  gmail.ts
  telegram.ts
  exa.ts
  tavily.ts

/trigger
  execute-agent.ts
  schedules.ts

/types
/schemas
/prompts