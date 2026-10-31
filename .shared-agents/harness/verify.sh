#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "==> Web lint"
npm run lint -- --max-warnings=0

echo "==> Web typecheck"
npx tsc --noEmit

echo "==> Functions lint/build"
npm --prefix functions run lint
npm --prefix functions run build

echo "==> Static export build"
npm run build

echo "==> Theme data integrity"
node --experimental-strip-types <<'NODE'
import { themeData } from './src/lib/themeData.ts';
const seen = new Map();
let total = 0;
let duplicates = 0;
for (const [category, themes] of Object.entries(themeData)) {
  const local = new Set();
  for (const theme of themes) {
    total += 1;
    if (local.has(theme)) { console.error(`Duplicate in ${category}: ${theme}`); duplicates += 1; }
    local.add(theme);
    if (seen.has(theme)) { console.error(`Duplicate across ${seen.get(theme)} / ${category}: ${theme}`); duplicates += 1; }
    else seen.set(theme, category);
  }
}
if (duplicates > 0) process.exit(1);
console.log(`OK: ${Object.keys(themeData).length} categories, ${total} unique themes`);
NODE

echo "==> Generated route integrity"
npx tsx -e "
import fs from 'node:fs';
import { themeCategories } from './src/lib/themeCategories';
const required = ['out/index.html','out/privacy.html','out/themes.html','out/icebreak.html','out/llms.txt','out/llms-full.txt','out/sitemap.xml','out/robots.txt','out/404.html'];
const missing = required.filter((file) => !fs.existsSync(file));
const categoryMissing = themeCategories.filter((c) => !fs.existsSync('out/themes/' + c.slug + '.html')).map((c) => c.slug);
if (missing.length || categoryMissing.length) {
  console.error('Missing files:', missing);
  console.error('Missing category pages:', categoryMissing);
  process.exit(1);
}
const sitemap = fs.readFileSync('out/sitemap.xml', 'utf8');
if (!sitemap.includes('/privacy') || !sitemap.includes('/themes/hobby')) process.exit(1);
const notFound = fs.readFileSync('out/404.html', 'utf8');
if (!notFound.includes('noindex')) process.exit(1);
console.log('OK: ' + (required.length + themeCategories.length) + ' generated routes verified');
"

echo "==> End-to-end game tests"
if [ -f tests/e2e/run_all.ts ]; then
  npx tsx tests/e2e/run_all.ts
else
  echo "SKIP: tests/e2e/run_all.ts is not present in this checkout"
fi

echo "==> All verification checks passed"
