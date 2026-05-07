-- Phase 14: approval metadata
-- Phase 15: tasks
-- Phase 16: CRM tables
-- Phase 18: run metrics

alter table public.approvals
  add column if not exists category text;

alter table public.approvals
  add column if not exists reviewer_note text;

alter table public.approvals
  add column if not exists reject_reason text;

alter table public.approvals
  add column if not exists edited_payload jsonb;

-- Tasks (Phase 15)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  agent_id uuid references public.agents (id) on delete set null,
  run_id uuid references public.agent_runs (id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'medium',
  status text not null default 'pending',
  due_date timestamptz,
  source_node_id text,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint tasks_priority_chk check (
    priority in ('low', 'medium', 'high')
  ),
  constraint tasks_status_chk check (
    status in ('pending', 'in_progress', 'completed', 'cancelled')
  )
);

create index if not exists tasks_user_status_idx on public.tasks (user_id, status);

alter table public.tasks enable row level security;

create policy "tasks_all_own" on public.tasks for all using (auth.uid () = user_id);

-- Investors / candidates / companies (Phase 16)
create table if not exists public.investors (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  fund text,
  focus text,
  stage text,
  location text,
  linkedin_url text,
  website text,
  score numeric,
  reason text,
  status text not null default 'new',
  source_run_id uuid references public.agent_runs (id) on delete set null,
  created_at timestamptz not null default now ()
);

create index if not exists investors_user_created_idx on public.investors (user_id, created_at desc);

alter table public.investors enable row level security;

create policy "investors_all_own" on public.investors for all using (auth.uid () = user_id);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  role text,
  skills text,
  location text,
  linkedin_url text,
  github_url text,
  score numeric,
  reason text,
  status text not null default 'new',
  source_run_id uuid references public.agent_runs (id) on delete set null,
  created_at timestamptz not null default now ()
);

create index if not exists candidates_user_created_idx on public.candidates (user_id, created_at desc);

alter table public.candidates enable row level security;

create policy "candidates_all_own" on public.candidates for all using (auth.uid () = user_id);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  industry text,
  website text,
  description text,
  score numeric,
  notes text,
  source_run_id uuid references public.agent_runs (id) on delete set null,
  created_at timestamptz not null default now ()
);

create index if not exists companies_user_created_idx on public.companies (user_id, created_at desc);

alter table public.companies enable row level security;

create policy "companies_all_own" on public.companies for all using (auth.uid () = user_id);

-- Run metrics (Phase 18)
create table if not exists public.agent_run_metrics (
  run_id uuid primary key references public.agent_runs (id) on delete cascade,
  duration_ms integer,
  total_tokens integer,
  total_cost numeric,
  provider_breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now ()
);

alter table public.agent_run_metrics enable row level security;

create policy "agent_run_metrics_select_own" on public.agent_run_metrics for select using (
  exists (
    select 1
    from public.agent_runs r
    join public.agents a on a.id = r.agent_id
    where
      r.id = agent_run_metrics.run_id
      and a.user_id = auth.uid ()
  )
);
