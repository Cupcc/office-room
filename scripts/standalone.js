import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Bundle the production JS and CSS into one file that also works via file://.
const output = resolve('dist');
let html = await readFile(resolve(output, 'index.html'), 'utf8');
const script = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const style = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!script || !style) throw new Error('Production entry files could not be found.');
const js = await readFile(resolve(output, script[1].replace(/^\//, '')), 'utf8');
const css = await readFile(resolve(output, style[1].replace(/^\//, '')), 'utf8');
html = html.replace(script[0], () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(style[0], () => `<style>${css}</style>`);
await writeFile(resolve(output, 'office.html'), html);
console.log('Standalone HTML: dist/office.html (open directly in a browser)');
const deskHtml = html.replace('<title>方寸 · 玻璃办公室</title>', '<title>木纹侧柜办公桌 · 1400 × 700 × 750 mm</title>')
  .replace('<div id="app"></div>', '<div id="app" data-default-model="office-desk-1400"></div>');
await writeFile(resolve(output, 'desk.html'), deskHtml);
console.log('Standalone desk preview: dist/desk.html');
const chairHtml = html.replace('<title>方寸 · 玻璃办公室</title>', '<title>云坐 Z1 人体工学椅 · 灰框灰网脚托款</title>')
  .replace('<div id="app"></div>', '<div id="app" data-default-model="office-chair-z1"></div>');
await writeFile(resolve(output, 'chair.html'), chairHtml);
console.log('Standalone chair preview: dist/chair.html');
