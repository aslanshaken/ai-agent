/**
 * Verifies Trigger.dev secret key (TRIGGER_SECRET_KEY) against the cloud API.
 * CLI login (`npx trigger.dev login` / `whoami`) is separate — needed for `trigger:dev` and deploy.
 */
const secret = process.env.TRIGGER_SECRET_KEY?.trim();
const project = process.env.TRIGGER_PROJECT_ID?.trim();

if (!secret) {
  console.error("FAIL: TRIGGER_SECRET_KEY is missing or empty in .env");
  process.exit(1);
}

if (!project || project === "proj_placeholder") {
  console.error(
    "FAIL: TRIGGER_PROJECT_ID is missing or still proj_placeholder (set your project ref from the Trigger dashboard)",
  );
  process.exit(1);
}

try {
  const { runs } = await import("@trigger.dev/sdk/v3");
  await runs.list({ limit: 1 });
  console.log("OK: Trigger.dev API accepted TRIGGER_SECRET_KEY (runs.list succeeded).");
  console.log("    Project ref configured:", project.slice(0, 6) + "…" + project.slice(-4));
  console.log(
    "    Note: `npx trigger.dev whoami` uses CLI login — run `npm run trigger:login` if dev/deploy commands say you are not logged in.",
  );
  process.exit(0);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("FAIL: Could not reach Trigger.dev with this key:", msg);
  process.exit(1);
}
