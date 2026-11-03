import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GAME_SEO_DATA, buildGameJsonLd, type GameSeoKey } from '../src/lib/gameSeoData';

const ROOT = path.resolve(__dirname, '..');

const OWNED_FILES = [
  'src/app/shachiku-catapult/page.tsx',
  'src/components/catapult/ShachikuCatapultGame.tsx',
  'src/app/shachiku-wire/page.tsx',
  'src/components/wire/ShachikuWireGame.tsx',
  'src/app/shachiku-stack/page.tsx',
  'src/components/stack/ShachikuStackGame.tsx',
  'src/lib/gameSeoData.ts',
  'src/app/games/page.tsx',
];

const FORBIDDEN_TRADEMARKS = [
  'Nanaca Crash',
  'Learn to Fly',
  'Spider-Man',
  'Tower Bloxx',
  'Angry Birds',
  'Flappy Bird',
];

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

describe('Nostalgic Mini-Games & Repository SEO Verification', () => {
  it('verifies all 3 new mini-game pages and components exist, have zero emojis, and are 100% original IP', () => {
    for (const rel of OWNED_FILES) {
      const fullPath = path.join(ROOT, rel);
      assert.ok(fs.existsSync(fullPath), `Missing file: ${rel}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.ok(!EMOJI_REGEX.test(content), `File ${rel} contains an emoji!`);
      for (const tm of FORBIDDEN_TRADEMARKS) {
        assert.ok(
          !content.toLowerCase().includes(tm.toLowerCase()),
          `File ${rel} references third-party trademark: ${tm}`
        );
      }
    }
  });

  it('verifies all 3 mini-games integrate AudioToggle, useBgm, and getAudioSettings', () => {
    const gameComponents = [
      'src/components/catapult/ShachikuCatapultGame.tsx',
      'src/components/wire/ShachikuWireGame.tsx',
      'src/components/stack/ShachikuStackGame.tsx',
    ];
    for (const rel of gameComponents) {
      const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.ok(content.includes('AudioToggle'), `${rel} must use AudioToggle`);
      assert.ok(content.includes('useBgm'), `${rel} must use useBgm`);
      assert.ok(content.includes('getAudioSettings'), `${rel} must respect getAudioSettings`);
      assert.ok(content.includes('localStorage'), `${rel} must persist state in localStorage`);
    }
  });

  it('verifies GAME_SEO_DATA has all 9 games and generates VideoGame, WebApplication, HowTo, and FAQPage JSON-LD', () => {
    const expectedKeys: GameSeoKey[] = [
      'defense',
      'shooting',
      'spiral',
      'survivor',
      'jinro',
      'sugoroku',
      'catapult',
      'wire',
      'stack',
    ];
    for (const key of expectedKeys) {
      const game = GAME_SEO_DATA[key];
      assert.ok(game, `Missing GAME_SEO_DATA entry for ${key}`);
      assert.equal(game.features.length, 6, `${key} should have 6 features`);
      assert.equal(game.steps.length, 4, `${key} should have 4 steps`);
      assert.equal(game.faqs.length, 5, `${key} should have 5 FAQs`);
      assert.ok(game.related.length >= 4, `${key} should have at least 4 related links`);

      const schemas = buildGameJsonLd(game) as Array<{ '@type': string }>;
      const types = schemas.map((s) => s['@type']);
      assert.ok(types.includes('VideoGame'), `${key} JSON-LD missing VideoGame`);
      assert.ok(types.includes('WebApplication'), `${key} JSON-LD missing WebApplication`);
      assert.ok(types.includes('HowTo'), `${key} JSON-LD missing HowTo`);
      assert.ok(types.includes('FAQPage'), `${key} JSON-LD missing FAQPage`);
    }
  });

  it('verifies sitemap, llms.txt, llms-full.txt, Footer, games portal, and verify.sh include the 3 new games', () => {
    const newSlugs = ['/shachiku-catapult', '/shachiku-wire', '/shachiku-stack'];
    const filesToCheck = [
      'src/app/games/page.tsx',
      'src/app/sitemap.ts',
      'src/app/llms.txt/route.ts',
      'src/app/llms-full.txt/route.ts',
      'src/components/Footer.tsx',
    ];
    for (const rel of filesToCheck) {
      const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      for (const slug of newSlugs) {
        assert.ok(text.includes(slug), `${rel} is missing ${slug}`);
      }
    }

    const verifySh = fs.readFileSync(path.join(ROOT, '.shared-agents/harness/verify.sh'), 'utf8');
    assert.ok(verifySh.includes('out/shachiku-catapult.html'));
    assert.ok(verifySh.includes('out/shachiku-wire.html'));
    assert.ok(verifySh.includes('out/shachiku-stack.html'));
  });
});
