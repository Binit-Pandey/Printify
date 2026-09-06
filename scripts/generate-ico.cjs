// Generates build/icon.ico (multi-size, 32-bit BMP entries) from build/icon.png.
// Runs on plain Node — no Electron/X server required.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SRC = path.join(__dirname, '..', 'build', 'icon.png');
const OUT = path.join(__dirname, '..', 'build', 'icon.ico');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

function downscale(src, srcW, srcH, dstW, dstH) {
  const dst = Buffer.alloc(dstW * dstH * 4);
  const xs = srcW / dstW;
  const ys = srcH / dstH;
  for (let y = 0; y < dstH; y += 1) {
    const y0 = Math.floor(y * ys);
    const y1 = Math.min(srcH - 1, Math.floor((y + 1) * ys));
    for (let x = 0; x < dstW; x += 1) {
      const x0 = Math.floor(x * xs);
      const x1 = Math.min(srcW - 1, Math.floor((x + 1) * xs));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy <= y1; sy += 1) {
        for (let sx = x0; sx <= x1; sx += 1) {
          const i = (sy * srcW + sx) * 4;
          r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3];
          n += 1;
        }
      }
      const o = (y * dstW + x) * 4;
      dst[o] = Math.round(r / n);
      dst[o + 1] = Math.round(g / n);
      dst[o + 2] = Math.round(b / n);
      dst[o + 3] = Math.round(a / n);
    }
  }
  return dst;
}

// BMP (BITMAPINFOHEADER) payload for an ICO entry. Rows are bottom-up BGRA,
// followed by a 1bpp AND mask (kept blank => use alpha channel).
function bmpEntry(pixels, size) {
  const xorSize = size * size * 4;
  const maskRowBytes = Math.ceil(size / 32) * 4;
  const maskSize = maskRowBytes * size;
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);          // biSize
  header.writeInt32LE(size, 4);         // biWidth
  header.writeInt32LE(size * 2, 8);     // biHeight (XOR + AND)
  header.writeUInt16LE(1, 12);          // biPlanes
  header.writeUInt16LE(32, 14);         // biBitCount
  header.writeUInt32LE(0, 16);          // biCompression (BI_RGB)
  header.writeUInt32LE(xorSize + maskSize, 20); // biSizeImage

  const out = Buffer.alloc(header.length + xorSize + maskSize);
  header.copy(out, 0);

  // Bottom-up BGRA pixel rows (ICO stores straight alpha, no pre-multiply).
  for (let row = 0; row < size; row += 1) {
    const srcY = size - 1 - row;
    const srcOff = srcY * size * 4;
    const dstOff = 40 + row * size * 4;
    for (let x = 0; x < size; x += 1) {
      const i = srcOff + x * 4;
      const o = dstOff + x * 4;
      out[o] = pixels[i + 2];       // B
      out[o + 1] = pixels[i + 1];   // G
      out[o + 2] = pixels[i];       // R
      out[o + 3] = pixels[i + 3];   // A
    }
  }

  // AND mask: zeroed -> fully transparent/opaque per alpha channel.
  const maskOff = 40 + xorSize;
  out.fill(0, maskOff, maskOff + maskSize);
  return out;
}

function buildIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);  // reserved
  header.writeUInt16LE(1, 2);  // type: icon
  header.writeUInt16LE(count, 4);

  const entries = Buffer.alloc(count * 16);
  let offset = 6 + count * 16;

  for (let i = 0; i < count; i += 1) {
    const { size, data } = images[i];
    const e = i * 16;
    entries[e] = size >= 256 ? 0 : size;      // width (0 == 256)
    entries[e + 1] = size >= 256 ? 0 : size;  // height
    entries[e + 2] = 0;                       // palette
    entries[e + 3] = 0;                       // reserved
    entries.writeUInt16LE(1, e + 4);          // planes
    entries.writeUInt16LE(32, e + 6);         // bpp
    entries.writeUInt32LE(data.length, e + 8);
    entries.writeUInt32LE(offset, e + 12);
    offset += data.length;
  }

  return Buffer.concat([header, entries, ...images.map((i) => i.data)]);
}

const { width, height, data } = PNG.sync.read(fs.readFileSync(SRC));
if (width !== height) {
  console.error(`[icons] Source must be square (got ${width}x${height}).`);
  process.exit(1);
}

const images = SIZES.map((size) => ({
  size,
  data: bmpEntry(downscale(data, width, height, size, size), size),
}));

fs.writeFileSync(OUT, buildIco(images));
console.log(`[icons] Wrote ${OUT} (${SIZES.join(',')}px)`);