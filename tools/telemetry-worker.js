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
  // Bucket by CSS-pixel resolution, not by model name — many phones share the
  // same logical resolution and cannot be told apart from screen size alone.
  if (w * h <= 0) return 'unknown';
  if (w > h) [w, h] = [h, w]; // normalise to portrait
  if (w <= 400 && h <= 700) return '\u2264375\u00d7667';
  if (w <= 400 && h <= 750) return '375\u00d7736\u2013744';
  if (w <= 400 && h <= 850) return '375\u00d7812';
  if (w <= 400 && h <= 900) return '390\u00d7844';
  if (w <= 430 && h <= 940) return '402\u00d7874';
  if (w <= 430 && h <= 960) return '430\u00d7932';
  if (w <= 820 && h <= 1200) return 'tablet (768\u2013820\u00d71024\u20131200)';
  if (w <= 1100 && h <= 1400) return 'large tablet';
  if (w <= 1280 && h <= 800) return 'laptop (\u22641440\u00d7900)';
  if (w <= 1500 && h <= 1000) return 'desktop (1440\u20131680\u00d7900\u20131050)';
  if (w <= 2000 && h <= 1200) return 'desktop (1920\u00d71080\u20131200)';
  if (w <= 2600 && h <= 1500) return 'desktop (2560\u00d71440)';
  return '4K+ / ultrawide';
}

// ---- dashboard HTML ----------------------------------------------------

function dashboardHtml(stats) {
  const { total, platforms, installed, resolutions, dprs, days, recent } = stats;

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
    .map((d) => '<tr><td class="label">' + d.date + '</td><td class="count">' + d.count + '</td><td class="count">' + d.devices + '</td></tr>')
    .join('');

  const fmtTime = (s) => s < 60 ? s + 's' : Math.floor(s / 60) + 'm';
  const deviceRows = Object.entries(stats.deviceStats || {})
    .filter(([, d]) => d.name)
    .sort((a, b) => b[1].sessions - a[1].sessions)
    .map(([, d]) => '<tr>' +
      '<td class="rec-name">' + (d.name || '\u2014') + '</td>' +
      '<td class="rec-plat">' + d.platform + '</td>' +
      '<td class="rec-geo">' + (d.country || '') + '</td>' +
      '<td class="count">' + d.sessions + '</td>' +
      '<td class="count">' + d.runs + '</td>' +
      '<td class="count">' + d.clears + '</td>' +
      '<td class="count">' + d.coins.toLocaleString() + '</td>' +
      '<td class="count">' + fmtTime(d.totalTime) + '</td>' +
      '</tr>')
    .join('');
  stats.deviceRows = deviceRows;

  const recentRows = (recent || []).slice().reverse()
    .map((r) => '<tr>' +
      '<td class="label rec-time">' + (r.sent || '').replace('T', ' ').slice(0, 16) + '</td>' +
      '<td class="rec-plat">' + r.platform + '</td>' +
      '<td class="rec-res">' + (r.screenW || '?') + '\xd7' + (r.screenH || '?') + '</td>' +
      '<td class="rec-dpr">' + (r.dpr || '1') + 'x</td>' +
      '<td class="rec-density">' + (r.density != null ? Number(r.density).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + 'x' : '\u2014') + '</td>' +
      '<td class="rec-gl">' + (r.backend || '\u2014') + '</td>' +
      '<td class="rec-pwa">' + (r.installed ? 'Yes' : 'No') + '</td>' +
      '<td class="count">' + (r.sessionSec != null ? r.sessionSec + 's' : '') + '</td>' +
      '<td class="rec-geo">' + [r.country, r.city].filter(Boolean).join(', ') + '</td>' +
      '<td class="rec-name">' + (r.name || '') + '</td>' +
      '</tr>')
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
    '  .chart-row{display:flex;gap:32px;flex-wrap:wrap}\n' +
    '  .chart-row>div{flex:1 1 180px;min-width:160px}\n' +
    '  table{width:100%;max-width:620px;border-collapse:collapse}\n' +
    '  td{padding:5px 8px}\n' +
    '  .label{color:#c8cbd7;font-size:.82rem;white-space:nowrap;width:1px}\n' +
    '  .count{color:#8e94a6;font-size:.82rem;text-align:right;width:54px;font-variant-numeric:tabular-nums}\n' +
    '  .bar-cell{width:100%}\n' +
    '  .bar{height:14px;border-radius:4px;min-width:2px}\n' +
    '  .wide{max-width:100%;overflow-x:auto}\n' +
    '  .wide table{max-width:none;min-width:700px}\n' +
    '  .wide td{font-size:.78rem;padding:4px 7px}\n' +
    '  .wide th{font-size:.72rem;color:#8e94a6;text-transform:uppercase;letter-spacing:.06em;text-align:left;padding:4px 7px}\n' +
    '  .rec-time{color:#6b7084;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.71rem}\n' +
    '  .rec-plat{color:#48e0c8}\n' +
    '  .rec-res{color:#c8cbd7;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}\n' +
    '  .rec-dpr{color:#f890b8}\n' +
    '  .rec-density{color:#48e0c8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}\n' +
    '  .rec-gl{color:#f890b8;font-size:.71rem}\n' +
    '  .rec-geo{color:#c8cbd7;font-size:.71rem}\n' +
    '  .rec-name{color:#f6d33c;font-size:.75rem;font-weight:600;letter-spacing:.03em}\n' +
    '  .rec-pwa{color:#f6d33c}\n' +
    '  .rec-ua{color:#55647a;font-size:.69rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n' +
    '  .footer{margin-top:40px;color:#55647a;font-size:.72rem}\n' +
    '  @media(max-width:500px){body{padding:14px}h1{font-size:1.4rem}}\n' +
    '</style>\n</head>\n<body>\n' +
    '<h1>MASHENSTEIN</h1>\n' +
    '<p style="color:#6b7084;margin-bottom:20px">Device telemetry \u2014 last 90 days</p>\n' +
    '<div class="hero">\n' +
    '  <div><div class="num">' + total + '</div><div class="lbl">total sessions</div></div>\n' +
    '  <div><div class="num">' + (stats.devices || total) + '</div><div class="lbl">unique devices</div></div>\n' +
    '  <div><div class="num">' + (stats.avgSession || '\u2014') + '</div><div class="lbl">avg session (min)</div></div>\n' +
    '  <div><div class="num">' + installedPct + '%</div><div class="lbl">installed (PWA)</div></div>\n' +
    '</div>\n' +
    '<div class="chart-row">\n' +
    '<div><h2>Platforms</h2>\n' +
    '<table>' + (platformRows || '<tr><td class="label" style="color:#55647a">no data yet</td></tr>') + '</table></div>\n' +
    '<div><h2>Screen sizes</h2>\n' +
    '<table>' + (resRows || '<tr><td class="label" style="color:#55647a">no data yet</td></tr>') + '</table></div>\n' +
    '<div><h2>Device pixel ratio</h2>\n' +
    '<table>' + (dprRows || '<tr><td class="label" style="color:#55647a">no data yet</td></tr>') + '</table></div>\n' +
    '</div>\n' +
    '<h2>Daily players</h2>\n' +
    '<table><thead><tr><th>Date</th><th>Sessions</th><th>Devices</th></tr></thead>\n' +
    '<tbody>' + (dayRows || '<tr><td class="label" style="color:#55647a">no data yet</td></tr>') + '</tbody></table>\n' +
    '<h2>Devices</h2>\n' +
    '<div class="wide"><table>\n' +
    '<thead><tr><th>Name</th><th>Platform</th><th>Location</th><th>Sessions</th><th>Runs</th><th>Clears</th><th>Coins</th><th>Playtime</th></tr></thead>\n' +
    '<tbody>' + (stats.deviceRows || '<tr><td class="label" style="color:#55647a">no named devices yet</td></tr>') + '</tbody>\n' +
    '</table></div>\n' +
    '<h2>Recent sessions</h2>\n' +
    '<div class="wide"><table>\n' +
    '<thead><tr><th>Time</th><th>Platform</th><th>Screen</th><th>DPR</th><th>Render</th><th>GL</th><th>PWA</th><th>Dur</th><th>Location</th><th>Device</th></tr></thead>\n' +
    '<tbody>' + (recentRows || '<tr><td class="label" style="color:#55647a">no data yet</td></tr>') + '</tbody>\n' +
    '</table></div>\n' +
    '<p class="footer" id="dash-ft">Refreshed ' + new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC</p>\n' +
    '<script>\n' +
    'document.querySelectorAll(".rec-time").forEach(el=>{const s=el.textContent.trim();if(!s)return;const d=new Date(s.replace(" ","T")+"Z");if(isNaN(d.getTime()))return;el.textContent=d.toLocaleString()});\n' +
    'const ft=document.getElementById("dash-ft");if(ft)ft.textContent="Refreshed "+new Date().toLocaleString()\n' +
    '</script>\n' +
    '</body>\n</html>';
}

// ---- aggregation -------------------------------------------------------

async function aggregateStats(env) {
  const platforms = { iphone: 0, ipad: 0, 'android-phone': 0, 'android-tablet': 0, desktop: 0 };
  const installed = { true: 0, false: 0 };
  const resolutions = {};
  const dprs = {};
  const daily = {};
  const dailyDevices = {};
  const recent = [];
  const devices = new Set();
  const deviceVisits = {};
  const deviceStats = {};
  let total = 0;
  let sessionSecs = 0;
  let sessionEnds = 0;

  function deviceKey(p) {
    // Prefer the persistent localStorage ID when available.
    // Fall back to fingerprint: platform + resolution + DPR + UA major version.
    if (p.did) return p.did;
    const uaMajor = (p.ua || '').replace(/^Mozilla\/[\d.]+ /, '').replace(/ (KHTML|Gecko|Chrome|Safari|Version|Mobile)\/[^\s]*/g, '').slice(0, 40);
    return (p.platform || '?') + '|' + (p.screenW || 0) + 'x' + (p.screenH || 0) + '|' + (p.dpr || 1) + '|' + uaMajor;
  }

  let cursor;
  for (let batch = 0; batch < 5; batch++) {
    const list = await env.MASHTELEMETRY.list({ prefix: 'ping:', limit: 500, cursor });
    for (const key of list.keys) {
      const raw = await env.MASHTELEMETRY.get(key.name);
      if (!raw) continue;
      let p;
      try { p = JSON.parse(raw); } catch (_) { continue; }

      // End pings carry session duration — tally for the average.
      if (p.sessionSec != null) { sessionSecs += p.sessionSec; sessionEnds++; }

      total++;

      const dk = deviceKey(p);
      devices.add(dk);
      deviceVisits[dk] = (deviceVisits[dk] || 0) + 1;

      const plat = p.platform || 'desktop';
      platforms[plat] = (platforms[plat] || 0) + 1;

      // Per-device summary
      if (!deviceStats[dk]) {
        deviceStats[dk] = { name: p.name || '', platform: plat, country: p.country || '', sessions: 0, runs: 0, clears: 0, coins: 0, totalTime: 0 };
      }
      const ds = deviceStats[dk];
      if (p.kind === 'run') {
        ds.runs++;
        if (p.success) ds.clears++;
        ds.coins += p.coins || 0;
        ds.totalTime += p.time || 0;
      } else if (p.kind !== 'end') {
        ds.sessions++;
      }

      installed[p.installed ? 'true' : 'false']++;

      const res = bucketResolution(p.screenW || 0, p.screenH || 0);
      resolutions[res] = (resolutions[res] || 0) + 1;

      const dpr = String(p.dpr || 1);
      dprs[dpr] = (dprs[dpr] || 0) + 1;

      const day = (p.sent || '').slice(0, 10);
      if (day) {
        daily[day] = (daily[day] || 0) + 1;
        if (!dailyDevices[day]) dailyDevices[day] = new Set();
        dailyDevices[day].add(dk);
      }

      // Keep the 50 most recent for the raw table.
      if (recent.length < 50) {
        recent.push({
          sent: p.sent || '',
          platform: plat,
          screenW: p.screenW || 0,
          screenH: p.screenH || 0,
          dpr: p.dpr || 1,
          density: p.density != null ? p.density : null,
          backend: p.backend || null,
          name: p.name || null,
          did: p.did || null,
          installed: !!p.installed,
          ua: p.ua || '',
          uaShort: (p.ua || '').replace(/^Mozilla\/[\d.]+ /, '').slice(0, 60),
          country: p.country || '',
          city: p.city || '',
          isp: p.isp || '',
          sessionSec: p.sessionSec || null,
        });
      }
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
    .map(([date, count]) => ({ date, count, devices: dailyDevices[date] ? dailyDevices[date].size : 0 }));

  const avgSession = sessionEnds > 0 ? Math.round(sessionSecs / sessionEnds / 60) : null;

  return { total, devices: devices.size, avgSession, platforms, installed, resolutions, dprs, days, recent, deviceStats };
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

    // Enrich with Cloudflare edge data — no IPs stored, just aggregated metadata.
    // cf object is free on every Worker plan. https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties
    const cf = request.cf || {};
    if (cf.country) payload.country = cf.country;
    if (cf.city) payload.city = cf.city;
    if (cf.continent) payload.continent = cf.continent;
    if (cf.asOrganization) payload.isp = cf.asOrganization;
    if (cf.httpProtocol) payload.httpProtocol = cf.httpProtocol;

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

