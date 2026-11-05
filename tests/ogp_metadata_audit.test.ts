import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT_DIR, 'out');
const BASE_URL = 'https://zatsudan-gacha.app';
const GENERIC_IMAGE = `${BASE_URL}/ogp.png`;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAttribute(tag: string, name: string) {
  const pattern = new RegExp(
    `(?:^|\\s)${escapeRegExp(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  );
  const match = tag.match(pattern);
  return match ? match[1] ?? match[2] ?? match[3] ?? '' : undefined;
}

function decodeEntities(value: string) {
  return value.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (match, entity) => {
    if (entity.startsWith('#')) {
      const hexadecimal = entity[1]?.toLowerCase() === 'x';
      const codePoint = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      if (Number.isFinite(codePoint)) {
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return match;
        }
      }
      return match;
    }
    const named: Record<string, string> = {
      amp: '&',
      apos: "'",
      gt: '>',
      lt: '<',
      quot: '"',
    };
    return named[entity] ?? match;
  });
}

function getMetaValues(html: string, attribute: string, value: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  return tags
    .filter((tag) => getAttribute(tag, attribute) === value)
    .map((tag) => {
      const content = getAttribute(tag, 'content');
      return content === undefined ? '' : decodeEntities(content);
    });
}

function getCanonicalValues(html: string) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  return tags
    .filter((tag) => (getAttribute(tag, 'rel') ?? '').toLowerCase() === 'canonical')
    .map((tag) => {
      const href = getAttribute(tag, 'href');
      return href === undefined ? '' : decodeEntities(href);
    });
}

function collectHtmlFiles(directory: string, results: string[] = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_next') {
        continue;
      }
      collectHtmlFiles(fullPath, results);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.html')) {
      continue;
    }
    if (entry.name === '404.html' || entry.name === '_not-found.html') {
      continue;
    }
    results.push(fullPath);
  }
  return results;
}

function normalizePathname(value: string) {
  let pathname: string;
  try {
    pathname = new URL(value, BASE_URL).pathname;
  } catch {
    pathname = value;
  }
  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }
  pathname = pathname.replace(/\/{2,}/g, '/');
  if (pathname.length > 1) {
    pathname = pathname.replace(/\/+$/, '');
  }
  return pathname || '/';
}

test('OGP metadata audit', async () => {
  assert.ok(fs.existsSync(OUT_DIR), 'out directory must exist');

  const htmlFiles = collectHtmlFiles(OUT_DIR).sort();
  assert.ok(htmlFiles.length > 0, 'expected generated HTML files');

  const sitemap = fs.readFileSync(path.join(OUT_DIR, 'sitemap.xml'), 'utf8');
  const sitemapPaths = new Set(
    Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), (match) =>
      normalizePathname(match[1]),
    ),
  );

  const imageUrls = new Set<string>();

  for (const htmlFile of htmlFiles) {
    const relativePath = path.relative(OUT_DIR, htmlFile);
    const html = fs.readFileSync(htmlFile, 'utf8');
    const canonicalValues = getCanonicalValues(html);
    assert.equal(canonicalValues.length, 1, `${relativePath}: expected exactly one canonical link`);
    const canonical = canonicalValues[0];
    const canonicalPath = normalizePathname(canonical);
    assert.ok(sitemapPaths.has(canonicalPath), `${relativePath}: canonical ${canonicalPath} missing from sitemap`);

    for (const [attribute, value] of [
      ['property', 'og:title'],
      ['property', 'og:description'],
      ['property', 'og:image'],
      ['name', 'twitter:image'],
      ['name', 'twitter:card'],
    ] as const) {
      const values = getMetaValues(html, attribute, value);
      assert.equal(values.length, 1, `${relativePath}: expected exactly one ${value}`);
      assert.ok(values[0].trim().length > 0, `${relativePath}: ${value} must not be empty`);
    }

    assert.equal(getMetaValues(html, 'property', 'og:site_name').length, 1, `${relativePath}: missing og:site_name`);
    assert.equal(getMetaValues(html, 'property', 'og:locale').length, 1, `${relativePath}: missing og:locale`);
    assert.ok(!html.includes(GENERIC_IMAGE), `${relativePath}: generic OGP image remains`);

    const imageUrl = getMetaValues(html, 'property', 'og:image')[0];
    const twitterImageUrl = getMetaValues(html, 'name', 'twitter:image')[0];
    assert.equal(imageUrl, twitterImageUrl, `${relativePath}: twitter:image must match og:image`);
    assert.ok(/^https?:\/\//i.test(imageUrl), `${relativePath}: og:image must be absolute`);

    const parsedImageUrl = new URL(imageUrl);
    assert.equal(parsedImageUrl.origin, BASE_URL, `${relativePath}: og:image must use the site origin`);
    assert.ok(parsedImageUrl.pathname.startsWith('/og/'), `${relativePath}: og:image must use /og/`);
    const imageFile = path.join(OUT_DIR, decodeURIComponent(parsedImageUrl.pathname).replace(/^\/+/, ''));
    assert.ok(fs.existsSync(imageFile), `${relativePath}: og:image file does not exist: ${imageFile}`);

    const metadata = await sharp(imageFile).metadata();
    assert.equal(metadata.format, 'png', `${relativePath}: og:image must be PNG`);
    assert.equal(metadata.width, 1200, `${relativePath}: og:image width must be 1200`);
    assert.equal(metadata.height, 630, `${relativePath}: og:image height must be 630`);

    assert.ok(!imageUrls.has(imageUrl), `${relativePath}: og:image must be unique`);
    imageUrls.add(imageUrl);
  }

  assert.equal(imageUrls.size, htmlFiles.length, 'every content page must have a unique image');
});
