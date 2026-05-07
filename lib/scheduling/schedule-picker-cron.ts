/** Human-friendly schedule → standard 5-field cron (minute hour dom month dow). */

export type SimpleRepeat = "daily" | "weekdays" | "weekly";

/** Cron weekday: 0 = Sunday … 6 = Saturday (matches typical cron). */
export function parsePickerFromCron(cron: string): {
  minute: number;
  hour: number;
  repeat: SimpleRepeat;
  weekday: number;
} | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minS, hourS, dom, month, dow] = parts;
  if (dom !== "*" || month !== "*") return null;

  const minute = Number.parseInt(minS ?? "", 10);
  const hour = Number.parseInt(hourS ?? "", 10);
  if (!Number.isFinite(minute) || !Number.isFinite(hour)) return null;
  if (minute < 0 || minute > 59 || hour < 0 || hour > 23) return null;

  if (dow === "*") return { minute, hour, repeat: "daily", weekday: 0 };
  if (dow === "1-5") return { minute, hour, repeat: "weekdays", weekday: 1 };

  if (/^\d+$/.test(dow ?? "")) {
    const d = Number.parseInt(dow!, 10);
    if (d >= 0 && d <= 6) return { minute, hour, repeat: "weekly", weekday: d };
  }

  return null;
}

export function buildCronFromPicker(
  minute: number,
  hour: number,
  repeat: SimpleRepeat,
  weekday: number,
): string {
  const m = Math.min(59, Math.max(0, Math.floor(minute)));
  const h = Math.min(23, Math.max(0, Math.floor(hour)));
  const wd = Math.min(6, Math.max(0, Math.floor(weekday)));

  if (repeat === "daily") return `${m} ${h} * * *`;
  if (repeat === "weekdays") return `${m} ${h} * * 1-5`;
  return `${m} ${h} * * ${wd}`;
}
