import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_COUNTS } from '../src/lib/siteCounts';

const ROOT = path.resolve(__dirname, '..');
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;
const GAMES = [
  { slug: 'roulette-casino', component: 'GrandRouletteGame' },
  { slug: 'baccarat', component: 'BaccaratRoyalGame' },
  { slug: 'video-poker', component: 'VideoPokerLoungeGame' },
  { slug: 'dice-casino', component: 'DiceCasinoGame' },
  { slug: 'keno-lounge', component: 'KenoLoungeGame' },
];

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Casino games', () => {
  it('has all 5 routes, client components, SEO, OGP, and no emojis', () => {
    for (const game of GAMES) {
      const pagePath = `src/app/${game.slug}/page.tsx`;
      const componentPath = `src/components/casino/${game.slug}/${game.component}.tsx`;
      assert.ok(fs.existsSync(path.join(ROOT, pagePath)), `missing ${pagePath}`);
      assert.ok(fs.existsSync(path.join(ROOT, componentPath)), `missing ${componentPath}`);
      const page = read(pagePath);
      const component = read(componentPath);
      assert.ok(page.includes('SeoContentSection'), `${pagePath} must use SeoContentSection`);
      assert.ok(page.includes('buildGameJsonLd'), `${pagePath} must emit JSON-LD`);
      assert.ok(page.includes('openGraph') && page.includes('twitter'), `${pagePath} needs OGP metadata`);
      assert.ok(page.includes(`/${game.slug}`), `${pagePath} missing canonical slug`);
      assert.ok(component.includes("'use client'") || component.includes('"use client"'), `${componentPath} must be client`);
      assert.ok(!page.includes('fetch('), `${pagePath} must not fetch`);
      assert.ok(!component.includes('fetch('), `${componentPath} must not fetch`);
      assert.ok(!EMOJI_REGEX.test(page), `${pagePath} contains an emoji`);
      assert.ok(!EMOJI_REGEX.test(component), `${componentPath} contains an emoji`);
    }
  });

  it('registers all casino games in the hub, sitemap, llms, footer, and harness', () => {
    const hub = read('src/app/games/page.tsx');
    const sitemap = read('src/app/sitemap.ts');
    const llms = read('src/app/llms.txt/route.ts');
    const llmsFull = read('src/app/llms-full.txt/route.ts');
    const footer = read('src/components/Footer.tsx');
    const harness = read('.shared-agents/harness/verify.sh');
    for (const game of GAMES) {
      assert.ok(hub.includes(`/${game.slug}`), `hub missing ${game.slug}`);
      assert.ok(sitemap.includes(`/${game.slug}`), `sitemap missing ${game.slug}`);
      assert.ok(llms.includes(`/${game.slug}`), `llms missing ${game.slug}`);
      assert.ok(llmsFull.includes(`/${game.slug}`), `llms-full missing ${game.slug}`);
      assert.ok(harness.includes(`out/${game.slug}.html`), `harness missing ${game.slug}`);
    }
    assert.ok(hub.includes('id="casino-games"'));
    assert.ok(footer.includes('/games#casino-games'));
    assert.equal(SITE_COUNTS.games, 49);
    assert.equal(SITE_COUNTS.casinoGames, 5);
  });
});
