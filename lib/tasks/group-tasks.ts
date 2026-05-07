export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
};

function startOfDayMs(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Groups open tasks for dashboard / tasks page (browser/local timezone). */
export function groupTasksByDue(rows: TaskRow[], now = new Date()) {
  const todayStart = startOfDayMs(now);
  const tomorrowStart = todayStart + 86400000;

  const open = rows.filter((t) => t.status === "pending" || t.status === "in_progress");

  const overdue: TaskRow[] = [];
  const dueToday: TaskRow[] = [];
  const upcoming: TaskRow[] = [];
  const nodate: TaskRow[] = [];

  for (const t of open) {
    if (!t.due_date) {
      nodate.push(t);
      continue;
    }
    const dueMs = startOfDayMs(new Date(t.due_date));
    if (dueMs < todayStart) overdue.push(t);
    else if (dueMs < tomorrowStart) dueToday.push(t);
    else upcoming.push(t);
  }

  const byPri = (a: TaskRow, b: TaskRow) => {
    const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
    return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
  };

  overdue.sort(byPri);
  dueToday.sort(byPri);
  upcoming.sort((a, b) => {
    const da = a.due_date ? new Date(a.due_date).getTime() : 0;
    const db = b.due_date ? new Date(b.due_date).getTime() : 0;
    return da - db;
  });
  nodate.sort(byPri);

  return { overdue, dueToday, upcoming, nodate, open };
}
