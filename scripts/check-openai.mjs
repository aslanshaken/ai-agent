const k = process.env.OPENAI_API_KEY?.trim();
if (!k) {
  console.error("OPENAI_API_KEY missing or empty (use --env-file=.env)");
  process.exit(1);
}

const r = await fetch("https://api.openai.com/v1/models?limit=1", {
  headers: { Authorization: `Bearer ${k}` },
});
const j = await r.json().catch(() => ({}));
if (r.ok) {
  console.log("OK", r.status, j.data?.[0]?.id ?? "");
  process.exit(0);
}
console.error("FAIL", r.status, j.error?.message ?? j);
process.exit(1);
