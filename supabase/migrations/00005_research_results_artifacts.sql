-- Phase 6: structured research artifacts from save_to_db → research_results

alter table public.research_results
add column if not exists agent_id uuid references public.agents (id) on delete set null;

alter table public.research_results
add column if not exists run_id uuid references public.agent_runs (id) on delete set null;

alter table public.research_results
add column if not exists title text;

alter table public.research_results
add column if not exists summary text;

alter table public.research_results
add column if not exists content jsonb not null default '{}'::jsonb;

alter table public.research_results
add column if not exists tags text[] not null default '{}'::text[];

alter table public.research_results
add column if not exists source_node_id text;

create index if not exists research_results_user_created_idx on public.research_results (user_id, created_at desc);

create index if not exists research_results_agent_id_idx on public.research_results (agent_id);

create index if not exists research_results_run_id_idx on public.research_results (run_id);
