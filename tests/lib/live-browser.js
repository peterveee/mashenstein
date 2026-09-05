// Loopback gives AudioWorklet the same secure-context capability as HTTPS production.
import { createServer } from 'node:http';
import { chromium } from 'playwright';
export async function openLiveBrowser() {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>Performance regression</title>');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  } catch (error) { server.close(); throw error; }
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { browser, origin, close: async () => { try { await browser.close(); } finally { server.close(); } } };
}
