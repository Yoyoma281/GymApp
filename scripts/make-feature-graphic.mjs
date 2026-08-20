// Play Store feature graphic: 1024x500, shown at the top of the listing and
// used as the poster frame for the promo video.
//
// Play crops it on some surfaces and overlays a play button in the middle
// when a video is attached, so the composition keeps the centre clear-ish
// and nothing important within ~80px of any edge.
//
// Usage: node scripts/make-feature-graphic.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Playwright is a dev-time dependency that isn't in package.json; allow an
// explicit path so this runs without polluting the app's dependency tree.
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'assets', 'store');

const BG = '#0b0b0d';
const ACCENT = '#f08c33';

// Same kick-arc-over-barbell mark as the app icon, so the listing and the
// installed app read as the same product.
const mark = `
<svg viewBox="0 0 512 512" width="300" height="300">
  <path d="M104 356 C 152 206, 292 152, 386 178"
        fill="none" stroke="${ACCENT}" stroke-width="28" stroke-linecap="round"/>
  <path d="M372 128 L 442 186 L 356 224 Z" fill="${ACCENT}"/>
  <rect x="120" y="382" width="272" height="24" rx="12" fill="#f5f5f7"/>
  <rect x="86"  y="360" width="34"  height="68" rx="12" fill="#f5f5f7"/>
  <rect x="392" y="360" width="34"  height="68" rx="12" fill="#f5f5f7"/>
  <rect x="58"  y="374" width="24"  height="40" rx="10" fill="${ACCENT}"/>
  <rect x="430" y="374" width="24"  height="40" rx="10" fill="${ACCENT}"/>
</svg>`;

const html = `
<html><head><meta charset="utf-8"><style>
  @import url('');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1024px; height: 500px; background: ${BG};
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    display: flex; align-items: center; gap: 48px; padding: 0 72px;
    overflow: hidden; position: relative;
  }
  /* A warm wash from the mark side, so the flat background has some depth
     without competing with the text. */
  .glow {
    position: absolute; left: -120px; top: -180px;
    width: 720px; height: 860px; border-radius: 50%;
    background: radial-gradient(closest-side, rgba(240,140,51,0.20), rgba(240,140,51,0));
  }
  .mark { flex: 0 0 300px; display: flex; align-items: center; justify-content: center; }
  .copy { position: relative; }
  h1 {
    font-size: 82px; font-weight: 800; color: #f5f5f7;
    letter-spacing: -1.5px; line-height: 1;
  }
  h1 span { color: ${ACCENT}; }
  p {
    margin-top: 18px; font-size: 30px; font-weight: 500;
    color: #b9b9c0; line-height: 1.3; max-width: 560px;
  }
  .rule { margin-top: 26px; display: flex; gap: 10px; }
  .rule i {
    display: block; height: 6px; width: 54px; border-radius: 3px;
    background: ${ACCENT}; opacity: .9;
  }
  .rule i:nth-child(2) { width: 26px; opacity: .55; }
  .rule i:nth-child(3) { width: 12px; opacity: .3; }
</style></head>
<body>
  <div class="glow"></div>
  <div class="mark">${mark}</div>
  <div class="copy">
    <h1>Dojo<span>Fit</span></h1>
    <p>Pick your technique. Get the gym work and stretches that build it.</p>
    <div class="rule"><i></i><i></i><i></i></div>
  </div>
</body></html>`;

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: path.join(OUT, 'feature-graphic.png') });
await browser.close();
console.log('wrote assets/store/feature-graphic.png (1024x500)');

// A 512x512 listing icon carrying the wordmark, as an alternative to the
// plain mark. Play shows the icon at a decent size on the listing page, but
// the same file is what a launcher shrinks to ~48dp — see the note in
// assets/store/README.md before choosing this one.
const iconHtml = `
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 512px; height: 512px; background: ${BG};
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 6px; overflow: hidden; position: relative;
  }
  .glow {
    position: absolute; left: 50%; top: 34%; transform: translate(-50%,-50%);
    width: 520px; height: 460px; border-radius: 50%;
    background: radial-gradient(closest-side, rgba(240,140,51,0.18), rgba(240,140,51,0));
  }
  .mark { margin-top: -14px; }
  .word {
    position: relative; font-size: 74px; font-weight: 800; letter-spacing: -1px;
    color: #f5f5f7; line-height: 1;
  }
  .word span { color: ${ACCENT}; }
</style></head>
<body>
  <div class="glow"></div>
  <div class="mark">
    <svg viewBox="0 0 512 512" width="300" height="300">
      <path d="M104 356 C 152 206, 292 152, 386 178"
            fill="none" stroke="${ACCENT}" stroke-width="28" stroke-linecap="round"/>
      <path d="M372 128 L 442 186 L 356 224 Z" fill="${ACCENT}"/>
      <rect x="120" y="382" width="272" height="24" rx="12" fill="#f5f5f7"/>
      <rect x="86"  y="360" width="34"  height="68" rx="12" fill="#f5f5f7"/>
      <rect x="392" y="360" width="34"  height="68" rx="12" fill="#f5f5f7"/>
      <rect x="58"  y="374" width="24"  height="40" rx="10" fill="${ACCENT}"/>
      <rect x="430" y="374" width="24"  height="40" rx="10" fill="${ACCENT}"/>
    </svg>
  </div>
  <div class="word">Dojo<span>Fit</span></div>
</body></html>`;

const b2 = await chromium.launch();
const p2 = await b2.newPage({ viewport: { width: 512, height: 512 } });
await p2.setContent(iconHtml, { waitUntil: 'load' });
await p2.screenshot({ path: path.join(OUT, 'play-icon-512-wordmark.png') });
await b2.close();
console.log('wrote assets/store/play-icon-512-wordmark.png (512x512)');
