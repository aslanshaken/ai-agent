/**
 * Reports which env vars from .env.example are set (never prints values).
 * Optionally pings APIs that support a quick check.
 * Usage: node --env-file=.env scripts/check-env-status.mjs
 */

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_PASSWORD",
  "OPENAI_API_KEY",
  "TRIGGER_SECRET_KEY",
  "TRIGGER_PROJECT_ID",
  "EXA_API_KEY",
  "TAVILY_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "TELEGRAM_BOT_TOKEN",
  "NEXT_PUBLIC_APP_URL",
  "SENTRY_DSN",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
];

function anonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

function isSet(name, raw) {
  if (raw === undefined || raw === null) return false;
  const v = String(raw).trim();
  if (!v) return false;
  if (name === "TRIGGER_PROJECT_ID" && v === "proj_placeholder") return false;
  return true;
}

console.log("Env presence (values hidden)\n");
for (const k of KEYS) {
  let ok = isSet(k, process.env[k]);
  if (k === "NEXT_PUBLIC_SUPABASE_ANON_KEY" || k === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") {
    ok = !!anonKey();
  }
  console.log(`${k.padEnd(38)} ${ok ? "  ✓ set" : "  ✗ empty"}`);
}

const hasUrl = isSet("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
const hasClientKey = !!anonKey();
let missingRequiredForApp = false;
if (!hasUrl || !hasClientKey) {
  missingRequiredForApp = true;
  console.log(
    "\nNote: App needs NEXT_PUBLIC_SUPABASE_URL plus NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.\n",
  );
}

console.log("\n--- Live checks (where supported) ---\n");

async function checkSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = anonKey();
  if (!url || !key) {
    console.log("Supabase: skip (URL or client key missing)");
    return;
  }
  try {
    const r = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      console.log("Supabase: OK", r.status, typeof j.version === "string" ? `(auth ${j.version})` : "");
    } else {
      console.log("Supabase: FAIL", r.status, j.msg || j.message || "");
    }
  } catch (e) {
    console.log("Supabase: FAIL", e instanceof Error ? e.message : e);
  }
}

async function checkOpenAI() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    console.log("OpenAI: skip (OPENAI_API_KEY missing)");
    return;
  }
  try {
    const r = await fetch("https://api.openai.com/v1/models?limit=1", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const j = await r.json().catch(() => ({}));
    console.log(r.ok ? "OpenAI: OK" : "OpenAI: FAIL", r.status, r.ok ? "" : j.error?.message || "");
  } catch (e) {
    console.log("OpenAI: FAIL", e instanceof Error ? e.message : e);
  }
}

async function checkTrigger() {
  const secret = process.env.TRIGGER_SECRET_KEY?.trim();
  const project = process.env.TRIGGER_PROJECT_ID?.trim();
  if (!secret || !project || project === "proj_placeholder") {
    console.log("Trigger.dev: skip (TRIGGER_SECRET_KEY / TRIGGER_PROJECT_ID missing)");
    return;
  }
  try {
    const { runs } = await import("@trigger.dev/sdk/v3");
    await runs.list({ limit: 1 });
    console.log("Trigger.dev: OK (runs.list)");
  } catch (e) {
    console.log("Trigger.dev: FAIL", e instanceof Error ? e.message : e);
  }
}

async function checkTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.log("Telegram: skip (TELEGRAM_BOT_TOKEN missing)");
    return;
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const j = await r.json();
    if (j.ok) {
      console.log("Telegram: OK (bot token valid)");
    } else {
      console.log("Telegram: FAIL", j.description || j);
    }
  } catch (e) {
    console.log("Telegram: FAIL", e instanceof Error ? e.message : e);
  }
}

async function checkTavily() {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) {
    console.log("Tavily: skip (TAVILY_API_KEY missing)");
    return;
  }
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query: "ping", max_results: 1 }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      console.log("Tavily: OK", r.status);
    } else {
      console.log("Tavily: FAIL", r.status, j.error || j.detail || JSON.stringify(j).slice(0, 120));
    }
  } catch (e) {
    console.log("Tavily: FAIL", e instanceof Error ? e.message : e);
  }
}

async function checkExa() {
  const key = process.env.EXA_API_KEY?.trim();
  if (!key) {
    console.log("Exa: skip (EXA_API_KEY missing)");
    return;
  }
  try {
    const r = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({ query: "test", numResults: 1, type: "keyword" }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      console.log("Exa: OK", r.status);
    } else {
      console.log("Exa: FAIL", r.status, j.error || j.message || JSON.stringify(j).slice(0, 120));
    }
  } catch (e) {
    console.log("Exa: FAIL", e instanceof Error ? e.message : e);
  }
}

await checkSupabase();
await checkOpenAI();
await checkTrigger();
await checkTelegram();
await checkTavily();
await checkExa();

console.log("\nGoogle OAuth / Sentry / PostHog: presence only above (no automatic ping in this script).");
if (missingRequiredForApp || (!hasUrl || !hasClientKey)) {
  process.exitCode = 1;
}
