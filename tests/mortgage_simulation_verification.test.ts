import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ARCHETYPES,
  PROPERTIES,
  BANKS,
  DANSHIN_PLANS,
  MACRO_REGIMES,
  FAMILY_PLANS,
  calcEqualPaymentMonthlyMan,
  calcEqualPrincipalMonthlyMan,
  calcAnnualTaxDeductionMan,
  runBankUnderwriting,
  generateRandomHouseholdSetup,
  createMortgageGame,
  advanceOneYear,
  resolveMortgageDecision,
  executePrepayment,
  executePropertySpecificAction,
  executeRefinance,
  executeSellProperty,
  setFocusMode,
  analyzeOutcomeFactors,
  calcAnnualHealthRiskProbabilities,
  formatConsistentHouseholdTitle,
  resolveEffectiveProperty,
} from '../src/lib/mortgage-logic';
import { MortgageSetupConfig } from '../src/types/mortgage';

console.log('=== Verifying Mortgage Survival Simulation: マイホーム完済記 (/mortgage-life) ===');

// 1. Verify Data Catalogs & Current Higher Interest Rate Baselines (2026 Post-BOJ Hikes)
assert.equal(ARCHETYPES.length, 12, 'Should have 12 household archetypes');
assert.equal(Object.keys(PROPERTIES).length, 12, 'Should have 12 property presets');
assert.equal(Object.keys(BANKS).length, 7, 'Should have 7 bank plans');
assert.ok(Object.keys(DANSHIN_PLANS).length >= 4, 'Should have at least 4 Danshin plans');
assert.ok(Object.keys(MACRO_REGIMES).length >= 5, 'Should have at least 5 Macro regimes');
assert.ok(Object.keys(FAMILY_PLANS).length >= 6, 'Should have at least 6 Family plans');

assert.ok(
  BANKS['net-bank'].baseRate >= 0.6,
  `Net bank variable rate (${BANKS['net-bank'].baseRate}%) must reflect current post-BOJ hike levels (>= 0.60%)`,
);
assert.ok(
  BANKS['mega-bank'].baseRate >= 0.8,
  `Mega bank variable rate (${BANKS['mega-bank'].baseRate}%) must reflect current post-BOJ hike levels (>= 0.80%)`,
);
assert.ok(
  BANKS['flat35-agency'].baseRate >= 2.1,
  `Flat 35 fixed rate (${BANKS['flat35-agency'].baseRate}%) must reflect current long-term rate levels (>= 2.10%)`,
);

// Verify realistic age-stratified cancer & illness probabilities
const riskAge32 = calcAnnualHealthRiskProbabilities(32, 'balanced', 85);
const riskAge58 = calcAnnualHealthRiskProbabilities(58, 'balanced', 85);
assert.ok(
  riskAge32.cancerProb > 0.0005 && riskAge32.cancerProb < 0.003,
  `32yo annual cancer probability (${riskAge32.cancerProb}) must be ~0.12%`,
);
assert.ok(
  riskAge58.cancerProb > riskAge32.cancerProb * 5 && riskAge58.cancerProb < 0.025,
  `58yo annual cancer probability (${riskAge58.cancerProb}) must be higher than 32yo (~1.35%)`,
);

// 2. Verify Equal Payment (元利均等) vs Equal Principal (元金均等) Math
const principalMan = 5000; // 5,000万円
const annualRate = 1.0; // 1.0%

const equalPay35 = calcEqualPaymentMonthlyMan(principalMan, annualRate, 35);
const equalPay50 = calcEqualPaymentMonthlyMan(principalMan, annualRate, 50);
const equalPrin35FirstMonth = calcEqualPrincipalMonthlyMan(principalMan, annualRate, 35);

assert.ok(
  equalPay35 > equalPay50,
  `35-year monthly payment (${equalPay35.toFixed(2)}) must exceed 50-year monthly payment (${equalPay50.toFixed(2)})`
);
assert.ok(
  equalPrin35FirstMonth > equalPay35,
  `Equal principal initial monthly payment (${equalPrin35FirstMonth.toFixed(2)}) must exceed equal payment (${equalPay35.toFixed(2)})`
);

// 3. Verify Housing Loan Tax Deduction (住宅ローン控除)
const longTermProp = PROPERTIES['tower-mansion-new'];
const usedProp = PROPERTIES['suburban-mansion-used'];
const usedNonCompliantProp = PROPERTIES['detached-used'];

const deductionChildSingle = calcAnnualTaxDeductionMan(5000, 1, longTermProp, 'single', true, 900, 0);
const deductionNoChildSingle = calcAnnualTaxDeductionMan(5000, 1, longTermProp, 'single', false, 900, 0);
const deductionPair = calcAnnualTaxDeductionMan(7000, 1, longTermProp, 'pair', true, 900, 600);
const deductionAfter13Y = calcAnnualTaxDeductionMan(4000, 14, longTermProp, 'single', true, 900, 0);
const deductionUsedYear11 = calcAnnualTaxDeductionMan(3000, 11, usedProp, 'single', true, 900, 0);
const deductionUsedOld = calcAnnualTaxDeductionMan(2500, 1, usedNonCompliantProp, 'single', true, 900, 0);

assert.equal(deductionChildSingle.creditMan, 35, '5000万 Long-term excellent with child should get max 35万/yr deduction');
assert.equal(deductionNoChildSingle.creditMan, 31.5, '4500万 cap without child should get 31.5万/yr deduction');
assert.ok(deductionPair.creditMan > deductionChildSingle.creditMan, 'Pair loan should allow higher combined tax deduction');
assert.equal(deductionAfter13Y.creditMan, 0, 'Deduction must expire after 13 years for new build');
assert.equal(deductionUsedYear11.creditMan, 0, 'Used property deduction must expire after 10 years');
assert.equal(deductionUsedOld.borrowingCapMan, 2000, 'Non-compliant used property should cap at 2000万');

// 4. Verify Bank Underwriting (審査・DTI・50年ローン・信用傷審査)
const baseSetup: MortgageSetupConfig = {
  archetypeId: 'power-couple-tower',
  age: 34,
  employment: 'listed-corp',
  mainIncomeMan: 780,
  subIncomeMan: 520,
  initialSavingsMan: 1600,
  downPaymentMan: 900,
  hasCreditBlemish: false,
  contractType: 'pair',
  familyPlan: 'child-2-public',
  propertyId: 'tower-mansion-new',
  bankId: 'net-bank',
  termYears: 35,
  repaymentMethod: 'equal-payment',
  bonusRepaymentRatio: 0,
  danshin: 'cancer-50',
  macroRegime: 'gradual-hike',
};

const uwPass = runBankUnderwriting(baseSetup);
assert.equal(uwPass.approved, true, 'Power couple with pair loan and 900万 down payment should pass underwriting');

// Net bank rejects credit blemish
const creditBlemishSetup: MortgageSetupConfig = {
  ...baseSetup,
  archetypeId: 'freelance-creator',
  employment: 'freelance',
  mainIncomeMan: 680,
  subIncomeMan: 280,
  hasCreditBlemish: true,
  propertyId: 'detached-powerbuilder-new',
  bankId: 'net-bank',
  contractType: 'single',
  downPaymentMan: 300,
};
const uwBlemishNet = runBankUnderwriting(creditBlemishSetup);
assert.ok(
  uwBlemishNet.warnings.some((w) => w.includes('CIC')),
  'Net bank must flag CIC credit blemish in underwriting warnings'
);

const uwOverBorrow = runBankUnderwriting({
  ...creditBlemishSetup,
  propertyId: 'luxury-penthouse-new',
  downPaymentMan: 0,
});
assert.ok(uwOverBorrow.ConditionalReductionMan > 0, 'Excessive DTI must trigger conditional loan reduction');
assert.equal(uwOverBorrow.grade, 'C', 'Excessive DTI must receive C high-risk underwriting grade');

// 5. Verify 5-Year Rule & 125% Rule & Unpaid Interest (未払利息) under Stagflation
const megaStagflationSetup: MortgageSetupConfig = {
  ...baseSetup,
  bankId: 'mega-bank', // Has 5-year & 125% rule
  macroRegime: 'stagflation-shock',
  downPaymentMan: 500,
};
let megaGame = createMortgageGame(megaStagflationSetup);
const initialRulePayment = megaGame.last5YearRulePaymentMan;

// Advance 3 years: rate rises sharply under stagflation, but 5-year rule keeps monthly rule payment fixed
for (let i = 0; i < 3; i++) {
  megaGame = advanceOneYear(megaGame);
  if (megaGame.pendingDecision) {
    megaGame = resolveMortgageDecision(megaGame, megaGame.pendingDecision.choices[0].id);
  }
}
assert.equal(
  megaGame.last5YearRulePaymentMan,
  initialRulePayment,
  'Mega bank 5-year rule must freeze monthly rule payment during years 1-4 despite rate hikes'
);

// Advance through year 6 to trigger 5-year recalculation (capped at 125%)
while (megaGame.yearIndex < 6 && megaGame.status === 'playing') {
  megaGame = advanceOneYear(megaGame);
  if (megaGame.pendingDecision) {
    megaGame = resolveMortgageDecision(megaGame, megaGame.pendingDecision.choices[0].id);
  }
}
assert.ok(
  megaGame.last5YearRulePaymentMan <= initialRulePayment * 1.251,
  `Mega bank 125% rule must cap payment jump at 125% (${megaGame.last5YearRulePaymentMan} vs ${initialRulePayment * 1.25})`
);

// 6. Verify Anytime Financial Defense Actions (繰上返済 / 固定借換 / 任意売却)
let actionGame = createMortgageGame(baseSetup);
actionGame = advanceOneYear(actionGame);
if (actionGame.pendingDecision) {
  actionGame = resolveMortgageDecision(actionGame, actionGame.pendingDecision.choices[0].id);
}
const balanceBeforePrepay = actionGame.remainingBalanceMan;
const afterPrepayReduce = executePrepayment(actionGame, 300, 'reduce-payment');
assert.equal(
  Math.round(afterPrepayReduce.remainingBalanceMan),
  Math.round(balanceBeforePrepay - 300),
  'Prepayment must reduce remaining principal by exact amount'
);

const afterRefi = executeRefinance(actionGame, 'to-fixed');
assert.equal(afterRefi.currentRateType, 'flat-35', 'Refinance action must switch rate type to flat-35 fixed');

const afterFocus = setFocusMode(actionGame, 'frugal-prepay');
assert.equal(afterFocus.focusMode, 'frugal-prepay', 'Focus mode must update cleanly');
assert.ok((actionGame.companions ?? []).length === 4, 'Must track 4 parallel companion households');

// Verify Mansion vs Detached House specific actions
const afterMansionReform = executePropertySpecificAction(actionGame, 'mansion-board-reform');
assert.ok(
  afterMansionReform.currentMgmtAndRepairMonthlyMan < actionGame.currentMgmtAndRepairMonthlyMan,
  'Mansion board reform must reduce monthly maintenance fee'
);
const detachedGame = createMortgageGame({
  ...baseSetup,
  propertyId: 'detached-custom-new',
});
const afterDetachedSolar = executePropertySpecificAction(detachedGame, 'detached-solar-battery');
assert.ok(
  afterDetachedSolar.propertyValueMan > detachedGame.propertyValueMan,
  'Detached solar+battery action must increase home equity value'
);

const afterSale = executeSellProperty(actionGame);
assert.ok(afterSale.status !== 'playing', 'Selling property must conclude the simulation with a settlement');
assert.ok(afterSale.ending !== null, 'Selling property must produce an ending summary');
assert.ok(analyzeOutcomeFactors(afterSale).length >= 2, 'Outcome factor analysis must return key reasons');

// 7. Verify Starting Age Consistency (e.g. 29歳・地方都市の敷地60坪＆太陽光戸建て世帯 starts at 29yo) & Strict Detached vs Mansion Event Separation
const regionalArch = ARCHETYPES.find((a) => a.id === 'regional-dual-car-detached')!;
assert.equal(regionalArch.age, 29, 'regional-dual-car-detached archetype age must be 29');
const regionalSetup: MortgageSetupConfig = {
  ...baseSetup,
  archetypeId: regionalArch.id,
  age: regionalArch.age,
  propertyId: regionalArch.recommendedProperty,
};
const regionalGame = createMortgageGame(regionalSetup);
assert.equal(regionalGame.age, 29, '29歳・地方都市の敷地60坪＆太陽光戸建て世帯 must start at age 29');
assert.ok(
  formatConsistentHouseholdTitle(regionalSetup).startsWith('29歳・'),
  'Household title must start with 29歳・ when borrowing age is 29',
);
assert.equal(
  resolveEffectiveProperty(regionalSetup).buildingType,
  'detached',
  'regional-dual-car-detached must resolve to detached house',
);
assert.equal(
  regionalGame.currentMgmtAndRepairMonthlyMan,
  0,
  'Detached house initial condo management & repair fee must be 0',
);

// Verify bonus repayment ratio normalization
const uwWithBonus = runBankUnderwriting({ ...baseSetup, bonusRepaymentRatio: 0.2 });
assert.ok(uwWithBonus.initialMonthlyPaymentMan > 0, 'Bonus repayment ratio 0.2 must yield positive monthly payment');

const MANSION_ONLY_EVENT_IDS = [
  'mansion-mgmt-parking-7',
  'mansion-special-levy-14',
  'mansion-noise-water-trouble',
  'tower-highrise-elevator',
  'mansion-unit-appliance',
  'mansion-board-leader',
];
const DETACHED_ONLY_EVENT_IDS = [
  'detached-solar-ev-7',
  'detached-repair-13',
  'detached-car-replace',
  'detached-storm-gutter',
  'detached-ecocute-fail',
  'detached-neighbor-boundary',
];

// 8. Run 100 Full-Lifecycle Simulations across Random Gacha Setups & Macro Regimes
let completedSimulations = 0;
let majorHealthTriggeredCount = 0;
const endingCounts: Record<string, number> = {};
const uniqueEventsTriggered = new Set<string>();

// Deterministic LCG for reproducible statistical test
let seed = 20261103;
const seededRng = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
};

for (let i = 0; i < 100; i++) {
  const randomSetup = generateRandomHouseholdSetup(seededRng);
  const effProp = resolveEffectiveProperty(randomSetup);
  const title = formatConsistentHouseholdTitle(randomSetup);
  assert.ok(
    title.startsWith(`${randomSetup.age}歳・`),
    `Formatted title (${title}) must match setup borrowing age (${randomSetup.age}歳)`,
  );
  assert.ok(
    randomSetup.randomRollSummary?.includes('自己資金') &&
      randomSetup.randomRollSummary?.includes('購入後の手元資金') &&
      randomSetup.randomRollSummary?.includes('借入元本') &&
      randomSetup.randomRollSummary?.includes('毎月返済'),
    `Random roll summary must include savings, remaining cash after purchase, loan principal, and monthly payment: ${randomSetup.randomRollSummary}`,
  );
  if (effProp.buildingType === 'detached') {
    assert.equal(
      title.includes('マンション') || title.includes('タワマン'),
      false,
      `Detached property must never have Mansion/Tower in household title (${title})`,
    );
  }

  let state = createMortgageGame(randomSetup);
  assert.equal(state.age, randomSetup.age, 'Game initial age must equal setup borrowing age');
  assert.equal(state.bojPolicyRate, 0.75, 'Initial BOJ policy rate must be 0.75%');
  let safetyTicks = 0;
  while (state.status === 'playing' && safetyTicks < 65) {
    state = advanceOneYear(state, seededRng);
    if (state.pendingDecision) {
      uniqueEventsTriggered.add(state.pendingDecision.id);
      const choiceIdx = i % state.pendingDecision.choices.length;
      state = resolveMortgageDecision(state, state.pendingDecision.choices[choiceIdx].id);
    }
    safetyTicks++;
  }
  assert.ok(state.status !== 'playing', `Simulation #${i} should finish within 65 years`);
  assert.ok(state.ending !== null, `Simulation #${i} must generate an ending`);

  // Strictly verify no cross-contamination between detached and mansion events/chronicles
  if (effProp.buildingType === 'detached') {
    for (const mId of MANSION_ONLY_EVENT_IDS) {
      assert.equal(
        state.triggeredEventIds.includes(mId),
        false,
        `Detached house simulation #${i} must NEVER trigger mansion event ${mId}`,
      );
    }
    for (const entry of state.chronicle) {
      assert.equal(
        entry.title.includes('管理組合') || entry.title.includes('マンション') || entry.title.includes('タワマン'),
        false,
        `Detached house chronicle must NEVER contain mansion/condo titles: ${entry.title}`,
      );
    }
  } else {
    for (const dId of DETACHED_ONLY_EVENT_IDS) {
      assert.equal(
        state.triggeredEventIds.includes(dId),
        false,
        `Mansion/Tower simulation #${i} must NEVER trigger detached event ${dId}`,
      );
    }
    for (const entry of state.chronicle) {
      assert.equal(
        entry.title.includes('一戸建て') || entry.title.includes('戸建て'),
        false,
        `Mansion/Tower chronicle must NEVER contain detached house titles: ${entry.title}`,
      );
    }
  }

  if (state.triggeredEventIds.includes('danshin-health-judgment')) {
    majorHealthTriggeredCount++;
  }
  endingCounts[state.ending.rank] = (endingCounts[state.ending.rank] ?? 0) + 1;
  completedSimulations++;
}

console.log(
  `Completed ${completedSimulations} full-lifecycle simulations. Unique decision events seen: ${uniqueEventsTriggered.size}. Major health/cancer rate: ${majorHealthTriggeredCount}%. Ending rank distribution:`,
  endingCounts,
);
assert.ok(
  uniqueEventsTriggered.size >= 12,
  `Should trigger at least 12 distinct turning point decision types across 100 simulations (saw ${uniqueEventsTriggered.size})`,
);
assert.ok(
  majorHealthTriggeredCount >= 10 && majorHealthTriggeredCount <= 55,
  `Major health/cancer event rate (${majorHealthTriggeredCount}%) must be statistically realistic (10-55%, never 100%!)`,
);

// 8. Verify Zero Emojis, Zero Personal Surnames, Zero Copycat Title, and Zero Truncation in Mortgage files
const filesToCheck = [
  'src/types/mortgage.ts',
  'src/lib/mortgage-logic.ts',
  'src/components/mortgage/MortgageVisuals.tsx',
  'src/components/mortgage/MortgageGame.tsx',
  'src/app/mortgage-life/page.tsx',
];
const emojiRegex = /\p{Extended_Pictographic}/u;
const personalSurnameRegex = /佐藤家|鈴木家|高橋家|田中家|伊藤家|渡辺家|山本家|中村家/;
const copycatTitleRegex = /1,300万|1300万|1in8b/i;

for (const file of filesToCheck) {
  const content = fs.readFileSync(file, 'utf-8');
  assert.equal(emojiRegex.test(content), false, `File ${file} must not contain any emojis`);
  assert.equal(
    personalSurnameRegex.test(content),
    false,
    `File ${file} must not contain personal surnames`
  );
  assert.equal(
    copycatTitleRegex.test(content),
    false,
    `File ${file} must not contain copycat title strings (1,300万 / 1in8b)`
  );
}

const uiContent =
  fs.readFileSync('src/components/mortgage/MortgageGame.tsx', 'utf-8') +
  fs.readFileSync('src/components/mortgage/MortgageVisuals.tsx', 'utf-8');
assert.equal(
  /\btruncate\b/.test(uiContent),
  false,
  'Mortgage UI components must not use CSS truncate class that clips Japanese text'
);

console.log('ALL MORTGAGE SIMULATION VERIFICATION TESTS PASSED!');
