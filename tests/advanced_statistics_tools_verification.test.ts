import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  normalCdf,
  tCdf,
  fCdf,
  chiSquareCdf,
  ols,
  jacobiEigen,
  invert,
  parseDelimitedTable,
  parseNumberList,
} from '../src/lib/statsCore';
import { SITE_COUNTS } from '../src/lib/siteCounts';

const ROOT = path.resolve(__dirname, '..');
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

const TOOLS = [
  { slug: 'logistic-regression', component: 'LogisticRegression' },
  { slug: 'principal-component-analysis', component: 'PrincipalComponentAnalysis' },
  { slug: 'multiple-regression', component: 'MultipleRegression' },
  { slug: 'quantile-regression', component: 'QuantileRegression' },
  { slug: 'multilevel-analysis', component: 'MultilevelAnalysis' },
  { slug: 'factor-analysis', component: 'FactorAnalysis' },
  { slug: 'cluster-analysis', component: 'ClusterAnalysis' },
  { slug: 'boolean-analysis', component: 'BooleanAnalysis' },
  { slug: 't-test', component: 'TTest' },
  { slug: 'maximum-likelihood', component: 'MaximumLikelihood' },
  { slug: 'covariance-structure-analysis', component: 'CovarianceStructureAnalysis' },
  { slug: 'correlation-analysis', component: 'CorrelationAnalysis' },
  { slug: 'anova', component: 'Anova' },
  { slug: 'time-series-analysis', component: 'TimeSeriesAnalysis' },
  { slug: 'survival-analysis', component: 'SurvivalAnalysis' },
];

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Advanced statistics tools', () => {
  it('has all 15 routes, client components, SEO shells, and no emojis', () => {
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

  it('has reliable shared math helpers', () => {
    assert.ok(Math.abs(normalCdf(1.96) - 0.975) < 0.001);
    assert.ok(Math.abs(tCdf(2, 10) - 0.9633) < 0.001);
    assert.ok(Math.abs(fCdf(4, 2, 20) - 0.9654) < 0.001);
    assert.ok(Math.abs(chiSquareCdf(3.84, 1) - 0.95) < 0.001);
    assert.deepEqual(parseNumberList('1, 2 3\n4'), { values: [1, 2, 3, 4], invalid: [] });
    const table = parseDelimitedTable('x,y\n1,2\n3,4');
    assert.deepEqual(table.headers, ['x', 'y']);
    assert.deepEqual(table.rows, [['1', '2'], ['3', '4']]);
    assert.deepEqual(invert([[4, 7], [2, 6]])?.[0], [0.6000000000000001, -0.7000000000000001]);
    const result = ols([[1], [2], [3], [4], [5]], [5, 8, 11, 14, 17]);
    assert.ok(result);
    assert.ok(Math.abs((result?.coefficients[0] ?? 0) - 2) < 1e-9);
    assert.ok(Math.abs((result?.coefficients[1] ?? 0) - 3) < 1e-9);
    assert.ok(Math.abs((result?.rSquared ?? 0) - 1) < 1e-9);
    const eigen = jacobiEigen([[2, 1], [1, 2]]);
    assert.ok(eigen);
    assert.ok(Math.abs((eigen?.values[0] ?? 0) - 1) < 1e-8);
    assert.ok(Math.abs((eigen?.values[1] ?? 0) - 3) < 1e-8);
  });

  it('registers every advanced tool in the hub, sitemap, llms, footer, and harness', () => {
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
    assert.ok(footer.includes('/tools#regression-stats'));
    assert.ok(footer.includes('/tools#multivariate-stats'));
    assert.ok(llmsFull.includes('全49種類'));
    assert.equal(SITE_COUNTS.advancedStatsTools, 15);
  });
});
