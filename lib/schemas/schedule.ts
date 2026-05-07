import { z } from "zod";

export const schedulePresetSchema = z.enum([
  "manual_only",
  "daily_8am",
  "weekdays_8am",
  "weekly_monday_8am",
  "custom",
]);

export type SchedulePreset = z.infer<typeof schedulePresetSchema>;

/** Canonical cron strings (cron-parser compatible). Manual preset stores placeholder when disabled. */
export const SCHEDULE_PRESET_CRONS: Record<
  Exclude<SchedulePreset, "manual_only" | "custom">,
  string
> = {
  daily_8am: "0 8 * * *",
  weekdays_8am: "0 8 * * 1-5",
  weekly_monday_8am: "0 8 * * 1",
};

/** Placeholder when preset is manual-only (ignored while disabled). */
export const MANUAL_DISABLED_CRON_PLACEHOLDER = "0 8 * * *";

export const upsertAgentScheduleBodySchema = z
  .object({
    preset: schedulePresetSchema,
    timezone: z.string().min(1).max(120),
    enabled: z.boolean(),
    custom_cron: z.string().max(200).optional(),
  })
  .refine((val) => val.preset !== "custom" || !!val.custom_cron?.trim(), {
    message: "custom_cron is required when preset is custom",
    path: ["custom_cron"],
  });

export type UpsertAgentScheduleBody = z.infer<typeof upsertAgentScheduleBodySchema>;
