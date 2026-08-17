// Render the DojoFit app icons from an inline SVG using headless Chrome
// (no native image tooling required).
//
// Produces:
//   assets/icon.png                      1024x1024  store + iOS icon
//   assets/adaptive-icon.png             1024x1024  Android foreground
//   assets/splash-icon.png                512x512   splash mark
//   assets/favicon.png                     48x48    web
//
// Usage: node scripts/make-icons.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire('/home/agent/crypto-next/crypto-next/package.json');
const { chromium } = require('playwright-core');

const here = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(here, '..', 'assets');
const CHROME = '/home/agent/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';

const BG = '#0b0b0d';
const ACCENT = '#f08c33';

// A rising kick arc over a barbell: the sport technique plus the gym work
// that builds it, which is what the app is for.
const mark = (size, withBackground) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  ${withBackground ? `<rect width="512" height="512" rx="112" fill="${BG}"/>` : ''}
  <!-- motion arc of a kick, ending in a solid arrowhead -->
  <path d="M104 356 C 152 206, 292 152, 386 178"
        fill="none" stroke="${ACCENT}" stroke-width="28" stroke-linecap="round"/>
  <path d="M372 128 L 442 186 L 356 224 Z" fill="${ACCENT}"/>
  <!-- barbell -->
  <rect x="120" y="382" width="272" height="24" rx="12" fill="#f5f5f7"/>
  <rect x="86"  y="360" width="34"  height="68" rx="12" fill="#f5f5f7"/>
  <rect x="392" y="360" width="34"  height="68" rx="12" fill="#f5f5f7"/>
  <rect x="58"  y="374" width="24"  height="40" rx="10" fill="${ACCENT}"/>
  <rect x="430" y="374" width="24"  height="40" rx="10" fill="${ACCENT}"/>
</svg>`;

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function render(file, size, { background = true, transparent = false } = {}) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<html><body style="margin:0;background:${transparent ? 'transparent' : BG}">
       ${mark(size, background)}
     </body></html>`,
  );
  await page.screenshot({
    path: path.join(ASSETS, file),
    omitBackground: transparent,
  });
  await page.close();
  console.log(`wrote assets/${file} (${size}x${size})`);
}

await render('icon.png', 1024);
// Android masks the foreground layer, so keep the mark clear of the edges
// and let adaptiveIcon.backgroundColor supply the field.
await render('adaptive-icon.png', 1024, { background: false, transparent: true });
await render('splash-icon.png', 512, { background: false, transparent: true });
await render('favicon.png', 48);

await browser.close();
