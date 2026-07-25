// Cloudflare Worker — receives device telemetry from MASHENSTEIN production
// builds and writes each ping into Workers KV. Also serves a dashboard at
// /dashboard that aggregates stored pings into readable charts.
//
// Deploy:
//   1. npx wrangler kv:namespace create MASHTELEMETRY
//   2. Paste the namespace id into wrangler.toml
//   3. npx wrangler deploy
//   4. Set MASH_TELEMETRY_URL when building the game

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ---- helpers -----------------------------------------------------------

function bucketResolution(w, h) {
  const area = w * h;
  if (area <= 0) return 'unknown';
  if (w > h) [w, h] = [h, w]; // normalise to portrait for bucketing
  if (w <= 400 && h <= 700) return '\u2264 iPhone SE';
  if (w <= 400 && h <= 850) return 'iPhone 6\u20138';
  if (w <= 400 && h <= 950) return 'iPhone X\u201315';
  if (w <= 430 && h <= 950) return 'iPhone 15 Pro Max';
  if (w <= 820 && h <= 1200) return 'iPad / small tablet';
  if (w <= 1100 && h <= 1400) return 'large tablet';
  if (w <= 1200 && h <= 1700) return 'laptop (\u22641440p)';
  if (w <= 1500 && h <= 2200) return 'desktop (1440p\u20134K)';
  return '4K+ / ultrawide';
}

// ---- dashboard HTML ----------------------------------------------------

function dashboardHtml(stats) {
  const { total, platforms, installed, resolutions, dprs, days } = stats;

  const bar = (label, count, max, color = '#48e0c8') => {
    const pct = max > 0 ? (count / max) * 100 : 0;
    return '<tr>' +
      '<td class="label">' + label + '</td>' +
      '<td class="bar-cell"><div class="bar" style="width:' + pct + '%;background:' + color + '"></div></td>' +
      '<td class="count">' + count + '</td></tr>';
  };

  const platformRows = Object.entries(platforms || {})
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => bar(k, v, total, '#48e0c8'))
    .join('');

  const resRows = Object.entries(resolutions || {})
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => bar(k, v, Math.max(...Object.values(resolutions)), '#f6d33c'))
    .join('');

  const dprRows = Object.entries(dprs || {})
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([k, v]) => bar(k + 'x', v, Math.max(...Object.values(dprs)), '#f890b8'))
    .join('');

  const installedPct = total > 0
    ? Math.round(((installed?.true || 0) / total) * 100)
    : 0;

  const dayRows = (days || [])
    .map((d) => '<tr><td class="label">' + d.date + '</td><td class="count">' + d.count + '</td></tr>')
    .join('');

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<title>MASHENSTEIN \u2014 Device Telemetry</title>\n' +
    '<style>\n' +
    '  *{box-sizing:border-box;margin:0;padding:0}\n' +
    '  body{background:#0b0b14;color:#c8cbd7;font:14px/1.5 system-ui,-apple-system,sans-serif;padding:24px}\n' +
    '  h1{color:#ffcf33;font:400 1.8rem/1.1 "Lilita One",system-ui,sans-serif;letter-spacing:.04em;margin-bottom:4px}\n' +
    '  h2{color:#8e94a6;font-size:.85rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin:32px 0 12px}\n' +
    '  .hero{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:8px}\n' +
    '  .hero>div{background:rgba(255,255,255,.04);border-radius:10px;padding:16px 22px;min-width:130px}\n' +
    '  .hero .num{color:#f6d33c;font-size:2rem;font-weight:800;line-height:1.1}\n' +
    '  .hero .lbl{color:#8e94a6;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em}\n' +
    '  table{width:100%;max-width:620px;border-collapse:collapse}\n' +
    '  td{padding:5px 8px}\n' +
    '  .label{color:#c8cbd7;font-size:.82rem;white-space:nowrap;width:1px}\n' +
    '  .count{color:#8e94a6;font-size:.82rem;text-align:right;width:54px;font-variant-numeric:tabular-nums}\n' +
    '  .bar-cell{width:100%}\n' +
    '  .bar{height:14px;border-radius:4px;min-width:2px}\n' +
    '  .footer{margin-top:40px;color:#55647a;font-size:.72rem}\n' +
    '  @media(max-width:500px){body{padding:14px}h1{font-size:1.4rem}}\n' +
    '</style>\n</head>\n<body>\n' +
    '<h1>MASHENSTEIN</h1>\n' +
    '<p style="color:#6b7084;margin-bottom:20px">Device telemetry \u2014 last 90 days</p>\n' +
    '<div class="hero">\n' +
    '  <div><div class="num">' + total + '</div><div class="lbl">total sessions</div></div>\n' +
    '  <div><div class="num">' + installedPct + '%</div><div class="lbl">installed (PWA)</div></div>\n' +
    '</div>\n' +
    '<h2>Platforms</h2>\n' +
    '<table>' + (platformRows || '<tr><td class="label" style="color:#55647a">no data yet</td></tr>') + '</table>\n' +
    '<h2>Screen sizes</h2>\n' +
    '<table>' + (resRows || '<tr><td class="label" style="color:#55647a">no data yet</td></tr>') + '</table>\n' +
    '<h2>Device pixel ratio</h2>\n' +
    '<table>' + (dprRows || '<tr><td class="label" style="color:#55647a">no data yet</td></tr>') + '</table>\n' +
    '<h2>Daily players</h2>\n' +
    '<table>' + (dayRows || '<tr><td class="label" style="color:#55647a">no data yet</td></tr>') + '</table>\n' +
    '<p class="footer">Refreshed ' + new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC</p>\n' +
    '</body>\n</html>';
}

// ---- aggregation -------------------------------------------------------

async function aggregateStats(env) {
  const platforms = { iphone: 0, ipad: 0, 'android-phone': 0, 'android-tablet': 0, desktop: 0 };
  const installed = { true: 0, false: 0 };
  const resolutions = {};
  const dprs = {};
  const daily = {};
  let total = 0;

  let cursor;
  for (let batch = 0; batch < 5; batch++) {
    const list = await env.MASHTELEMETRY.list({ prefix: 'ping:', limit: 500, cursor });
    for (const key of list.keys) {
      const raw = await env.MASHTELEMETRY.get(key.name);
      if (!raw) continue;
      let p;
      try { p = JSON.parse(raw); } catch (_) { continue; }
      total++;

      const plat = p.platform || 'desktop';
      platforms[plat] = (platforms[plat] || 0) + 1;

      installed[p.installed ? 'true' : 'false']++;

      const res = bucketResolution(p.screenW || 0, p.screenH || 0);
      resolutions[res] = (resolutions[res] || 0) + 1;

      const dpr = String(p.dpr || 1);
      dprs[dpr] = (dprs[dpr] || 0) + 1;

      const day = (p.sent || '').slice(0, 10);
      if (day) daily[day] = (daily[day] || 0) + 1;
    }
    cursor = list.cursor;
    if (!cursor || list.keys.length < 500) break;
  }

  // Fold in daily counters for days that may have fallen out of the ping list.
  const counterList = await env.MASHTELEMETRY.list({ prefix: 'counter:', limit: 90 });
  for (const key of counterList.keys) {
    const day = key.name.slice(8);
    const count = Number(await env.MASHTELEMETRY.get(key.name)) || 0;
    if (!daily[day] || count > daily[day]) daily[day] = count;
  }

  const days = Object.entries(daily)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, count]) => ({ date, count }));

  return { total, platforms, installed, resolutions, dprs, days };
}

// ---- fetch handler -----------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Dashboard — GET /dashboard
    if (request.method === 'GET' && url.pathname === '/dashboard') {
      try {
        const stats = await aggregateStats(env);
        return new Response(dashboardHtml(stats), {
          status: 200,
          headers: { 'Content-Type': 'text/html;charset=utf-8', ...CORS },
        });
      } catch (e) {
        return new Response('Dashboard error: ' + e.message, { status: 500 });
      }
    }

    // CORS preflight
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // Telemetry ingest — POST /
    if (request.method !== 'POST') {
      return new Response('MASHENSTEIN telemetry endpoint \u2014 POST pings, GET /dashboard for stats', {
        status: 405, headers: CORS,
      });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return new Response('Invalid JSON', { status: 400, headers: CORS });
    }

    const ts = payload.sent || new Date().toISOString();
    const suffix = Math.random().toString(36).slice(2, 8);
    const key = 'ping:' + ts + ':' + suffix;

    await env.MASHTELEMETRY.put(key, JSON.stringify(payload), {
      expirationTtl: 90 * 24 * 60 * 60,
    });

    const today = ts.slice(0, 10);
    const counterKey = 'counter:' + today;
    const current = await env.MASHTELEMETRY.get(counterKey);
    await env.MASHTELEMETRY.put(counterKey, String(Number(current || 0) + 1), {
      expirationTtl: 90 * 24 * 60 * 60,
    });

    return new Response('OK', { status: 200, headers: CORS });
  },
};

