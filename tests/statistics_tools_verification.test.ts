import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PREFECTURE_STATS, JAPAN_CITIES, WORLD_CITIES } from '../src/lib/statsData';
import { FULL_PREFECTURE_STATS, GENRE_META, METRIC_DEFINITIONS } from '../src/lib/prefectureStatsCatalog';
import { SITE_COUNTS } from '../src/lib/siteCounts';

const ROOT = path.resolve(__dirname, '..');
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

const TOOLS = [
  { slug: 'prefecture-ranking', component: 'PrefectureRanking' },
  { slug: 'prefecture-quiz', component: 'PrefectureQuiz' },
  { slug: 'standard-deviation', component: 'StandardDeviation' },
  { slug: 'correlation-coefficient', component: 'CorrelationCoefficient' },
  { slug: 'deviation-score', component: 'DeviationScore' },
  { slug: 'statistics-graph', component: 'StatisticsGraph' },
  { slug: 'heatmap-maker', component: 'HeatmapMaker' },
  { slug: 'city-distance', component: 'CityDistance' },
  { slug: 'coordinate-distance', component: 'CoordinateDistance' },
  { slug: 'world-timezone', component: 'WorldTimezone' },
];

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Statistics and map tools', () => {
  it('has all 10 routes, client components, SEO shells, and no emojis', () => {
    for (const tool of TOOLS) {
      const pagePath = `src/app/${tool.slug}/page.tsx`;
      const componentPath = `src/components/tools/${tool.slug}/${tool.component}.tsx`;
      assert.ok(fs.existsSync(path.join(ROOT, pagePath)), `missing ${pagePath}`);
      assert.ok(fs.existsSync(path.join(ROOT, componentPath)), `missing ${componentPath}`);
      const page = read(pagePath);
      const component = read(componentPath);
      assert.ok(page.includes('UtilityToolShell'), `${pagePath} must use UtilityToolShell`);
      assert.ok(page.includes('UtilityToolSeo'), `${pagePath} must type SEO data`);
      assert.ok(page.includes('export const metadata'), `${pagePath} must export metadata`);
      assert.ok(page.includes(`canonical: '/${tool.slug}'`), `${pagePath} has wrong canonical`);
      assert.ok(component.includes("'use client'") || component.includes('"use client"'), `${componentPath} must be a client component`);
      assert.ok(!page.includes('fetch('), `${pagePath} must not fetch data`);
      assert.ok(!component.includes('fetch('), `${componentPath} must not fetch data`);
      assert.ok(!component.includes('localStorage'), `${componentPath} must not persist inputs`);
      assert.ok(!EMOJI_REGEX.test(page), `${pagePath} contains an emoji`);
      assert.ok(!EMOJI_REGEX.test(component), `${componentPath} contains an emoji`);
    }
  });

  it('has valid prefecture, city, and world clock data', () => {
    assert.equal(PREFECTURE_STATS.length, 47);
    assert.equal(new Set(PREFECTURE_STATS.map((pref) => pref.name)).size, 47);
    assert.ok(PREFECTURE_STATS.every((pref) => pref.population > 0 && pref.area > 0));
    assert.ok(PREFECTURE_STATS.reduce((sum, pref) => sum + pref.population, 0) > 120_000_000);
    assert.equal(FULL_PREFECTURE_STATS.length, 47);
    assert.equal(GENRE_META.length, 6);
    assert.equal(METRIC_DEFINITIONS.length, 36);
    assert.equal(new Set(FULL_PREFECTURE_STATS.map((p) => `${p.mapCol},${p.mapRow}`)).size, 47);
    for (const def of METRIC_DEFINITIONS) {
      assert.ok(
        FULL_PREFECTURE_STATS.every((p) => Number.isFinite(p[def.key])),
        `Metric ${def.key} must be finite for all 47 prefectures`,
      );
    }
    assert.ok(JAPAN_CITIES.length >= 40);
    assert.ok(JAPAN_CITIES.every((city) => city.lat >= 20 && city.lat <= 46 && city.lon >= 122 && city.lon <= 154));
    assert.ok(WORLD_CITIES.length >= 15);
    for (const city of WORLD_CITIES) {
      assert.ok(city.lat >= -90 && city.lat <= 90);
      assert.ok(city.lon >= -180 && city.lon <= 180);
      assert.doesNotThrow(() => new Intl.DateTimeFormat('en-US', { timeZone: city.timeZone }).format(new Date()));
    }
    assert.equal(SITE_COUNTS.tools, 49);
  });

  it('registers every tool in the hub, sitemap, llms, footer, and harness', () => {
    const hub = read('src/app/tools/page.tsx');
    const sitemap = read('src/app/sitemap.ts');
    const llms = read('src/app/llms.txt/route.ts');
    const llmsFull = read('src/app/llms-full.txt/route.ts');
    const footer = read('src/components/Footer.tsx');
    const harness = read('.shared-agents/harness/verify.sh');
    for (const tool of TOOLS) {
      assert.ok(hub.includes(`/${tool.slug}`), `tools hub missing /${tool.slug}`);
      assert.ok(sitemap.includes(`/${tool.slug}`), `sitemap missing /${tool.slug}`);
      assert.ok(llms.includes(`/${tool.slug}`), `llms.txt missing /${tool.slug}`);
      assert.ok(llmsFull.includes(`/${tool.slug}`), `llms-full.txt missing /${tool.slug}`);
      assert.ok(harness.includes(`out/${tool.slug}.html`), `harness missing /${tool.slug}`);
    }
    assert.ok(footer.includes('/tools#stats-tools'));
    assert.ok(footer.includes('/tools#map-tools'));
    assert.ok(llmsFull.includes('全49種類'));
  });
});
