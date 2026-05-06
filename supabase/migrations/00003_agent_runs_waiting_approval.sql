-- Allow runs to pause on approval nodes (mock / future resume).
alter table public.agent_runs
drop constraint if exists agent_runs_status_chk;

alter table public.agent_runs
add constraint agent_runs_status_chk check (
  status in (
    'pending',
    'running',
    'completed',
    'failed',
    'waiting_for_approval'
  )
);
