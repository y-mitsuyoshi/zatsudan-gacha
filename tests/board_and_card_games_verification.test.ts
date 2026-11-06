import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_COUNTS } from '../src/lib/siteCounts';

const ROOT = path.resolve(__dirname, '..');

const BOARD_GAMES = [
  { slug: 'reversi', componentPath: 'src/components/board/reversi/ReversiGame.tsx' },
  { slug: 'qubic-four', componentPath: 'src/components/board/qubic-four/QubicFourGame.tsx' },
  { slug: 'gomoku', componentPath: 'src/components/board/gomoku/GomokuGame.tsx' },
  { slug: 'mancala', componentPath: 'src/components/board/mancala/MancalaGame.tsx' },
  { slug: 'checkers', componentPath: 'src/components/board/checkers/CheckersGame.tsx' },
  { slug: 'nine-mens-morris', componentPath: 'src/components/board/nine-mens-morris/NineMensMorrisGame.tsx' },
  { slug: 'hex-board', componentPath: 'src/components/board/hex-board/HexBoardGame.tsx' },
  { slug: 'dots-and-boxes', componentPath: 'src/components/board/dots-and-boxes/DotsAndBoxesGame.tsx' },
  { slug: 'stellar-atelier', componentPath: 'src/components/board/stellar-atelier/StellarAtelierGame.tsx' },
  { slug: 'archipelago-cartographer', componentPath: 'src/components/board/archipelago-cartographer/ArchipelagoCartographerGame.tsx' },
  { slug: 'abyssal-salvage', componentPath: 'src/components/board/abyssal-salvage/AbyssalSalvageGame.tsx' },
  { slug: 'automatons-bazaar', componentPath: 'src/components/board/automatons-bazaar/AutomatonsBazaarGame.tsx' },
  { slug: 'dice-harbor', componentPath: 'src/components/board/dice-harbor/DiceHarborGame.tsx' },
];

const CARD_GAMES = [
  { slug: 'klondike', componentPath: 'src/components/cards/klondike/KlondikeGame.tsx' },
  { slug: 'blackjack', componentPath: 'src/components/cards/blackjack/BlackjackGame.tsx' },
  { slug: 'freecell', componentPath: 'src/components/cards/freecell/FreecellGame.tsx' },
  { slug: 'daifugo', componentPath: 'src/components/cards/daifugo/DaifugoGame.tsx' },
  { slug: 'texas-holdem', componentPath: 'src/components/cards/texas-holdem/TexasHoldemGame.tsx' },
];

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Board and Card games', () => {
  it('has all 8 board games and 5 card games with SEO metadata, JSON-LD, and trademark safety', () => {
    for (const game of [...BOARD_GAMES, ...CARD_GAMES]) {
      const pagePath = `src/app/${game.slug}/page.tsx`;
      assert.ok(fs.existsSync(path.join(ROOT, pagePath)), `missing ${pagePath}`);
      assert.ok(fs.existsSync(path.join(ROOT, game.componentPath)), `missing ${game.componentPath}`);
      const page = read(pagePath);
      const component = read(game.componentPath);
      assert.ok(page.includes('SeoContentSection'), `${pagePath} must use SeoContentSection`);
      assert.ok(page.includes('buildGameJsonLd'), `${pagePath} must emit game JSON-LD`);
      assert.ok(page.includes('canonical:') && page.includes(game.slug), `${pagePath} has wrong canonical`);
      assert.ok(page.includes('openGraph') && page.includes('twitter'), `${pagePath} needs OGP metadata`);
      assert.ok(component.includes("'use client'") || component.includes('"use client"'), `${game.componentPath} must be a client component`);
      const forbiddenTrademarks = /オセロ|Othello|カタン|カルカソンヌ|宝石の煌き|Splendor|Carcassonne|インカの黄金|海底探険|街コロ|Machi Koro|ハゲタカのえじき|すごろくや/i;
      assert.ok(!forbiddenTrademarks.test(page), `${pagePath} must not use trademarked board game names`);
      assert.ok(!forbiddenTrademarks.test(component), `${game.componentPath} must not use trademarked board game names`);
    }
  });

  it('registers all 18 board and card games in hub, sitemap, llms, footer, and harness', () => {
    const hub = read('src/app/games/page.tsx');
    const sitemap = read('src/app/sitemap.ts');
    const llms = read('src/app/llms.txt/route.ts');
    const llmsFull = read('src/app/llms-full.txt/route.ts');
    const footer = read('src/components/Footer.tsx');
    const harness = read('.shared-agents/harness/verify.sh');
    for (const game of [...BOARD_GAMES, ...CARD_GAMES]) {
      assert.ok(hub.includes(`/${game.slug}`), `games hub missing /${game.slug}`);
      assert.ok(sitemap.includes(`/${game.slug}`), `sitemap missing /${game.slug}`);
      assert.ok(llms.includes(`/${game.slug}`), `llms.txt missing /${game.slug}`);
      assert.ok(llmsFull.includes(`/${game.slug}`), `llms-full.txt missing /${game.slug}`);
      assert.ok(harness.includes(`out/${game.slug}.html`), `harness missing /${game.slug}`);
    }
    assert.ok(hub.includes('id="board-games"'));
    assert.ok(hub.includes('id="card-games"'));
    assert.ok(footer.includes('/games#board-games'));
    assert.ok(footer.includes('/games#card-games'));
    assert.equal(SITE_COUNTS.boardGames, 13);
    assert.equal(SITE_COUNTS.cardGames, 5);
  });
});
