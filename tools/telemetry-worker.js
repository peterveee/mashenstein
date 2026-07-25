// Cloudflare Worker — receives device telemetry from MASHENSTEIN production
// builds and writes each ping as a row into Workers KV for later querying.
//
// Deploy:
//   1. npx wrangler kv:namespace create MASHTELEMETRY
//   2. Paste the namespace id into wrangler.toml below
//   3. npx wrangler deploy
//   4. Set the worker URL in your build template as __MASH_TELEMETRY_URL__
//
// wrangler.toml:
//   name = "mashenstein-telemetry"
//   main = "tools/telemetry-worker.js"
//   compatibility_date = "2025-07-01"
//   [[kv_namespaces]]
//   binding = "MASHTELEMETRY"
//   id = "<your-namespace-id>"

export default {
  async fetch(request, env) {
    // Only accept POST from the game
    if (request.method !== 'POST') {
      return new Response('MASHENSTEIN telemetry endpoint — POST only', { status: 405 });
    }

    // Light CORS so the game can POST from any origin
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return new Response('Invalid JSON', { status: 400, headers });
    }

    // Build a key that sorts chronologically and is unique per ping.
    // A microsecond timestamp + random suffix keeps concurrent pings from
    // overwriting each other in KV (last-write-wins).
    const ts = payload.sent || new Date().toISOString();
    const suffix = Math.random().toString(36).slice(2, 8);
    const key = `ping:${ts}:${suffix}`;

    // Store the raw payload. KV values are strings; JSON.stringify is implicit
    // in the put, but being explicit makes the stored shape clear.
    // TTL: 90 days — long enough for a release cycle, not forever.
    await env.MASHTELEMETRY.put(key, JSON.stringify(payload), {
      expirationTtl: 90 * 24 * 60 * 60,
    });

    // Also update a rolling daily counter so a dashboard can show
    // "X players today" without listing all keys.
    const today = ts.slice(0, 10); // "2026-07-25"
    const counterKey = `counter:${today}`;
    const current = await env.MASHTELEMETRY.get(counterKey);
    await env.MASHTELEMETRY.put(counterKey, String(Number(current || 0) + 1), {
      expirationTtl: 90 * 24 * 60 * 60,
    });

    return new Response('OK', { status: 200, headers });
  },
};
