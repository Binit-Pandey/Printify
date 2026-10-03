/**
 * Reads an image file chosen by the user and returns it as a data URL.
 *
 * Phone photos are several megabytes. Storing one verbatim would bloat the
 * settings row, slow down every settings fetch (the value is returned with the
 * company record) and make each exported invoice PDF enormous — the logo is
 * printed at roughly 60x60 points. Downscaling to a sane bounding box first
 * keeps all of that small.
 */

/** Longest edge of the stored image, in pixels. */
const MAX_EDGE = 512;

export const MAX_LOGO_BYTES = 8 * 1024 * 1024;

export class LogoError extends Error {}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new LogoError('That file could not be read'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new LogoError('That file is not a readable image'));
    img.src = src;
  });
}

/**
 * Converts a picked image file into a compact data URL suitable for storing in
 * the settings record.
 */
export async function fileToLogoDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new LogoError('Please choose an image file (PNG, JPG, SVG or WebP)');
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new LogoError('That image is too large. Please pick one under 8 MB.');
  }

  const raw = await readAsDataUrl(file);

  // SVG is vector artwork: re-encoding it through a canvas would rasterise it
  // and can fail outright, so keep the original markup.
  if (file.type === 'image/svg+xml') return raw;

  let img: HTMLImageElement;
  try {
    img = await loadImage(raw);
  } catch {
    throw new LogoError('That file is not a readable image');
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new LogoError('This system cannot process the image');

  // Logos sit on white paper in invoices; flattening transparency avoids black
  // boxes in exported PDFs.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  // PNG keeps crisp edges for line art; JPEG is far smaller for photos.
  const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';
  return canvas.toDataURL(hasAlpha ? 'image/png' : 'image/jpeg', 0.92);
}

/** True when the stored value is an uploaded image rather than a URL/path. */
export function isUploadedLogo(value: string | undefined): boolean {
  return typeof value === 'string' && value.startsWith('data:image/');
}
