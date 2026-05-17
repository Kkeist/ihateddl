// 把根目录的静态资源（index.html / css / js）同步进 www/（Capacitor 的 webDir）。
// 源码改动后跑 `npm run sync:www`（或 build:apk）再重新打包。
import { rm, mkdir, cp } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');

await rm(www, { recursive: true, force: true });
await mkdir(www, { recursive: true });
for (const item of ['index.html', 'css', 'js']) {
  await cp(join(root, item), join(www, item), { recursive: true });
}
console.log('www/ synced from index.html + css/ + js/');
