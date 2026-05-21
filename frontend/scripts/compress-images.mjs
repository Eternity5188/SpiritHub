import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import path from 'path';

const PUBLIC = new URL('../public', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const TARGETS = ['background_logo.png', 'Colab.png', 'AI_kits.png', 'abroad.png', 'logo.png'];

async function compress(file) {
  const src = path.join(PUBLIC, file);
  const webp = path.join(PUBLIC, file.replace(/\.png$/i, '.webp'));

  const before = (await stat(src)).size;
  await sharp(src)
    .webp({ quality: 82, effort: 4 })
    .toFile(webp);
  const after = (await stat(webp)).size;

  const saved = ((1 - after / before) * 100).toFixed(1);
  console.log(`${file.padEnd(22)} ${(before/1024).toFixed(0).padStart(6)}KB → ${(after/1024).toFixed(0).padStart(5)}KB  (-${saved}%)`);
}

console.log('\n压缩图片 PNG → WebP\n');
for (const f of TARGETS) {
  await compress(f).catch(e => console.error(`跳过 ${f}: ${e.message}`));
}
console.log('\n完成。\n');
