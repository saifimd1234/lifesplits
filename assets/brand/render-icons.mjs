// Renders every app icon / splash PNG from mark.mjs.
// Needs @resvg/resvg-js available (e.g. `npm i --no-save @resvg/resvg-js`).
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { INK, svgDoc } from './mark.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'images');

const targets = [
  // iOS + default: full bleed, no transparency.
  { file: 'icon.png', svg: svgDoc({ background: INK }), size: 1024 },
  // Android adaptive: art inside the 66% safe zone on transparent; background is a color in app.json.
  { file: 'android-icon-foreground.png', svg: svgDoc({ scale: 0.72 }), size: 1024 },
  { file: 'android-icon-monochrome.png', svg: svgDoc({ scale: 0.72, mono: '#FFFFFF' }), size: 1024 },
  { file: 'splash-icon.png', svg: svgDoc(), size: 1024 },
  { file: 'favicon.png', svg: svgDoc({ background: INK }), size: 48 },
];

for (const t of targets) {
  writeFileSync(join(here, t.file.replace('.png', '.svg')), t.svg);
  const png = new Resvg(t.svg, { fitTo: { mode: 'width', value: t.size } }).render().asPng();
  writeFileSync(join(out, t.file), png);
  console.log(`${t.file} ${t.size}px`);
}
