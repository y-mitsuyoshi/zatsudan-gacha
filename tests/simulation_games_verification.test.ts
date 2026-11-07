import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_COUNTS } from '../src/lib/siteCounts';

const ROOT = path.resolve(__dirname, '..');
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

const GAMES = [
  { slug: 'ball-multiply', component: 'BallMultiplyGame' },
  { slug: 'domino-cascade', component: 'DominoCascadeGame' },
  { slug: 'sand-flow', component: 'SandFlowGame' },
  { slug: 'bubble-merge', component: 'BubbleMergeGame' },
  { slug: 'gravity-orbit', component: 'GravityOrbitGame' },
];

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Simulation games', () => {
  it('has all 5 routes, client components, JSON-LD, metadata, and no emojis', () => {
    for (const game of GAMES) {
      const pagePath = `src/app/${game.slug}/page.tsx`;
      const componentPath = `src/components/sims/${game.slug}/${game.component}.tsx`;
      assert.ok(fs.existsSync(path.join(ROOT, pagePath)), `missing ${pagePath}`);
      assert.ok(fs.existsSync(path.join(ROOT, componentPath)), `missing ${componentPath}`);
      const page = read(pagePath);
      const component = read(componentPath);
      assert.ok(page.includes('SeoContentSection'), `${pagePath} must use SeoContentSection`);
      assert.ok(page.includes('buildGameJsonLd'), `${pagePath} must emit game JSON-LD`);
      assert.ok(page.includes('canonical:') && page.includes(game.slug), `${pagePath} has wrong canonical`);
      assert.ok(page.includes('openGraph') && page.includes('twitter'), `${pagePath} needs OGP metadata`);
      assert.ok(component.includes("'use client'") || component.includes('"use client"'), `${componentPath} must be a client component`);
      assert.ok(!page.includes('fetch('), `${pagePath} must not fetch data`);
      assert.ok(!component.includes('fetch('), `${componentPath} must not fetch data`);
      assert.ok(!EMOJI_REGEX.test(page), `${pagePath} contains an emoji`);
      assert.ok(!EMOJI_REGEX.test(component), `${componentPath} contains an emoji`);
    }
  });

  it('registers every simulation game in the hub, sitemap, llms, footer, and harness', () => {
    const hub = read('src/app/games/page.tsx');
    const sitemap = read('src/app/sitemap.ts');
    const llms = read('src/app/llms.txt/route.ts');
    const llmsFull = read('src/app/llms-full.txt/route.ts');
    const footer = read('src/components/Footer.tsx');
    const harness = read('.shared-agents/harness/verify.sh');
    for (const game of GAMES) {
      assert.ok(hub.includes(`/${game.slug}`), `games hub missing /${game.slug}`);
      assert.ok(sitemap.includes(`/${game.slug}`), `sitemap missing /${game.slug}`);
      assert.ok(llms.includes(`/${game.slug}`), `llms.txt missing /${game.slug}`);
      assert.ok(llmsFull.includes(`/${game.slug}`), `llms-full.txt missing /${game.slug}`);
      assert.ok(harness.includes(`out/${game.slug}.html`), `harness missing /${game.slug}`);
    }
    assert.ok(hub.includes('id="simulation-games"'));
    assert.ok(footer.includes('/games#simulation-games'));
    assert.ok(llmsFull.includes('全49作品'));
    assert.equal(SITE_COUNTS.games, 49);
    assert.equal(SITE_COUNTS.simulationGames, 5);
    assert.equal(SITE_COUNTS.boardGames, 18);
    assert.equal(SITE_COUNTS.cardGames, 5);
  });
});
