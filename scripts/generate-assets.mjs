import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ICON_SIZE = 1024;
const SPLASH_SIZE = 1024;
const BRAND_THEME = 'emerald';
const GRID = 100;

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift) => Math.round(((n >> shift) & 0xff) * (1 - amount));
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`;
}

const RING = { cx: 50, cy: 50, r: 33, weight: 12.5, squircle: 0.62, from: 22, to: 352 };
const PIECES = [22, 34, 18, 34, 18, 34, 30];
const GAP = 4;
const CROSSBAR = { y: 59.5, from: 50, to: 71 };

function ringPoint(deg) {
  const t = (deg * Math.PI) / 180;
  const edge = (v) => Math.sign(v) * Math.abs(v) ** RING.squircle;
  return [RING.cx + RING.r * edge(Math.cos(t)), RING.cy - RING.r * edge(Math.sin(t))];
}

const SAMPLES = 1440;
const RULER = Array.from({ length: SAMPLES + 1 }, (_, i) => RING.from + ((RING.to - RING.from) * i) / SAMPLES).map(
  (deg, i, degrees) => {
    const [x, y] = ringPoint(deg);
    return { deg, x, y, at: i === 0 ? 0 : Math.hypot(x - ringPoint(degrees[i - 1])[0], y - ringPoint(degrees[i - 1])[1]) };
  }
);
RULER.forEach((stop, i) => {
  stop.at += i === 0 ? 0 : RULER[i - 1].at;
});
const RING_LENGTH = RULER[SAMPLES].at;

function angleAt(distance) {
  const i = RULER.findIndex((stop) => stop.at >= distance);
  if (i <= 0) return RING.from;
  const previous = RULER[i - 1];
  const span = RULER[i].at - previous.at;
  return previous.deg + (RULER[i].deg - previous.deg) * (span === 0 ? 0 : (distance - previous.at) / span);
}

function piecePath(from, to) {
  const start = angleAt(from + RING.weight / 2);
  const end = angleAt(to - RING.weight / 2);
  const steps = Math.max(2, Math.round((end - start) / 2));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const [x, y] = ringPoint(start + ((end - start) * i) / steps);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

function arcPaths() {
  const total = PIECES.reduce((sum, share) => sum + share, 0);
  const scale = (RING_LENGTH - GAP * (PIECES.length - 1)) / total;
  let cursor = 0;
  return PIECES.map((share) => {
    const from = cursor;
    cursor += share * scale + GAP;
    return piecePath(from, from + share * scale);
  });
}

function mark(color) {
  const stroke = `stroke="${color}" stroke-width="${RING.weight}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const paths = [
    ...arcPaths(),
    `M ${CROSSBAR.from} ${CROSSBAR.y} L ${CROSSBAR.to} ${CROSSBAR.y}`,
  ];
  return `<g ${stroke}>${paths.map((d) => `<path d="${d}" />`).join('')}</g>`;
}

function field(size, palette) {
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.primary}" />
      <stop offset="1" stop-color="${shade(palette.primary, 0.42)}" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)" />`;
}

function iconSvg(palette) {
  const inset = ICON_SIZE * 0.14;
  const scale = (ICON_SIZE - inset * 2) / GRID;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}">
  ${field(ICON_SIZE, palette)}
  <g transform="translate(${inset},${inset}) scale(${scale})">${mark(palette.background)}</g>
</svg>`;
}

function splashSvg(palette) {
  const inset = SPLASH_SIZE * 0.06;
  const scale = (SPLASH_SIZE - inset * 2) / GRID;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SPLASH_SIZE}" height="${SPLASH_SIZE}" viewBox="0 0 ${SPLASH_SIZE} ${SPLASH_SIZE}">
  <g transform="translate(${inset},${inset}) scale(${scale})">${mark(palette.primary)}</g>
</svg>`;
}

async function render(svg, out, opaque) {
  const pipeline = sharp(Buffer.from(svg));
  await (opaque ? pipeline.flatten({ background: '#000000' }) : pipeline).png().toFile(out);
}

const palettes = JSON.parse(await readFile(join(root, 'assets', 'themes.json'), 'utf8'));
const iconDir = join(root, 'assets', 'icons');
await mkdir(iconDir, { recursive: true });

for (const [name, schemes] of Object.entries(palettes)) {
  await render(iconSvg(schemes.dark), join(iconDir, `${name}.png`), true);
}
await render(iconSvg(palettes[BRAND_THEME].dark), join(root, 'assets', 'icon.png'), true);
for (const scheme of ['light', 'dark']) {
  await render(splashSvg(palettes[BRAND_THEME][scheme]), join(root, 'assets', `splash-${scheme}.png`), false);
}

process.stdout.write(`generated ${Object.keys(palettes).length} app icons and 2 splash images\n`);
