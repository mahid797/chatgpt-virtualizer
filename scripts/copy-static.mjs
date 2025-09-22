import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');
const distDir = resolve(projectRoot, 'dist');

const fileMappings = [
  ['public/manifest.json', 'manifest.json'],
  ['src/ui/popup.html', 'popup.html'],
  ['src/ui/popup.css', 'popup.css'],
  ['src/content/styles.css', 'styles.css'],
];

async function copyFixedAssets() {
  for (const [srcRel, destRel] of fileMappings) {
    const src = resolve(projectRoot, srcRel);
    const dest = resolve(distDir, destRel);
    await mkdir(dirname(dest), { recursive: true });
    await cp(src, dest, { force: true });
  }
}

async function copyAssetDirectory() {
  const assetsSrc = resolve(projectRoot, 'assets');
  const assetsDest = resolve(distDir, 'assets');
  try {
    await mkdir(assetsDest, { recursive: true });
    await cp(assetsSrc, assetsDest, { recursive: true, force: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

async function main() {
  await mkdir(distDir, { recursive: true });
  await copyFixedAssets();
  await copyAssetDirectory();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
