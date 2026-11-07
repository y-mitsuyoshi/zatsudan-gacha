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
  { slug: 'stained-glass-mosaic', componentPath: 'src/components/board/stained-glass-mosaic/StainedGlassMosaicGame.tsx' },
  { slug: 'royal-courier', componentPath: 'src/components/board/royal-courier/RoyalCourierGame.tsx' },
  { slug: 'sky-botanist', componentPath: 'src/components/board/sky-botanist/SkyBotanistGame.tsx' },
  { slug: 'totem-bluff', componentPath: 'src/components/board/totem-bluff/TotemBluffGame.tsx' },
  { slug: 'clockwork-railways', componentPath: 'src/components/board/clockwork-railways/ClockworkRailwaysGame.tsx' },
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
      const forbiddenTrademarks = /オセロ|Othello|カタン|カルカソンヌ|宝石の煌き|Splendor|Carcassonne|インカの黄金|海底探険|街コロ|Machi Koro|ハゲタカのえじき|すごろくや|アズール|Azul|サグラダ|Sagrada|ラブレター|Love Letter|ウイングスパン|Wingspan|スカル|Skull|チケット・トゥ・ライド|Ticket to Ride/i;
      assert.ok(!forbiddenTrademarks.test(page), `${pagePath} must not use trademarked board game names`);
      assert.ok(!forbiddenTrademarks.test(component), `${game.componentPath} must not use trademarked board game names`);
    }
  });

  it('registers all 23 board and card games in hub, sitemap, llms, footer, and harness', () => {
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
    assert.equal(SITE_COUNTS.boardGames, 18);
    assert.equal(SITE_COUNTS.cardGames, 5);
  });

  it('enforces Daifugo card exchange lock for lower ranks and commercial Texas Holdem features', () => {
    const daifugo = read('src/components/cards/daifugo/DaifugoGame.tsx');
    assert.ok(
      daifugo.includes('canHumanSelectCardsInHand') && daifugo.includes('強制献上'),
      'Daifugo must lock manual card selection for Hinmin/Daihinmin during exchange and perform automatic tribute'
    );
    assert.ok(daifugo.includes('bgmOn'), 'Daifugo must include procedural BGM toggle');

    const holdemDir = 'src/components/cards/texas-holdem';
    const holdem = read(`${holdemDir}/TexasHoldemGame.tsx`);
    assert.ok(holdem.includes('TitleScreen') && holdem.includes('LobbyScreen') && holdem.includes('TableScreen'), 'Texas Holdem must route title / lobby / table screens');
    const chars = read(`${holdemDir}/characters.ts`);
    for (const id of ['karen', 'rei', 'koharu', 'valentina', 'jin', 'luna', 'sakura', 'alice', 'leon', 'chloe', 'hibiki', 'suou']) {
      assert.ok(chars.includes(`${id}:`), `Texas Holdem character ${id} missing`);
      assert.ok(fs.existsSync(path.join(ROOT, `public/assets/holdem/chars/${id}.webp`)), `missing illustration for ${id}`);
      assert.ok(fs.existsSync(path.join(ROOT, `public/assets/holdem/chars/${id}_win.webp`)), `missing win illustration for ${id}`);
      assert.ok(fs.existsSync(path.join(ROOT, `public/assets/holdem/voices/${id}/greet_0.mp3`)), `missing voice clip for ${id}`);
    }
    const audio = read(`${holdemDir}/audio.ts`);
    assert.ok(audio.includes('playBgm') && audio.includes('speak'), 'Texas Holdem must include BGM and voice playback');
    const profile = read(`${holdemDir}/profile.ts`);
    for (const rankName of ['ブロンズ', 'シルバー', 'ゴールド', 'プラチナ', 'ダイヤモンド', 'ロイヤル', 'レジェンド']) {
      assert.ok(profile.includes(rankName), `Texas Holdem rank ${rankName} missing`);
    }
    const threeFx = read(`${holdemDir}/ui/ThreeFx.tsx`);
    assert.ok(threeFx.includes("'three'"), 'Texas Holdem must include Three.js celebratory effect overlay');
    const resultOverlay = read(`${holdemDir}/ui/ResultOverlay.tsx`);
    assert.ok(
      resultOverlay.includes('無料リバイして続行') &&
        resultOverlay.includes('チップ満額で再挑戦') &&
        resultOverlay.includes('満額補充'),
      'Texas Holdem must include busted relief rebuy, retry, and stack top-up UI when chips run out'
    );
    const holdemPage = read('src/app/texas-holdem/page.tsx');
    assert.ok(
      holdemPage.includes('/og/texas-holdem.png') &&
        holdemPage.includes('一ノ瀬カレン') &&
        fs.existsSync(path.join(ROOT, 'public/assets/holdem/ogp_cover_v2.png')),
      'Texas Holdem page OGP metadata and custom Ichinose Karen OGP cover must be configured'
    );
  });
});
