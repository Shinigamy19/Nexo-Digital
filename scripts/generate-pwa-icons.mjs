import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '..', 'src', 'assets', 'brand', 'logo.png');
const outDir = path.join(__dirname, '..', 'public', 'icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 10, g: 10, b: 15, alpha: 1 } })
    .png()
    .toFile(path.join(outDir, `icon-${size}x${size}.png`));
  console.log(`✓ icon-${size}x${size}.png`);
}

await sharp(src)
  .resize(512, 512, { fit: 'contain', background: { r: 10, g: 10, b: 15, alpha: 1 } })
  .png()
  .toFile(path.join(outDir, 'icon-maskable-512x512.png'));
console.log('✓ icon-maskable-512x512.png (maskable)');

console.log('\nAll PWA icons generated.');
