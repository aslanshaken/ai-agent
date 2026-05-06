-- Synoro Founder OS — MVP schema (run in Supabase SQL editor or CLI)

create extension if not exists "pgcrypto";

-- Profiles mirror auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  mission text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  version integer not null default 1,
  config jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (agent_id, version)
);

create table if not exists public.agent_nodes (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.agent_versions (id) on delete cascade,
  react_flow_id text not null,
  type text not null,
  label text,
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint agent_nodes_type_chk check (
    type in (
      'trigger',
      'search',
      'ai_reasoning',
      'condition',
      'approval',
      'save_to_db',
      'notification'
    )
  )
);

create table if not exists public.agent_edges (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.agent_versions (id) on delete cascade,
  react_flow_id text not null,
  source_node text not null,
  target_node text not null,
  source_handle text,
  target_handle text,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  version_id uuid references public.agent_versions (id) on delete set null,
  status text not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  output jsonb,
  error text,
  trigger_run_id text,
  created_at timestamptz not null default now(),
  constraint agent_runs_status_chk check (
    status in ('pending', 'running', 'completed', 'failed')
  )
);

create table if not exists public.agent_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs (id) on delete cascade,
  step_index integer not null,
  node_type text,
  node_id text,
  status text not null default 'completed',
  output jsonb,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  run_id uuid references public.agent_runs (id) on delete cascade,
  title text not null,
  status text not null default 'pending',
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tool_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.company_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scope text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.research_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  result jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- New signup → profile
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.handle_new_user ();

create index if not exists agents_user_id_idx on public.agents (user_id);
create index if not exists agent_versions_agent_id_idx on public.agent_versions (agent_id);
create index if not exists agent_nodes_version_id_idx on public.agent_nodes (version_id);
create index if not exists agent_edges_version_id_idx on public.agent_edges (version_id);
create index if not exists agent_runs_agent_id_idx on public.agent_runs (agent_id);
create index if not exists agent_run_steps_run_id_idx on public.agent_run_steps (run_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.agent_versions enable row level security;
alter table public.agent_nodes enable row level security;
alter table public.agent_edges enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_run_steps enable row level security;
alter table public.approvals enable row level security;
alter table public.tool_connections enable row level security;
alter table public.company_memory enable row level security;
alter table public.research_results enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid () = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid () = id);

create policy "agents_all_own" on public.agents for all using (auth.uid () = user_id);

create policy "agent_versions_all_own" on public.agent_versions for all using (
  exists (
    select 1
    from public.agents a
    where
      a.id = agent_versions.agent_id
      and a.user_id = auth.uid ()
  )
);

create policy "agent_nodes_all_own" on public.agent_nodes for all using (
  exists (
    select 1
    from public.agent_versions v
    join public.agents a on a.id = v.agent_id
    where
      v.id = agent_nodes.version_id
      and a.user_id = auth.uid ()
  )
);

create policy "agent_edges_all_own" on public.agent_edges for all using (
  exists (
    select 1
    from public.agent_versions v
    join public.agents a on a.id = v.agent_id
    where
      v.id = agent_edges.version_id
      and a.user_id = auth.uid ()
  )
);

create policy "agent_runs_all_own" on public.agent_runs for all using (
  exists (
    select 1
    from public.agents a
    where
      a.id = agent_runs.agent_id
      and a.user_id = auth.uid ()
  )
);

create policy "agent_run_steps_all_own" on public.agent_run_steps for all using (
  exists (
    select 1
    from public.agent_runs r
    join public.agents a on a.id = r.agent_id
    where
      r.id = agent_run_steps.run_id
      and a.user_id = auth.uid ()
  )
);

create policy "approvals_all_own" on public.approvals for all using (
  exists (
    select 1
    from public.agents a
    where
      a.id = approvals.agent_id
      and a.user_id = auth.uid ()
  )
);

create policy "tool_connections_all_own" on public.tool_connections for all using (
  auth.uid () = user_id
);

create policy "company_memory_all_own" on public.company_memory for all using (
  auth.uid () = user_id
);

create policy "research_results_all_own" on public.research_results for all using (
  auth.uid () = user_id
);
