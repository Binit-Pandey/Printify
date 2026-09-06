// Generates a square 512x512 application icon (build/icon.png) from the
// existing brand logo (public/logo/logo.png) using a centre-crop + nearest
// neighbour downscale. electron-builder derives .ico/.icns/AppImage icons from
// this single PNG at packaging time.
'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'public', 'logo', 'logo.png');
const outDir = path.join(root, 'build');
const out = path.join(outDir, 'icon.png');
const TARGET = 512;

if (!fs.existsSync(src)) {
  console.error(`[icons] Source logo not found: ${src}`);
  process.exit(1);
}

const png = PNG.sync.read(fs.readFileSync(src));
const size = Math.min(png.width, png.height);
const offX = Math.floor((png.width - size) / 2);
const offY = Math.floor((png.height - size) / 2);

// Centre-crop to a square.
const square = new PNG({ width: size, height: size });
for (let y = 0; y < size; y += 1) {
  for (let x = 0; x < size; x += 1) {
    const si = ((offY + y) * png.width + (offX + x)) << 2;
    const di = (y * size + x) << 2;
    square.data[di] = png.data[si];
    square.data[di + 1] = png.data[si + 1];
    square.data[di + 2] = png.data[si + 2];
    square.data[di + 3] = png.data[si + 3];
  }
}

// Downscale to TARGET x TARGET (nearest neighbour is fine for an app icon).
const scaled = new PNG({ width: TARGET, height: TARGET });
for (let y = 0; y < TARGET; y += 1) {
  for (let x = 0; x < TARGET; x += 1) {
    const sx = Math.floor((x * size) / TARGET);
    const sy = Math.floor((y * size) / TARGET);
    const si = (sy * size + sx) << 2;
    const di = (y * TARGET + x) << 2;
    scaled.data[di] = square.data[si];
    scaled.data[di + 1] = square.data[si + 1];
    scaled.data[di + 2] = square.data[si + 2];
    scaled.data[di + 3] = square.data[si + 3];
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(out, PNG.sync.write(scaled));
console.log(`[icons] Wrote ${out} (${TARGET}x${TARGET})`);