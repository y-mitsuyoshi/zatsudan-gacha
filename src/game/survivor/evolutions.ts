/**
 * Vampire Survivors Depth: 8 Weapon Evolutions
 * Base Weapon at Lv8 + Matching Passive at Lv1+ -> Boss Chest triggers evolution.
 * Evolved weapons completely overhaul visual rendering, hit frequencies, and mechanics.
 */

export interface EvolutionRecipe {
  baseWeaponId: string;
  requiredPassiveId: string;
  evolvedId: string;
  name: string;
  desc: string;
  icon: string;
  flavor: string;
}

export const EVOLUTION_RECIPES: EvolutionRecipe[] = [
  {
    baseWeaponId: 'shuriken',
    requiredPassiveId: 'power',
    evolvedId: 'contract_storm',
    name: '契約書ストーム',
    desc: '無限に螺旋を描くカッター契約書。全敵を貫通し紙傷ペナルティを与える。',
    icon: 'contract_storm',
    flavor: '「全条項、承認済みです」',
  },
  {
    baseWeaponId: 'coffee',
    requiredPassiveId: 'watch',
    evolvedId: 'caffeine_geyser',
    name: 'メガカフェイン・ゲイザー',
    desc: '前後に薙ぎ払う超熱湯エスプレッソ火炎放射。高熱の持続蒸気を残す。',
    icon: 'caffeine_geyser',
    flavor: 'トリプルエスプレッソ直噴',
  },
  {
    baseWeaponId: 'barrier',
    requiredPassiveId: 'magnet',
    evolvedId: 'kanban_barrier',
    name: 'タスク管理結界',
    desc: '巨大な電磁ToDoボード結界。敵弾を反射・消滅させ、接近敵を感電。',
    icon: 'kanban_barrier',
    flavor: '進捗管理は絶対防御',
  },
  {
    baseWeaponId: 'boomerang',
    requiredPassiveId: 'shoes',
    evolvedId: 'gold_exchange',
    name: '役員ゴールド名刺',
    desc: '超重量の純金名刺が広域楕円軌道を旋回し、通過時に衝撃波を放つ。',
    icon: 'gold_exchange',
    flavor: '純金24Kの圧倒的挨拶',
  },
  {
    baseWeaponId: 'bomb',
    requiredPassiveId: 'lunch',
    evolvedId: 'taurine_supernova',
    name: 'モンスタータウリン',
    desc: '地面に高濃度タウリン溶解プールを形成。侵入した敵を大幅減速＆融解。',
    icon: 'taurine_supernova',
    flavor: 'タウリン30000mgの超新星',
  },
  {
    baseWeaponId: 'phone',
    requiredPassiveId: 'care',
    evolvedId: 'emergency_hotline',
    name: '緊急ホットライン',
    desc: '全社衛星ホットライン雷撃。密集した敵クラスターへ容赦ない連続落雷。',
    icon: 'emergency_hotline',
    flavor: '役員直通24時間スクランブル',
  },
  {
    baseWeaponId: 'hanko',
    requiredPassiveId: 'power',
    evolvedId: 'imperial_seal',
    name: '代表取締役印',
    desc: '画面全体を揺るがす深紅の巨大決裁印。大ダメージと敵1秒完全スタン。',
    icon: 'imperial_seal',
    flavor: 'これにて全件決裁完了',
  },
  {
    baseWeaponId: 'bell',
    requiredPassiveId: 'watch',
    evolvedId: 'grand_chime',
    name: '完全定時チャイム',
    desc: '18時の終業チャイムが響き渡り、画面内の全雑魚敵を1.5秒間完全凍結。',
    icon: 'grand_chime',
    flavor: '「お疲れ様でした、帰ります」',
  },
];

/**
 * Checks whether any owned weapon qualifies for evolution based on:
 * - Base weapon level >= 8
 * - Matching passive level >= 1
 * - Weapon is not already evolved
 * Returns the first matching evolution recipe or null.
 */
export function checkEvolution(
  weapons: Map<string, number>,
  passives: Map<string, number>
): EvolutionRecipe | null {
  if (!weapons || weapons.size === 0) return null;

  for (const recipe of EVOLUTION_RECIPES) {
    const baseLv = weapons.get(recipe.baseWeaponId) ?? 0;
    const passiveLv = passives.get(recipe.requiredPassiveId) ?? 0;
    const alreadyEvolved = weapons.has(recipe.evolvedId);

    if (baseLv >= 8 && passiveLv >= 1 && !alreadyEvolved) {
      return recipe;
    }
  }

  return null;
}

/**
 * Checks if a given weapon ID is an evolved legendary weapon.
 */
export function isEvolvedWeapon(id: string): boolean {
  return EVOLUTION_RECIPES.some((r) => r.evolvedId === id);
}

/**
 * Finds recipe by evolved weapon ID.
 */
export function getRecipeByEvolvedId(id: string): EvolutionRecipe | undefined {
  return EVOLUTION_RECIPES.find((r) => r.evolvedId === id);
}
