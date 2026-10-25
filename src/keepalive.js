// Render's free plan puts a service to sleep after 15 minutes without inbound traffic.
// This asks our own public /health address every 10 minutes, which counts as traffic.
// It only runs on Render (RENDER_EXTERNAL_URL is set there automatically).
// It cannot wake a service that is already asleep; the cPanel cron job in the README covers that.
const EVERY_MINUTES = 10;

function startKeepAlive() {
  const base = (process.env.KEEPALIVE_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
  if (!base || process.env.KEEPALIVE === 'off') return;
  const ping = async () => {
    try {
      const r = await fetch(base + '/health', { signal: AbortSignal.timeout(20000) });
      if (!r.ok) console.warn('[keepalive] health check returned', r.status);
    } catch (e) {
      console.warn('[keepalive] ping failed:', e.message);
    }
  };
  setInterval(ping, EVERY_MINUTES * 60 * 1000);
  console.log(`Keep-alive: pinging ${base}/health every ${EVERY_MINUTES} minutes`);
}

module.exports = { startKeepAlive };
