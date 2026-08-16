// Minimal MuscleWiki media-token endpoint for local dev.
// Holds the API key server-side and mints short-lived media tokens
// for the app: POST /token -> {token, expires_in}. This is the same
// contract the app expects from EXPO_PUBLIC_MW_TOKEN_URL in
// production (deploy the equivalent as a serverless function).
//
// Usage: node scripts/mw-token-server.mjs   (port 8787)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const KEY =
  process.env.MUSCLEWIKI_API_KEY ??
  fs.readFileSync(path.join(here, '.musclewiki-key'), 'utf8').trim();

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.end();
  try {
    const upstream = await fetch('https://api.musclewiki.com/media/token', {
      method: 'POST',
      headers: { 'X-API-Key': KEY },
    });
    const body = await upstream.text();
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
    res.end(body);
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
});

server.listen(8787, () => console.log('mw token server on http://localhost:8787'));
