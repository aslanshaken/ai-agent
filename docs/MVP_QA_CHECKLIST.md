# Founder OS — MVP manual QA checklist

Use this after deploying migrations and configuring `.env` (Supabase URL + anon/publishable key minimum).

## Auth & routing

- [ ] Visit `/` while **signed out** → marketing/landing loads.
- [ ] Visit `/` while **signed in** → redirects to `/dashboard` (Today).
- [ ] Visit `/dashboard` while **signed out** → redirects to `/login?next=/dashboard`.
- [ ] Sign **in** → lands on `/dashboard` (or `next` if present).
- [ ] Sign **up** with immediate session → lands on `/dashboard`.

## First-run onboarding

- [ ] New account with **no agents, no briefings, no runs** → Today shows **Create your first Founder Daily Briefing agent** card with template CTA.

## Template deep link

- [ ] Open `/agents/new?template=founder-daily-briefing` → wizard jumps to **build** step with Founder Daily Briefing graph and mission preloaded (after templates API loads).

## Agent CRUD

- [ ] **Agents** empty state shows CTAs (Founder Daily Briefing + other templates).
- [ ] Save new agent → redirects to `/agents/[id]`.
- [ ] **Setup progress** checklist updates as you save graph, add schedule, run, approvals, outputs.

## Scheduling

- [ ] On agent detail, **Scheduling** shows **Apply recommended schedule** when no schedule exists.
- [ ] Click apply → weekdays 8:00 AM, `America/Chicago`, enabled; **Save** state reflects row.

## Run now

- [ ] Click **Run now** → button shows **Starting…**, then browser navigates to **`/runs/[id]`** for the new run.
- [ ] Run detail shows **status** badge and **Open agent** when applicable.

## Approvals

- [ ] Run reaches **waiting_for_approval** → run detail shows **Approve / Reject** inline (not only inbox link).
- [ ] **Approve** while on run detail → page **refreshes** in place; run continues or completes.
- [ ] **Reject** → run cancelled / stopped per existing behavior.
- [ ] From **Approvals** inbox, approve still navigates to run when not already on that page.

## Briefing & dashboard

- [ ] Complete flow through **save_to_db → daily_briefings** → latest briefing appears on **Today (`/dashboard`)** with **Source run** when `run_id` exists.
- [ ] **Today** shows latest briefing summary + pillars; **Source run** appears when `run_id` exists.
- [ ] **Activity** run total counts only **your** agents’ runs.

## Tasks

- [ ] **Today** urgent tasks card shows tasks or “You’re clear” when empty.
- [ ] **`create_task`** node creates rows; tasks appear grouped (overdue / today / etc.).

## Research memory

- [ ] **`/memory/research`** lists only **your** `research_results`; empty state has CTAs.
- [ ] Rows link to **run** when `run_id` present.

## Runs list

- [ ] **`/runs`** lists only runs for **your** agents; empty state links to agents / briefing template.

## Approvals inbox

- [ ] Empty state shows CTAs to briefing template and runs.

## Scheduled run (smoke)

- [ ] With Trigger configured: scheduled job enqueues (verify Trigger dashboard if available).
- [ ] Without Trigger: cron path may still record schedule row; execution depends on existing runtime — confirm **last_run** / run rows appear per your deployment.

## Known environment blockers

- **Supabase not configured** → auth and data pages fail or empty; fix env first.
- **Migrations not applied** → templates, tasks, briefings tables missing; run `supabase db push`.
- **Trigger.dev not configured** → runs execute **inline** in the app (`mode: inline`); acceptable for QA.
- **No OpenAI / search keys** → reasoning and search use **mock** outputs; journey still completable.

---

**Pass criteria:** A founder can complete: sign in → Today → template agent → schedule → run → approve → see briefing on Today → optional tasks/research links — without Gmail, Calendar, or Telegram.
