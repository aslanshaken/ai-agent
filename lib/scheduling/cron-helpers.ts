import { CronExpressionParser } from "cron-parser";
import cronstrue from "cronstrue";
import {
  MANUAL_DISABLED_CRON_PLACEHOLDER,
  SCHEDULE_PRESET_CRONS,
  type SchedulePreset,
} from "@/lib/schemas/schedule";

export function validateCronExpression(expression: string): { ok: true } | { ok: false; error: string } {
  const trimmed = expression.trim();
  if (!trimmed) {
    return { ok: false, error: "Cron expression is required" };
  }
  try {
    CronExpressionParser.parse(trimmed, { strict: false });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid cron expression" };
  }
}

export function describeCron(expression: string): string {
  try {
    return cronstrue.toString(expression, { use24HourTimeFormat: false });
  } catch {
    return expression;
  }
}

export function resolveCronForPreset(
  preset: SchedulePreset,
  customCron: string | undefined,
): { cron: string } | { error: string } {
  if (preset === "manual_only") {
    return { cron: MANUAL_DISABLED_CRON_PLACEHOLDER };
  }
  if (preset === "custom") {
    const c = customCron?.trim() ?? "";
    const v = validateCronExpression(c);
    if (!v.ok) {
      return { error: v.error };
    }
    return { cron: c };
  }
  return { cron: SCHEDULE_PRESET_CRONS[preset] };
}

export function inferPresetFromRow(enabled: boolean, cronExpression: string): SchedulePreset {
  if (!enabled) {
    return "manual_only";
  }
  const c = cronExpression.trim();
  for (const [preset, expr] of Object.entries(SCHEDULE_PRESET_CRONS) as [
    keyof typeof SCHEDULE_PRESET_CRONS,
    string,
  ][]) {
    if (c === expr) {
      return preset;
    }
  }
  if (c === MANUAL_DISABLED_CRON_PLACEHOLDER) {
    return "daily_8am";
  }
  return "custom";
}

export function computeNextRunUtc(
  cronExpression: string,
  timeZone: string,
  fromUtc: Date = new Date(),
): Date {
  const iter = CronExpressionParser.parse(cronExpression.trim(), {
    tz: timeZone,
    currentDate: fromUtc,
  });
  return iter.next().toDate();
}

/**
 * Next occurrence strictly after a completed fire (avoids returning the same wall time).
 */
export function computeNextAfterFire(
  cronExpression: string,
  timeZone: string,
  firedAt: Date,
): Date {
  const from = new Date(firedAt.getTime() + 1000);
  return computeNextRunUtc(cronExpression, timeZone, from);
}
