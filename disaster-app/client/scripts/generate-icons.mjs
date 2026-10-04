/**
 * Generates the PWA icon set without any image dependency.
 *
 * A minimal PNG encoder is implemented on top of Node's built-in zlib: the
 * icons are rasterised pixel by pixel, then written as a single-IDAT,
 * 8-bit RGBA PNG. Run with `npm run icons --prefix client`.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

/* ------------------------------------------------------------ PNG encoder */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

/** Encodes an RGBA pixel buffer (width * height * 4) as a PNG. */
function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: truecolour with alpha
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with filter type 0 (None).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ------------------------------------------------------------- rasteriser */

const NAVY = [11, 18, 32, 255];
const RED = [220, 38, 38, 255];
const WHITE = [255, 255, 255, 255];

function setPixel(buffer, width, x, y, colour) {
  const offset = (y * width + x) * 4;
  buffer[offset] = colour[0];
  buffer[offset + 1] = colour[1];
  buffer[offset + 2] = colour[2];
  buffer[offset + 3] = colour[3];
}

/**
 * Draws a rounded-square navy badge containing a red warning triangle with a
 * white exclamation mark. Supersampling keeps the edges smooth.
 */
function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.2;

  // Triangle vertices in normalised coordinates.
  const apex = { x: 0.5, y: 0.22 };
  const left = { x: 0.16, y: 0.78 };
  const right = { x: 0.84, y: 0.78 };

  const sign = (ax, ay, bx, by, cx, cy) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);

  const inTriangle = (x, y) => {
    const d1 = sign(x, y, apex.x, apex.y, left.x, left.y);
    const d2 = sign(x, y, left.x, left.y, right.x, right.y);
    const d3 = sign(x, y, right.x, right.y, apex.x, apex.y);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  };

  const inRoundedSquare = (px, py) => {
    const insetX = Math.min(px, size - 1 - px);
    const insetY = Math.min(py, size - 1 - py);
    if (insetX >= radius || insetY >= radius) return true;
    const dx = radius - insetX;
    const dy = radius - insetY;
    return dx * dx + dy * dy <= radius * radius;
  };

  // Exclamation mark geometry, normalised.
  const barX = [0.47, 0.53];
  const barY = [0.38, 0.6];
  const dotCentre = { x: 0.5, y: 0.685 };
  const dotRadius = 0.035;

  const SAMPLES = 3;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let rTotal = 0;
      let gTotal = 0;
      let bTotal = 0;
      let aTotal = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const px = x + (sx + 0.5) / SAMPLES;
          const py = y + (sy + 0.5) / SAMPLES;
          const nx = px / size;
          const ny = py / size;

          let colour = [0, 0, 0, 0];
          if (inRoundedSquare(px, py)) {
            colour = NAVY;
            if (inTriangle(nx, ny)) {
              colour = RED;
              const inBar = nx >= barX[0] && nx <= barX[1] && ny >= barY[0] && ny <= barY[1];
              const dx = nx - dotCentre.x;
              const dy = ny - dotCentre.y;
              const inDot = dx * dx + dy * dy <= dotRadius * dotRadius;
              if (inBar || inDot) colour = WHITE;
            }
          }

          rTotal += colour[0];
          gTotal += colour[1];
          bTotal += colour[2];
          aTotal += colour[3];
        }
      }

      const count = SAMPLES * SAMPLES;
      setPixel(rgba, size, x, y, [
        Math.round(rTotal / count),
        Math.round(gTotal / count),
        Math.round(bTotal / count),
        Math.round(aTotal / count)
      ]);
    }
  }

  return encodePng(size, size, rgba);
}

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Disaster management">
  <rect width="64" height="64" rx="13" fill="#0B1220"/>
  <path d="M32 14 L54 50 H10 Z" fill="#DC2626"/>
  <rect x="30" y="24" width="4" height="14" rx="2" fill="#ffffff"/>
  <circle cx="32" cy="43" r="2.4" fill="#ffffff"/>
</svg>
`;

mkdirSync(publicDir, { recursive: true });

for (const size of [192, 512]) {
  const file = path.join(publicDir, `pwa-${size}x${size}.png`);
  writeFileSync(file, drawIcon(size));
  console.log(`[icons] wrote ${path.relative(process.cwd(), file)}`);
}

const svgPath = path.join(publicDir, 'favicon.svg');
writeFileSync(svgPath, FAVICON_SVG);
console.log(`[icons] wrote ${path.relative(process.cwd(), svgPath)}`);
