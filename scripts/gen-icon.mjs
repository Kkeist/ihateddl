// 把 assets/ 下的图标 SVG 渲染成 @capacitor/assets 需要的 1024px PNG。
// 跑完再 `npx @capacitor/assets generate --android` 生成各密度 mipmap。
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const A = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const jobs = [
  ['icon-source.svg', 'icon-only.png'],
  ['icon-foreground.svg', 'icon-foreground.png'],
  ['icon-background.svg', 'icon-background.png'],
];
for (const [svg, png] of jobs) {
  const buf = await readFile(join(A, svg));
  await sharp(buf, { density: 384 }).resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(join(A, png));
  console.log('rendered ' + png);
}
