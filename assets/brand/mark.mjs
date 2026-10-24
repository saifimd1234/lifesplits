// Source of truth for the LifeSplits mark: a stopwatch ring split into laps,
// one lap in the goal color. Run `node assets/brand/render-icons.mjs` after editing.

export const INK = '#141416';
export const GOAL = '#F26B1D';
export const LIGHT = '#F5F5F7';

const CX = 512;
const CY = 512;
const R = 290;
const STROKE = 92;
const OFFSET_Y = 36;

const SEGMENTS = [
  [6, 104, GOAL],
  [116, 206, LIGHT],
  [218, 282, '#8E8E93'],
  [294, 354, '#48484A'],
];

function point(deg, r) {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
}

function arc(a0, a1) {
  const [x0, y0] = point(a0, R);
  const [x1, y1] = point(a1, R);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** The mark as SVG elements, drawn on a 1024 canvas, scaled about the center. */
export function markSvg({ scale = 1, mono = null } = {}) {
  const color = (c) => mono ?? c;
  const [hx, hy] = point(104, 190);
  const parts = [
    ...SEGMENTS.map(([a0, a1, c]) => `<path d="${arc(a0, a1)}" fill="none" stroke="${color(c)}" stroke-width="${STROKE}"/>`),
    `<rect x="462" y="92" width="100" height="54" rx="16" fill="${color(LIGHT)}"/>`,
    `<rect x="494" y="140" width="36" height="40" fill="${color(LIGHT)}"/>`,
    `<line x1="${CX}" y1="${CY}" x2="${hx.toFixed(2)}" y2="${hy.toFixed(2)}" stroke="${color(GOAL)}" stroke-width="40" stroke-linecap="round"/>`,
    `<circle cx="${CX}" cy="${CY}" r="34" fill="${color(LIGHT)}"/>`,
  ];
  // The crown makes the art top-heavy; nudge it down to sit optically centered.
  const t = `translate(${CX} ${CY}) scale(${scale}) translate(${-CX} ${-CY + OFFSET_Y})`;
  return `<g transform="${t}">${parts.join('')}</g>`;
}

export function svgDoc({ background = null, scale = 1, mono = null } = {}) {
  const bg = background ? `<rect width="1024" height="1024" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${bg}${markSvg({ scale, mono })}</svg>`;
}

export const GEOMETRY = { CX, CY, R, STROKE, OFFSET_Y, SEGMENTS };
