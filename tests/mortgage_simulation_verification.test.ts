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
  executeRefinance,
  executeSellProperty,
} from '../src/lib/mortgage-logic';
import { MortgageSetupConfig } from '../src/types/mortgage';

console.log('=== Verifying 1in8b-style Mortgage Survival Simulation (/mortgage-life) ===');

// 1. Verify Data Catalogs
assert.ok(ARCHETYPES.length >= 6, 'Should have at least 6 household archetypes');
assert.ok(Object.keys(PROPERTIES).length >= 8, 'Should have at least 8 property presets');
assert.ok(Object.keys(BANKS).length >= 5, 'Should have at least 5 bank plans');
assert.ok(Object.keys(DANSHIN_PLANS).length >= 4, 'Should have at least 4 Danshin plans');
assert.ok(Object.keys(MACRO_REGIMES).length >= 5, 'Should have at least 5 Macro regimes');
assert.ok(Object.keys(FAMILY_PLANS).length >= 6, 'Should have at least 6 Family plans');

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

const afterSale = executeSellProperty(actionGame);
assert.ok(afterSale.status !== 'playing', 'Selling property must conclude the simulation with a settlement');
assert.ok(afterSale.ending !== null, 'Selling property must produce an ending summary');

// 7. Run 50 Full-Lifecycle Simulations across Random Gacha Setups & Macro Regimes
let completedSimulations = 0;
const endingCounts: Record<string, number> = {};

for (let i = 0; i < 50; i++) {
  const randomSetup = generateRandomHouseholdSetup();
  let state = createMortgageGame(randomSetup);
  let safetyTicks = 0;
  while (state.status === 'playing' && safetyTicks < 65) {
    state = advanceOneYear(state);
    if (state.pendingDecision) {
      const choiceIdx = i % state.pendingDecision.choices.length;
      state = resolveMortgageDecision(state, state.pendingDecision.choices[choiceIdx].id);
    }
    safetyTicks++;
  }
  assert.ok(state.status !== 'playing', `Simulation #${i} should finish within 65 years`);
  assert.ok(state.ending !== null, `Simulation #${i} must generate an ending`);
  endingCounts[state.ending.rank] = (endingCounts[state.ending.rank] ?? 0) + 1;
  completedSimulations++;
}

console.log(`Completed ${completedSimulations} full-lifecycle simulations. Ending rank distribution:`, endingCounts);

// 8. Verify Zero Emojis in all new Mortgage files (S-15 rule)
const filesToCheck = [
  'src/types/mortgage.ts',
  'src/lib/mortgage-logic.ts',
  'src/components/mortgage/MortgageGame.tsx',
  'src/app/mortgage-life/page.tsx',
];
const emojiRegex = /\p{Extended_Pictographic}/u;
for (const file of filesToCheck) {
  const content = fs.readFileSync(file, 'utf-8');
  assert.equal(emojiRegex.test(content), false, `File ${file} must not contain any emojis`);
}

console.log('ALL MORTGAGE SIMULATION VERIFICATION TESTS PASSED!');
