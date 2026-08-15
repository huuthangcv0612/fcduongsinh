/**
 * Simple icon generator using Node canvas or just copy logo
 * Since we can't use sharp, we'll copy the existing logo.png and rename it
 * for the required sizes. Browsers will scale them automatically.
 */
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
  console.log('✅ Created /public/icons/ directory');
}

const srcLogo = join(publicDir, 'logo.png');

// Copy logo to required icon sizes (browser scales automatically)
const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
sizes.forEach(size => {
  const dest = join(iconsDir, `icon-${size}.png`);
  copyFileSync(srcLogo, dest);
  console.log(`✅ Created icon-${size}.png`);
});

console.log('\n🎉 All icons generated in /public/icons/');
