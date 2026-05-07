"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { describeCron } from "@/lib/scheduling/cron-helpers";
import {
  buildCronFromPicker,
  parsePickerFromCron,
  type SimpleRepeat,
} from "@/lib/scheduling/schedule-picker-cron";
import type { SchedulePreset } from "@/lib/schemas/schedule";

const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const COMMON_TIMEZONES = [
  "America/Chicago",
  "America/New_York",
  "America/Los_Angeles",
  "America/Denver",
  "Europe/London",
  "Europe/Berlin",
  "UTC",
] as const;

type ScheduleResponse = {
  id: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  preset: SchedulePreset;
  cron_preview: string;
};

type Props = { agentId: string; embedded?: boolean };

export function AgentSchedulePanel({ agentId, embedded = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hasRow, setHasRow] = useState(false);
  const [preset, setPreset] = useState<SchedulePreset>("manual_only");
  const [timezone, setTimezone] = useState("America/Chicago");
  const [enabled, setEnabled] = useState(false);
  const [customCron, setCustomCron] = useState("");
  const [customHour, setCustomHour] = useState(8);
  const [customMinute, setCustomMinute] = useState(0);
  const [customRepeat, setCustomRepeat] = useState<SimpleRepeat>("daily");
  const [customWeekday, setCustomWeekday] = useState(1);
  const [cronPreview, setCronPreview] = useState("");
  const [nextRunAt, setNextRunAt] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [storedCron, setStoredCron] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/schedule`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load schedule");
      const s = data.schedule as ScheduleResponse | null;
      if (s) {
        setHasRow(true);
        setPreset(s.preset);
        setTimezone(s.timezone);
        setEnabled(s.enabled);
        if (s.preset === "custom") {
          const parsed = parsePickerFromCron(s.cron_expression);
          setCustomCron(s.cron_expression);
          if (parsed) {
            setCustomMinute(parsed.minute);
            setCustomHour(parsed.hour);
            setCustomRepeat(parsed.repeat);
            setCustomWeekday(parsed.weekday);
          }
        } else {
          setCustomCron("");
        }
        setCronPreview(s.cron_preview);
        setNextRunAt(s.next_run_at);
        setLastRunAt(s.last_run_at);
        setStoredCron(s.cron_expression);
      } else {
        setHasRow(false);
        setPreset("manual_only");
        setTimezone("America/Chicago");
        setEnabled(false);
        setCustomCron("");
        setCronPreview("");
        setNextRunAt(null);
        setLastRunAt(null);
        setStoredCron("");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const previewCron = useMemo(() => {
    if (preset === "manual_only") {
      return "";
    }
    if (preset === "custom") {
      return customCron.trim();
    }
    const map: Record<string, string> = {
      daily_8am: "0 8 * * *",
      weekdays_8am: "0 8 * * 1-5",
      weekly_monday_8am: "0 8 * * 1",
    };
    return map[preset] ?? "";
  }, [preset, customCron]);

  useEffect(() => {
    if (!previewCron) {
      setCronPreview("");
      return;
    }
    try {
      setCronPreview(describeCron(previewCron));
    } catch {
      setCronPreview(previewCron);
    }
  }, [previewCron]);

  const effectiveEnabled = preset === "manual_only" ? false : enabled;

  const commitPickerCron = (
    minute: number,
    hour: number,
    repeat: SimpleRepeat,
    weekday: number,
  ) => {
    setCustomMinute(minute);
    setCustomHour(hour);
    setCustomRepeat(repeat);
    setCustomWeekday(weekday);
    setCustomCron(buildCronFromPicker(minute, hour, repeat, weekday));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body = {
        preset,
        timezone: timezone.trim() || "America/Chicago",
        enabled: effectiveEnabled,
        custom_cron: preset === "custom" ? customCron.trim() : undefined,
      };
      const res = await fetch(`/api/agents/${agentId}/schedule`, {
        method: hasRow ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      const s = data.schedule as ScheduleResponse;
      setHasRow(true);
      setCronPreview(s.cron_preview);
      setNextRunAt(s.next_run_at);
      setLastRunAt(s.last_run_at);
      setStoredCron(s.cron_expression);
      setMessage("Schedule saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const applyRecommended = async () => {
    setPreset("weekdays_8am");
    setTimezone("America/Chicago");
    setEnabled(true);
    setSaving(true);
    setMessage(null);
    try {
      const body = {
        preset: "weekdays_8am" as const,
        timezone: "America/Chicago",
        enabled: true,
      };
      const res = await fetch(`/api/agents/${agentId}/schedule`, {
        method: hasRow ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      const s = data.schedule as ScheduleResponse;
      setHasRow(true);
      setCronPreview(s.cron_preview);
      setNextRunAt(s.next_run_at);
      setLastRunAt(s.last_run_at);
      setStoredCron(s.cron_expression);
      setMessage("Recommended schedule applied (weekdays 8:00 AM · Chicago).");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!hasRow) return;
    setRemoving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/schedule`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setHasRow(false);
      setPreset("manual_only");
      setEnabled(false);
      setCustomCron("");
      setNextRunAt(null);
      setLastRunAt(null);
      setStoredCron("");
      setMessage("Schedule removed.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setRemoving(false);
    }
  };

  const inner = (
    <>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading schedule…</p>
      ) : (
        <div className="flex flex-col gap-6 text-sm">
          {!hasRow ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50/90 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-violet-950 dark:text-violet-100">
                    Recommended for daily briefings
                  </p>
                  <p className="mt-1 text-xs text-violet-900/80 dark:text-violet-200/90">
                    Weekdays at 8:00 AM · America/Chicago — typical founder morning review.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0"
                  disabled={saving}
                  onClick={() => void applyRecommended()}
                >
                  {saving ? "Applying…" : "Apply"}
                </Button>
              </div>
            </div>
          ) : null}

          <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Automation
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                Turn runs on and pick how often this agent executes.
              </p>
            </div>
            <div className="space-y-4 px-4 py-4">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-0 py-0.5 hover:border-zinc-200 dark:hover:border-zinc-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-400"
                  checked={effectiveEnabled}
                  disabled={preset === "manual_only"}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-200">
                  <span className="font-medium">Schedule enabled</span>
                  <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                    {preset === "manual_only"
                      ? "Choose a preset below to enable automatic runs."
                      : "Agent runs on the schedule below while enabled."}
                  </span>
                </span>
              </label>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500" htmlFor={`preset-${agentId}`}>
                  Preset
                </label>
                <select
                  id={`preset-${agentId}`}
                  className={cn(
                    "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm",
                    "dark:border-zinc-700 dark:bg-zinc-950",
                  )}
                  value={preset}
                  onChange={(e) => {
                    const v = e.target.value as SchedulePreset;
                    setPreset(v);
                    if (v === "manual_only") {
                      setEnabled(false);
                    }
                    if (v === "custom") {
                      const seed =
                        previewCron.trim() ||
                        customCron.trim() ||
                        buildCronFromPicker(0, 8, "daily", 0);
                      const parsed = parsePickerFromCron(seed);
                      if (parsed) {
                        commitPickerCron(
                          parsed.minute,
                          parsed.hour,
                          parsed.repeat,
                          parsed.weekday,
                        );
                      } else {
                        commitPickerCron(0, 8, "daily", 0);
                      }
                    }
                  }}
                >
                  <option value="manual_only">Manual only (no automatic runs)</option>
                  <option value="daily_8am">Daily at 8:00 AM</option>
                  <option value="weekdays_8am">Weekdays at 8:00 AM</option>
                  <option value="weekly_monday_8am">Weekly Monday at 8:00 AM</option>
                  <option value="custom">Custom cron</option>
                </select>
              </div>

              {preset === "custom" ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label
                        className="text-xs font-medium text-zinc-500"
                        htmlFor={`time-${agentId}`}
                      >
                        Run time
                      </label>
                      <input
                        id={`time-${agentId}`}
                        type="time"
                        step={60}
                        className={cn(
                          "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm",
                          "dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100",
                        )}
                        value={`${String(customHour).padStart(2, "0")}:${String(customMinute).padStart(2, "0")}`}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) return;
                          const [hs, ms] = v.split(":").map((x) => Number.parseInt(x, 10));
                          commitPickerCron(
                            Number.isFinite(ms) ? ms : 0,
                            Number.isFinite(hs) ? hs : 8,
                            customRepeat,
                            customWeekday,
                          );
                        }}
                      />
                      <p className="text-[10px] text-zinc-500">
                        Uses your chosen timezone below.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label
                        className="text-xs font-medium text-zinc-500"
                        htmlFor={`repeat-${agentId}`}
                      >
                        Repeat
                      </label>
                      <select
                        id={`repeat-${agentId}`}
                        className={cn(
                          "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm",
                          "dark:border-zinc-700 dark:bg-zinc-950",
                        )}
                        value={customRepeat}
                        onChange={(e) => {
                          const r = e.target.value as SimpleRepeat;
                          commitPickerCron(customMinute, customHour, r, customWeekday);
                        }}
                      >
                        <option value="daily">Every day</option>
                        <option value="weekdays">Monday – Friday</option>
                        <option value="weekly">Once a week</option>
                      </select>
                    </div>
                  </div>
                  {customRepeat === "weekly" ? (
                    <div className="space-y-1.5">
                      <label
                        className="text-xs font-medium text-zinc-500"
                        htmlFor={`dow-${agentId}`}
                      >
                        Day of week
                      </label>
                      <select
                        id={`dow-${agentId}`}
                        className={cn(
                          "h-10 w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 text-sm",
                          "dark:border-zinc-700 dark:bg-zinc-950",
                        )}
                        value={customWeekday}
                        onChange={(e) => {
                          const d = Number.parseInt(e.target.value, 10);
                          commitPickerCron(customMinute, customHour, "weekly", d);
                        }}
                      >
                        {WEEKDAY_OPTIONS.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <details className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/40">
                    <summary className="cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Advanced: cron expression
                    </summary>
                    <div className="mt-3 space-y-1.5 pb-1">
                      <Input
                        id={`cron-${agentId}`}
                        value={customCron}
                        onChange={(e) => {
                          const next = e.target.value;
                          setCustomCron(next);
                          const parsed = parsePickerFromCron(next);
                          if (parsed) {
                            setCustomMinute(parsed.minute);
                            setCustomHour(parsed.hour);
                            setCustomRepeat(parsed.repeat);
                            setCustomWeekday(parsed.weekday);
                          }
                        }}
                        placeholder="0 8 * * *"
                        className="font-mono text-xs"
                      />
                      <p className="text-[10px] text-zinc-500">
                        Edit only if you need a schedule outside daily / weekdays / weekly at one
                        time.
                      </p>
                    </div>
                  </details>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Timezone & summary
              </h3>
            </div>
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <label className="text-xs font-medium text-zinc-500" htmlFor={`tz-${agentId}`}>
                  Timezone (IANA)
                </label>
                <Input
                  id={`tz-${agentId}`}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  list={`tz-list-${agentId}`}
                  placeholder="America/Chicago"
                />
                <datalist id={`tz-list-${agentId}`}>
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz} />
                  ))}
                </datalist>
              </div>
              <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="font-medium text-zinc-600 dark:text-zinc-400">Cron preview</p>
                <p className="mt-1.5 leading-snug text-zinc-800 dark:text-zinc-200">
                  {previewCron || storedCron
                    ? cronPreview || describeCron(previewCron || storedCron)
                    : "—"}
                </p>
                {previewCron || storedCron ? (
                  <p className="mt-2 break-all font-mono text-[10px] text-zinc-500">
                    {previewCron || storedCron}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Run history
              </h3>
            </div>
            <dl className="grid gap-4 px-4 py-4 text-xs sm:grid-cols-2">
              <div className="min-w-0 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/40">
                <dt className="font-medium text-zinc-500">Next run</dt>
                <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                  {nextRunAt ? new Date(nextRunAt).toLocaleString() : "—"}
                </dd>
                <p className="mt-1 text-[10px] text-zinc-400">Stored in UTC on server</p>
              </div>
              <div className="min-w-0 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/40">
                <dt className="font-medium text-zinc-500">Last run</dt>
                <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                  {lastRunAt ? new Date(lastRunAt).toLocaleString() : "—"}
                </dd>
              </div>
            </dl>
          </section>

          <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : "Save schedule"}
              </Button>
              {hasRow ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void remove()}
                  disabled={removing}
                >
                  {removing ? "Removing…" : "Remove schedule"}
                </Button>
              ) : null}
            </div>
            {message ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
            ) : null}
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="text-sm">{inner}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduling</CardTitle>
        <CardDescription>
          Run this agent automatically on a cron. Execution uses the same path as Run now
          (Trigger.dev or inline).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">{inner}</CardContent>
    </Card>
  );
}
