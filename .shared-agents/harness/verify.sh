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
import { guides } from './src/lib/guideData';
const required = ['out/index.html','out/privacy.html','out/themes.html','out/icebreak.html','out/games.html','out/tools.html','out/about.html','out/guides.html','out/profile-maker.html','out/isekai-status.html','out/excuse-generator.html','out/station-sign-maker.html','out/minority-word.html','out/ishin-denshin.html','out/ng-word.html','out/kinku-talk.html','out/rank-guess.html','out/word-chain.html','out/llms.txt','out/llms-full.txt','out/sitemap.xml','out/robots.txt','out/404.html'];
const missing = required.filter((file) => !fs.existsSync(file));
const categoryMissing = themeCategories.filter((c) => !fs.existsSync('out/themes/' + c.slug + '.html')).map((c) => c.slug);
const guideMissing = guides.filter((g) => !fs.existsSync('out/guides/' + g.slug + '.html')).map((g) => g.slug);
if (missing.length || categoryMissing.length || guideMissing.length) {
  console.error('Missing files:', missing);
  console.error('Missing category pages:', categoryMissing);
  console.error('Missing guide pages:', guideMissing);
  process.exit(1);
}
const sitemap = fs.readFileSync('out/sitemap.xml', 'utf8');
if (!['/privacy','/themes/hobby','/games','/tools','/about','/guides','/guides/one-on-one','/minority-word','/ishin-denshin','/ng-word','/kinku-talk','/rank-guess','/word-chain'].every((path) => sitemap.includes(path))) process.exit(1);
const notFound = fs.readFileSync('out/404.html', 'utf8');
if (!notFound.includes('noindex')) process.exit(1);
const gamePages = ['out/barricade-defense.html','out/shachiku-shooting.html','out/shachiku-spiral.html','out/shachiku-survivor.html','out/shachiku-jinro.html','out/shachiku-sugoroku.html','out/shachiku-catapult.html','out/shachiku-wire.html','out/shachiku-stack.html','out/mortgage-life.html'];
if (gamePages.some((file) => !fs.readFileSync(file, 'utf8').includes('VideoGame'))) process.exit(1);
const toolPages = ['out/profile-maker.html','out/isekai-status.html','out/excuse-generator.html','out/station-sign-maker.html'];
if (toolPages.some((file) => !fs.readFileSync(file, 'utf8').includes('WebApplication'))) process.exit(1);
const guidePages = guides.map((g) => 'out/guides/' + g.slug + '.html');
if (guidePages.some((file) => !fs.readFileSync(file, 'utf8').includes('HowTo'))) process.exit(1);
const partyPages = ['out/minority-word.html','out/ishin-denshin.html','out/ng-word.html','out/kinku-talk.html','out/rank-guess.html','out/word-chain.html'];
if (partyPages.some((file) => !fs.readFileSync(file, 'utf8').includes('WebApplication') || !fs.readFileSync(file, 'utf8').includes('HowTo'))) process.exit(1);
if (fs.readFileSync('out/index.html', 'utf8').includes('fonts.googleapis.com')) process.exit(1);
console.log('OK: ' + (required.length + themeCategories.length + guides.length) + ' generated routes verified');
"

echo "==> AI provider and secret checks"
if grep -RIn "GEMINI_API_KEY\|generativelanguage.googleapis.com\|Google Gemini\|Gemini API" functions/src src .env.example README.md FIREBASE_SETUP.md; then
  echo "ERROR: legacy Gemini provider reference remains"
  exit 1
fi
if grep -RIn "OPENCODE_GO_API_KEY=\"[^Y]" .env.example; then
  echo "ERROR: .env.example must not contain a real API key"
  exit 1
fi
if grep -RIl "OPENCODE_GO_API_KEY\|opencode.ai/inference/go" out; then
  echo "ERROR: server-side AI secret or endpoint leaked into static output"
  exit 1
fi
if git ls-files | grep -E '(^|/)\.env(\.|$)' | grep -v '\.env\.example'; then
  echo "ERROR: environment file is tracked by git"
  exit 1
fi
if ! grep -q "allow read, write: if false" firestore.rules; then
  echo "ERROR: Firestore client access is not denied"
  exit 1
fi
if ! grep -q "deepseek-v4.1-flash" src/lib/opencode.ts functions/src/opencode.ts; then
  echo "ERROR: expected OpenCode Go model is not configured"
  exit 1
fi
echo "OK: provider migration and secret checks passed"

echo "==> End-to-end game tests"
if [ -f tests/e2e/run_all.ts ]; then
  npx tsx tests/e2e/run_all.ts
else
  echo "SKIP: tests/e2e/run_all.ts is not present in this checkout"
fi
if [ -f tests/mortgage_simulation_verification.test.ts ]; then
  npx tsx tests/mortgage_simulation_verification.test.ts
fi

echo "==> All verification checks passed"
