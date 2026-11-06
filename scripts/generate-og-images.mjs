import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const BASE_URL = 'https://zatsudan-gacha.app';
const OLD_IMAGE_URL = `${BASE_URL}/ogp.png`;
const SITE_NAME = '雑談テーマガチャ';
const TWITTER_SITE = '@zatsudan_gacha';

const NAMED_ENTITIES = {
  amp: '&',
  apos: "'",
  copy: '©',
  deg: '°',
  emsp: '\u2003',
  ensp: '\u2002',
  euro: '€',
  gt: '>',
  hellip: '…',
  laquo: '«',
  lt: '<',
  mdash: '—',
  middot: '·',
  nbsp: ' ',
  ndash: '–',
  para: '¶',
  pound: '£',
  quot: '"',
  raquo: '»',
  reg: '®',
  rarr: '→',
  sect: '§',
  thinsp: '\u2009',
  times: '×',
  trade: '™',
  yen: '¥',
};

const CATEGORY_STYLES = {
  TOP: { accent: '#b4552d', accentSoft: '#ead8c8' },
  THEME: { accent: '#3e6b58', accentSoft: '#d8e3dc' },
  GUIDE: { accent: '#5a5677', accentSoft: '#dedbe8' },
  GAME: { accent: '#a33f35', accentSoft: '#ecd7d3' },
  TOOL: { accent: '#2f6078', accentSoft: '#d5e2e8' },
  SITE: { accent: '#6d6255', accentSoft: '#e3ddd4' },
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeEntities(value) {
  return String(value).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g, (match, entity) => {
    if (entity.startsWith('#')) {
      const hexadecimal = entity[1]?.toLowerCase() === 'x';
      const codePoint = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      if (Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff) {
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return match;
        }
      }
      return match;
    }
    return Object.hasOwn(NAMED_ENTITIES, entity) ? NAMED_ENTITIES[entity] : match;
  });
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&apos;';
    }
  });
}

function getAttribute(tag, name) {
  const pattern = new RegExp(
    `(?:^|\\s)${escapeRegExp(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  );
  const match = tag.match(pattern);
  return match ? match[1] ?? match[2] ?? match[3] ?? '' : undefined;
}

function getMetaTags(html) {
  return html.match(/<meta\b[^>]*>/gi) ?? [];
}

function getMetaContent(html, attribute, value) {
  for (const tag of getMetaTags(html)) {
    if (getAttribute(tag, attribute) === value) {
      const content = getAttribute(tag, 'content');
      return content === undefined ? undefined : decodeEntities(content);
    }
  }
  return undefined;
}

function hasMeta(html, attribute, value) {
  return getMetaTags(html).some((tag) => getAttribute(tag, attribute) === value);
}

function setMetaContent(html, attribute, value, content) {
  return html.replace(/<meta\b[^>]*>/gi, (tag) => {
    if (getAttribute(tag, attribute) !== value) {
      return tag;
    }
    if (getAttribute(tag, 'content') === undefined) {
      return tag;
    }
    const escaped = escapeXml(content);
    return tag.replace(
      /(\scontent\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/i,
      (match, prefix) => `${prefix}"${escaped}"`,
    );
  });
}

function addMeta(html, attribute, value, content) {
  if (hasMeta(html, attribute, value)) {
    return html;
  }
  const tag = `<meta ${attribute}="${value}" content="${escapeXml(content)}"/>`;
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${tag}</head>`) : `${html}${tag}`;
}

function setOrAddMeta(html, attribute, value, content) {
  if (hasMeta(html, attribute, value)) {
    return setMetaContent(html, attribute, value, content);
  }
  return addMeta(html, attribute, value, content);
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).trim() : '';
}

function extractCanonical(html) {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if ((getAttribute(tag, 'rel') ?? '').toLowerCase() === 'canonical') {
      const href = getAttribute(tag, 'href');
      return href === undefined ? undefined : decodeEntities(href);
    }
  }
  return undefined;
}

function isWideCharacter(character) {
  const codePoint = character.codePointAt(0) ?? 0;
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x1f000 && codePoint <= 0x1faff)
  );
}

function characterWidth(character) {
  if (isWideCharacter(character)) {
    return 1;
  }
  if (/\s/.test(character)) {
    return 0.3;
  }
  if (/[ilI.,'!:;|]/.test(character)) {
    return 0.28;
  }
  if (/[mwMW@]/.test(character)) {
    return 0.85;
  }
  return 0.6;
}

function measureText(value, fontSize) {
  let width = 0;
  for (const character of value) {
    width += characterWidth(character) * fontSize;
  }
  return width;
}

function isKatakana(character) {
  const codePoint = character.codePointAt(0) ?? 0;
  return (
    (codePoint >= 0x30a0 && codePoint <= 0x30ff) ||
    (codePoint >= 0x31f0 && codePoint <= 0x31ff) ||
    (codePoint >= 0xff65 && codePoint <= 0xff9f)
  );
}

function tokenize(value) {
  const tokens = [];
  let latin = '';
  let katakana = '';
  const flushLatin = () => {
    if (latin) {
      tokens.push(latin);
      latin = '';
    }
  };
  const flushKatakana = () => {
    if (katakana) {
      tokens.push(katakana);
      katakana = '';
    }
  };
  for (const character of value) {
    if (isKatakana(character)) {
      flushLatin();
      katakana += character;
      continue;
    }
    if (isWideCharacter(character) || character === ' ') {
      flushLatin();
      flushKatakana();
      tokens.push(character);
      continue;
    }
    flushKatakana();
    latin += character;
  }
  flushLatin();
  flushKatakana();
  return tokens;
}

function wrapText(value, maxWidth, fontSize) {
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [''];
  }
  const lines = [];
  let line = '';
  for (const token of tokenize(normalized)) {
    if (token === ' ' && line.length === 0) {
      continue;
    }
    if (measureText(line + token, fontSize) <= maxWidth) {
      line += token;
      continue;
    }
    if (line.trim()) {
      lines.push(line.trim());
      line = '';
    }
    if (token === ' ') {
      continue;
    }
    if (measureText(token, fontSize) <= maxWidth) {
      line = token;
      continue;
    }
    for (const character of token) {
      if (line && measureText(line + character, fontSize) > maxWidth) {
        lines.push(line);
        line = '';
      }
      line += character;
    }
  }
  if (line.trim()) {
    lines.push(line.trim());
  }
  return lines.length ? lines : [''];
}

function truncateToWidth(value, maxWidth, fontSize) {
  if (measureText(value, fontSize) <= maxWidth) {
    return value;
  }
  const characters = Array.from(value);
  while (characters.length && measureText(`${characters.join('')}…`, fontSize) > maxWidth) {
    characters.pop();
  }
  return `${characters.join('')}…`;
}

function balanceLines(lines, maxWidth, fontSize) {
  if (lines.length < 2) {
    return lines;
  }
  const targetWidth = maxWidth * 0.28;
  let guard = 0;
  while (
    lines.length > 1 &&
    measureText(lines[lines.length - 1], fontSize) < targetWidth &&
    guard < 40
  ) {
    const previousTokens = tokenize(lines[lines.length - 2]);
    const currentTokens = tokenize(lines[lines.length - 1]);
    let moved;
    while (previousTokens.length) {
      moved = previousTokens.pop();
      if (moved !== ' ') {
        break;
      }
    }
    if (moved === undefined || moved === ' ') {
      break;
    }
    const currentCandidate = [moved, ...currentTokens].join('').trimStart();
    if (measureText(currentCandidate, fontSize) > maxWidth) {
      break;
    }
    const previousCandidate = previousTokens.join('').trimEnd();
    if (!previousCandidate) {
      break;
    }
    lines[lines.length - 2] = previousCandidate;
    lines[lines.length - 1] = currentCandidate;
    guard += 1;
  }
  return lines;
}

function fitText(value, maxWidth, fontSize, maxLines) {
  let lines = wrapText(value, maxWidth, fontSize);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = truncateToWidth(lines[maxLines - 1], maxWidth, fontSize);
  }
  return balanceLines(lines, maxWidth, fontSize);
}

function collectHtmlFiles(directory, results = []) {
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

function normalizeRoute(value) {
  let route = String(value ?? '').trim();
  if (!route) {
    return '/';
  }
  if (/^https?:\/\//i.test(route)) {
    try {
      route = new URL(route).pathname;
    } catch {
      return '/';
    }
  }
  route = route.split('#')[0].split('?')[0];
  if (!route.startsWith('/')) {
    route = `/${route}`;
  }
  route = route.replace(/\/index\.html?$/i, '/').replace(/\.html?$/i, '');
  route = route.replace(/\/{2,}/g, '/');
  if (route.length > 1) {
    route = route.replace(/\/+$/, '');
  }
  return route || '/';
}

function routeFromFile(relativePath) {
  const normalized = relativePath.split(path.sep).join('/').replace(/\.html$/i, '');
  if (normalized === 'index') {
    return '/';
  }
  if (normalized.endsWith('/index')) {
    return normalizeRoute(`/${normalized.slice(0, -6)}`);
  }
  return normalizeRoute(`/${normalized}`);
}

function categoryForRoute(route, html) {
  if (route === '/') {
    return 'TOP';
  }
  if (route === '/themes' || route.startsWith('/themes/')) {
    return 'THEME';
  }
  if (route === '/guides' || route.startsWith('/guides/') || route === '/icebreak') {
    return 'GUIDE';
  }
  if (route === '/games') {
    return 'GAME';
  }
  if (route === '/tools') {
    return 'TOOL';
  }
  if (/"@type"\s*:\s*"VideoGame"/i.test(html)) {
    return 'GAME';
  }
  if (/"@type"\s*:\s*"WebApplication"/i.test(html)) {
    return 'TOOL';
  }
  return 'SITE';
}

function chooseTitleLayout(title) {
  for (const fontSize of [66, 60, 54, 48, 42]) {
    const lines = balanceLines(wrapText(title, 1000, fontSize), 1000, fontSize);
    if (lines.length <= 3) {
      return { fontSize, lines };
    }
  }
  const fontSize = 42;
  return { fontSize, lines: fitText(title, 1000, fontSize, 3) };
}

function renderSvg({ title, description, route, category }) {
  const style = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.SITE;
  const titleLayout = chooseTitleLayout(title);
  const titleSize = titleLayout.fontSize;
  const titleLineHeight = Math.round(titleSize * 1.18);
  const titleBaseline = 252;
  const titleBottom = titleBaseline + (titleLayout.lines.length - 1) * titleLineHeight + titleSize * 0.3;
  const descriptionSize = 26;
  const descriptionLineHeight = 38;
  const descriptionBaseline = Math.round(titleBottom + 52);
  const descriptionLines = fitText(description, 980, descriptionSize, 3);
  const routeLabel = truncateToWidth(
    `zatsudan-gacha.app${route === '/' ? '/' : route}`,
    820,
    20,
  );
  const hash = Array.from(route).reduce(
    (value, character) => ((value * 31 + (character.codePointAt(0) ?? 0)) >>> 0),
    7,
  );
  const ringX = 1000 + (hash % 70);
  const ringY = 470 + (hash % 50);
  const diagonalOffset = hash % 36;

  const titleSpans = titleLayout.lines
    .map((line, index) =>
      `<tspan x="88"${index === 0 ? '' : ` dy="${titleLineHeight}"`}>${escapeXml(line)}</tspan>`,
    )
    .join('');
  const descriptionSpans = descriptionLines
    .map((line, index) =>
      `<tspan x="88"${index === 0 ? '' : ` dy="${descriptionLineHeight}"`}>${escapeXml(line)}</tspan>`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="paper-dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#7f7467" opacity="0.18"/>
    </pattern>
    <pattern id="paper-lines" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="18" stroke="${style.accent}" stroke-width="1" opacity="0.18"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="#f2ede3"/>
  <rect width="1200" height="630" fill="url(#paper-dots)"/>
  <rect x="0" y="0" width="1200" height="12" fill="${style.accent}"/>
  <rect x="0" y="606" width="1200" height="24" fill="${style.accentSoft}"/>
  <rect x="0" y="606" width="1200" height="24" fill="url(#paper-lines)"/>
  <circle cx="${ringX}" cy="${ringY}" r="164" fill="none" stroke="${style.accent}" stroke-width="2" opacity="0.2"/>
  <circle cx="${ringX}" cy="${ringY}" r="116" fill="none" stroke="${style.accent}" stroke-width="1.5" opacity="0.16"/>
  <path d="M 1020 ${82 + diagonalOffset} L 1120 ${82 + diagonalOffset} M 1042 ${104 + diagonalOffset} L 1142 ${104 + diagonalOffset} M 1064 ${126 + diagonalOffset} L 1164 ${126 + diagonalOffset}" stroke="${style.accent}" stroke-width="2" opacity="0.22"/>
  <rect x="88" y="54" width="54" height="54" fill="${style.accent}"/>
  <text x="115" y="91" text-anchor="middle" font-family="Noto Sans CJK JP" font-size="27" font-weight="700" fill="#f8f3ea">雑</text>
  <text x="160" y="84" font-family="Noto Sans CJK JP" font-size="30" font-weight="700" fill="#1c1a17">${escapeXml(SITE_NAME)}</text>
  <text x="160" y="112" font-family="Noto Sans CJK JP" font-size="14" letter-spacing="2.4" fill="#6f6559">ZATSUDAN GACHA</text>
  <rect x="88" y="150" width="132" height="34" fill="${style.accentSoft}" stroke="${style.accent}" stroke-width="1.5"/>
  <text x="154" y="173" text-anchor="middle" font-family="Noto Sans CJK JP" font-size="15" font-weight="700" letter-spacing="2.5" fill="${style.accent}">${category}</text>
  <text x="88" y="${titleBaseline}" font-family="Noto Sans CJK JP" font-size="${titleSize}" font-weight="700" fill="#1c1a17">${titleSpans}</text>
  <text x="88" y="${descriptionBaseline}" font-family="Noto Sans CJK JP" font-size="${descriptionSize}" fill="#5f564c">${descriptionSpans}</text>
  <line x1="88" y1="574" x2="1112" y2="574" stroke="#d8cec0" stroke-width="1"/>
  <text x="88" y="598" font-family="Noto Sans CJK JP" font-size="20" fill="#6f6559">${escapeXml(routeLabel)}</text>
  <text x="1112" y="598" text-anchor="end" font-family="Noto Sans CJK JP" font-size="14" letter-spacing="1.8" fill="#8a7f72">FREE WEB GAMES &amp; TOOLS</text>
</svg>`;
}

async function main() {
  const outDirectory = path.resolve('out');
  if (!fs.existsSync(outDirectory)) {
    throw new Error('out directory does not exist. Run next build first.');
  }

  const htmlFiles = collectHtmlFiles(outDirectory).sort();
  const ogDirectory = path.join(outDirectory, 'og');
  fs.rmSync(ogDirectory, { recursive: true, force: true });
  fs.mkdirSync(ogDirectory, { recursive: true });

  let generated = 0;
  for (const htmlFile of htmlFiles) {
    const html = fs.readFileSync(htmlFile, 'utf8');
    const relativePath = path.relative(outDirectory, htmlFile);
    const fileRoute = routeFromFile(relativePath);
    const metadataUrl = getMetaContent(html, 'property', 'og:url');
    const canonicalUrl = extractCanonical(html);
    const route = normalizeRoute(metadataUrl || canonicalUrl || fileRoute);
    const title =
      getMetaContent(html, 'property', 'og:title') ||
      getMetaContent(html, 'name', 'twitter:title') ||
      extractTitle(html) ||
      SITE_NAME;
    const description =
      getMetaContent(html, 'property', 'og:description') ||
      getMetaContent(html, 'name', 'twitter:description') ||
      getMetaContent(html, 'name', 'description') ||
      '';
    const category = categoryForRoute(route, html);
    const imageRelativePath = route === '/' ? 'og/home.png' : `og${route}.png`;
    const imageAbsoluteUrl = `${BASE_URL}/${imageRelativePath}`;
    const imageFilePath = path.join(outDirectory, imageRelativePath);

    fs.mkdirSync(path.dirname(imageFilePath), { recursive: true });
    const customMortgageCover = path.resolve('public/assets/mortgage_cover_v2.png');
    const customHoldemCover = path.resolve('public/assets/holdem/ogp_cover.png');
    if (route === '/mortgage-life' && fs.existsSync(customMortgageCover)) {
      await sharp(customMortgageCover)
        .resize(1200, 630, { fit: 'cover' })
        .png({ compressionLevel: 9 })
        .toFile(imageFilePath);
    } else if (route === '/texas-holdem' && fs.existsSync(customHoldemCover)) {
      await sharp(customHoldemCover)
        .resize(1200, 630, { fit: 'cover' })
        .png({ compressionLevel: 9 })
        .toFile(imageFilePath);
    } else {
      const svg = renderSvg({ title, description, route, category });
      await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(imageFilePath);
    }

    const headStart = html.search(/<head\b/i);
    const headEnd = headStart >= 0 ? html.indexOf('</head>', headStart) : -1;
    if (headStart < 0 || headEnd < 0) {
      continue;
    }

    let head = html.slice(headStart, headEnd);
    if (!hasMeta(head, 'property', 'og:title')) {
      head = addMeta(head, 'property', 'og:title', title);
    }
    if (!hasMeta(head, 'property', 'og:description')) {
      head = addMeta(head, 'property', 'og:description', description);
    }
    if (!hasMeta(head, 'property', 'og:url')) {
      head = addMeta(head, 'property', 'og:url', `${BASE_URL}${route === '/' ? '' : route}`);
    }
    if (!hasMeta(head, 'name', 'twitter:title')) {
      head = addMeta(head, 'name', 'twitter:title', title);
    }
    if (!hasMeta(head, 'name', 'twitter:description')) {
      head = addMeta(head, 'name', 'twitter:description', description);
    }
    head = setOrAddMeta(head, 'property', 'og:site_name', SITE_NAME);
    head = setOrAddMeta(head, 'property', 'og:locale', 'ja_JP');
    head = setOrAddMeta(head, 'property', 'og:image', imageAbsoluteUrl);
    head = setOrAddMeta(head, 'property', 'og:image:width', '1200');
    head = setOrAddMeta(head, 'property', 'og:image:height', '630');
    head = setOrAddMeta(head, 'property', 'og:image:type', 'image/png');
    head = setOrAddMeta(head, 'name', 'twitter:card', 'summary_large_image');
    head = setOrAddMeta(head, 'name', 'twitter:site', TWITTER_SITE);
    head = setOrAddMeta(head, 'name', 'twitter:image', imageAbsoluteUrl);
    if (!hasMeta(head, 'property', 'og:image:alt')) {
      const alt = getMetaContent(head, 'name', 'twitter:image:alt') || title;
      head = addMeta(head, 'property', 'og:image:alt', alt);
    }
    if (!hasMeta(head, 'name', 'twitter:image:alt')) {
      const alt =
        getMetaContent(head, 'property', 'og:image:alt') ||
        getMetaContent(head, 'name', 'twitter:title') ||
        title;
      head = addMeta(head, 'name', 'twitter:image:alt', alt);
    }

    const updated = html.slice(0, headStart) + head + html.slice(headEnd);

    fs.writeFileSync(htmlFile, updated);
    generated += 1;
  }

  console.log(`Generated ${generated} OGP images in ${path.relative(process.cwd(), ogDirectory)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
