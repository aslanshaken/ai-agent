-- Optional: constrain approval workflow statuses
alter table public.approvals
drop constraint if exists approvals_status_chk;

alter table public.approvals
add constraint approvals_status_chk check (
  status in ('pending', 'approved', 'rejected')
);
