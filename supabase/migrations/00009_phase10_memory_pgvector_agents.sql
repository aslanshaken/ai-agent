-- Phase 10: pgvector memory + agent governance columns + expanded node type constraint

create extension if not exists vector;

alter table public.company_memory
  add column if not exists category text;

alter table public.company_memory
  add column if not exists title text;

alter table public.company_memory
  add column if not exists content_json jsonb not null default '{}'::jsonb;

alter table public.company_memory
  add column if not exists embedding vector (1536);

alter table public.company_memory
  add column if not exists source text;

alter table public.company_memory
  add column if not exists updated_at timestamptz not null default now();

update public.company_memory
set
  category = coalesce(category, scope, 'company_context'),
  title = coalesce(
    nullif(trim(coalesce(title, '')), ''),
    left(coalesce(content, ''), 120),
    'Memory entry'
  ),
  content_json = case
    when content_json is null or content_json = '{}'::jsonb
      then jsonb_build_object('text', coalesce(content, ''))
    else content_json
  end;

alter table public.agents
  add column if not exists memory_categories text[] not null default array[
    'company_context',
    'research_history',
    'competitors',
    'investor_preferences',
    'candidate_preferences'
  ]::text[];

alter table public.agents
  add column if not exists permission_profile jsonb not null default '{"risk_level":"medium"}'::jsonb;

-- Required params first; params with defaults must come last (PostgreSQL rule).
create or replace function public.match_company_memory (
  query_embedding vector (1536),
  filter_user_id uuid,
  match_count int default 8,
  filter_categories text[] default null
)
returns table (
  id uuid,
  title text,
  category text,
  content_json jsonb,
  similarity float
)
language sql
stable
parallel safe
as $$
  select
    cm.id,
    cm.title,
    cm.category,
    cm.content_json,
    (1::float - (cm.embedding <=> query_embedding))::float as similarity
  from public.company_memory cm
  where
    cm.user_id = filter_user_id
    and cm.embedding is not null
    and (
      filter_categories is null
      or cm.category = any (filter_categories)
    )
  order by cm.embedding <=> query_embedding
  limit greatest (1, least (match_count, 32));
$$;

alter table public.agent_nodes
drop constraint if exists agent_nodes_type_chk;

alter table public.agent_nodes
add constraint agent_nodes_type_chk check (
  type in (
    'trigger',
    'search',
    'aggregate_results',
    'ai_reasoning',
    'priority_ranker',
    'condition',
    'approval',
    'save_to_db',
    'notification',
    'create_task',
    'save_investor',
    'save_candidate',
    'save_company'
  )
);
