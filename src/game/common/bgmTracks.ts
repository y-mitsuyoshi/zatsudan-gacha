/**
 * 社畜ゲーム共通 — BGM楽曲データ (本格オリジナル全13曲)。
 * 形式は ./bgm.ts の BgmTrack を参照。トラックIDは BGM_TRACK_IDS で固定。
 */
import type { BgmTrack } from './bgm';

export const BGM_TRACK_IDS = [
  'shachiku-menu', // 全社畜ゲーム共通のタイトル/メニュー
  'sugoroku-board', // 社畜すごろく: 盤面プレイ中
  'sugoroku-result', // 社畜すごろく: リザルト
  'spiral-battle', // 社畜スパイラル: 通常ウェーブ
  'spiral-boss', // 社畜スパイラル: ボスウェーブ
  'survivor-battle', // 社畜サバイバー: 通常
  'survivor-boss', // 社畜サバイバー: ボス出現中
  'defense-battle', // 社畜通勤サバイバー(防衛): 通常
  'defense-boss', // 社畜通勤サバイバー(防衛): ボス
  'danmaku-stage', // 社畜シューティング: ステージ道中
  'danmaku-boss', // 社畜シューティング: ボス戦
  'jinro-day', // 社畜人狼: 昼の議論/投票
  'jinro-night', // 社畜人狼: 夜
] as const;

export type BgmTrackId = (typeof BGM_TRACK_IDS)[number];

export const BGM_TRACKS: Record<string, BgmTrack> = {
  'shachiku-menu': {
  "id": "shachiku-menu",
  "title": "出社前のエスプレッソ",
  "bpm": 108,
  "swing": 0.1,
  "master": 0.85,
  "voices": [
    {
      "id": "bass",
      "wave": "triangle",
      "gain": 0.16,
      "attack": 0.005,
      "release": 0.07,
      "cutoff": 650
    },
    {
      "id": "chord",
      "wave": "sine",
      "gain": 0.045,
      "attack": 0.01,
      "release": 0.12,
      "cutoff": 1800,
      "detune": 10,
      "pan": -0.25
    },
    {
      "id": "lead",
      "wave": "sawtooth",
      "gain": 0.055,
      "attack": 0.01,
      "release": 0.09,
      "cutoff": 2600,
      "vibrato": 10,
      "pan": 0.15
    },
    {
      "id": "accent",
      "wave": "square",
      "gain": 0.035,
      "attack": 0.005,
      "release": 0.06,
      "cutoff": 2000,
      "pan": 0.3
    }
  ],
  "sections": [
    {
      "bars": 4,
      "voices": {
        "bass": "F2 . . F2 . . C3 . F2 . . F2 . G2 . A2 | G2 . . G2 . . D3 . G2 . . G2 . A2 . Bb2 | A2 . . A2 . . E3 . A2 . . A2 . G2 . F2 | Bb2 . . Bb2 . . Bb2 . C3 . . C3 . C3 . .",
        "chord": ". . A3 . . . C4 . . . E4 . . . C4 . | . . Bb3 . . . D4 . . . F4 . . . D4 . | . . C4 . . . E4 . . . G4 . . . E4 . | . . D4 . . . F4 . . . E4 . . . G4 .",
        "lead": ". . . . . . . . C5 - - . D5 - - . | F5 - - . - - - . D5 - - . C5 - - . | A4 - - . - - - . C5 - - . - - - . | G4 - - . - - - . - - - . . . . .",
        "accent": ". . . . . . . . . . . . A4 - C5 - | . . . . . . . . . . . . Bb4 - D5 - | . . . . . . . . . . . . C5 - E5 - | D5 - E5 - G5 - - . . . . . . . . ."
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "F2 . . F2 . C3 . F2 . . F2 . G2 . A2 . | D2 . . D2 . A2 . D2 . . D2 . E2 . F2 . | G2 . . G2 . D3 . G2 . . G2 . A2 . Bb2 . | C3 . . C3 . G2 . C3 . . C3 . D3 . E3 . | A2 . . A2 . E3 . A2 . . A2 . G2 . F2 . | D2 . . D2 . A2 . D2 . . D2 . E2 . F2 . | G2 . . G2 . D3 . G2 . . G2 . A2 . Bb2 . | C3 . . C3 . C3 . C3 . . C3 . D3 . E3 .",
        "chord": ". . A3 . . . C4 . . . A3 . . . C4 . | . . F3 . . . A3 . . . F3 . . . A3 . | . . G3 . . . Bb3 . . . G3 . . . Bb3 . | . . E3 . . . G3 . . . E3 . . . Bb3 . | . . A3 . . . C4 . . . A3 . . . C4 . | . . F3 . . . A3 . . . F3 . . . A3 . | . . G3 . . . Bb3 . . . G3 . . . Bb3 . | . . E3 . . . G3 . . . E3 . . . C4 .",
        "lead": "A4 - . C5 - . D5 - F5 - . D5 - . C5 . | A4 - - . . . . . . . A4 . C5 . D5 . | G4 - . Bb4 - . C5 - D5 - . C5 - . Bb4 . | G4 - - . . . . . . . G4 . A4 . Bb4 . | C5 - . E5 - . G5 - F5 - . E5 - . D5 . | F5 - - . . . . . . . D5 . C5 . A4 . | Bb4 - . D5 - . C5 - G4 - . A4 - . Bb4 . | C5 - - - - . . . . . . . . . . .",
        "accent": ". . . . . . . . . . . . C5 - - . | . . . . . . . . . . . . D5 - - . | . . . . . . . . . . . . Bb4 - - . | . . . . . . . . . . . . G4 - - . | . . . . . . . . . . . . E5 - - . | . . . . . . . . . . . . F5 - - . | . . . . . . . . . . . . D5 - - . | E5 - G5 - C6 - - . . . . . . . . ."
      },
      "drums": {
        "kick": "x...x..x..x.x... | x...x..x..x.x... | x...x..x..x.x... | x...x..x..x.x... | x...x..x..x.x... | x...x..x..x.x... | x...x..x..x.x... | x...x..x..x.x...",
        "snare": "....x.......x..o | ....x.......x..o | ....x.......x..o | ....x...x.x.xxxx | ....x.......x..o | ....x.......x..o | ....x.......x..o | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "Bb2 . . Bb2 . F2 . Bb2 . . Bb2 . C3 . D3 . | Bb2 . . Bb2 . G2 . Bb2 . . Bb2 . C3 . D3 . | A2 . . A2 . E2 . A2 . . A2 . G2 . F2 . | D2 . . D2 . A2 . D2 . . D2 . E2 . F2 . | G2 . . G2 . D3 . G2 . . G2 . A2 . Bb2 . | G2 . . G2 . D3 . G2 . . G2 . A2 . B2 . | C3 . . C3 . G2 . C3 . . C3 . D3 . E3 . | C3 . C3 . C3 . C3 . C3 . . . . . . .",
        "chord": ". . F3 . . . A3 . . . D4 . . . A3 . | . . G3 . . . Bb3 . . . E4 . . . Bb3 . | . . E3 . . . G3 . . . C4 . . . G3 . | . . F3 . . . A3 . . . D4 . . . A3 . | . . G3 . . . Bb3 . . . D4 . . . Bb3 . | . . G3 . . . B3 . . . D4 . . . B3 . | . . G3 . . . Bb3 . . . C4 . . . E4 . | . . G3 . . . Bb3 . . . C4 . . . E4 .",
        "lead": "D5 - . F5 - . G5 - A5 - . G5 - . F5 . | G5 - - . . . . . . . G5 . A5 . Bb5 . | C6 - . A5 - . F5 - E5 - . F5 - . G5 . | F5 - - . . . . . . . D5 . E5 . F5 . | G5 - . D5 - . F5 - E5 - . D5 - . C5 . | D5 - - . . . . . . . D5 . E5 . F#5 . | G5 - . A5 - . Bb5 - C6 - . D6 - . E6 . | F6 - - - - . . . . . . . . . . .",
        "accent": ". . . . . . . . . . . . F5 - A5 - | . . . . . . . . . . . . G5 - Bb5 - | . . . . . . . . . . . . E5 - G5 - | . . . . . . . . . . . . D5 - F5 - | . . . . . . . . . . . . Bb4 - D5 - | . . . . . . . . . . . . B4 - D5 - | . . . . . . . . . . . . C5 - E5 - | C5 - E5 - G5 - Bb5 - C6 - - . . . . ."
      },
      "drums": {
        "kick": "x...x..x..x.x... | x...x..x..x.x... | x...x..x..x.x... | x...x..x..x.x... | x...x..x..x.x... | x...x..x..x.x... | x...x..x..x.x... | x...x..x..x.x...",
        "snare": "....x.......x..o | ....x.......x..o | ....x.......x..o | ....x...x.x.xxxx | ....x.......x..o | ....x.......x..o | ....x.......x..o | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    }
  ]
},

  'sugoroku-board': {
  "id": "sugoroku-board",
  "title": "出世街道すごろく行進曲",
  "bpm": 120,
  "swing": 0.18,
  "master": 0.82,
  "voices": [
    {
      "id": "bass",
      "wave": "triangle",
      "gain": 0.17,
      "attack": 0.005,
      "release": 0.08,
      "cutoff": 700
    },
    {
      "id": "lead",
      "wave": "square",
      "gain": 0.05,
      "attack": 0.005,
      "release": 0.06,
      "cutoff": 2400
    },
    {
      "id": "comp",
      "wave": "triangle",
      "gain": 0.055,
      "attack": 0.01,
      "release": 0.07,
      "cutoff": 1600,
      "pan": -0.2
    },
    {
      "id": "bells",
      "wave": "sine",
      "gain": 0.04,
      "attack": 0.002,
      "release": 0.2,
      "detune": 8,
      "pan": 0.35
    }
  ],
  "sections": [
    {
      "bars": 4,
      "voices": {
        "bass": "C3 . . . G2 . . . C3 . . . G2 . . . | B2 . . . G2 . . . B2 . . . G2 . . . | A2 . . . E2 . . . A2 . . . E2 . . . | G2 . . . D3 . . . G2 . . . G2 . A2 B2",
        "comp": ". . E4 . . . G4 . . . E4 . . . G4 . | . . D4 . . . G4 . . . D4 . . . G4 . | . . C4 . . . E4 . . . C4 . . . E4 . | . . B3 . . . D4 . . . F4 . . . G4 .",
        "lead": "C5 . C5 . E5 . G5 . C6 - - . . . . . | B5 . G5 . D5 . G5 . B5 - - . . . . . | A5 . E5 . C5 . E5 . A5 - - . . . . . | G5 . A5 . B5 . C6 . D6 - - . . . . .",
        "bells": ". . . . . . . . . . . . G5 . C6 . | . . . . . . . . . . . . G5 . B5 . | . . . . . . . . . . . . E5 . A5 . | . . . . . . . . G5 . B5 . D6 - - ."
      },
      "drums": {
        "kick": "x.......x....... | x.......x....... | x.......x....... | x.......x.......",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "C3 . . . G2 . . . C3 . . . G2 . . . | G2 . . . D3 . . . G2 . . . D3 . . . | A2 . . . E2 . . . A2 . . . E2 . . . | E2 . . . B2 . . . E2 . . . B2 . . . | F2 . . . C3 . . . F2 . . . C3 . . . | C3 . . . G2 . . . C3 . . . G2 . . . | D2 . . . A2 . . . D2 . . . A2 . . . | G2 . . . D3 . . . G2 . . . G2 . A2 B2",
        "comp": ". . E4 . . . G4 . . . E4 . . . G4 . | . . D4 . . . G4 . . . D4 . . . G4 . | . . C4 . . . E4 . . . C4 . . . E4 . | . . B3 . . . E4 . . . B3 . . . E4 . | . . A3 . . . C4 . . . A3 . . . C4 . | . . G3 . . . C4 . . . G3 . . . C4 . | . . F3 . . . A3 . . . C4 . . . A3 . | . . F3 . . . G3 . . . B3 . . . D4 .",
        "lead": "E5 . E5 . F5 . G5 . G5 - E5 . C5 - - . | D5 . E5 . F5 . A5 . G5 - - . . . . . | C5 . D5 . E5 . G5 . A5 - G5 . E5 - - . | G5 . E5 . D5 . B4 . E5 - - . . . . . | A5 . A5 . B5 . C6 . G5 - E5 . C5 - - . | F5 . G5 . A5 . F5 . E5 - - . . . . . | D5 . E5 . F5 . G5 . A5 . G5 . F5 . D5 . | G5 - - - - . . . . . . . . . . .",
        "bells": ". . . . . . . . . . . . C6 - - . | . . . . . . . . . . . . B5 - - . | . . . . . . . . . . . . A5 - - . | . . . . . . . . . . . . G5 - - . | . . . . . . . . . . . . C6 - - . | . . . . . . . . . . . . G5 - - . | . . . . . . . . . . . . F5 - - . | D5 . F5 . B5 . D6 . G6 - - . . . . ."
      },
      "drums": {
        "kick": "x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x.......",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "F2 . . . C3 . . . F2 . . . C3 . . . | G2 . . . D3 . . . G2 . . . D3 . . . | E2 . . . B2 . . . E2 . . . B2 . . . | A2 . . . E2 . . . A2 . . . E2 . . . | D2 . . . A2 . . . D2 . . . A2 . . . | G2 . . . D3 . . . G2 . . . D3 . . . | C3 . . . G2 . . . C3 . . . G2 . . . | G2 . . . D3 . . . G2 . A2 . B2 . D3 .",
        "comp": ". . A3 . . . C4 . . . A3 . . . C4 . | . . B3 . . . D4 . . . B3 . . . D4 . | . . G3 . . . B3 . . . G3 . . . B3 . | . . A3 . . . C4 . . . A3 . . . C4 . | . . F3 . . . A3 . . . C4 . . . A3 . | . . F3 . . . G3 . . . B3 . . . D4 . | . . E3 . . . G3 . . . C4 . . . G3 . | . . F3 . . . G3 . . . B3 . . . D4 .",
        "lead": "A5 - C6 . B5 . A5 . G5 - F5 . E5 - - . | F5 . G5 . A5 . B5 . C6 - - . . . . . | G5 - B5 . A5 . G5 . E5 - D5 . C5 - - . | D5 . E5 . F5 . G5 . A5 - - . . . . . | F5 . E5 . D5 . F5 . A5 - G5 . F5 - - . | E5 . F5 . G5 . A5 . B5 - - . . . . . | C6 - - . B5 . A5 . G5 . E5 . D5 . E5 . | C5 - - - - . . . . . . . . . . .",
        "bells": ". . . . . . . . C6 . E6 . G6 - - . | . . . . . . . . D6 . F6 . A6 - - . | . . . . . . . . B5 . D6 . G6 - - . | . . . . . . . . A5 . C6 . E6 - - . | . . . . . . . . F5 . A5 . D6 - - . | . . . . . . . . G5 . B5 . F6 - - . | . . . . . . . . E6 . G6 . C7 - - . | G5 . C6 . E6 . G6 . C7 - - . . . . ."
      },
      "drums": {
        "kick": "x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x.......",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    }
  ]
},

  'sugoroku-result': {
  "id": "sugoroku-result",
  "title": "本日もお疲れ様でした",
  "bpm": 104,
  "swing": 0.05,
  "master": 0.85,
  "loopFrom": 1,
  "voices": [
    {
      "id": "bass",
      "wave": "triangle",
      "gain": 0.16,
      "attack": 0.01,
      "release": 0.12,
      "cutoff": 550
    },
    {
      "id": "lead",
      "wave": "sine",
      "gain": 0.065,
      "attack": 0.02,
      "release": 0.15,
      "vibrato": 12
    },
    {
      "id": "harmony",
      "wave": "square",
      "gain": 0.035,
      "attack": 0.02,
      "release": 0.12,
      "cutoff": 1800,
      "pan": -0.3
    },
    {
      "id": "glock",
      "wave": "sine",
      "gain": 0.04,
      "attack": 0.002,
      "release": 0.25,
      "pan": 0.3
    }
  ],
  "sections": [
    {
      "bars": 4,
      "voices": {
        "bass": "G2 - - . G2 - - . G2 - - . G2 - - . | C3 - - . C3 - - . C3 - - . C3 - - . | D3 - - . D3 - - . D3 - - . D3 - - . | G2 - - . G2 - - . G2 - - . . . . .",
        "lead": "G4 . B4 . D5 - G5 - G5 . A5 . B5 - - . | C6 - - . B5 . A5 . G5 - - . . . . . | A5 . B5 . C6 - D6 - D6 . E6 . F#6 - - . | G6 - - - - - - . . . . . . . . .",
        "harmony": "D4 . G4 . B4 - D5 - D5 . F#5 . G5 - - . | E5 - - . D5 . C5 . B4 - - . . . . . | F#5 . G5 . A5 - B5 - B5 . C6 . D6 - - . | B5 - - - - - - . . . . . . . . .",
        "glock": ". . . . . . . . G5 . B5 . D6 - - . | E6 - - . D6 . C6 . B5 - - . . . . . | . . . . . . . . A5 . D6 . F#6 - - . | G6 - - - - - - . . . . . . . . ."
      },
      "drums": {
        "kick": "x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x... | x...............",
        "snare": "....x.......x.xx | ....x.......x.xx | ....x.......x.xx | x...x...x...x...",
        "hat": "x...o...x...o... | x...o...x...o... | x...o...x...o... | x...o...x...o...",
        "crash": "x............... | ................ | ................ | x..............."
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "G2 - - . . . D3 . G2 - - . . . . . | F#2 - - . . . C#3 . F#2 - - . . . . . | E2 - - . . . B2 . E2 - - . . . . . | B2 - - . . . F#3 . B2 - - . . . . . | C3 - - . . . G2 . C3 - - . . . . . | B2 - - . . . G2 . B2 - - . . . . . | A2 - - . . . E3 . A2 - - . . . . . | D3 - - . . . A2 . D3 - - . . . . .",
        "lead": "B4 - - . C5 . D5 . G5 - - . F#5 . E5 . | D5 - - - - . . . . . . . . . . . | G4 - - . A4 . B4 . E5 - - . D5 . C5 . | B4 - - - - . . . . . . . . . . . | C5 - - . D5 . E5 . G5 - - . F#5 . E5 . | D5 - - . B4 . G4 . B4 - - - - . . . | A4 - - . B4 . C5 . E5 - - . D5 . C5 . | D5 - - - - . . . . . . . . . . .",
        "harmony": "G4 - - . . . . . B4 - - . . . . . | F#4 - - . . . . . A4 - - . . . . . | E4 - - . . . . . G4 - - . . . . . | D4 - - . . . . . F#4 - - . . . . . | E4 - - . . . . . G4 - - . . . . . | D4 - - . . . . . G4 - - . . . . . | C4 - - . . . . . E4 - - . . . . . | F#4 - - . . . . . A4 - - . . . . .",
        "glock": ". . . . . . . . G5 . B5 . D6 - - . | . . . . . . . . F#5 . A5 . D6 - - . | . . . . . . . . E5 . G5 . B5 - - . | . . . . . . . . D5 . F#5 . B5 - - . | . . . . . . . . E5 . G5 . C6 - - . | . . . . . . . . D5 . G5 . B5 - - . | . . . . . . . . C5 . E5 . A5 - - . | . . . . . . . . D5 . F#5 . A5 - - ."
      },
      "drums": {
        "kick": "x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x.......",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x.......x... | ....x.......x... | ....x.......x... | ....x.......x... | ....x.......x...",
        "hat": "x...o...x...o... | x...o...x...o... | x...o...x...o... | x...o...x...o... | x...o...x...o... | x...o...x...o... | x...o...x...o... | x...o...x...o..."
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "C3 - - . . . G2 . C3 - - . . . . . | C3 - - . . . A2 . C3 - - . . . . . | B2 - - . . . F#2 . B2 - - . . . . . | E2 - - . . . B2 . E2 - - . . . . . | A2 - - . . . E2 . A2 - - . . . . . | D3 - - . . . A2 . D3 - - . . . . . | G2 - - . . . D2 . G2 - - . . . . . | D3 - - . . . A2 . D3 . E3 . F#3 . A3 .",
        "lead": "E5 - - . F#5 . G5 . A5 - G5 . F#5 - - . | F#5 - - . G5 . A5 . B5 - A5 . G5 - - . | D5 - - . E5 . F#5 . G5 - F#5 . E5 - - . | B4 - - - - . . . . . . . . . . . | C5 - - . D5 . E5 . F#5 - E5 . D5 - - . | A4 - - . B4 . C5 . D5 - E5 . F#5 - - . | G5 - - - - . . . . . . . . . . . | G5 - - - - . . . . . . . . . . .",
        "harmony": "C4 - - . . . . . E4 - - . . . . . | D4 - - . . . . . F#4 - - . . . . . | B3 - - . . . . . D4 - - . . . . . | G3 - - . . . . . B3 - - . . . . . | E3 - - . . . . . A3 - - . . . . . | F#3 - - . . . . . A3 - - . . . . . | B3 - - . . . . . D4 - - . . . . . | C4 - - . . . . . F#4 - - . . . . .",
        "glock": ". . . . . . . . G5 . C6 . E6 - - . | . . . . . . . . A5 . D6 . F#6 - - . | . . . . . . . . F#5 . B5 . D6 - - . | . . . . . . . . E5 . G5 . B5 - - . | . . . . . . . . C5 . E5 . A5 - - . | . . . . . . . . D5 . F#5 . A5 - - . | . . . . . . . . B5 . D6 . G6 - - . | G5 . B5 . D6 . G6 . B6 - - . . . . ."
      },
      "drums": {
        "kick": "x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x....... | x.......x.......",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x.......x... | ....x.......x... | ....x.......x... | ....x.......x... | ....x.......x...",
        "hat": "x...o...x...o... | x...o...x...o... | x...o...x...o... | x...o...x...o... | x...o...x...o... | x...o...x...o... | x...o...x...o... | x...o...x...o..."
      }
    }
  ]
},

  'spiral-battle': {
  "id": "spiral-battle",
  "title": "未処理タスクの螺旋階段",
  "bpm": 136,
  "master": 0.85,
  "voices": [
    {
      "id": "bass",
      "wave": "sawtooth",
      "gain": 0.14,
      "attack": 0.005,
      "release": 0.05,
      "cutoff": 650
    },
    {
      "id": "arp",
      "wave": "square",
      "gain": 0.045,
      "attack": 0.005,
      "release": 0.04,
      "cutoff": 2600,
      "pan": 0.25
    },
    {
      "id": "lead",
      "wave": "sawtooth",
      "gain": 0.055,
      "attack": 0.01,
      "release": 0.08,
      "cutoff": 2400,
      "vibrato": 8,
      "detune": 12
    },
    {
      "id": "pad",
      "wave": "triangle",
      "gain": 0.04,
      "attack": 0.04,
      "release": 0.15,
      "cutoff": 1400,
      "pan": -0.3
    }
  ],
  "sections": [
    {
      "bars": 4,
      "voices": {
        "bass": "D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 F2 D2 C2 D2 | Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 D2 Bb1 A1 Bb1 | C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 E2 C2 D2 E2 | A1 A1 A1 A1 A1 A1 A1 A1 A1 A1 A1 A1 C#2 A1 B1 C#2",
        "arp": "D4 F4 A4 D5 D4 F4 A4 D5 D4 F4 A4 D5 D4 F4 A4 D5 | D4 F4 Bb4 D5 D4 F4 Bb4 D5 D4 F4 Bb4 D5 D4 F4 Bb4 D5 | E4 G4 C5 E5 E4 G4 C5 E5 E4 G4 C5 E5 E4 G4 C5 E5 | E4 A4 C#5 E5 E4 A4 C#5 E5 E4 A4 C#5 E5 E4 A4 C#5 E5",
        "lead": ". . . . . . . . . . . . A4 - D5 - | F5 - - - - . . . . . . . D5 - F5 - | G5 - - - - . . . . . . . E5 - G5 - | A5 - - - - - - . . . . . . . . .",
        "pad": "D3 - - - - - - - A3 - - - - - - - | Bb2 - - - - - - - F3 - - - - - - - | C3 - - - - - - - G3 - - - - - - - | A2 - - - - - - - E3 - - - - - - -"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "..x...x...x...x. | ..x...x...x...x. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 F2 D2 C2 D2 | Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 D2 Bb1 A1 Bb1 | C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 E2 C2 D2 E2 | D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 F2 D2 C2 D2 | D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 F2 D2 C2 D2 | Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 D2 Bb1 A1 Bb1 | C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 E2 C2 D2 E2 | A1 A1 A1 A1 A1 A1 A1 A1 A1 A1 A1 A1 C#2 A1 B1 C#2",
        "arp": "D4 F4 A4 D5 D4 F4 A4 D5 D4 F4 A4 D5 D4 F4 A4 D5 | D4 F4 Bb4 D5 D4 F4 Bb4 D5 D4 F4 Bb4 D5 D4 F4 Bb4 D5 | E4 G4 C5 E5 E4 G4 C5 E5 E4 G4 C5 E5 E4 G4 C5 E5 | D4 F4 A4 D5 D4 F4 A4 D5 D4 F4 A4 D5 D4 F4 A4 D5 | D4 F4 A4 D5 D4 F4 A4 D5 D4 F4 A4 D5 D4 F4 A4 D5 | D4 F4 Bb4 D5 D4 F4 Bb4 D5 D4 F4 Bb4 D5 D4 F4 Bb4 D5 | E4 G4 C5 E5 E4 G4 C5 E5 E4 G4 C5 E5 E4 G4 C5 E5 | E4 A4 C#5 E5 E4 A4 C#5 E5 E4 A4 C#5 E5 E4 A4 C#5 E5",
        "lead": "D5 - . F5 - . A5 - A5 - . G5 . F5 . E5 | D5 - - . . . . . F5 - . G5 . A5 - . | G5 - . E5 - . C5 - E5 - . D5 . C5 . E5 | D5 - - - - . . . . . . . . . . . | D5 - . F5 - . A5 - D6 - . C6 . A5 . G5 | F5 - - . . . . . D5 - . F5 . A5 - . | G5 - . C6 - . B5 - G5 - . E5 . G5 . B5 | A5 - - - - - - . . . . . . . . .",
        "pad": "D3 - - - - - - - F3 - - - - - - - | Bb2 - - - - - - - D3 - - - - - - - | C3 - - - - - - - E3 - - - - - - - | D3 - - - - - - - F3 - - - - - - - | D3 - - - - - - - F3 - - - - - - - | Bb2 - - - - - - - D3 - - - - - - - | C3 - - - - - - - E3 - - - - - - - | A2 - - - - - - - C#3 - - - - - - -"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x..x | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x..x | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 D2 Bb1 A1 Bb1 | C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 E2 C2 D2 E2 | D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 F2 D2 C2 D2 | F2 F2 F2 F2 F2 F2 F2 F2 F2 F2 F2 F2 A2 F2 G2 A2 | G2 G2 G2 G2 G2 G2 G2 G2 G2 G2 G2 G2 Bb2 G2 A2 Bb2 | A2 A2 A2 A2 A2 A2 A2 A2 A2 A2 A2 A2 C3 A2 B2 C3 | Bb2 Bb2 Bb2 Bb2 Bb2 Bb2 Bb2 Bb2 Bb2 Bb2 Bb2 Bb2 D3 Bb2 C3 D3 | A2 A2 A2 A2 A2 A2 A2 A2 A2 A2 A2 A2 C#3 A2 B2 C#3",
        "arp": "F4 Bb4 D5 F5 F4 Bb4 D5 F5 F4 Bb4 D5 F5 F4 Bb4 D5 F5 | G4 C5 E5 G5 G4 C5 E5 G5 G4 C5 E5 G5 G4 C5 E5 G5 | F4 A4 D5 F5 F4 A4 D5 F5 F4 A4 D5 F5 F4 A4 D5 F5 | A4 C5 F5 A5 A4 C5 F5 A5 A4 C5 F5 A5 A4 C5 F5 A5 | G4 Bb4 D5 G5 G4 Bb4 D5 G5 G4 Bb4 D5 G5 G4 Bb4 D5 G5 | A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5 | Bb4 D5 F5 Bb5 Bb4 D5 F5 Bb5 Bb4 D5 F5 Bb5 Bb4 D5 F5 Bb5 | A4 C#5 E5 A5 A4 C#5 E5 A5 A4 C#5 E5 A5 A4 C#5 E5 A5",
        "lead": "F5 - . G5 - . A5 - Bb5 - . A5 . G5 . F5 | G5 - - . . . . . E5 - . F5 . G5 - . | A5 - . F5 - . D5 - F5 - . G5 . A5 . C6 | C6 - - - - . . . . . . . . . . . | D6 - . Bb5 - . G5 - Bb5 - . C6 . D6 . E6 | C6 - - . . . . . A5 - . B5 . C6 - . | D6 - . C6 - . Bb5 - A5 - . G5 . F5 . G5 | A5 - - - - - - . . . . . . . . .",
        "pad": "Bb2 - - - - - - - D3 - - - - - - - | C3 - - - - - - - E3 - - - - - - - | D3 - - - - - - - F3 - - - - - - - | F3 - - - - - - - A3 - - - - - - - | G2 - - - - - - - Bb2 - - - - - - - | A2 - - - - - - - C3 - - - - - - - | Bb2 - - - - - - - D3 - - - - - - - | A2 - - - - - - - C#3 - - - - - - -"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x..x | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x..x | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 4,
      "voices": {
        "bass": "D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 F2 D2 C2 D2 | Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 D2 Bb1 A1 Bb1 | C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 E2 C2 D2 E2 | A1 A1 A1 A1 A1 A1 A1 A1 A1 A1 A1 A1 C#2 A1 B1 C#2",
        "arp": "D4 F4 A4 D5 D4 F4 A4 D5 D4 F4 A4 D5 D4 F4 A4 D5 | D4 F4 Bb4 D5 D4 F4 Bb4 D5 D4 F4 Bb4 D5 D4 F4 Bb4 D5 | E4 G4 C5 E5 E4 G4 C5 E5 E4 G4 C5 E5 E4 G4 C5 E5 | E4 A4 C#5 E5 E4 A4 C#5 E5 E4 A4 C#5 E5 E4 A4 C#5 E5",
        "lead": "D5 . F5 . A5 . D6 . A5 . F5 . D5 . F5 . | Bb5 . G5 . F5 . D5 . Bb4 . D5 . F5 . Bb5 . | C6 . G5 . E5 . C5 . E5 . G5 . C6 . E6 . | A6 - - - - - - . . . . . . . . .",
        "pad": "D3 - - - - - - - A3 - - - - - - - | Bb2 - - - - - - - F3 - - - - - - - | C3 - - - - - - - G3 - - - - - - - | A2 - - - - - - - E3 - - - - - - -"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | x..............."
      }
    }
  ]
},

  'spiral-boss': {
  "id": "spiral-boss",
  "title": "怒号の重役プレゼンテーション",
  "bpm": 150,
  "master": 0.88,
  "voices": [
    {
      "id": "sub",
      "wave": "triangle",
      "gain": 0.18,
      "attack": 0.005,
      "release": 0.07,
      "cutoff": 350
    },
    {
      "id": "midbass",
      "wave": "sawtooth",
      "gain": 0.11,
      "attack": 0.005,
      "release": 0.05,
      "cutoff": 900,
      "detune": 15
    },
    {
      "id": "lead",
      "wave": "square",
      "gain": 0.055,
      "attack": 0.008,
      "release": 0.08,
      "cutoff": 2800,
      "vibrato": 15,
      "detune": 10
    },
    {
      "id": "synth",
      "wave": "sawtooth",
      "gain": 0.04,
      "attack": 0.005,
      "release": 0.06,
      "cutoff": 2200,
      "pan": 0.3
    }
  ],
  "sections": [
    {
      "bars": 4,
      "voices": {
        "sub": "C2 - - - - - - - C2 - - - - - - - | Ab1 - - - - - - - Ab1 - - - - - - - | F1 - - - - - - - F1 - - - - - - - | G1 - - - - - - - G1 - - - - - - -",
        "midbass": "C2 C2 C2 . C2 C2 C2 . Eb2 C2 . C2 G2 Eb2 D2 Eb2 | Ab1 Ab1 Ab1 . Ab1 Ab1 Ab1 . C2 Ab1 . Ab1 Eb2 C2 Bb1 C2 | F1 F1 F1 . F1 F1 F1 . Ab1 F1 . F1 C2 Ab1 G1 Ab1 | G1 G1 G1 . G1 G1 G1 . B1 G1 . G1 D2 B1 A1 B1",
        "lead": "C5 - - . D5 . Eb5 - G5 - - . F5 . Eb5 . | D5 - - - - . . . . . . . Eb5 - F5 - | Ab5 - - . G5 . F5 - Eb5 - - . D5 . C5 . | B4 - - - - - - . . . . . . . . .",
        "synth": "Eb4 G4 C5 . Eb4 G4 C5 . Eb4 G4 C5 . Eb4 G4 C5 . | C4 Eb4 Ab4 . C4 Eb4 Ab4 . C4 Eb4 Ab4 . C4 Eb4 Ab4 . | C4 F4 Ab4 . C4 F4 Ab4 . C4 F4 Ab4 . C4 F4 Ab4 . | D4 F4 G4 B4 D4 F4 G4 B4 D4 F4 G4 B4 D4 F4 G4 B4"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...xxxxxx.x",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "sub": "C2 - - - - - - - C2 - - - - - - - | Ab1 - - - - - - - Ab1 - - - - - - - | Bb1 - - - - - - - Bb1 - - - - - - - | C2 - - - - - - - C2 - - - - - - - | C2 - - - - - - - C2 - - - - - - - | Ab1 - - - - - - - Ab1 - - - - - - - | Bb1 - - - - - - - Bb1 - - - - - - - | G1 - - - - - - - G1 - - - - - - -",
        "midbass": "C2 C2 C2 . C2 C2 C2 . Eb2 C2 . C2 G2 Eb2 D2 Eb2 | Ab1 Ab1 Ab1 . Ab1 Ab1 Ab1 . C2 Ab1 . Ab1 Eb2 C2 Bb1 C2 | Bb1 Bb1 Bb1 . Bb1 Bb1 Bb1 . D2 Bb1 . Bb1 F2 D2 C2 D2 | C2 C2 C2 . C2 C2 C2 . Eb2 C2 . C2 G2 Eb2 D2 Eb2 | C2 C2 C2 . C2 C2 C2 . Eb2 C2 . C2 G2 Eb2 D2 Eb2 | Ab1 Ab1 Ab1 . Ab1 Ab1 Ab1 . C2 Ab1 . Ab1 Eb2 C2 Bb1 C2 | Bb1 Bb1 Bb1 . Bb1 Bb1 Bb1 . D2 Bb1 . Bb1 F2 D2 C2 D2 | G1 G1 G1 . G1 G1 G1 . B1 G1 . G1 D2 B1 A1 B1",
        "lead": "C5 - . Eb5 - . G5 - Ab5 - . G5 . F5 . Eb5 | D5 - - . . . . . F5 - . Eb5 . D5 - . | F5 - . G5 - . Ab5 - G5 - . F5 . Eb5 . D5 | Eb5 - - - - . . . . . . . . . . . | C5 - . Eb5 - . G5 - C6 - . Bb5 . Ab5 . G5 | Ab5 - - . . . . . C6 - . Bb5 . Ab5 - . | Bb5 - . Ab5 - . G5 - F5 - . Eb5 . D5 . F5 | G5 - - - - - - . . . . . . . . .",
        "synth": "Eb4 G4 C5 . Eb4 G4 C5 . Eb4 G4 C5 . Eb4 G4 C5 . | C4 Eb4 Ab4 . C4 Eb4 Ab4 . C4 Eb4 Ab4 . C4 Eb4 Ab4 . | D4 F4 Bb4 . D4 F4 Bb4 . D4 F4 Bb4 . D4 F4 Bb4 . | Eb4 G4 C5 . Eb4 G4 C5 . Eb4 G4 C5 . Eb4 G4 C5 . | Eb4 G4 C5 . Eb4 G4 C5 . Eb4 G4 C5 . Eb4 G4 C5 . | C4 Eb4 Ab4 . C4 Eb4 Ab4 . C4 Eb4 Ab4 . C4 Eb4 Ab4 . | D4 F4 Bb4 . D4 F4 Bb4 . D4 F4 Bb4 . D4 F4 Bb4 . | D4 F4 G4 B4 D4 F4 G4 B4 D4 F4 G4 B4 D4 F4 G4 B4"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...xxxxxx.x | ....x.......x... | ....x.......x... | ....x.......x... | ....x...xxxxxx.x",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "sub": "Ab1 - - - - - - - Ab1 - - - - - - - | Bb1 - - - - - - - Bb1 - - - - - - - | C2 - - - - - - - C2 - - - - - - - | Eb2 - - - - - - - Eb2 - - - - - - - | F1 - - - - - - - F1 - - - - - - - | G1 - - - - - - - G1 - - - - - - - | Ab1 - - - - - - - Ab1 - - - - - - - | G1 - - - - - - - G1 - - - - - - -",
        "midbass": "Ab1 Ab1 Ab1 Ab1 Ab1 Ab1 Ab1 Ab1 C2 Ab1 Ab1 Ab1 Eb2 Ab1 Ab1 Ab1 | Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 D2 Bb1 Bb1 Bb1 F2 Bb1 Bb1 Bb1 | C2 C2 C2 C2 C2 C2 C2 C2 Eb2 C2 C2 C2 G2 C2 C2 C2 | Eb2 Eb2 Eb2 Eb2 Eb2 Eb2 Eb2 Eb2 G2 Eb2 Eb2 Eb2 Bb2 Eb2 Eb2 Eb2 | F1 F1 F1 F1 F1 F1 F1 F1 Ab1 F1 F1 F1 C2 F1 F1 F1 | G1 G1 G1 G1 G1 G1 G1 G1 Bb1 G1 G1 G1 D2 G1 G1 G1 | Ab1 Ab1 Ab1 Ab1 Ab1 Ab1 Ab1 Ab1 C2 Ab1 Ab1 Ab1 Eb2 Ab1 Ab1 Ab1 | G1 G1 G1 G1 G1 G1 G1 G1 B1 G1 G1 G1 D2 G1 G1 G1",
        "lead": "C6 - . Ab5 - . Eb5 - Ab5 - . Bb5 . C6 . D6 | D6 - - . . . . . Bb5 - . C6 . D6 - . | Eb6 - . C6 - . G5 - C6 - . D6 . Eb6 . F6 | G6 - - - - . . . . . . . . . . . | Ab6 - . F6 - . C6 - F6 - . G6 . Ab6 . Bb6 | G6 - - . . . . . Eb6 - . F6 . G6 - . | F6 - . Eb6 - . D6 - C6 - . B5 . C6 . D6 | G5 - - - - - - . . . . . . . . .",
        "synth": "C5 Eb5 Ab5 . C5 Eb5 Ab5 . C5 Eb5 Ab5 . C5 Eb5 Ab5 . | D5 F5 Bb5 . D5 F5 Bb5 . D5 F5 Bb5 . D5 F5 Bb5 . | Eb5 G5 C6 . Eb5 G5 C6 . Eb5 G5 C6 . Eb5 G5 C6 . | G4 Bb4 Eb5 . G4 Bb4 Eb5 . G4 Bb4 Eb5 . G4 Bb4 Eb5 . | Ab4 C5 F5 . Ab4 C5 F5 . Ab4 C5 F5 . Ab4 C5 F5 . | Bb4 D5 G5 . Bb4 D5 G5 . Bb4 D5 G5 . Bb4 D5 G5 . | C5 Eb5 Ab5 . C5 Eb5 Ab5 . C5 Eb5 Ab5 . C5 Eb5 Ab5 . | B4 D5 G5 . B4 D5 G5 . B4 D5 G5 . B4 D5 G5 ."
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...xxxxxx.x | ....x.......x... | ....x.......x... | ....x.......x... | ....x...xxxxxx.x",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 4,
      "voices": {
        "sub": "C2 - - - - - - - C2 - - - - - - - | Ab1 - - - - - - - Ab1 - - - - - - - | F1 - - - - - - - F1 - - - - - - - | G1 - - - - - - - G1 - - - - - - -",
        "midbass": "C2 C2 C2 . C2 C2 C2 . Eb2 C2 . C2 G2 Eb2 D2 Eb2 | Ab1 Ab1 Ab1 . Ab1 Ab1 Ab1 . C2 Ab1 . Ab1 Eb2 C2 Bb1 C2 | F1 F1 F1 . F1 F1 F1 . Ab1 F1 . F1 C2 Ab1 G1 Ab1 | G1 G1 G1 . G1 G1 G1 . B1 G1 . G1 D2 B1 A1 B1",
        "lead": "C6 . Eb6 . G6 . C7 . G6 . Eb6 . C6 . Eb6 . | Ab6 . Eb6 . C6 . Ab5 . C6 . Eb6 . Ab6 . C7 . | F6 . Ab6 . C7 . F6 . C7 . Ab6 . F6 . Ab6 . | G6 - - - - - - - G5 - - - - - - -",
        "synth": "Eb4 G4 C5 . Eb4 G4 C5 . Eb4 G4 C5 . Eb4 G4 C5 . | C4 Eb4 Ab4 . C4 Eb4 Ab4 . C4 Eb4 Ab4 . C4 Eb4 Ab4 . | C4 F4 Ab4 . C4 F4 Ab4 . C4 F4 Ab4 . C4 F4 Ab4 . | D4 F4 G4 B4 D4 F4 G4 B4 D4 F4 G4 B4 D4 F4 G4 B4"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...xxxxxx.x",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | x..............."
      }
    }
  ]
},

  'survivor-battle': {
  "id": "survivor-battle",
  "title": "無限残業サバイバル",
  "bpm": 142,
  "master": 0.85,
  "voices": [
    {
      "id": "bass",
      "wave": "triangle",
      "gain": 0.17,
      "attack": 0.005,
      "release": 0.06,
      "cutoff": 1200
    },
    {
      "id": "lead",
      "wave": "square",
      "gain": 0.06,
      "attack": 0.005,
      "release": 0.07,
      "cutoff": 3000,
      "vibrato": 10
    },
    {
      "id": "arp",
      "wave": "square",
      "gain": 0.045,
      "attack": 0.005,
      "release": 0.04,
      "cutoff": 2500,
      "pan": 0.2
    }
  ],
  "sections": [
    {
      "bars": 4,
      "voices": {
        "bass": "A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 | F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 | G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 | E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 F2 G#2 B2",
        "lead": ". . . . . . . . A4 . B4 . C5 - E5 - | F5 - - - - . . . F5 . G5 . A5 - F5 - | G5 - - - - . . . G5 . A5 . B5 - G5 - | E5 - - - - - - . . . . . . . . .",
        "arp": "A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5 | F4 A4 C5 F5 F4 A4 C5 F5 F4 A4 C5 F5 F4 A4 C5 F5 | G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 | E4 G#4 B4 E5 E4 G#4 B4 E5 E4 G#4 B4 E5 E4 G#4 B4 E5"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x.",
        "crash": "x............... | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 | F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 | G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 | C3 C4 C3 C4 C3 C4 C3 C4 C3 C4 C3 C4 C3 C4 C3 C4 | D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 | A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 | F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 | E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 F2 G#2 B2",
        "lead": "E5 - . A5 - . B5 - C6 - . B5 . A5 . G5 | A5 - - . . . . . F5 - . G5 . A5 - . | B5 - . G5 - . D5 - G5 - . A5 . B5 . D6 | C6 - - - - . . . . . . . . . . . | D6 - . A5 - . F5 - A5 - . B5 . C6 . D6 | C6 - - . . . . . A5 - . B5 . C6 - . | D6 - . C6 - . B5 - A5 - . G5 . F5 . A5 | E5 - - - - - - . . . . . . . . .",
        "arp": "A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5 | F4 A4 C5 F5 F4 A4 C5 F5 F4 A4 C5 F5 F4 A4 C5 F5 | G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 | G4 C5 E5 G5 G4 C5 E5 G5 G4 C5 E5 G5 G4 C5 E5 G5 | F4 A4 D5 F5 F4 A4 D5 F5 F4 A4 D5 F5 F4 A4 D5 F5 | E4 A4 C5 E5 E4 A4 C5 E5 E4 A4 C5 E5 E4 A4 C5 E5 | F4 A4 C5 F5 F4 A4 C5 F5 F4 A4 C5 F5 F4 A4 C5 F5 | E4 G#4 B4 E5 E4 G#4 B4 E5 E4 G#4 B4 E5 E4 G#4 B4 E5"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 | G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 | E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 | A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 | D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 | G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 | C3 C4 C3 C4 C3 C4 C3 C4 C3 C4 C3 C4 C3 C4 C3 C4 | E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 F2 G#2 B2",
        "lead": "A5 - . C6 - . D6 - E6 - . D6 . C6 . A5 | B5 - - . . . . . G5 - . A5 . B5 - . | G5 - . B5 - . C6 - D6 - . C6 . B5 . G5 | A5 - - - - . . . . . . . . . . . | F5 - . A5 - . B5 - C6 - . B5 . A5 . F5 | G5 - . B5 - . C6 - D6 - . C6 . B5 . G5 | E6 - - . D6 . C6 . B5 . A5 . G5 . A5 . | E5 - - - - - - . . . . . . . . .",
        "arp": "F4 A4 C5 F5 F4 A4 C5 F5 F4 A4 C5 F5 F4 A4 C5 F5 | G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 | E4 G4 B4 E5 E4 G4 B4 E5 E4 G4 B4 E5 E4 G4 B4 E5 | E4 A4 C5 E5 E4 A4 C5 E5 E4 A4 C5 E5 E4 A4 C5 E5 | F4 A4 D5 F5 F4 A4 D5 F5 F4 A4 D5 F5 F4 A4 D5 F5 | G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 | G4 C5 E5 G5 G4 C5 E5 G5 G4 C5 E5 G5 G4 C5 E5 G5 | E4 G#4 B4 E5 E4 G#4 B4 E5 E4 G#4 B4 E5 E4 G#4 B4 E5"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 4,
      "voices": {
        "bass": "A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 | F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 | D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 | E2 E3 E2 E3 E2 E3 E2 E3 E2 F2 G#2 B2 E3 G#3 B3 E4",
        "lead": "A5 . C6 . E6 . A6 . E6 . C6 . A5 . C6 . | F6 . C6 . A5 . F5 . A5 . C6 . F6 . A6 . | D6 . A5 . F5 . D5 . F5 . A5 . D6 . F6 . | E6 - - - - - - - E5 - - - - - - -",
        "arp": "A4 C5 E5 A5 C6 A5 E5 C5 A4 C5 E5 A5 C6 A5 E5 C5 | F4 A4 C5 F5 A5 F5 C5 A4 F4 A4 C5 F5 A5 F5 C5 A4 | D4 F4 A4 D5 F5 D5 A4 F4 D4 F4 A4 D5 F5 D5 A4 F4 | E4 G#4 B4 E5 G#5 E5 B4 G#4 E5 G#5 B5 E6 . . . ."
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x.",
        "crash": "x............... | ................ | ................ | x..............."
      }
    }
  ]
},

  'survivor-boss': {
  "id": "survivor-boss",
  "title": "降臨！取締役本部長",
  "bpm": 148,
  "master": 0.88,
  "voices": [
    {
      "id": "bass",
      "wave": "triangle",
      "gain": 0.17,
      "attack": 0.005,
      "release": 0.06,
      "cutoff": 800
    },
    {
      "id": "lead",
      "wave": "square",
      "gain": 0.06,
      "attack": 0.008,
      "release": 0.08,
      "cutoff": 2600,
      "vibrato": 14,
      "detune": 12
    },
    {
      "id": "counter",
      "wave": "sawtooth",
      "gain": 0.045,
      "attack": 0.005,
      "release": 0.06,
      "cutoff": 2000,
      "pan": -0.3
    },
    {
      "id": "chords",
      "wave": "square",
      "gain": 0.035,
      "attack": 0.01,
      "release": 0.08,
      "cutoff": 1800,
      "pan": 0.3
    }
  ],
  "sections": [
    {
      "bars": 4,
      "voices": {
        "bass": "E2 E2 E2 . E2 E2 E2 . G2 E2 . E2 B2 G2 F#2 G2 | C2 C2 C2 . C2 C2 C2 . E2 C2 . C2 G2 E2 D2 E2 | D2 D2 D2 . D2 D2 D2 . F#2 D2 . D2 A2 F#2 E2 F#2 | B1 B1 B1 . B1 B1 B1 . D#2 B1 . B1 F#2 D#2 C#2 D#2",
        "lead": "E5 - - . F#5 . G5 - B5 - - . A5 . G5 . | C6 - - - - . . . . . . . B5 - A5 - | D6 - - . C6 . B5 - A5 - - . G5 . F#5 . | B5 - - - - - - . . . . . . . . .",
        "counter": "B4 . G4 . E4 . G4 . B4 . G4 . E4 . G4 . | G4 . E4 . C4 . E4 . G4 . E4 . C4 . E4 . | A4 . F#4 . D4 . F#4 . A4 . F#4 . D4 . F#4 . | F#4 . D#4 . B3 . D#4 . F#4 . D#4 . B3 . D#4 .",
        "chords": "G4 B4 E5 . G4 B4 E5 . G4 B4 E5 . G4 B4 E5 . | E4 G4 C5 . E4 G4 C5 . E4 G4 C5 . E4 G4 C5 . | F#4 A4 D5 . F#4 A4 D5 . F#4 A4 D5 . F#4 A4 D5 . | D#4 F#4 B4 . D#4 F#4 B4 . D#4 F#4 B4 . D#4 F#4 B4 ."
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "E2 E2 E2 . E2 E2 E2 . G2 E2 . E2 B2 G2 F#2 G2 | C2 C2 C2 . C2 C2 C2 . E2 C2 . C2 G2 E2 D2 E2 | D2 D2 D2 . D2 D2 D2 . F#2 D2 . D2 A2 F#2 E2 F#2 | E2 E2 E2 . E2 E2 E2 . G2 E2 . E2 B2 G2 F#2 G2 | E2 E2 E2 . E2 E2 E2 . G2 E2 . E2 B2 G2 F#2 G2 | C2 C2 C2 . C2 C2 C2 . E2 C2 . C2 G2 E2 D2 E2 | A1 A1 A1 . A1 A1 A1 . C2 A1 . A1 E2 C2 B1 C2 | B1 B1 B1 . B1 B1 B1 . D#2 B1 . B1 F#2 D#2 C#2 D#2",
        "lead": "E5 - . G5 - . B5 - C6 - . B5 . A5 . G5 | F#5 - - . . . . . A5 - . G5 . F#5 - . | A5 - . B5 - . C6 - B5 - . A5 . G5 . F#5 | G5 - - - - . . . . . . . . . . . | E5 - . G5 - . B5 - E6 - . D6 . C6 . B5 | C6 - - . . . . . E6 - . D6 . C6 - . | D6 - . C6 - . B5 - A5 - . G5 . F#5 . A5 | B5 - - - - - - . . . . . . . . .",
        "counter": "B4 . G4 . E4 . G4 . B4 . G4 . E4 . G4 . | G4 . E4 . C4 . E4 . G4 . E4 . C4 . E4 . | A4 . F#4 . D4 . F#4 . A4 . F#4 . D4 . F#4 . | B4 . G4 . E4 . G4 . B4 . G4 . E4 . G4 . | B4 . G4 . E4 . G4 . B4 . G4 . E4 . G4 . | G4 . E4 . C4 . E4 . G4 . E4 . C4 . E4 . | E4 . C4 . A3 . C4 . E4 . C4 . A3 . C4 . | F#4 . D#4 . B3 . D#4 . F#4 . D#4 . B3 . D#4 .",
        "chords": "G4 B4 E5 . G4 B4 E5 . G4 B4 E5 . G4 B4 E5 . | E4 G4 C5 . E4 G4 C5 . E4 G4 C5 . E4 G4 C5 . | F#4 A4 D5 . F#4 A4 D5 . F#4 A4 D5 . F#4 A4 D5 . | G4 B4 E5 . G4 B4 E5 . G4 B4 E5 . G4 B4 E5 . | G4 B4 E5 . G4 B4 E5 . G4 B4 E5 . G4 B4 E5 . | E4 G4 C5 . E4 G4 C5 . E4 G4 C5 . E4 G4 C5 . | E4 A4 C5 . E4 A4 C5 . E4 A4 C5 . E4 A4 C5 . | D#4 F#4 B4 . D#4 F#4 B4 . D#4 F#4 B4 . D#4 F#4 B4 ."
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "C2 C2 C2 C2 C2 C2 C2 C2 E2 C2 C2 C2 G2 C2 C2 C2 | D2 D2 D2 D2 D2 D2 D2 D2 F#2 D2 D2 D2 A2 D2 D2 D2 | E2 E2 E2 E2 E2 E2 E2 E2 G2 E2 E2 E2 B2 E2 E2 E2 | G2 G2 G2 G2 G2 G2 G2 G2 B2 G2 G2 G2 D3 G2 G2 G2 | A1 A1 A1 A1 A1 A1 A1 A1 C2 A1 A1 A1 E2 A1 A1 A1 | B1 B1 B1 B1 B1 B1 B1 B1 D2 B1 B1 B1 F#2 B1 B1 B1 | C2 C2 C2 C2 C2 C2 C2 C2 E2 C2 C2 C2 G2 C2 C2 C2 | B1 B1 B1 B1 B1 B1 B1 B1 D#2 B1 B1 B1 F#2 B1 B1 B1",
        "lead": "C6 - . A5 - . E5 - A5 - . B5 . C6 . D6 | D6 - - . . . . . B5 - . C6 . D6 - . | E6 - . C6 - . G5 - C6 - . D6 . E6 . F#6 | G6 - - - - . . . . . . . . . . . | A6 - . F#6 - . D6 - F#6 - . G6 . A6 . B6 | G6 - - . . . . . E6 - . F#6 . G6 - . | F#6 - . E6 - . D#6 - E6 - . F#6 . G6 . A6 | B5 - - - - - - . . . . . . . . .",
        "counter": "E5 G5 C6 . E5 G5 C6 . E5 G5 C6 . E5 G5 C6 . | F#5 A5 D6 . F#5 A5 D6 . F#5 A5 D6 . F#5 A5 D6 . | G5 B5 E6 . G5 B5 E6 . G5 B5 E6 . G5 B5 E6 . | B4 D5 G5 . B4 D5 G5 . B4 D5 G5 . B4 D5 G5 . | C5 E5 A5 . C5 E5 A5 . C5 E5 A5 . C5 E5 A5 . | D5 F#5 B5 . D5 F#5 B5 . D5 F#5 B5 . D5 F#5 B5 . | E5 G5 C6 . E5 G5 C6 . E5 G5 C6 . E5 G5 C6 . | D#5 F#5 B5 . D#5 F#5 B5 . D#5 F#5 B5 . D#5 F#5 B5 .",
        "chords": "G4 C5 E5 . G4 C5 E5 . G4 C5 E5 . G4 C5 E5 . | A4 D5 F#5 . A4 D5 F#5 . A4 D5 F#5 . A4 D5 F#5 . | B4 E5 G5 . B4 E5 G5 . B4 E5 G5 . B4 E5 G5 . | D4 G4 B4 . D4 G4 B4 . D4 G4 B4 . D4 G4 B4 . | E4 A4 C5 . E4 A4 C5 . E4 A4 C5 . E4 A4 C5 . | F#4 B4 D5 . F#4 B4 D5 . F#4 B4 D5 . F#4 B4 D5 . | G4 C5 E5 . G4 C5 E5 . G4 C5 E5 . G4 C5 E5 . | F#4 B4 D#5 . F#4 B4 D#5 . F#4 B4 D#5 . F#4 B4 D#5 ."
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | x..............."
      }
    }
  ]
},

  'defense-battle': {
  "id": "defense-battle",
  "title": "怒涛のラッシュアワー突破劇",
  "bpm": 145,
  "master": 0.86,
  "voices": [
    {
      "id": "bass",
      "wave": "triangle",
      "gain": 0.16,
      "attack": 0.005,
      "release": 0.07,
      "cutoff": 700
    },
    {
      "id": "gtr",
      "wave": "sawtooth",
      "gain": 0.05,
      "attack": 0.008,
      "release": 0.07,
      "cutoff": 2200,
      "detune": 14,
      "pan": -0.25
    },
    {
      "id": "lead",
      "wave": "square",
      "gain": 0.06,
      "attack": 0.008,
      "release": 0.09,
      "cutoff": 2800,
      "vibrato": 12,
      "pan": 0.2
    },
    {
      "id": "organ",
      "wave": "sine",
      "gain": 0.045,
      "attack": 0.02,
      "release": 0.12,
      "detune": 8
    }
  ],
  "sections": [
    {
      "bars": 4,
      "voices": {
        "bass": "E2 . E2 . E2 . E2 . E2 . E2 . G2 . B2 . | G2 . G2 . G2 . G2 . G2 . G2 . B2 . D3 . | A2 . A2 . A2 . A2 . A2 . A2 . C#3 . E3 . | C3 . C3 . C3 . C3 . D3 . D3 . D3 . D3 .",
        "gtr": "E3 B3 E4 . E3 B3 E4 . E3 B3 E4 . G3 . B3 . | G3 D4 G4 . G3 D4 G4 . G3 D4 G4 . B3 . D4 . | A3 E4 A4 . A3 E4 A4 . A3 E4 A4 . C#4 . E4 . | C4 G4 C5 . C4 G4 C5 . D4 A4 D5 . D4 A4 D5 .",
        "lead": ". . . . . . . . E5 - G5 - B5 - - . | D6 - - - - . . . B5 - A5 - G5 - - . | A5 - - - - . . . B5 - C6 - D6 - - . | E6 - - - - - - . . . . . . . . .",
        "organ": "E4 - - - - - - - G4 - - - - - - - | G4 - - - - - - - B4 - - - - - - - | A4 - - - - - - - C#5 - - - - - - - | C5 - - - - - - - D5 - - - - - - -"
      },
      "drums": {
        "kick": "x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | ..x...x...x...x.",
        "crash": "x............... | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "E2 E2 E2 E2 E2 E2 E2 E2 E2 E2 E2 E2 G2 E2 F#2 G2 | E2 E2 E2 E2 E2 E2 E2 E2 E2 E2 E2 E2 G2 E2 F#2 G2 | C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 E2 C2 D2 E2 | D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 D2 F#2 D2 E2 F#2 | E2 E2 E2 E2 E2 E2 E2 E2 E2 E2 E2 E2 G2 E2 F#2 G2 | E2 E2 E2 E2 E2 E2 E2 E2 E2 E2 E2 E2 G2 E2 F#2 G2 | C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 C2 E2 C2 D2 E2 | B1 B1 B1 B1 B1 B1 B1 B1 B1 B1 B1 B1 D#2 B1 C#2 D#2",
        "gtr": "E3 B3 . E3 B3 . E3 B3 . E3 B3 . G3 . A3 . | E3 B3 . E3 B3 . E3 B3 . E3 B3 . G3 . A3 . | C3 G3 . C3 G3 . C3 G3 . C3 G3 . E3 . G3 . | D3 A3 . D3 A3 . D3 A3 . D3 A3 . F#3 . A3 . | E3 B3 . E3 B3 . E3 B3 . E3 B3 . G3 . A3 . | E3 B3 . E3 B3 . E3 B3 . E3 B3 . G3 . A3 . | C3 G3 . C3 G3 . C3 G3 . C3 G3 . E3 . G3 . | B2 F#3 . B2 F#3 . B2 F#3 . B2 F#3 . D#3 . F#3 .",
        "lead": "E5 - . G5 - . A5 - B5 - . A5 . G5 . F#5 | E5 - - . . . . . . . B4 . E5 . G5 . | A5 - . G5 - . E5 - G5 - . A5 . B5 . C6 | D6 - - - - . . . . . . . . . . . | E5 - . G5 - . A5 - B5 - . A5 . G5 . F#5 | E5 - - . . . . . . . G5 . A5 . B5 . | C6 - . B5 - . A5 - G5 - . F#5 . E5 . G5 | F#5 - - - - - - . . . . . . . . .",
        "organ": "E4 - - - - - - - B4 - - - - - - - | E4 - - - - - - - B4 - - - - - - - | C4 - - - - - - - G4 - - - - - - - | D4 - - - - - - - A4 - - - - - - - | E4 - - - - - - - B4 - - - - - - - | E4 - - - - - - - B4 - - - - - - - | C4 - - - - - - - G4 - - - - - - - | B3 - - - - - - - F#4 - - - - - - -"
      },
      "drums": {
        "kick": "x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "C2 C2 C2 C2 C2 C2 C2 C2 E2 C2 C2 C2 G2 C2 C2 C2 | D2 D2 D2 D2 D2 D2 D2 D2 F#2 D2 D2 D2 A2 D2 D2 D2 | E2 E2 E2 E2 E2 E2 E2 E2 G2 E2 E2 E2 B2 E2 E2 E2 | G2 G2 G2 G2 G2 G2 G2 G2 B2 G2 G2 G2 D3 G2 G2 G2 | C2 C2 C2 C2 C2 C2 C2 C2 E2 C2 C2 C2 G2 C2 C2 C2 | D2 D2 D2 D2 D2 D2 D2 D2 F#2 D2 D2 D2 A2 D2 D2 D2 | E2 E2 E2 E2 E2 E2 E2 E2 G2 E2 E2 E2 B2 E2 E2 E2 | E2 E2 E2 E2 E2 E2 E2 E2 G2 E2 E2 E2 B2 E2 E2 E2",
        "gtr": "C4 G4 C5 . C4 G4 C5 . C4 G4 C5 . C4 G4 C5 . | D4 A4 D5 . D4 A4 D5 . D4 A4 D5 . D4 A4 D5 . | E4 B4 E5 . E4 B4 E5 . E4 B4 E5 . E4 B4 E5 . | G4 D5 G5 . G4 D5 G5 . G4 D5 G5 . G4 D5 G5 . | C4 G4 C5 . C4 G4 C5 . C4 G4 C5 . C4 G4 C5 . | D4 A4 D5 . D4 A4 D5 . D4 A4 D5 . D4 A4 D5 . | E4 B4 E5 . E4 B4 E5 . E4 B4 E5 . E4 B4 E5 . | E4 B4 E5 . E4 B4 E5 . E4 B4 E5 . E4 B4 E5 .",
        "lead": "G5 - . A5 - . B5 - C6 - . B5 . A5 . G5 | A5 - - . . . . . F#5 - . G5 . A5 - . | B5 - . G5 - . E5 - G5 - . A5 . B5 . D6 | D6 - - - - . . . . . . . . . . . | C6 - . D6 - . E6 - D6 - . C6 . B5 . A5 | B5 - - . . . . . A5 - . G5 . F#5 - . | E5 - - - - . . . . . . . . . . . | E5 - - - - - - . . . . . . . . .",
        "organ": "C5 - - - - - - - E5 - - - - - - - | D5 - - - - - - - F#5 - - - - - - - | E5 - - - - - - - G5 - - - - - - - | G5 - - - - - - - B5 - - - - - - - | C5 - - - - - - - E5 - - - - - - - | D5 - - - - - - - F#5 - - - - - - - | E5 - - - - - - - G5 - - - - - - - | E5 - - - - - - - B5 - - - - - - -"
      },
      "drums": {
        "kick": "x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "..x...x...x...x. | ..x...x...x...x. | ..x...x...x...x. | ..x...x...x...x. | ..x...x...x...x. | ..x...x...x...x. | ..x...x...x...x. | ..x...x...x...x.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 4,
      "voices": {
        "bass": "E2 E2 . E2 E2 . E2 E2 . E2 G2 . A2 . Bb2 . | B2 . G2 . E2 . D2 . E2 E2 . E2 E2 . G2 . | A2 A2 . A2 A2 . A2 A2 . A2 C3 . D3 . D#3 . | E3 . D3 . B2 . A2 . G2 . F#2 . E2 . . .",
        "gtr": "E3 B3 . E3 B3 . E3 B3 . E3 G3 . A3 . Bb3 . | B3 . G3 . E3 . D3 . E3 B3 . E3 B3 . G3 . | A3 E4 . A3 E4 . A3 E4 . A3 C4 . D4 . D#4 . | E4 . D4 . B3 . A3 . G3 . F#3 . E3 . . .",
        "lead": "E5 . E5 . G5 . A5 . Bb5 - B5 - E6 - - . | B5 . G5 . E5 . D5 . E5 - - . . . . . | A5 . A5 . C6 . D6 . D#6 - E6 - A6 - - . | B6 . A6 . G6 . E6 . D6 . B5 . E5 - - .",
        "organ": "E4 - - - - - - - G4 - - - - - - - | G4 - - - - - - - B4 - - - - - - - | A4 - - - - - - - C#5 - - - - - - - | C5 - - - - - - - D5 - - - - - - -"
      },
      "drums": {
        "kick": "x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x... | x...x...x.x.x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x.",
        "crash": "x............... | ................ | ................ | x..............."
      }
    }
  ]
},

  'defense-boss': {
  "id": "defense-boss",
  "title": "運行停止のサイレン",
  "bpm": 152,
  "master": 0.88,
  "voices": [
    {
      "id": "bass",
      "wave": "sawtooth",
      "gain": 0.15,
      "attack": 0.005,
      "release": 0.06,
      "cutoff": 600
    },
    {
      "id": "riff",
      "wave": "sawtooth",
      "gain": 0.055,
      "attack": 0.005,
      "release": 0.06,
      "cutoff": 2000,
      "detune": 15,
      "pan": -0.3
    },
    {
      "id": "lead",
      "wave": "square",
      "gain": 0.06,
      "attack": 0.01,
      "release": 0.1,
      "cutoff": 2600,
      "vibrato": 15,
      "pan": 0.2
    },
    {
      "id": "siren",
      "wave": "sine",
      "gain": 0.035,
      "attack": 0.02,
      "release": 0.15,
      "vibrato": 25,
      "pan": 0.35
    }
  ],
  "sections": [
    {
      "bars": 4,
      "voices": {
        "bass": "D2 D2 D2 . D2 D2 D2 . F2 D2 . D2 A2 F2 E2 F2 | Bb1 Bb1 Bb1 . Bb1 Bb1 Bb1 . D2 Bb1 . Bb1 F2 D2 C2 D2 | G1 G1 G1 . G1 G1 G1 . Bb1 G1 . G1 D2 Bb1 A1 Bb1 | A1 A1 A1 . A1 A1 A1 . C#2 A1 . A1 E2 C#2 B1 C#2",
        "riff": "D3 A3 D4 . D3 A3 D4 . D3 A3 D4 . F3 . A3 . | Bb2 F3 Bb3 . Bb2 F3 Bb3 . Bb2 F3 Bb3 . D3 . F3 . | G2 D3 G3 . G2 D3 G3 . G2 D3 G3 . Bb2 . D3 . | A2 E3 A3 . A2 E3 A3 . A2 E3 A3 . C#3 . E3 .",
        "lead": "D5 - - . E5 . F5 - A5 - - . G5 . F5 . | Bb5 - - - - . . . . . . . A5 - G5 - | G5 - - . A5 . Bb5 - D6 - - . C6 . Bb5 . | A5 - - - - - - . . . . . . . . .",
        "siren": "A5 - D6 - A5 - D6 - A5 - D6 - A5 - D6 - | Bb5 - D6 - Bb5 - D6 - Bb5 - D6 - Bb5 - D6 - | G5 - D6 - G5 - D6 - G5 - D6 - G5 - D6 - | A5 - C#6 - A5 - C#6 - A5 - C#6 - A5 - C#6 -"
      },
      "drums": {
        "kick": "x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x.",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "D2 D2 D2 . D2 D2 D2 . F2 D2 . D2 A2 F2 E2 F2 | F2 F2 F2 . F2 F2 F2 . A2 F2 . F2 C3 A2 G2 A2 | G2 G2 G2 . G2 G2 G2 . Bb2 G2 . G2 D3 Bb2 A2 Bb2 | Bb1 Bb1 Bb1 . Bb1 Bb1 Bb1 . D2 Bb1 . Bb1 F2 D2 C2 D2 | D2 D2 D2 . D2 D2 D2 . F2 D2 . D2 A2 F2 E2 F2 | F2 F2 F2 . F2 F2 F2 . A2 F2 . F2 C3 A2 G2 A2 | Bb1 Bb1 Bb1 . Bb1 Bb1 Bb1 . D2 Bb1 . Bb1 F2 D2 C2 D2 | A1 A1 A1 . A1 A1 A1 . C#2 A1 . A1 E2 C#2 B1 C#2",
        "riff": "D3 A3 D4 . D3 A3 D4 . D3 A3 D4 . F3 . A3 . | F3 C4 F4 . F3 C4 F4 . F3 C4 F4 . A3 . C4 . | G3 D4 G4 . G3 D4 G4 . G3 D4 G4 . Bb3 . D4 . | Bb2 F3 Bb3 . Bb2 F3 Bb3 . Bb2 F3 Bb3 . D3 . F3 . | D3 A3 D4 . D3 A3 D4 . D3 A3 D4 . F3 . A3 . | F3 C4 F4 . F3 C4 F4 . F3 C4 F4 . A3 . C4 . | Bb2 F3 Bb3 . Bb2 F3 Bb3 . Bb2 F3 Bb3 . D3 . F3 . | A2 E3 A3 . A2 E3 A3 . A2 E3 A3 . C#3 . E3 .",
        "lead": "D5 - . F5 - . A5 - Bb5 - . A5 . G5 . F5 | A5 - - . . . . . F5 - . G5 . A5 - . | B5 - . G5 - . D5 - G5 - . A5 . B5 . D6 | C6 - - - - . . . . . . . . . . . | D6 - . A5 - . F5 - A5 - . B5 . C6 . D6 | C6 - - . . . . . A5 - . B5 . C6 - . | D6 - . C6 - . Bb5 - A5 - . G5 . F5 . G5 | A5 - - - - - - . . . . . . . . .",
        "siren": ". . . . . . . . A5 - D6 - A5 - D6 - | . . . . . . . . C6 - F6 - C6 - F6 - | . . . . . . . . B5 - G6 - B5 - G6 - | . . . . . . . . Bb5 - F6 - Bb5 - F6 - | . . . . . . . . A5 - D6 - A5 - D6 - | . . . . . . . . C6 - F6 - C6 - F6 - | . . . . . . . . Bb5 - F6 - Bb5 - F6 - | . . . . . . . . A5 - C#6 - A5 - C#6 -"
      },
      "drums": {
        "kick": "x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x.",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "G2 G2 G2 G2 G2 G2 G2 G2 Bb2 G2 G2 G2 D3 G2 G2 G2 | C2 C2 C2 C2 C2 C2 C2 C2 E2 C2 C2 C2 G2 C2 C2 C2 | F2 F2 F2 F2 F2 F2 F2 F2 A2 F2 F2 F2 C3 F2 F2 F2 | D2 D2 D2 D2 D2 D2 D2 D2 F2 D2 D2 D2 A2 D2 D2 D2 | G2 G2 G2 G2 G2 G2 G2 G2 Bb2 G2 G2 G2 D3 G2 G2 G2 | A1 A1 A1 A1 A1 A1 A1 A1 C#2 A1 A1 A1 E2 A1 A1 A1 | D2 D2 D2 D2 D2 D2 D2 D2 F2 D2 D2 D2 A2 D2 D2 D2 | D2 D2 D2 D2 D2 D2 D2 D2 F2 D2 D2 D2 A2 D2 D2 D2",
        "riff": "G3 D4 G4 . G3 D4 G4 . G3 D4 G4 . G3 D4 G4 . | C4 G4 C5 . C4 G4 C5 . C4 G4 C5 . C4 G4 C5 . | F3 C4 F4 . F3 C4 F4 . F3 C4 F4 . F3 C4 F4 . | D3 A3 D4 . D3 A3 D4 . D3 A3 D4 . D3 A3 D4 . | G3 D4 G4 . G3 D4 G4 . G3 D4 G4 . G3 D4 G4 . | A3 E4 A4 . A3 E4 A4 . A3 E4 A4 . A3 E4 A4 . | D3 A3 D4 . D3 A3 D4 . D3 A3 D4 . D3 A3 D4 . | D3 A3 D4 . D3 A3 D4 . D3 A3 D4 . D3 A3 D4 .",
        "lead": "D6 - . Bb5 - . G5 - Bb5 - . C6 . D6 . E6 | E6 - - . . . . . C6 - . D6 . E6 - . | F6 - . C6 - . A5 - C6 - . D6 . E6 . F6 | F6 - - - - . . . . . . . . . . . | G6 - . D6 - . Bb5 - D6 - . E6 . F6 . G6 | E6 - - . . . . . C#6 - . D6 . E6 - . | D6 - - - - . . . . . . . . . . . | D6 - - - - - - . . . . . . . . .",
        "siren": "G5 - D6 - G5 - D6 - G5 - D6 - G5 - D6 - | G5 - E6 - G5 - E6 - G5 - E6 - G5 - E6 - | A5 - F6 - A5 - F6 - A5 - F6 - A5 - F6 - | F5 - D6 - F5 - D6 - F5 - D6 - F5 - D6 - | G5 - D6 - G5 - D6 - G5 - D6 - G5 - D6 - | A5 - E6 - A5 - E6 - A5 - E6 - A5 - E6 - | A5 - F6 - A5 - F6 - A5 - F6 - A5 - F6 - | A5 - D6 - A5 - D6 - A5 - D6 - A5 - D6 -"
      },
      "drums": {
        "kick": "x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x.",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 4,
      "voices": {
        "bass": "Bb1 Bb1 . Bb1 Bb1 . Bb1 Bb1 . Bb1 D2 . F2 . G2 . | C2 C2 . C2 C2 . C2 C2 . C2 E2 . G2 . A2 . | D2 D2 . D2 D2 . D2 D2 . D2 F2 . A2 . C3 . | A1 A1 . A1 A1 . A1 A1 . A1 C#2 . E2 . G2 .",
        "riff": "Bb2 F3 . Bb2 F3 . Bb2 F3 . Bb2 D3 . F3 . G3 . | C3 G3 . C3 G3 . C3 G3 . C3 E3 . G3 . A3 . | D3 A3 . D3 A3 . D3 A3 . D3 F3 . A3 . C4 . | A2 E3 . A2 E3 . A2 E3 . A2 C#3 . E3 . G3 .",
        "lead": "Bb5 . D6 . F6 . Bb6 . F6 . D6 . Bb5 . D6 . | C6 . E6 . G6 . C7 . G6 . E6 . C6 . E6 . | D6 . F6 . A6 . D6 . A6 . F6 . D6 . F6 . | A6 - - - - - - - A5 - - - - - - -",
        "siren": "A5 - D6 - A5 - D6 - A5 - D6 - A5 - D6 - | Bb5 - D6 - Bb5 - D6 - Bb5 - D6 - Bb5 - D6 - | G5 - D6 - G5 - D6 - G5 - D6 - G5 - D6 - | A5 - C#6 - A5 - C#6 - A5 - C#6 - A5 - C#6 -"
      },
      "drums": {
        "kick": "x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x.",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | x..............."
      }
    }
  ]
},

  'danmaku-stage': {
  "id": "danmaku-stage",
  "title": "空中庭園オフィス 〜 雲海の会議",
  "bpm": 152,
  "master": 0.86,
  "voices": [
    {
      "id": "bass",
      "wave": "sawtooth",
      "gain": 0.14,
      "attack": 0.005,
      "release": 0.06,
      "cutoff": 750
    },
    {
      "id": "lead",
      "wave": "square",
      "gain": 0.065,
      "attack": 0.008,
      "release": 0.09,
      "cutoff": 3200,
      "vibrato": 12,
      "detune": 10
    },
    {
      "id": "pad",
      "wave": "triangle",
      "gain": 0.04,
      "attack": 0.03,
      "release": 0.15,
      "cutoff": 1800,
      "detune": 12,
      "pan": -0.3
    },
    {
      "id": "bell",
      "wave": "sine",
      "gain": 0.04,
      "attack": 0.002,
      "release": 0.2,
      "pan": 0.3
    }
  ],
  "sections": [
    {
      "bars": 4,
      "voices": {
        "bass": "F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 | D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 | E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 | C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 D2 E2 F2",
        "lead": ". . . . . . . . F#5 - G#5 - A5 - C#6 - | B5 - - - - . . . A5 - G#5 - F#5 - - . | G#5 - - - - . . . A5 - B5 - C#6 - - . | G#5 - - - - - - . . . . . . . . .",
        "pad": "F#4 - - - - - - - A4 - - - - - - - | D4 - - - - - - - F#4 - - - - - - - | E4 - - - - - - - G#4 - - - - - - - | C#4 - - - - - - - F4 - - - - - - -",
        "bell": "F#5 A5 C#6 F#6 F#5 A5 C#6 F#6 F#5 A5 C#6 F#6 F#5 A5 C#6 F#6 | D5 F#5 A5 D6 D5 F#5 A5 D6 D5 F#5 A5 D6 D5 F#5 A5 D6 | E5 G#5 B5 E6 E5 G#5 B5 E6 E5 G#5 B5 E6 E5 G#5 B5 E6 | C#5 F5 G#5 C#6 C#5 F5 G#5 C#6 C#5 F5 G#5 C#6 C#5 F5 G#5 C#6"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "..x...x...x...x. | ..x...x...x...x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x.",
        "crash": "x............... | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 | D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 | E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 | A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 | B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 | F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 | D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 | C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 D2 E2 F2",
        "lead": "C#5 - . F#5 - . G#5 - A5 - . G#5 . F#5 . E5 | F#5 - - . . . . . D5 - . E5 . F#5 - . | G#5 - . E5 - . B4 - E5 - . F#5 . G#5 . B5 | A5 - - - - . . . . . . . . . . . | B5 - . F#5 - . D5 - F#5 - . G#5 . A5 . B5 | A5 - - . . . . . F#5 - . G#5 . A5 - . | B5 - . A5 - . G#5 - F#5 - . E5 . D5 . F#5 | C#5 - - - - - - . . . . . . . . .",
        "pad": "F#4 - - - - - - - A4 - - - - - - - | D4 - - - - - - - F#4 - - - - - - - | E4 - - - - - - - G#4 - - - - - - - | A4 - - - - - - - C#5 - - - - - - - | B4 - - - - - - - D5 - - - - - - - | F#4 - - - - - - - A4 - - - - - - - | D4 - - - - - - - F#4 - - - - - - - | C#4 - - - - - - - F4 - - - - - - -",
        "bell": "F#5 A5 C#6 F#6 F#5 A5 C#6 F#6 F#5 A5 C#6 F#6 F#5 A5 C#6 F#6 | D5 F#5 A5 D6 D5 F#5 A5 D6 D5 F#5 A5 D6 D5 F#5 A5 D6 | E5 G#5 B5 E6 E5 G#5 B5 E6 E5 G#5 B5 E6 E5 G#5 B5 E6 | E5 A5 C#6 E6 E5 A5 C#6 E6 E5 A5 C#6 E6 E5 A5 C#6 E6 | D5 F#5 B5 D6 D5 F#5 B5 D6 D5 F#5 B5 D6 D5 F#5 B5 D6 | C#5 F#5 A5 C#6 C#5 F#5 A5 C#6 C#5 F#5 A5 C#6 C#5 F#5 A5 C#6 | D5 F#5 A5 D6 D5 F#5 A5 D6 D5 F#5 A5 D6 D5 F#5 A5 D6 | C#5 F5 G#5 C#6 C#5 F5 G#5 C#6 C#5 F5 G#5 C#6 C#5 F5 G#5 C#6"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 | E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 | C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 | F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 | B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 | C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 | D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 | E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3",
        "lead": "F#5 - . A5 - . B5 - C#6 - . B5 . A5 . F#5 | G#5 - - . . . . . E5 - . F#5 . G#5 - . | E5 - . G#5 - . A5 - B5 - . A5 . G#5 . E5 | F#5 - - - - . . . . . . . . . . . | D5 - . F#5 - . G#5 - A5 - . G#5 . F#5 . D5 | E5 - . G#5 - . A5 - B5 - . A5 . G#5 . E5 | F#5 - - . G#5 . A5 . B5 - C#6 . D6 - E6 . | C#6 - - - - - - . . . . . . . . .",
        "pad": "D4 - - - - - - - F#4 - - - - - - - | E4 - - - - - - - G#4 - - - - - - - | C#4 - - - - - - - E4 - - - - - - - | F#4 - - - - - - - A4 - - - - - - - | B3 - - - - - - - D4 - - - - - - - | C#4 - - - - - - - E4 - - - - - - - | D4 - - - - - - - F#4 - - - - - - - | E4 - - - - - - - G#4 - - - - - - -",
        "bell": "D5 F#5 A5 D6 D5 F#5 A5 D6 D5 F#5 A5 D6 D5 F#5 A5 D6 | E5 G#5 B5 E6 E5 G#5 B5 E6 E5 G#5 B5 E6 E5 G#5 B5 E6 | C#5 E5 G#5 C#6 C#5 E5 G#5 C#6 C#5 E5 G#5 C#6 C#5 E5 G#5 C#6 | C#5 F#5 A5 C#6 C#5 F#5 A5 C#6 C#5 F#5 A5 C#6 C#5 F#5 A5 C#6 | D5 F#5 B5 D6 D5 F#5 B5 D6 D5 F#5 B5 D6 D5 F#5 B5 D6 | E5 G#5 C#6 E6 E5 G#5 C#6 E6 E5 G#5 C#6 E6 E5 G#5 C#6 E6 | F#5 A5 D6 F#6 F#5 A5 D6 F#6 F#5 A5 D6 F#6 F#5 A5 D6 F#6 | G#5 B5 E6 G#6 G#5 B5 E6 G#6 G#5 B5 E6 G#6 G#5 B5 E6 G#6"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 4,
      "voices": {
        "bass": "F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 | D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 | B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 | C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 D2 E2 F2 G#2 A2 B2 C#3",
        "lead": "F#5 . A5 . C#6 . F#6 . E6 . C#6 . A5 . C#6 . | D6 . A5 . F#5 . D5 . F#5 . A5 . D6 . F#6 . | B5 . F#5 . D5 . B4 . D5 . F#5 . B5 . D6 . | C#6 - - - - - - - C#5 - - - - - - -",
        "pad": "F#4 - - - - - - - A4 - - - - - - - | D4 - - - - - - - F#4 - - - - - - - | E4 - - - - - - - G#4 - - - - - - - | C#4 - - - - - - - F4 - - - - - - -",
        "bell": "F#5 A5 C#6 F#6 F#5 A5 C#6 F#6 F#5 A5 C#6 F#6 F#5 A5 C#6 F#6 | D5 F#5 A5 D6 D5 F#5 A5 D6 D5 F#5 A5 D6 D5 F#5 A5 D6 | E5 G#5 B5 E6 E5 G#5 B5 E6 E5 G#5 B5 E6 E5 G#5 B5 E6 | C#5 F5 G#5 C#6 C#5 F5 G#5 C#6 C#5 F5 G#5 C#6 C#5 F5 G#5 C#6"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x. | x.x.x.x.x.x.x.x.",
        "crash": "x............... | ................ | ................ | x..............."
      }
    }
  ]
},

  'danmaku-boss': {
  "id": "danmaku-boss",
  "title": "弾幕ノルマの嵐 〜 査定裁判",
  "bpm": 158,
  "master": 0.88,
  "voices": [
    {
      "id": "bass",
      "wave": "sawtooth",
      "gain": 0.14,
      "attack": 0.005,
      "release": 0.05,
      "cutoff": 700
    },
    {
      "id": "lead",
      "wave": "sawtooth",
      "gain": 0.065,
      "attack": 0.008,
      "release": 0.09,
      "cutoff": 2800,
      "vibrato": 16,
      "detune": 14
    },
    {
      "id": "chords",
      "wave": "square",
      "gain": 0.04,
      "attack": 0.01,
      "release": 0.08,
      "cutoff": 2000,
      "pan": -0.3
    },
    {
      "id": "arp",
      "wave": "triangle",
      "gain": 0.04,
      "attack": 0.004,
      "release": 0.05,
      "cutoff": 2400,
      "pan": 0.3
    }
  ],
  "sections": [
    {
      "bars": 4,
      "voices": {
        "bass": "B1 B2 B1 B2 B1 B2 B1 B2 B1 B2 B1 B2 D2 B1 A1 B1 | G1 G2 G1 G2 G1 G2 G1 G2 G1 G2 G1 G2 B1 G1 F#1 G1 | A1 A2 A1 A2 A1 A2 A1 A2 A1 A2 A1 A2 C#2 A1 G#1 A1 | F#1 F#2 F#1 F#2 F#1 F#2 F#1 F#2 F#1 F#2 F#1 F#2 A#1 F#1 E1 F#1",
        "lead": "B4 - - . C#5 . D5 - F#5 - - . E5 . D5 . | G5 - - - - . . . . . . . F#5 - E5 - | A5 - - . G5 . F#5 - E5 - - . D5 . C#5 . | F#5 - - - - - - . . . . . . . . .",
        "chords": "D4 F#4 B4 . D4 F#4 B4 . D4 F#4 B4 . D4 F#4 B4 . | B3 D4 G4 . B3 D4 G4 . B3 D4 G4 . B3 D4 G4 . | C#4 E4 A4 . C#4 E4 A4 . C#4 E4 A4 . C#4 E4 A4 . | A#3 C#4 F#4 . A#3 C#4 F#4 . A#3 C#4 F#4 . A#3 C#4 F#4 .",
        "arp": "B4 D5 F#5 B5 B4 D5 F#5 B5 B4 D5 F#5 B5 B4 D5 F#5 B5 | G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 | A4 C#5 E5 A5 A4 C#5 E5 A5 A4 C#5 E5 A5 A4 C#5 E5 A5 | F#4 A#4 C#5 F#5 F#4 A#4 C#5 F#5 F#4 A#4 C#5 F#5 F#4 A#4 C#5 F#5"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "B1 B2 B1 B2 B1 B2 B1 B2 B1 B2 B1 B2 D2 B1 A1 B1 | G1 G2 G1 G2 G1 G2 G1 G2 G1 G2 G1 G2 B1 G1 F#1 G1 | A1 A2 A1 A2 A1 A2 A1 A2 A1 A2 A1 A2 C#2 A1 G#1 A1 | D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 D2 D3 F#2 D2 C#2 D2 | E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 G2 E2 D#2 E2 | B1 B2 B1 B2 B1 B2 B1 B2 B1 B2 B1 B2 D2 B1 A1 B1 | G1 G2 G1 G2 G1 G2 G1 G2 G1 G2 G1 G2 B1 G1 F#1 G1 | F#1 F#2 F#1 F#2 F#1 F#2 F#1 F#2 F#1 F#2 F#1 F#2 A#1 F#1 E1 F#1",
        "lead": "B5 - . D6 - . F#6 - G6 - . F#6 . E6 . D6 | C#6 - - . . . . . E6 - . D6 . C#6 - . | E6 - . F#6 - . G6 - F#6 - . E6 . D6 . C#6 | D6 - - - - . . . . . . . . . . . | E6 - . G6 - . B6 - A6 - . G6 . F#6 . E6 | F#6 - - . . . . . D6 - . E6 . F#6 - . | G6 - . F#6 - . E6 - D6 - . C#6 . B5 . D6 | F#5 - - - - - - . . . . . . . . .",
        "chords": "D4 F#4 B4 . D4 F#4 B4 . D4 F#4 B4 . D4 F#4 B4 . | B3 D4 G4 . B3 D4 G4 . B3 D4 G4 . B3 D4 G4 . | C#4 E4 A4 . C#4 E4 A4 . C#4 E4 A4 . C#4 E4 A4 . | D4 F#4 A4 . D4 F#4 A4 . D4 F#4 A4 . D4 F#4 A4 . | E4 G4 B4 . E4 G4 B4 . E4 G4 B4 . E4 G4 B4 . | D4 F#4 B4 . D4 F#4 B4 . D4 F#4 B4 . D4 F#4 B4 . | B3 D4 G4 . B3 D4 G4 . B3 D4 G4 . B3 D4 G4 . | A#3 C#4 F#4 . A#3 C#4 F#4 . A#3 C#4 F#4 . A#3 C#4 F#4 .",
        "arp": "B4 D5 F#5 B5 B4 D5 F#5 B5 B4 D5 F#5 B5 B4 D5 F#5 B5 | G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 | A4 C#5 E5 A5 A4 C#5 E5 A5 A4 C#5 E5 A5 A4 C#5 E5 A5 | A4 D5 F#5 A5 A4 D5 F#5 A5 A4 D5 F#5 A5 A4 D5 F#5 A5 | G4 B4 E5 G5 G4 B4 E5 G5 G4 B4 E5 G5 G4 B4 E5 G5 | F#4 B4 D5 F#5 F#4 B4 D5 F#5 F#4 B4 D5 F#5 F#4 B4 D5 F#5 | G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 | F#4 A#4 C#5 F#5 F#4 A#4 C#5 F#5 F#4 A#4 C#5 F#5 F#4 A#4 C#5 F#5"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "G1 G2 G1 G2 G1 G2 G1 G2 G1 G2 G1 G2 G1 G2 G1 G2 | A1 A2 A1 A2 A1 A2 A1 A2 A1 A2 A1 A2 A1 A2 A1 A2 | F#1 F#2 F#1 F#2 F#1 F#2 F#1 F#2 F#1 F#2 F#1 F#2 F#1 F#2 F#1 F#2 | B1 B2 B1 B2 B1 B2 B1 B2 B1 B2 B1 B2 B1 B2 B1 B2 | E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 | F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 | G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 | F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3 F#2 F#3",
        "lead": "B5 - . D6 - . E6 - F#6 - . E6 . D6 . B5 | C#6 - - . . . . . A5 - . B5 . C#6 - . | A5 - . C#6 - . D6 - E6 - . D6 . C#6 . A5 | B5 - - - - . . . . . . . . . . . | G5 - . B5 - . C#6 - D6 - . C#6 . B5 . G5 | A5 - . C#6 - . D6 - E6 - . D6 . C#6 . A5 | B5 - - . C#6 . D6 . E6 - F#6 . G6 - A6 . | F#6 - - - - - - . . . . . . . . .",
        "chords": "D4 G4 B4 . D4 G4 B4 . D4 G4 B4 . D4 G4 B4 . | E4 A4 C#5 . E4 A4 C#5 . E4 A4 C#5 . E4 A4 C#5 . | C#4 F#4 A4 . C#4 F#4 A4 . C#4 F#4 A4 . C#4 F#4 A4 . | D4 F#4 B4 . D4 F#4 B4 . D4 F#4 B4 . D4 F#4 B4 . | E4 G4 B4 . E4 G4 B4 . E4 G4 B4 . E4 G4 B4 . | F#4 A4 C#5 . F#4 A4 C#5 . F#4 A4 C#5 . F#4 A4 C#5 . | G4 B4 D5 . G4 B4 D5 . G4 B4 D5 . G4 B4 D5 . | F#4 A#4 C#5 . F#4 A#4 C#5 . F#4 A#4 C#5 . F#4 A#4 C#5 .",
        "arp": "D5 G5 B5 D6 D5 G5 B5 D6 D5 G5 B5 D6 D5 G5 B5 D6 | E5 A5 C#6 E6 E5 A5 C#6 E6 E5 A5 C#6 E6 E5 A5 C#6 E6 | C#5 F#5 A5 C#6 C#5 F#5 A5 C#6 C#5 F#5 A5 C#6 C#5 F#5 A5 C#6 | D5 F#5 B5 D6 D5 F#5 B5 D6 D5 F#5 B5 D6 D5 F#5 B5 D6 | E5 G5 B5 E6 E5 G5 B5 E6 E5 G5 B5 E6 E5 G5 B5 E6 | F#5 A5 C#6 F#6 F#5 A5 C#6 F#6 F#5 A5 C#6 F#6 F#5 A5 C#6 F#6 | G5 B5 D6 G6 G5 B5 D6 G6 G5 B5 D6 G6 G5 B5 D6 G6 | F#5 A#5 C#6 F#6 F#5 A#5 C#6 F#6 F#5 A#5 C#6 F#6 F#5 A#5 C#6 F#6"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx | ....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | ................ | ................ | ................ | ................ | ................"
      }
    },
    {
      "bars": 4,
      "voices": {
        "bass": "B1 B2 . B1 B2 . B1 B2 . B1 D2 . F#2 . A2 . | G1 G2 . G1 G2 . G1 G2 . G1 B1 . D2 . F#2 . | E1 E2 . E1 E2 . E1 E2 . E1 G1 . B1 . D2 . | F#1 F#2 . F#1 F#2 . F#1 F#2 . F#1 A#1 . C#2 . E2 .",
        "lead": "B5 . D6 . F#6 . B6 . F#6 . D6 . B5 . D6 . | G6 . D6 . B5 . G5 . B5 . D6 . G6 . B6 . | E6 . B5 . G5 . E5 . G5 . B5 . E6 . G6 . | F#6 - - - - - - - F#5 - - - - - - -",
        "chords": "D4 F#4 B4 . D4 F#4 B4 . D4 F#4 B4 . D4 F#4 B4 . | B3 D4 G4 . B3 D4 G4 . B3 D4 G4 . B3 D4 G4 . | C#4 E4 A4 . C#4 E4 A4 . C#4 E4 A4 . C#4 E4 A4 . | A#3 C#4 F#4 . A#3 C#4 F#4 . A#3 C#4 F#4 . A#3 C#4 F#4 .",
        "arp": "B4 D5 F#5 B5 B4 D5 F#5 B5 B4 D5 F#5 B5 B4 D5 F#5 B5 | G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 | A4 C#5 E5 A5 A4 C#5 E5 A5 A4 C#5 E5 A5 A4 C#5 E5 A5 | F#4 A#4 C#5 F#5 F#4 A#4 C#5 F#5 F#4 A#4 C#5 F#5 F#4 A#4 C#5 F#5"
      },
      "drums": {
        "kick": "x...x...x...x... | x...x...x...x... | x...x...x...x... | x...x...x...x...",
        "snare": "....x.......x... | ....x.......x... | ....x.......x... | ....x...x.x.xxxx",
        "hat": "x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o. | x.o.x.o.x.o.x.o.",
        "crash": "x............... | ................ | ................ | x..............."
      }
    }
  ]
},

  'jinro-day': {
  "id": "jinro-day",
  "title": "探り合いの定例会議",
  "bpm": 92,
  "swing": 0.12,
  "master": 0.82,
  "voices": [
    {
      "id": "bass",
      "wave": "triangle",
      "gain": 0.16,
      "attack": 0.01,
      "release": 0.12,
      "cutoff": 450
    },
    {
      "id": "keys",
      "wave": "sine",
      "gain": 0.05,
      "attack": 0.015,
      "release": 0.15,
      "cutoff": 1600,
      "detune": 8,
      "pan": -0.2
    },
    {
      "id": "lead",
      "wave": "square",
      "gain": 0.045,
      "attack": 0.02,
      "release": 0.12,
      "cutoff": 2200,
      "vibrato": 12,
      "pan": 0.2
    },
    {
      "id": "clock",
      "wave": "triangle",
      "gain": 0.035,
      "attack": 0.002,
      "release": 0.05,
      "cutoff": 1800,
      "pan": 0.35
    }
  ],
  "sections": [
    {
      "bars": 4,
      "voices": {
        "bass": "D2 - - . . . A2 . D2 - - . F2 . G2 . | G2 - - . . . D3 . G2 - - . Bb2 . C3 . | E2 - - . . . Bb2 . E2 - - . G2 . A2 . | A2 - - . . . E3 . A2 - - . C#3 . E3 .",
        "keys": ". F4 A4 C5 E5 . . . . F4 A4 C5 . . . . | . F4 Bb4 D5 F5 . . . . F4 Bb4 D5 . . . . | . E4 G4 Bb4 D5 . . . . E4 G4 Bb4 . . . . | . E4 G4 A4 C#5 . . . . E4 G4 A4 . . . .",
        "lead": ". . . . A4 - - . F4 - - . D4 - - . | . . . . Bb4 - - . G4 - - . D4 - - . | . . . . Bb4 - - . G4 - - . E4 - - . | . . . . A4 - - . G4 - F4 - E4 - - .",
        "clock": "A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 ."
      },
      "drums": {
        "kick": "x...........x... | x...........x... | x...........x... | x...........x...",
        "snare": "....o.......o... | ....o.......o... | ....o.......o... | ....o.......o...",
        "hat": "..o...o...o...o. | ..o...o...o...o. | ..o...o...o...o. | ..o...o...o...o."
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "D2 - - . . . A2 . D2 - - . F2 . G2 . | G2 - - . . . D3 . G2 - - . A2 . Bb2 . | C3 - - . . . G2 . C3 - - . D3 . E3 . | F2 - - . . . C3 . F2 - - . G2 . A2 . | Bb2 - - . . . F2 . Bb2 - - . C3 . D3 . | E2 - - . . . Bb2 . E2 - - . G2 . Bb2 . | A2 - - . . . E3 . A2 - - . C#3 . E3 . | D2 - - . . . A2 . D2 - - . E2 . F2 .",
        "keys": ". F4 A4 C5 . . . . . F4 A4 C5 . . . . | . F4 Bb4 D5 . . . . . F4 Bb4 D5 . . . . | . E4 Bb4 D5 . . . . . E4 Bb4 D5 . . . . | . E4 A4 C5 . . . . . E4 A4 C5 . . . . | . D4 A4 C5 . . . . . D4 A4 C5 . . . . | . D4 G4 Bb4 . . . . . D4 G4 Bb4 . . . . | . C#4 G4 A4 . . . . . C#4 G4 A4 . . . . | . C4 F4 A4 . . . . . C4 F4 A4 . . . .",
        "lead": "A4 - - . D5 - E5 . F5 - - . E5 . D5 . | G5 - - - - . . . . . D5 . F5 . G5 . | Bb5 - - . A5 . G5 . E5 - - . F5 . G5 . | A5 - - - - . . . . . . . . . . . | D5 - - . F5 . A5 . C6 - - . Bb5 . A5 . | G5 - - . F5 . E5 . D5 - - . E5 . F5 . | E5 - - - - . . . F5 - E5 - D5 - C#5 - | D5 - - - - - - . . . . . . . . .",
        "clock": "A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 ."
      },
      "drums": {
        "kick": "x...........x... | x...........x... | x...........x... | x...........x... | x...........x... | x...........x... | x...........x... | x...........x...",
        "snare": "....o.......o... | ....o.......o... | ....o.......o... | ....o.......o... | ....o.......o... | ....o.......o... | ....o.......o... | ....o.......o...",
        "hat": "..o...o...o...o. | ..o...o...o...o. | ..o...o...o...o. | ..o...o...o...o. | ..o...o...o...o. | ..o...o...o...o. | ..o...o...o...o. | ..o...o...o...o."
      }
    },
    {
      "bars": 8,
      "voices": {
        "bass": "G2 - - . . . D3 . G2 - - . A2 . Bb2 . | C3 - - . . . G2 . C3 - - . D3 . E3 . | F2 - - . . . C3 . F2 - - . G2 . A2 . | Bb2 - - . . . F2 . Bb2 - - . C3 . D3 . | E2 - - . . . Bb2 . E2 - - . G2 . Bb2 . | A2 - - . . . E3 . A2 - - . C#3 . E3 . | D2 - - . . . A2 . D2 - - . F2 . A2 . | A2 - - . . . E3 . A2 - - . C#3 . E3 .",
        "keys": ". F4 Bb4 D5 . . . . . F4 Bb4 D5 . . . . | . E4 Bb4 C5 . . . . . E4 Bb4 C5 . . . . | . E4 A4 C5 . . . . . E4 A4 C5 . . . . | . D4 A4 C5 . . . . . D4 A4 C5 . . . . | . D4 G4 Bb4 . . . . . D4 G4 Bb4 . . . . | . C#4 G4 A4 . . . . . C#4 G4 A4 . . . . | . C4 F4 A4 . . . . . C4 F4 A4 . . . . | . C#4 E4 G4 . . . . . C#4 E4 G4 . . . .",
        "lead": "D6 - - . Bb5 . G5 . Bb5 - C6 . D6 - - . | C6 - - - - . . . G5 - A5 . Bb5 - - . | C6 - - . A5 . F5 . A5 - Bb5 . C6 - - . | D6 - - - - . . . . . . . . . . . | Bb5 - - . G5 . E5 . G5 - A5 . Bb5 - - . | A5 - - - - . . . E5 - F5 . G5 - - . | F5 - - . E5 . D5 . F5 - E5 . D5 - - . | C#5 - - - - - - . . . . . . . . .",
        "clock": "A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 . | A5 . A5 . A5 . A5 . A5 . A5 . A5 . A5 ."
      },
      "drums": {
        "kick": "x...........x... | x...........x... | x...........x... | x...........x... | x...........x... | x...........x... | x...........x... | x...........x...",
        "snare": "....o.......o... | ....o.......o... | ....o.......o... | ....o.......o... | ....o.......o... | ....o.......o... | ....o.......o... | ....o.......o...",
        "hat": "..o...o...o...o. | ..o...o...o...o. | ..o...o...o...o. | ..o...o...o...o. | ..o...o...o...o. | ..o...o...o...o. | ..o...o...o...o. | ..o...o...o...o."
      }
    }
  ]
},

  'jinro-night': {
  "id": "jinro-night",
  "title": "消灯後のオフィス 〜 暗躍する影",
  "bpm": 72,
  "master": 0.8,
  "voices": [
    {
      "id": "sub",
      "wave": "sine",
      "gain": 0.16,
      "attack": 0.05,
      "release": 0.25,
      "cutoff": 300
    },
    {
      "id": "ambient",
      "wave": "triangle",
      "gain": 0.045,
      "attack": 0.1,
      "release": 0.3,
      "cutoff": 1200,
      "detune": 15,
      "pan": -0.3
    },
    {
      "id": "drop",
      "wave": "sine",
      "gain": 0.045,
      "attack": 0.002,
      "release": 0.3,
      "vibrato": 8,
      "pan": 0.25
    },
    {
      "id": "pulse",
      "wave": "square",
      "gain": 0.03,
      "attack": 0.01,
      "release": 0.05,
      "cutoff": 1400,
      "pan": -0.1
    }
  ],
  "sections": [
    {
      "bars": 8,
      "voices": {
        "sub": "C2 - - - - - - - - - - - - - - - | C2 - - - - - - - - - - - - - - - | C2 - - - - - - - - - - - - - - - | C2 - - - - - - - - - - - - - - - | C2 - - - - - - - - - - - - - - - | C2 - - - - - - - - - - - - - - - | C2 - - - - - - - - - - - - - - - | C2 - - - - - - - - - - - - - - -",
        "ambient": "Eb3 - - - - - - - G3 - - - - - - - | Eb3 - - - - - - - Ab3 - - - - - - - | F3 - - - - - - - Ab3 - - - - - - - | D3 - - - - - - - G3 - - - - - - - | Eb3 - - - - - - - G3 - - - - - - - | Eb3 - - - - - - - Ab3 - - - - - - - | D3 - - - - - - - F3 - - - - - - - | Eb3 - - - - - - - C3 - - - - - - -",
        "drop": ". . . . G5 - - . . . . . . . . . | . . . . . . . . Ab5 - - . . . . . | . . . . F5 - - . . . . . . . . . | . . . . . . . . D5 - - . . . . . | . . . . Eb5 - - . . . . . . . . . | . . . . . . . . C6 - - . . . . . | . . . . B5 - - . . . . . . . . . | . . . . . . . . C5 - - - - . . .",
        "pulse": "C3 . . . . . . . C3 . . . . . . . | C3 . . . . . . . C3 . . . . . . . | C3 . . . . . . . C3 . . . . . . . | B2 . . . . . . . B2 . . . . . . . | C3 . . . . . . . C3 . . . . . . . | C3 . . . . . . . C3 . . . . . . . | B2 . . . . . . . B2 . . . . . . . | C3 . . . . . . . C3 . . . . . . ."
      },
      "drums": {
        "kick": "x.o............. | ................ | x.o............. | ................ | x.o............. | ................ | x.o............. | ................"
      }
    },
    {
      "bars": 8,
      "voices": {
        "sub": "C2 - - - - - - - - - - - - - - - | F1 - - - - - - - - - - - - - - - | Ab1 - - - - - - - - - - - - - - - | G1 - - - - - - - - - - - - - - - | C2 - - - - - - - - - - - - - - - | F1 - - - - - - - - - - - - - - - | D2 - - - - - - - - - - - - - - - | G1 - - - - - - - - - - - - - - -",
        "ambient": "G3 - - - - - - - C4 - - - - - - - | Ab3 - - - - - - - C4 - - - - - - - | C4 - - - - - - - Eb4 - - - - - - - | B3 - - - - - - - D4 - - - - - - - | G3 - - - - - - - C4 - - - - - - - | Ab3 - - - - - - - D4 - - - - - - - | F3 - - - - - - - Ab3 - - - - - - - | G3 - - - - - - - B3 - - - - - - -",
        "drop": "C6 - - . . . . . Eb6 - - . . . . . | F6 - - . . . . . C6 - - . . . . . | Ab6 - - . . . . . G6 - - . . . . . | F6 - - . . . . . D6 - - . . . . . | Eb6 - - . . . . . G6 - - . . . . . | Ab6 - - . . . . . F6 - - . . . . . | D6 - - . . . . . F6 - - . . . . . | B5 - - - - - - . . . . . . . . .",
        "pulse": "C3 . . . C3 . . . C3 . . . C3 . . . | F2 . . . F2 . . . F2 . . . F2 . . . | Ab2 . . . Ab2 . . . Ab2 . . . Ab2 . . . | G2 . . . G2 . . . G2 . . . G2 . . . | C3 . . . C3 . . . C3 . . . C3 . . . | F2 . . . F2 . . . F2 . . . F2 . . . | D2 . . . D2 . . . D2 . . . D2 . . . | G2 . . . G2 . . . G2 . . . G2 . . ."
      },
      "drums": {
        "kick": "x.o............. | ................ | x.o............. | ................ | x.o............. | ................ | x.o............. | ................"
      }
    }
  ]
},
};
