-- Phase 8: agent schedules + run provenance

create table if not exists public.agent_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  agent_id uuid not null references public.agents (id) on delete cascade,
  cron_expression text not null,
  timezone text not null default 'America/Chicago',
  enabled boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_schedules_agent_unique unique (agent_id)
);

create index if not exists agent_schedules_due_idx
  on public.agent_schedules (next_run_at)
  where enabled = true and next_run_at is not null;

alter table public.agent_runs
  add column if not exists source text not null default 'manual';

alter table public.agent_runs
  add column if not exists schedule_id uuid references public.agent_schedules (id) on delete set null;

alter table public.agent_runs
  add column if not exists scheduled_for timestamptz;

alter table public.agent_runs drop constraint if exists agent_runs_source_chk;

alter table public.agent_runs
  add constraint agent_runs_source_chk check (source in ('manual', 'scheduled'));

create unique index if not exists agent_runs_schedule_scheduled_unique
  on public.agent_runs (schedule_id, scheduled_for)
  where schedule_id is not null and scheduled_for is not null;

alter table public.agent_schedules enable row level security;

create policy "agent_schedules_select_own" on public.agent_schedules
  for select using (
    user_id = auth.uid ()
    and exists (
      select 1
      from public.agents a
      where
        a.id = agent_schedules.agent_id
        and a.user_id = auth.uid ()
    )
  );

create policy "agent_schedules_insert_own" on public.agent_schedules
  for insert with check (
    user_id = auth.uid ()
    and exists (
      select 1
      from public.agents a
      where
        a.id = agent_schedules.agent_id
        and a.user_id = auth.uid ()
    )
  );

create policy "agent_schedules_update_own" on public.agent_schedules
  for update using (
    user_id = auth.uid ()
    and exists (
      select 1
      from public.agents a
      where
        a.id = agent_schedules.agent_id
        and a.user_id = auth.uid ()
    )
  );

create policy "agent_schedules_delete_own" on public.agent_schedules
  for delete using (
    user_id = auth.uid ()
    and exists (
      select 1
      from public.agents a
      where
        a.id = agent_schedules.agent_id
        and a.user_id = auth.uid ()
    )
  );
