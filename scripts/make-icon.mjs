// Génère build-resources/icon.ico (multi-résolution) à partir du logo SVG.
// Lancer : node scripts/make-icon.mjs
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(resolve(root, 'build-resources/logo.svg'));

const sizes = [256, 128, 64, 48, 32, 16];
const pngs = [];
for (const s of sizes) {
  pngs.push(await sharp(svg, { density: 512 }).resize(s, s).png().toBuffer());
}

const ico = await pngToIco(pngs);
writeFileSync(resolve(root, 'build-resources/icon.ico'), ico);
writeFileSync(resolve(root, 'build-resources/icon.png'), pngs[0]);
console.log('OK — icon.ico (' + ico.length + ' octets) + icon.png générés');
