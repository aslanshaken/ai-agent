-- Phase 9: Founder Daily Briefing artifacts + updated template graph

create table if not exists public.daily_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  run_id uuid references public.agent_runs (id) on delete set null,
  title text not null,
  summary text,
  priorities jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists daily_briefings_user_created_idx
  on public.daily_briefings (user_id, created_at desc);

create index if not exists daily_briefings_run_id_idx
  on public.daily_briefings (run_id);

alter table public.daily_briefings enable row level security;

create policy "daily_briefings_all_own" on public.daily_briefings
  for all using (auth.uid () = user_id);

-- Full founder daily briefing template: 3 parallel searches → aggregate → reason → rank → approval → save
update public.agent_templates
set
  default_mission = 'Synthesize market, investor, and talent signals into a ranked daily founder briefing for Synoro.',
  default_nodes = $brief9n$
  [
    {"id":"bd-tr","type":"trigger","position":{"x":200,"y":0},"data":{"label":"Start"}},
    {"id":"bd-ms","type":"search","position":{"x":20,"y":100},"data":{"label":"Market signals","provider":"mock","query":"AI startup market signals workflow automation founder news this week","limit":5}},
    {"id":"bd-si","type":"search","position":{"x":200,"y":100},"data":{"label":"Investor landscape","provider":"mock","query":"Seed and Series A investors B2B workflow automation AI agents 2026","limit":5}},
    {"id":"bd-sc","type":"search","position":{"x":380,"y":100},"data":{"label":"Talent signals","provider":"mock","query":"Hiring senior full-stack AI infrastructure engineers remote US","limit":5}},
    {"id":"bd-ag","type":"aggregate_results","position":{"x":200,"y":240},"data":{"label":"Merge search results"}},
    {"id":"bd-ar","type":"ai_reasoning","position":{"x":200,"y":380},"data":{"label":"Synthesize briefing","instruction":"From the aggregated searches, write a tight synthesis: market pulse, investor themes, talent/hiring signals, and risks. Keep it scannable.","outputFormat":"structured","model":""}},
    {"id":"bd-pr","type":"priority_ranker","position":{"x":200,"y":520},"data":{"label":"Rank priorities","instruction":"Given the synthesis and raw searches, produce ranked priorities and opportunities for the founder today. Be specific.","model":""}},
    {"id":"bd-ap","type":"approval","position":{"x":200,"y":660},"data":{"label":"Review briefing"}},
    {"id":"bd-sv","type":"save_to_db","position":{"x":200,"y":800},"data":{"label":"Save daily briefing","target":"daily_briefings","title":"Founder daily briefing","sourceNodeId":"","tags":"briefing,daily,dashboard"}}
  ]
  $brief9n$::jsonb,
  default_edges = $brief9e$
  [
    {"id":"bd-e1","source":"bd-tr","target":"bd-ms"},
    {"id":"bd-e2","source":"bd-tr","target":"bd-si"},
    {"id":"bd-e3","source":"bd-tr","target":"bd-sc"},
    {"id":"bd-e4","source":"bd-ms","target":"bd-ag"},
    {"id":"bd-e5","source":"bd-si","target":"bd-ag"},
    {"id":"bd-e6","source":"bd-sc","target":"bd-ag"},
    {"id":"bd-e7","source":"bd-ag","target":"bd-ar"},
    {"id":"bd-e8","source":"bd-ar","target":"bd-pr"},
    {"id":"bd-e9","source":"bd-pr","target":"bd-ap"},
    {"id":"bd-e10","source":"bd-ap","target":"bd-sv"}
  ]
  $brief9e$::jsonb,
  tools_summary = 'Search x3 · Aggregate · AI synthesis · Priority rank · Approval · daily_briefings',
  estimated_runtime = '4–10 minutes'
where slug = 'founder-daily-briefing';
