import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'public', 'icons');
const svgPath = join(iconsDir, 'icon.svg');

const sizes: Array<{ name: string; size: number; maskable?: boolean }> = [
  { name: 'pwa-64x64.png', size: 64 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'maskable-icon-512x512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
];

async function main(): Promise<void> {
  await mkdir(iconsDir, { recursive: true });
  const svg = await readFile(svgPath);
  for (const { name, size, maskable } of sizes) {
    let pipeline = sharp(svg).resize(size, size);
    if (maskable) {
      pipeline = pipeline.extend({
        top: Math.round(size * 0.1),
        bottom: Math.round(size * 0.1),
        left: Math.round(size * 0.1),
        right: Math.round(size * 0.1),
        background: '#0e0f13',
      });
    }
    await pipeline.png().toFile(join(iconsDir, name));
  }
  const favicon = await sharp(svg).resize(32, 32).png().toBuffer();
  await writeFile(join(iconsDir, 'favicon.ico'), favicon);
  console.log('Icons written to public/icons/');
}

void main();
