/**
 * Simple icon generator using Node canvas or just copy logo
 * Since we can't use sharp, we'll copy the existing logo.png and rename it
 * for the required sizes. Browsers will scale them automatically.
 */
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
  console.log('✅ Created /public/icons/ directory');
}

const srcLogo = join(publicDir, 'logo.png');

// Check if macOS sips is available for crisp resizing
let hasSips = false;
try {
  execSync('which sips', { stdio: 'ignore' });
  hasSips = true;
} catch {
  hasSips = false;
}

// Generate required icon sizes
const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
sizes.forEach(size => {
  const dest = join(iconsDir, `icon-${size}.png`);
  if (hasSips) {
    try {
      execSync(`sips -z ${size} ${size} "${srcLogo}" --out "${dest}"`, { stdio: 'ignore' });
      console.log(`✅ Resized icon-${size}.png (${size}x${size})`);
      return;
    } catch {
      // fallback to copy
    }
  }
  copyFileSync(srcLogo, dest);
  console.log(`✅ Created icon-${size}.png`);
});

console.log('\n🎉 All icons generated in /public/icons/');
