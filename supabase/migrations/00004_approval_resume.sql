-- Phase 5: approval resume — cancelled runs + approvals.updated_at

alter table public.agent_runs
drop constraint if exists agent_runs_status_chk;

alter table public.agent_runs
add constraint agent_runs_status_chk check (
  status in (
    'pending',
    'running',
    'completed',
    'failed',
    'waiting_for_approval',
    'cancelled'
  )
);

alter table public.approvals
add column if not exists updated_at timestamptz not null default now();
