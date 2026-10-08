export const MAX_IMAGE_SIDE = 2048;
export const THUMBNAIL_SIDE = 300;
export const JPEG_QUALITY = 0.85;
export const TILE_OVERLAP = 0.15;

export interface PixelSize {
  readonly width: number;
  readonly height: number;
}

export interface PixelRect extends PixelSize {
  readonly x: number;
  readonly y: number;
}

export interface EncodedJpeg {
  readonly dataUrl: string;
  readonly width: number;
  readonly height: number;
}

/** Scales so the long side is at most `maxSide`, keeping aspect ratio. */
export function scaledDimensions(
  width: number,
  height: number,
  maxSide = MAX_IMAGE_SIDE,
): PixelSize {
  if (width <= 0 || height <= 0) return { width: 1, height: 1 };
  const long = Math.max(width, height);
  if (long <= maxSide) return { width, height };
  const scale = maxSide / long;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** 2×2 grid with overlapping tiles (default 15% overlap on each axis). */
export function tileRects2x2(
  width: number,
  height: number,
  overlap = TILE_OVERLAP,
): readonly PixelRect[] {
  const tileW = Math.ceil(width / (2 - overlap));
  const tileH = Math.ceil(height / (2 - overlap));
  const stepX = Math.floor(tileW * (1 - overlap));
  const stepY = Math.floor(tileH * (1 - overlap));
  const rects: PixelRect[] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const x = Math.min(col * stepX, Math.max(0, width - tileW));
      const y = Math.min(row * stepY, Math.max(0, height - tileH));
      rects.push({
        x,
        y,
        width: Math.min(tileW, width - x),
        height: Math.min(tileH, height - y),
      });
    }
  }
  return rects;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The image could not be loaded.'));
    };
    img.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality = JPEG_QUALITY): EncodedJpeg {
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { dataUrl, width: canvas.width, height: canvas.height };
}

function drawToCanvas(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  sx = 0,
  sy = 0,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, dw, dh);
  return canvas;
}

export function encodeImageElement(img: HTMLImageElement, maxSide = MAX_IMAGE_SIDE): EncodedJpeg {
  const size = scaledDimensions(img.naturalWidth, img.naturalHeight, maxSide);
  const canvas = drawToCanvas(img, img.naturalWidth, img.naturalHeight, size.width, size.height);
  return canvasToJpeg(canvas);
}

export async function encodeImageFile(file: File, maxSide = MAX_IMAGE_SIDE): Promise<EncodedJpeg> {
  const img = await loadImageFromFile(file);
  return encodeImageElement(img, maxSide);
}

export async function encodeThumbnail(dataUrl: string): Promise<EncodedJpeg> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Thumbnail source invalid.'));
    el.src = dataUrl;
  });
  return encodeImageElement(img, THUMBNAIL_SIDE);
}

export async function extractDetailTiles(overview: EncodedJpeg): Promise<readonly EncodedJpeg[]> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Overview invalid for tiles.'));
    el.src = overview.dataUrl;
  });
  const rects = tileRects2x2(overview.width, overview.height);
  const tiles: EncodedJpeg[] = [];
  for (const rect of rects) {
    const scaleX = img.naturalWidth / overview.width;
    const scaleY = img.naturalHeight / overview.height;
    const sx = Math.round(rect.x * scaleX);
    const sy = Math.round(rect.y * scaleY);
    const sw = Math.round(rect.width * scaleX);
    const sh = Math.round(rect.height * scaleY);
    const canvas = drawToCanvas(img, sw, sh, rect.width, rect.height, sx, sy);
    tiles.push(canvasToJpeg(canvas));
  }
  return tiles;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header?.match(/data:([^;]+)/u)?.[1] ?? 'image/jpeg';
  const binary = atob(base64 ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
