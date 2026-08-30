export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // ponytail: in-process interval, single-instance only. Upgrade to Vercel Cron for serverless.
  const { purgeExpiredFiles } = await import("@/lib/purge");
  const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  const run = async () => {
    try {
      const r = await purgeExpiredFiles();
      console.log(`[purge] deleted=${r.deleted} failed=${r.failed}`);
    } catch (e) {
      console.error("[purge] error", e);
    }
  };
  setInterval(run, INTERVAL_MS);
  // ponytail: also run once on boot so a fresh deploy catches up
  setTimeout(run, 30_000);
}
