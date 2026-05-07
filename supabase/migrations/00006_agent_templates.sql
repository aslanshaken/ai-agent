-- Phase 7: agent templates (starter graph blueprints, global catalog)

create table if not exists public.agent_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text,
  tags text[] not null default '{}'::text[],
  default_mission text,
  default_nodes jsonb not null default '[]'::jsonb,
  default_edges jsonb not null default '[]'::jsonb,
  default_schedule jsonb not null default '{}'::jsonb,
  estimated_runtime text,
  tools_summary text,
  schedule_hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_templates_category_idx on public.agent_templates (category);

alter table public.agent_templates enable row level security;

create policy "agent_templates_select_authenticated"
on public.agent_templates for select to authenticated using (true);

-- Seed: investor research (trigger -> search -> ai_reasoning -> approval -> save_to_db)
insert into public.agent_templates (
  slug, name, description, category, tags, default_mission,
  default_nodes, default_edges, default_schedule,
  estimated_runtime, tools_summary, schedule_hint
) values (
  'investor-research',
  'Investor Research',
  'Find relevant investors, score fit with AI, approve before saving to your research library.',
  'fundraising',
  array['investors', 'research', 'approval'],
  'Identify and prioritize seed-stage AI investors relevant to B2B workflow automation (Synoro).',
  $inv_n$[{"id":"inv-n-tr","type":"trigger","position":{"x":180,"y":0},"data":{"label":"Trigger"}},{"id":"inv-n-s","type":"search","position":{"x":160,"y":120},"data":{"label":"Search investors","provider":"mock","query":"Top seed AI investors for B2B workflow automation startups","limit":5}},{"id":"inv-n-ar","type":"ai_reasoning","position":{"x":140,"y":260},"data":{"label":"Score fit","instruction":"Score investors from 1-10 based on relevance for Synoro. Return a ranked list with rationale.","outputFormat":"structured","model":""}},{"id":"inv-n-ap","type":"approval","position":{"x":180,"y":400},"data":{"label":"Human review"}},{"id":"inv-n-sv","type":"save_to_db","position":{"x":140,"y":540},"data":{"label":"Save to research","target":"research_results","title":"Investor research snapshot","sourceNodeId":"","tags":"investor,seed,ai,b2b"}}]$inv_n$::jsonb,
  $inv_e$[{"id":"inv-e1","source":"inv-n-tr","target":"inv-n-s"},{"id":"inv-e2","source":"inv-n-s","target":"inv-n-ar"},{"id":"inv-e3","source":"inv-n-ar","target":"inv-n-ap"},{"id":"inv-e4","source":"inv-n-ap","target":"inv-n-sv"}]$inv_e$::jsonb,
  '{"suggestion":"Run weekly after you update your pitch deck."}'::jsonb,
  '2-6 minutes',
  'Web search · AI reasoning · Human approval · research_results',
  'Optional: every Monday 8:00 after market open (set schedule in Phase 8).'
) on conflict (slug) do nothing;

insert into public.agent_templates (
  slug, name, description, category, tags, default_mission,
  default_nodes, default_edges, default_schedule,
  estimated_runtime, tools_summary, schedule_hint
) values (
  'candidate-sourcing',
  'Candidate Sourcing',
  'Search for engineering talent, summarize profiles, approve, then save structured notes.',
  'hiring',
  array['candidates', 'research', 'approval'],
  'Source senior full-stack engineers with AI infra experience for a fast-moving startup.',
  $cand_n$[{"id":"cand-n-tr","type":"trigger","position":{"x":180,"y":0},"data":{"label":"Trigger"}},{"id":"cand-n-s","type":"search","position":{"x":160,"y":120},"data":{"label":"Search candidates","provider":"mock","query":"Senior full-stack engineers AI infrastructure TypeScript remote US hiring 2026","limit":6}},{"id":"cand-n-ar","type":"ai_reasoning","position":{"x":140,"y":260},"data":{"label":"Rank fit","instruction":"Rank candidates 1-10 for our stack (Next.js, Postgres, AI agents). Note years of experience and standout projects.","outputFormat":"structured","model":""}},{"id":"cand-n-ap","type":"approval","position":{"x":180,"y":400},"data":{"label":"Human review"}},{"id":"cand-n-sv","type":"save_to_db","position":{"x":140,"y":540},"data":{"label":"Save shortlist","target":"research_results","title":"Candidate sourcing run","sourceNodeId":"","tags":"candidate,engineering,full-stack"}}]$cand_n$::jsonb,
  $cand_e$[{"id":"cand-e1","source":"cand-n-tr","target":"cand-n-s"},{"id":"cand-e2","source":"cand-n-s","target":"cand-n-ar"},{"id":"cand-e3","source":"cand-n-ar","target":"cand-n-ap"},{"id":"cand-e4","source":"cand-n-ap","target":"cand-n-sv"}]$cand_e$::jsonb,
  '{"suggestion":"Run when you open a new role."}'::jsonb,
  '2-6 minutes',
  'Web search · AI reasoning · Human approval · research_results',
  'Optional: twice weekly while hiring is active.'
) on conflict (slug) do nothing;

insert into public.agent_templates (
  slug, name, description, category, tags, default_mission,
  default_nodes, default_edges, default_schedule,
  estimated_runtime, tools_summary, schedule_hint
) values (
  'founder-daily-briefing',
  'Founder Daily Briefing',
  'One search pass for market and priority signals, AI daily brief, approve, save for your dashboard.',
  'operations',
  array['briefing', 'daily', 'priorities'],
  'Summarize what matters today for the founder: priorities, market signals, and follow-ups.',
  $brief_n$[{"id":"brief-n-tr","type":"trigger","position":{"x":180,"y":0},"data":{"label":"Trigger"}},{"id":"brief-n-s","type":"search","position":{"x":160,"y":120},"data":{"label":"Market signals","provider":"mock","query":"Startup news AI agents workflow automation founder priorities week of May 2026","limit":5}},{"id":"brief-n-ar","type":"ai_reasoning","position":{"x":140,"y":260},"data":{"label":"Daily brief","instruction":"Produce a founder daily briefing: top priorities, research insights, risks, and suggested next actions as bullet lists.","outputFormat":"action_items","model":""}},{"id":"brief-n-ap","type":"approval","position":{"x":180,"y":400},"data":{"label":"Human review"}},{"id":"brief-n-sv","type":"save_to_db","position":{"x":140,"y":540},"data":{"label":"Save briefing","target":"research_results","title":"Founder daily briefing","sourceNodeId":"","tags":"briefing,daily,priorities"}}]$brief_n$::jsonb,
  $brief_e$[{"id":"brief-e1","source":"brief-n-tr","target":"brief-n-s"},{"id":"brief-e2","source":"brief-n-s","target":"brief-n-ar"},{"id":"brief-e3","source":"brief-n-ar","target":"brief-n-ap"},{"id":"brief-e4","source":"brief-n-ap","target":"brief-n-sv"}]$brief_e$::jsonb,
  '{"suggestion":"Run every weekday morning before standup."}'::jsonb,
  '2-5 minutes',
  'Web search · AI reasoning · Human approval · research_results',
  'Optional: weekdays 7:30 AM in your timezone (Phase 8).'
) on conflict (slug) do nothing;

insert into public.agent_templates (
  slug, name, description, category, tags, default_mission,
  default_nodes, default_edges, default_schedule,
  estimated_runtime, tools_summary, schedule_hint
) values (
  'startup-intelligence',
  'Startup Intelligence',
  'Track competitors and market moves; AI synthesizes; approve; save intel.',
  'strategy',
  array['competitors', 'market', 'intel'],
  'Monitor competitive landscape and startup news relevant to our category and ICP.',
  $intel_n$[{"id":"intel-n-tr","type":"trigger","position":{"x":180,"y":0},"data":{"label":"Trigger"}},{"id":"intel-n-s","type":"search","position":{"x":160,"y":120},"data":{"label":"Competitive scan","provider":"mock","query":"B2B workflow automation startups competitors funding product launches 2026","limit":6}},{"id":"intel-n-ar","type":"ai_reasoning","position":{"x":140,"y":260},"data":{"label":"Synthesize intel","instruction":"Summarize competitive moves and rate strategic threat 1-5 with rationale and watchlist companies.","outputFormat":"structured","model":""}},{"id":"intel-n-ap","type":"approval","position":{"x":180,"y":400},"data":{"label":"Human review"}},{"id":"intel-n-sv","type":"save_to_db","position":{"x":140,"y":540},"data":{"label":"Save intel","target":"research_results","title":"Startup intelligence digest","sourceNodeId":"","tags":"competitor,intelligence,market"}}]$intel_n$::jsonb,
  $intel_e$[{"id":"intel-e1","source":"intel-n-tr","target":"intel-n-s"},{"id":"intel-e2","source":"intel-n-s","target":"intel-n-ar"},{"id":"intel-e3","source":"intel-n-ar","target":"intel-n-ap"},{"id":"intel-e4","source":"intel-n-ap","target":"intel-n-sv"}]$intel_e$::jsonb,
  '{"suggestion":"Run weekly for board prep."}'::jsonb,
  '2-6 minutes',
  'Web search · AI reasoning · Human approval · research_results',
  'Optional: Sunday evening weekly digest.'
) on conflict (slug) do nothing;
