// Builds docs/hero.png, docs/walkthrough.gif and copies README screenshots.
// Needs `npm i --no-save gifenc @resvg/resvg-js`.
// usage: node scripts/docs/compose.mjs docs/.raw docs
import { Resvg } from '@resvg/resvg-js';
import gifenc from 'gifenc';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { GIFEncoder, applyPalette, quantize } = gifenc;
const [raw, docs] = process.argv.slice(2);
mkdirSync(join(docs, 'screenshots'), { recursive: true });

const png = (name) => readFileSync(join(raw, `${name}.png`));
const size = (buf) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });
const b64 = (buf) => buf.toString('base64');

/** A phone-shaped crop of the top 390×844 of a screenshot. */
function phone(name, x, y, w) {
  const buf = png(name);
  const { w: iw, h: ih } = size(buf);
  const h = Math.round((w * 844) / 390);
  const id = `clip-${name}-${x}`;
  return `
    <defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.11}"/></clipPath></defs>
    <rect x="${x - 7}" y="${y - 7}" width="${w + 14}" height="${h + 14}" rx="${w * 0.11 + 7}" fill="#2C2C2E"/>
    <g clip-path="url(#${id})">
      <svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${iw} ${(iw * 844) / 390}" preserveAspectRatio="xMidYMin slice">
        <image width="${iw}" height="${ih}" href="data:image/png;base64,${b64(buf)}"/>
      </svg>
    </g>`;
}

const MARK = `<g transform="translate(512 512) scale(1) translate(-512 -476)"><path d="M 542.31 223.59 A 290 290 0 0 1 793.39 582.16" fill="none" stroke="#F26B1D" stroke-width="92"/><path d="M 772.65 639.13 A 290 290 0 0 1 384.87 772.65" fill="none" stroke="#F5F5F7" stroke-width="92"/><path d="M 333.46 740.52 A 290 290 0 0 1 228.34 451.71" fill="none" stroke="#8E8E93" stroke-width="92"/><path d="M 247.07 394.05 A 290 290 0 0 1 481.69 223.59" fill="none" stroke="#48484A" stroke-width="92"/><rect x="462" y="92" width="100" height="54" rx="16" fill="#F5F5F7"/><rect x="494" y="140" width="36" height="40" fill="#F5F5F7"/><line x1="512" y1="512" x2="696.36" y2="557.97" stroke="#F26B1D" stroke-width="40" stroke-linecap="round"/><circle cx="512" cy="512" r="34" fill="#F5F5F7"/></g>`;

const font = `font-family="Segoe UI, Helvetica, Arial, sans-serif"`;
const pill = (x, y, text) => {
  const w = text.length * 11.5 + 40;
  return `<rect x="${x}" y="${y}" width="${w}" height="44" rx="22" fill="#2C2C2E"/><circle cx="${x + 22}" cy="${y + 22}" r="5" fill="#F26B1D"/><text x="${x + 36}" y="${y + 29}" font-size="20" ${font} fill="#E5E5EA">${text}</text>`;
};

const hero = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="#141416"/>
  <circle cx="1220" cy="450" r="520" fill="#1C1C1F"/>
  <svg x="96" y="170" width="150" height="150" viewBox="0 0 1024 1024">${MARK}</svg>
  <text x="100" y="430" font-size="96" font-weight="700" ${font} fill="#F5F5F7" letter-spacing="-2">LifeSplits</text>
  <text x="104" y="500" font-size="34" ${font} fill="#A1A1AA">See what your goals really cost in time.</text>
  ${pill(100, 570, 'One clock, one tap per switch')}
  ${pill(100, 630, 'Planned vs real share of your day')}
  ${pill(100, 690, 'Honest finish dates')}
  ${pill(100, 750, 'Year → month → week → day → lap')}
  ${phone('goals', 1270, 120, 280)}
  ${phone('review-week', 960, 150, 280)}
  ${phone('today-running', 760, 120, 300)}
</svg>`;
writeFileSync(join(docs, 'hero.png'), new Resvg(hero, { font: { loadSystemFonts: true } }).render().asPng());
console.log('hero.png');

// Walkthrough GIF: real screens in the order a new user meets them.
const frames = [
  ['welcome', 1800],
  ['intro-1', 1500],
  ['intro-2', 1500],
  ['intro-4', 1500],
  ['today-running', 2000],
  ['lap-sheet', 2000],
  ['goals', 2000],
  ['goal-detail', 2000],
  ['review-week', 2000],
  ['review-day', 2000],
  ['dark-today', 1800],
];
const GW = 360;
const GH = Math.round((GW * 844) / 390);
const gif = GIFEncoder();
for (const [name, delay] of frames) {
  const buf = png(name);
  const { w: iw, h: ih } = size(buf);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${GW}" height="${GH}" viewBox="0 0 ${iw} ${(iw * 844) / 390}" preserveAspectRatio="xMidYMin slice"><image width="${iw}" height="${ih}" href="data:image/png;base64,${b64(buf)}"/></svg>`;
  const img = new Resvg(svg).render();
  const rgba = new Uint8Array(img.pixels);
  const palette = quantize(rgba, 256);
  gif.writeFrame(applyPalette(rgba, palette), img.width, img.height, { palette, delay });
}
gif.finish();
writeFileSync(join(docs, 'walkthrough.gif'), gif.bytes());
console.log('walkthrough.gif');

const keep = [
  'welcome', 'intro-1', 'intro-2', 'intro-3', 'intro-4', 'intro-5',
  'today-start-tip', 'today-running', 'lap-sheet', 'goals-tip', 'goals', 'goal-detail', 'new-goal',
  'review-week', 'review-month', 'review-year', 'review-day', 'settings',
  'dark-today', 'dark-goals', 'dark-review',
];
for (const k of keep) copyFileSync(join(raw, `${k}.png`), join(docs, 'screenshots', `${k}.png`));
console.log(`${keep.length} screenshots`);
