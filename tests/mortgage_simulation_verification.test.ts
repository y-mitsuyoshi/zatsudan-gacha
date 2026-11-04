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
  executeRelocateProperty,
  executeSellProperty,
  evaluateEnding,
  setFocusMode,
  setPostRetirementWorkThisYear,
  setSpouseWorkStyleThisYear,
  analyzeOutcomeFactors,
  calcAnnualHealthRiskProbabilities,
  calcDetailedChildAnnualEduCostMan,
  calcDynamicFamilyComposition,
  calcEffectiveAnnualPropertyTaxMan,
  executeMidTermRateHike,
  formatConsistentHouseholdTitle,
  getChildIndependenceAge,
  getDefaultRetirementAllowanceMan,
  CRAM_SCHOOL_SPECS,
  INSURANCE_PLAN_SPECS,
  LEISURE_STYLE_SPECS,
  RELOCATION_PLAN_SPECS,
  resolveEffectiveBank,
  resolveEffectiveHouseholdCareerAndEdu,
  resolveEffectiveProperty,
  buildShareChallengeUrl,
  parseShareChallengeParams,
  generateCertShareText,
  generateViralXShareText,
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

// Verify realistic age-stratified cancer & illness probabilities (5-year brackets strictly increasing with age)
const riskAge26 = calcAnnualHealthRiskProbabilities(26, 'balanced', 85);
const riskAge32 = calcAnnualHealthRiskProbabilities(32, 'balanced', 85);
const riskAge42 = calcAnnualHealthRiskProbabilities(42, 'balanced', 85);
const riskAge52 = calcAnnualHealthRiskProbabilities(52, 'balanced', 85);
const riskAge58 = calcAnnualHealthRiskProbabilities(58, 'balanced', 85);
const riskAge67 = calcAnnualHealthRiskProbabilities(67, 'balanced', 85);
const riskAge76 = calcAnnualHealthRiskProbabilities(76, 'balanced', 85);
assert.ok(
  riskAge26.cancerProb < riskAge32.cancerProb &&
    riskAge32.cancerProb < riskAge42.cancerProb &&
    riskAge42.cancerProb < riskAge52.cancerProb &&
    riskAge52.cancerProb < riskAge58.cancerProb &&
    riskAge58.cancerProb < riskAge67.cancerProb &&
    riskAge67.cancerProb < riskAge76.cancerProb,
  'Annual cancer incidence probability must strictly increase across age brackets from 20s to 75+',
);
assert.ok(
  riskAge32.cancerProb > 0.0005 && riskAge32.cancerProb < 0.003,
  `32yo annual cancer probability (${riskAge32.cancerProb}) must be ~0.09%`,
);
assert.ok(
  riskAge58.cancerProb > riskAge32.cancerProb * 5 && riskAge58.cancerProb < 0.025,
  `58yo annual cancer probability (${riskAge58.cancerProb}) must be higher than 32yo (~1.15%)`,
);

// Verify Employment-Based Retirement Allowance Defaults & Salary / Post-Retirement / Education / Gakushi Hoken / Scholarship Math
assert.equal(getDefaultRetirementAllowanceMan('civil-servant'), 2100, 'Civil servant default retirement allowance must be 2100万');
assert.equal(getDefaultRetirementAllowanceMan('listed-corp'), 1750, 'Listed corp default retirement allowance must be 1750万');
assert.equal(getDefaultRetirementAllowanceMan('sme'), 550, 'SME default retirement allowance must be 550万');
assert.equal(getDefaultRetirementAllowanceMan('mega-venture'), 0, 'Mega venture default retirement allowance must be 0万');
assert.equal(getDefaultRetirementAllowanceMan('freelance'), 0, 'Freelance default retirement allowance must be 0万');

// Detailed child education cost verification
const eduCfgBase: MortgageSetupConfig = {
  archetypeId: 'steady-couple-station',
  age: 34,
  employment: 'listed-corp',
  mainIncomeMan: 600,
  subIncomeMan: 300,
  initialSavingsMan: 900,
  downPaymentMan: 400,
  hasCreditBlemish: false,
  contractType: 'pair',
  familyPlan: 'child-1-public',
  propertyId: 'station-mansion-new',
  bankId: 'mega-bank',
  termYears: 35,
  repaymentMethod: 'equal-payment',
  bonusRepaymentRatio: 0,
  danshin: 'cancer-50',
  macroRegime: 'gradual-hike',
  hasGakushiHoken: false,
  scholarshipType: 'none',
};

const jhsPublicCost = calcDetailedChildAnnualEduCostMan(13, {
  ...eduCfgBase,
  juniorHighPath: 'public-jhs',
  higherEdPath: 'national-univ',
});
const jhsPrivateExamCost = calcDetailedChildAnnualEduCostMan(13, {
  ...eduCfgBase,
  juniorHighPath: 'private-exam-jhs',
  higherEdPath: 'national-univ',
});
assert.ok(jhsPrivateExamCost > jhsPublicCost * 2.5, 'Private exam JHS cost at age 13 must exceed public JHS cost');

const univNatCost = calcDetailedChildAnnualEduCostMan(19, {
  ...eduCfgBase,
  juniorHighPath: 'public-jhs',
  higherEdPath: 'national-univ',
});
const univPrivArtsCost = calcDetailedChildAnnualEduCostMan(19, {
  ...eduCfgBase,
  juniorHighPath: 'public-jhs',
  higherEdPath: 'private-arts-univ',
});
const univPrivSciCost = calcDetailedChildAnnualEduCostMan(19, {
  ...eduCfgBase,
  juniorHighPath: 'public-jhs',
  higherEdPath: 'private-science-univ',
});
const univWithJasso = calcDetailedChildAnnualEduCostMan(19, {
  ...eduCfgBase,
  juniorHighPath: 'public-jhs',
  higherEdPath: 'private-science-univ',
  scholarshipType: 'jasso-loan',
});
const univWithGrant = calcDetailedChildAnnualEduCostMan(19, {
  ...eduCfgBase,
  juniorHighPath: 'public-jhs',
  higherEdPath: 'private-science-univ',
  scholarshipType: 'grant-workstudy',
});
const hsJobAt19 = calcDetailedChildAnnualEduCostMan(19, {
  ...eduCfgBase,
  juniorHighPath: 'public-jhs',
  higherEdPath: 'high-school-job',
});
const vocAt20 = calcDetailedChildAnnualEduCostMan(20, {
  ...eduCfgBase,
  juniorHighPath: 'public-jhs',
  higherEdPath: 'vocational-2yr',
});
assert.ok(
  univNatCost < univPrivArtsCost && univPrivArtsCost < univPrivSciCost,
  'University costs must scale: national < private arts < private science',
);
assert.ok(
  univWithGrant < univWithJasso && univWithJasso < univPrivSciCost,
  'Scholarships must reduce annual parent burden during university years',
);
assert.equal(hsJobAt19, 0, 'High school job child is independent at 18 -> 0 edu cost at 19');
assert.equal(vocAt20, 0, 'Vocational 2yr child is independent at 20 -> 0 edu cost at 20');
assert.equal(getChildIndependenceAge('high-school-job'), 18);
assert.equal(getChildIndependenceAge('vocational-2yr'), 20);
assert.equal(getChildIndependenceAge('private-science-univ'), 22);

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
  mainIncomeMan: 880,
  subIncomeMan: 600,
  initialSavingsMan: 1800,
  downPaymentMan: 1200,
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

// 7b. Verify Salary Curves (steady-up rises vs downward-pressure declines), Post-Retirement Work, Spouse Part-Time & Gakushi Hoken Payout
let steadyUpGame = createMortgageGame({
  ...baseSetup,
  age: 32,
  mainIncomeMan: 600,
  salaryCurve: 'steady-up',
});
let downwardGame = createMortgageGame({
  ...baseSetup,
  age: 32,
  mainIncomeMan: 600,
  salaryCurve: 'downward-pressure',
});
for (let y = 0; y < 8; y++) {
  steadyUpGame = advanceOneYear(steadyUpGame, () => 0.99);
  if (steadyUpGame.pendingDecision) {
    steadyUpGame = resolveMortgageDecision(steadyUpGame, steadyUpGame.pendingDecision.choices[0].id);
  }
  downwardGame = advanceOneYear(downwardGame, () => 0.99);
  if (downwardGame.pendingDecision) {
    downwardGame = resolveMortgageDecision(downwardGame, downwardGame.pendingDecision.choices[0].id);
  }
}
assert.ok(
  steadyUpGame.mainIncomeMan > 630,
  `Steady-up salary curve should increase mainIncomeMan above 630万 after 8 years (got ${steadyUpGame.mainIncomeMan}万)`,
);
assert.ok(
  downwardGame.mainIncomeMan < 570,
  `Downward-pressure salary curve should decrease mainIncomeMan below 570万 after 8 years (got ${downwardGame.mainIncomeMan}万)`,
);

// Verify Post-Retirement Work at age 60 & Retirement Allowance Gating
let retireZeroArubaito = createMortgageGame({
  ...baseSetup,
  age: 58,
  termYears: 25,
  retirementAllowanceMan: 0,
  postRetirementWork: 'part-time-arubaito',
});
while (retireZeroArubaito.age < 60) {
  retireZeroArubaito = advanceOneYear(retireZeroArubaito, () => 0.99);
  if (retireZeroArubaito.pendingDecision && retireZeroArubaito.age < 60) {
    retireZeroArubaito = resolveMortgageDecision(
      retireZeroArubaito,
      retireZeroArubaito.pendingDecision.choices[0].id,
    );
  }
}
assert.equal(
  retireZeroArubaito.mainIncomeMan,
  140,
  'part-time-arubaito post-retirement work should set mainIncomeMan to 140万 at age 60',
);
assert.equal(
  retireZeroArubaito.pendingDecision?.id,
  'no-retirement-60-survival',
  '0万 retirement allowance at age 60 must trigger no-retirement-60-survival (never retirement-lump-sum-60)',
);

let retireFullAllowance = createMortgageGame({
  ...baseSetup,
  age: 58,
  termYears: 25,
  retirementAllowanceMan: 1800,
  postRetirementWork: 'full-retire-60',
});
while (retireFullAllowance.age < 60) {
  retireFullAllowance = advanceOneYear(retireFullAllowance, () => 0.99);
  if (retireFullAllowance.pendingDecision && retireFullAllowance.age < 60) {
    retireFullAllowance = resolveMortgageDecision(
      retireFullAllowance,
      retireFullAllowance.pendingDecision.choices[0].id,
    );
  }
}
assert.equal(
  retireFullAllowance.mainIncomeMan,
  0,
  'full-retire-60 should set mainIncomeMan to 0万 at age 60',
);
assert.equal(
  retireFullAllowance.pendingDecision?.id,
  'retirement-lump-sum-60',
  '1800万 retirement allowance at age 60 must trigger retirement-lump-sum-60',
);
assert.ok(
  retireZeroArubaito.pendingDecision?.choices.some((c) => c.id === 'senior-no-work-full-retire'),
  'no-retirement-60-survival must include an explicit choice not to work after retirement (senior-no-work-full-retire)',
);
assert.ok(
  retireFullAllowance.pendingDecision?.choices.some((c) => c.id === 'retire-60-no-work-life'),
  'retirement-lump-sum-60 must include an explicit choice not to work after retirement (retire-60-no-work-life)',
);

// Verify retire-65-pension-only (work until 64, then do not work at all from age 65) & age 65 retirement-65-work-or-not decision
let retire65Game = createMortgageGame({
  ...baseSetup,
  age: 58,
  termYears: 25,
  retirementAllowanceMan: 1200,
  postRetirementWork: 'retire-65-pension-only',
});
while (retire65Game.age < 65 && retire65Game.status === 'playing') {
  retire65Game = advanceOneYear(retire65Game, () => 0.99);
  if (retire65Game.pendingDecision && retire65Game.age < 65) {
    retire65Game = resolveMortgageDecision(
      retire65Game,
      retire65Game.pendingDecision.choices[1]?.id ?? retire65Game.pendingDecision.choices[0].id,
    );
  }
}
assert.equal(
  retire65Game.mainIncomeMan,
  250,
  'retire-65-pension-only must set mainIncomeMan to pension-only (250万 for listed-corp) at age 65 with zero silver work',
);
assert.equal(
  retire65Game.pendingDecision?.id,
  'retirement-65-work-or-not',
  'Age 65 with remaining balance must trigger retirement-65-work-or-not decision',
);
assert.ok(
  retire65Game.pendingDecision?.choices.some((c) => c.id === 'retire-65-no-work-pension'),
  'retirement-65-work-or-not must include choice retire-65-no-work-pension (do not work after 65)',
);

// Verify Single -> Marriage & Marriage Relocation (single-marriage-crossroad) + Subsequent Childbirth
let singleGame = createMortgageGame({
  ...baseSetup,
  archetypeId: 'single-solo-compact',
  age: 31,
  contractType: 'single',
  familyPlan: 'dinks',
  subIncomeMan: 0,
  spouseWorkPattern: 'no-spouse',
  propertyId: 'compact-mansion-new',
});
assert.equal(
  resolveEffectiveHouseholdCareerAndEdu(singleGame.config).hasSpouse,
  false,
  'Single starter must begin with hasSpouse = false',
);
while (singleGame.yearIndex < 4 && singleGame.status === 'playing') {
  singleGame = advanceOneYear(singleGame, () => 0.99);
  if (singleGame.pendingDecision && singleGame.yearIndex < 4) {
    singleGame = resolveMortgageDecision(singleGame, singleGame.pendingDecision.choices[0].id);
  }
}
assert.equal(
  singleGame.pendingDecision?.id,
  'single-marriage-crossroad',
  'Single household at year 4 must trigger single-marriage-crossroad',
);
assert.ok(
  singleGame.pendingDecision?.choices.some((c) => c.id === 'single-marry-and-relocate'),
  'single-marriage-crossroad must include marriage + relocation choice (single-marry-and-relocate)',
);
singleGame = resolveMortgageDecision(singleGame, 'single-marry-and-relocate');
assert.equal(
  resolveEffectiveHouseholdCareerAndEdu(singleGame.config).hasSpouse,
  true,
  'Choosing single-marry-and-relocate must transition single player to married household',
);
assert.equal(
  singleGame.subIncomeMan,
  280,
  'Marriage + relocation must add spouse dual-income (280万)',
);
assert.equal(
  singleGame.relocationCount,
  1,
  'Marriage + relocation must increment relocationCount to 1',
);

// Verify Anytime Home Relocation (executeRelocateProperty) for Any Household
assert.equal(Object.keys(RELOCATION_PLAN_SPECS).length, 3, 'Must define 3 relocation plan specs');
const familyBeforeReloc = createMortgageGame(baseSetup);
const upgradedReloc = executeRelocateProperty(familyBeforeReloc, 'upgrade-wider');
assert.ok(
  upgradedReloc.propertyValueMan > familyBeforeReloc.propertyValueMan,
  'upgrade-wider relocation must increase propertyValueMan',
);
assert.equal(upgradedReloc.relocationCount, 1, 'Relocation must increment relocationCount');

const downsizedReloc = executeRelocateProperty(familyBeforeReloc, 'downsize-compact');
assert.ok(
  downsizedReloc.remainingBalanceMan < familyBeforeReloc.remainingBalanceMan - 700,
  'downsize-compact relocation must significantly compress remaining mortgage balance',
);

// Verify Diverse Ending Patterns (20+ distinct ending IDs reachable in evaluateEnding)
const endingSet = new Set<string>();
endingSet.add(evaluateEnding(familyBeforeReloc, 'bankrupt').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, unpaidInterestMan: 80 }, 'bankrupt').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, appliedInterestRate: 2.6, currentRateType: 'variable' }, 'bankrupt').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, childrenAges: [17] }, 'bankrupt').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, age: 64 }, 'bankrupt').ending.id);
endingSet.add(evaluateEnding(familyBeforeReloc, 'divorce-deadlock').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, liquidSavingsMan: 3500 }, 'sold').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, age: 63, liquidSavingsMan: 1400 }, 'sold').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, liquidSavingsMan: 1800 }, 'sold').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, liquidSavingsMan: 700 }, 'sold').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, liquidSavingsMan: 200 }, 'sold').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, liquidSavingsMan: 40 }, 'sold').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, danshinTriggered: true }, 'paid-off').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, age: 46, totalPrepaymentMan: 1200, liquidSavingsMan: 1500 }, 'paid-off').ending.id);
endingSet.add(evaluateEnding({ ...singleGame, liquidSavingsMan: 1500 }, 'paid-off').ending.id);
endingSet.add(evaluateEnding({ ...upgradedReloc, liquidSavingsMan: 1600 }, 'paid-off').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, config: { ...baseSetup, postRetirementWork: 'full-retire-60' }, liquidSavingsMan: 2000 }, 'paid-off').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, config: { ...baseSetup, propertyId: 'tower-mansion-new' }, propertyValueMan: 6500, liquidSavingsMan: 2200, remainingBalanceMan: 0 }, 'paid-off').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, config: { ...baseSetup, propertyId: 'detached-custom-new' }, propertyValueMan: 4500, buildingValueMan: 1200, liquidSavingsMan: 2000, remainingBalanceMan: 0 }, 'paid-off').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, config: { ...baseSetup, propertyId: 'station-mansion-new' }, propertyValueMan: 5500, liquidSavingsMan: 3500, remainingBalanceMan: 0 }, 'paid-off').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, childrenAges: [24, 21], liquidSavingsMan: 1700, remainingBalanceMan: 0 }, 'paid-off').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, config: { ...baseSetup, contractType: 'single', spouseWorkPattern: 'no-spouse' }, childrenAges: [], liquidSavingsMan: 1500, remainingBalanceMan: 0 }, 'paid-off').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, mentalScore: 92, liquidSavingsMan: 1200, remainingBalanceMan: 0 }, 'paid-off').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, age: 65, liquidSavingsMan: 1450, remainingBalanceMan: 0 }, 'paid-off').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, config: { ...baseSetup, postRetirementWork: 'full-retire-60' }, liquidSavingsMan: 600, remainingBalanceMan: 0 }, 'paid-off').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, age: 78, liquidSavingsMan: 400, remainingBalanceMan: 0 }, 'paid-off').ending.id);
endingSet.add(evaluateEnding({ ...familyBeforeReloc, age: 68, liquidSavingsMan: 300, remainingBalanceMan: 0 }, 'paid-off').ending.id);
assert.equal(endingSet.size, 27, `All 27 distinct endings in evaluateEnding must be uniquely reachable (got ${endingSet.size})`);

// Verify Spouse homemaker-to-part transition & Gakushi Hoken +200万 maturity at child age 18
let gakushiSpouseGame = createMortgageGame({
  ...baseSetup,
  age: 32,
  subIncomeMan: 0,
  contractType: 'single',
  familyPlan: 'child-1-public', // child starts at age 2
  spouseWorkPattern: 'homemaker-to-part',
  hasGakushiHoken: true,
});
while (gakushiSpouseGame.childrenAges[0] < 6 && gakushiSpouseGame.status === 'playing') {
  gakushiSpouseGame = advanceOneYear(gakushiSpouseGame, () => 0.99);
  if (gakushiSpouseGame.pendingDecision) {
    gakushiSpouseGame = resolveMortgageDecision(
      gakushiSpouseGame,
      gakushiSpouseGame.pendingDecision.choices[0].id,
    );
  }
}
assert.equal(
  gakushiSpouseGame.subIncomeMan,
  108,
  `homemaker-to-part spouse should start part-time work (108万) once child enters elementary school at age 6 (got ${gakushiSpouseGame.subIncomeMan}万)`,
);

while (gakushiSpouseGame.childrenAges[0] < 18 && gakushiSpouseGame.status === 'playing') {
  gakushiSpouseGame = advanceOneYear(gakushiSpouseGame, () => 0.99);
  if (gakushiSpouseGame.pendingDecision) {
    gakushiSpouseGame = resolveMortgageDecision(
      gakushiSpouseGame,
      gakushiSpouseGame.pendingDecision.choices[0].id,
    );
  }
}
assert.ok(
  gakushiSpouseGame.chronicle.some((c) => c.title.includes('学資保険・満期保険金受領')),
  'hasGakushiHoken=true must record +200万 Gakushi Hoken maturity payout in chronicle when child reaches age 18',
);

// Verify Property Tax New-Build Reduction Cliff & Revaluation Math
const stdDetachedProp = PROPERTIES['detached-powerbuilder-new']; // standard energyCert, detached -> 3yr reduction
const taxY3 = calcEffectiveAnnualPropertyTaxMan(stdDetachedProp, 3, 2100, 2100);
const taxY4 = calcEffectiveAnnualPropertyTaxMan(stdDetachedProp, 4, 2100, 2100);
assert.equal(taxY3.reductionEndYear, 3, 'New standard detached house should have 3-year property tax reduction');
assert.equal(taxY4.isReductionJustExpired, true, 'New standard detached house reduction must expire at year 4');
assert.ok(
  taxY4.annualTaxMan > taxY3.annualTaxMan,
  `Property tax in year 4 (${taxY4.annualTaxMan}万) must jump higher than year 3 (${taxY3.annualTaxMan}万) when building reduction expires`,
);

// Verify DINKs Unexpected Childbirth at Year 3 adds a newborn (age 0) when chosen
let dinksBirthGame = createMortgageGame({
  ...baseSetup,
  age: 31,
  familyPlan: 'dinks',
  contractType: 'pair',
  spouseWorkPattern: 'fulltime-keep',
});
assert.equal(dinksBirthGame.childrenAges.length, 0, 'DINKs should start with 0 children');
for (let y = 0; y < 3; y++) {
  dinksBirthGame = advanceOneYear(dinksBirthGame, () => 0.99);
}
assert.equal(
  dinksBirthGame.pendingDecision?.id,
  'dinks-unexpected-childbirth',
  'Married DINKs couple <= 41yo should encounter dinks-unexpected-childbirth at year 3',
);
dinksBirthGame = resolveMortgageDecision(dinksBirthGame, 'welcome-first-child-gakushi');
assert.equal(
  dinksBirthGame.childrenAges.length,
  1,
  'Choosing welcome-first-child-gakushi must add 1 newborn child to childrenAges',
);
assert.equal(dinksBirthGame.childrenAges[0], 0, 'Newborn child must start at age 0');
assert.equal(dinksBirthGame.config.hasGakushiHoken, true, 'welcome-first-child-gakushi must enable Gakushi Hoken');

// Verify Periodic Renovations (Year 16 & Year 28) and 5-Year Fire/Earthquake Insurance Renewal
let detachedRenoGame = createMortgageGame({
  ...baseSetup,
  age: 30,
  propertyId: 'detached-custom-new',
  customBuildingType: 'detached',
  insurancePlan: 'full-fire-earthquake-water',
});
let sawYear16DetachedReno = false;
let sawYear28DetachedReno = false;
let saw5YrInsuranceRenewal = false;
while (detachedRenoGame.yearIndex < 29 && detachedRenoGame.status === 'playing') {
  detachedRenoGame = advanceOneYear(detachedRenoGame, () => 0.99);
  if (detachedRenoGame.yearIndex === 5) {
    saw5YrInsuranceRenewal = detachedRenoGame.chronicle.some((c) =>
      c.title.includes('火災保険・地震保険の5年更新'),
    );
  }
  if (detachedRenoGame.pendingDecision) {
    if (detachedRenoGame.pendingDecision.id === 'periodic-renovation-year16') {
      sawYear16DetachedReno = true;
      assert.ok(
        detachedRenoGame.pendingDecision.title.includes('一戸建て16年目'),
        'Detached house Year 16 renovation must be detached-specific',
      );
    }
    if (detachedRenoGame.pendingDecision.id === 'periodic-renovation-year28') {
      sawYear28DetachedReno = true;
      assert.ok(
        detachedRenoGame.pendingDecision.title.includes('一戸建て28年目'),
        'Detached house Year 28 renovation must be detached-specific',
      );
    }
    detachedRenoGame = resolveMortgageDecision(
      detachedRenoGame,
      detachedRenoGame.pendingDecision.choices[0].id,
    );
  }
}
assert.ok(saw5YrInsuranceRenewal, 'Must record 5-year Fire & Earthquake Insurance renewal in chronicle');
assert.ok(sawYear16DetachedReno, 'Must trigger periodic-renovation-year16 at Year 16');
assert.ok(sawYear28DetachedReno, 'Must trigger periodic-renovation-year28 at Year 28');
assert.equal(Object.keys(INSURANCE_PLAN_SPECS).length, 3, 'Should have 3 Fire/Earthquake insurance plans');
assert.equal(Object.keys(CRAM_SCHOOL_SPECS).length, 3, 'Should have 3 Cram School / Yobiko policy plans');
assert.equal(Object.keys(LEISURE_STYLE_SPECS).length, 3, 'Should have 3 Family Travel / Leisure style plans');

// Verify Cram School policy and Cumulative Price Index affect child education costs
const cramMinimalCost14 = calcDetailedChildAnnualEduCostMan(14, {
  ...eduCfgBase,
  juniorHighPath: 'public-jhs',
  cramSchoolPolicy: 'minimal-self-study',
});
const cramStandardCost14 = calcDetailedChildAnnualEduCostMan(14, {
  ...eduCfgBase,
  juniorHighPath: 'public-jhs',
  cramSchoolPolicy: 'standard-cram',
});
const cramIntensiveCost14 = calcDetailedChildAnnualEduCostMan(14, {
  ...eduCfgBase,
  juniorHighPath: 'public-jhs',
  cramSchoolPolicy: 'intensive-cram',
});
assert.ok(
  cramMinimalCost14 < cramStandardCost14 && cramStandardCost14 < cramIntensiveCost14,
  `Cram school policy must strictly order age-14 education costs: minimal (${cramMinimalCost14}万) < standard (${cramStandardCost14}万) < intensive (${cramIntensiveCost14}万)`,
);
const cramInflatedCost14 = calcDetailedChildAnnualEduCostMan(
  14,
  {
    ...eduCfgBase,
    juniorHighPath: 'public-jhs',
    cramSchoolPolicy: 'standard-cram',
  },
  130,
);
assert.ok(
  cramInflatedCost14 > cramStandardCost14,
  `Cumulative inflation (CPI=130) must increase education/cram costs (${cramInflatedCost14}万 > ${cramStandardCost14}万)`,
);

// Verify cumulativePriceIndex and repairCostInflationMult increase under inflation
assert.ok(
  (detachedRenoGame.cumulativePriceIndex ?? 100) > 125,
  `Cumulative price index after 30 years of gradual-hike (${detachedRenoGame.cumulativePriceIndex}) must exceed 125`,
);
assert.ok(
  (detachedRenoGame.repairCostInflationMult ?? 1.0) > 1.35,
  `Repair cost inflation multiplier after 30 years (${detachedRenoGame.repairCostInflationMult}) must exceed 1.35x`,
);

// Verify refreshed /games thumbnail asset exists and is wired
assert.ok(
  fs.existsSync('public/assets/mortgage_cover_v2.svg'),
  'public/assets/mortgage_cover_v2.svg must exist for /games thumbnail',
);

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
const SPOUSE_ONLY_EVENT_IDS = [
  'pair-maternity-1',
  'pair-divorce-crisis-11',
  'spouse-career-change',
  'spouse-work-turning-point',
  'dinks-unexpected-childbirth',
  'second-child-birth-choice',
];
const CHILD_ONLY_EVENT_IDS = [
  'education-crossroad-10',
  'university-scholarship-choice',
  'child-orthodontics-expense',
  'adult-child-marriage-grandchild',
  'child-cram-school-entry',
  'child-highschool-yobiko-entry',
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

  const effCareerEdu = resolveEffectiveHouseholdCareerAndEdu(state.config);
  // Single household (that remained unmarried throughout life) must never get spouse/pair events
  if (effCareerEdu.spouseWorkPattern === 'no-spouse') {
    for (const spId of SPOUSE_ONLY_EVENT_IDS) {
      assert.equal(
        state.triggeredEventIds.includes(spId),
        false,
        `Single household simulation #${i} must NEVER trigger spouse event ${spId}`,
      );
    }
  }
  // Childless household (that remained childless throughout life) must never get child/education events
  if (state.childrenAges.length === 0) {
    for (const chId of CHILD_ONLY_EVENT_IDS) {
      assert.equal(
        state.triggeredEventIds.includes(chId),
        false,
        `Childless household simulation #${i} must NEVER trigger child event ${chId}`,
      );
    }
  }
  // High school job route must never trigger university scholarship event
  if (effCareerEdu.higherEdPath === 'high-school-job') {
    assert.equal(
      state.triggeredEventIds.includes('university-scholarship-choice'),
      false,
      `high-school-job simulation #${i} must NEVER trigger university-scholarship-choice`,
    );
  }
  // Retirement allowance < 400 must never trigger retirement-lump-sum-60
  if (effCareerEdu.retirementAllowanceMan < 400) {
    assert.equal(
      state.triggeredEventIds.includes('retirement-lump-sum-60'),
      false,
      `No/low retirement allowance simulation #${i} must NEVER trigger retirement-lump-sum-60`,
    );
  } else {
    assert.equal(
      state.triggeredEventIds.includes('no-retirement-60-survival'),
      false,
      `Retirement allowance >= 400 simulation #${i} must NEVER trigger no-retirement-60-survival`,
    );
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

// 8. Verify Mix Rate Ratio Selection, Dynamic Family Composition Expenses, Yearly Spouse Work Selector, and Yearly Post-60 Work/Retire Selector
const mix20Bank = resolveEffectiveBank({
  ...baseSetup,
  bankId: 'neo-mix-bank',
  customRateType: 'mix',
  mixFixedRatioPercent: 20,
});
const mix80Bank = resolveEffectiveBank({
  ...baseSetup,
  bankId: 'neo-mix-bank',
  customRateType: 'mix',
  mixFixedRatioPercent: 80,
});
assert.ok(
  mix20Bank.baseRate < mix80Bank.baseRate,
  `20% Fixed / 80% Variable mix initial rate (${mix20Bank.baseRate}%) must be lower than 80% Fixed / 20% Variable (${mix80Bank.baseRate}%)`,
);
const mix20Game = executeMidTermRateHike(
  createMortgageGame({
    ...baseSetup,
    bankId: 'neo-mix-bank',
    customRateType: 'mix',
    mixFixedRatioPercent: 20,
  }),
  1.0,
);
const mix80Game = executeMidTermRateHike(
  createMortgageGame({
    ...baseSetup,
    bankId: 'neo-mix-bank',
    customRateType: 'mix',
    mixFixedRatioPercent: 80,
  }),
  1.0,
);
const mix20Jump = mix20Game.appliedInterestRate - mix20Bank.baseRate;
const mix80Jump = mix80Game.appliedInterestRate - mix80Bank.baseRate;
assert.ok(
  mix20Jump > mix80Jump,
  `20% Fixed / 80% Variable mix must experience a larger rate jump on BOJ hike (${mix20Jump.toFixed(2)}%) than 80% Fixed / 20% Variable (${mix80Jump.toFixed(2)}%)`,
);

// Dynamic family composition living cost test
const singleFamGame = createMortgageGame({
  ...baseSetup,
  contractType: 'single',
  spouseWorkPattern: 'no-spouse',
  subIncomeMan: 0,
  familyPlan: 'dinks',
});
const singleComp = calcDynamicFamilyComposition(singleFamGame);
assert.equal(singleComp.totalHouseholdMembers, 1, 'Single household must have 1 member');
const coupleFamGame = createMortgageGame({
  ...baseSetup,
  contractType: 'pair',
  spouseWorkPattern: 'fulltime-keep',
  subIncomeMan: 350,
  familyPlan: 'dinks',
});
const coupleComp = calcDynamicFamilyComposition(coupleFamGame);
assert.equal(coupleComp.totalHouseholdMembers, 2, 'Couple household must have 2 members');
assert.ok(
  coupleComp.annualBaseLivingCostMan > singleComp.annualBaseLivingCostMan,
  'Couple living cost must exceed single living cost',
);
const teenFamGame = {
  ...coupleFamGame,
  childrenAges: [16, 13],
};
const teenComp = calcDynamicFamilyComposition(teenFamGame);
assert.equal(teenComp.totalHouseholdMembers, 4, 'Couple + 2 teen children must have 4 members');
assert.ok(
  teenComp.annualBaseLivingCostMan > coupleComp.annualBaseLivingCostMan + 70,
  'Teenage children must significantly increase household living expenses',
);
const emptyNestGame = {
  ...coupleFamGame,
  childrenAges: [24, 22],
};
const emptyNestComp = calcDynamicFamilyComposition(emptyNestGame);
assert.equal(
  emptyNestComp.totalHouseholdMembers,
  2,
  'Once children reach independenceAge (22+), cohabiting household members must return to 2',
);
assert.equal(
  emptyNestComp.annualBaseLivingCostMan,
  coupleComp.annualBaseLivingCostMan,
  'Empty-nest household base living cost must drop back to couple level',
);

// Yearly spouse work selector test (homemaker -> fulltime return -> part-time -> homemaker)
let spouseTestGame = createMortgageGame({
  ...baseSetup,
  contractType: 'single',
  spouseWorkPattern: 'homemaker',
  subIncomeMan: 0,
});
assert.equal(spouseTestGame.subIncomeMan, 0, 'Initial homemaker subIncomeMan must be 0');
spouseTestGame = setSpouseWorkStyleThisYear(spouseTestGame, 'fulltime');
assert.ok(spouseTestGame.subIncomeMan >= 240, 'Returning to fulltime work must set spouse income >= 240万');
spouseTestGame = setSpouseWorkStyleThisYear(spouseTestGame, 'part-time');
assert.equal(spouseTestGame.subIncomeMan, 115, 'Switching to part-time work must set spouse income to 115万');
spouseTestGame = setSpouseWorkStyleThisYear(spouseTestGame, 'homemaker');
assert.equal(spouseTestGame.subIncomeMan, 0, 'Choosing not to work this year must set spouse income to 0');

// Yearly post-60 work style & "when to retire" selector test
let seniorWorkGame = {
  ...createMortgageGame(baseSetup),
  age: 61,
};
seniorWorkGame = setPostRetirementWorkThisYear(seniorWorkGame, 'reemploy-light-job');
assert.equal(seniorWorkGame.mainIncomeMan, 250, 'Choosing light job at 61 must set main income to 250万');
seniorWorkGame = setPostRetirementWorkThisYear(seniorWorkGame, 'part-time-arubaito');
assert.equal(seniorWorkGame.mainIncomeMan, 140, 'Choosing arubaito at 61 must set main income to 140万');
seniorWorkGame = setPostRetirementWorkThisYear(seniorWorkGame, 'retire-now');
assert.equal(seniorWorkGame.mainIncomeMan, 0, 'Choosing to stop working and retire at 61 must set main income to 0');

// 8.7 Verify Viral X Share Text Generation & Challenge URL Round-Trip
const shareCfg: MortgageSetupConfig = {
  ...baseSetup,
  age: 34,
  mainIncomeMan: 680,
  subIncomeMan: 320,
  initialSavingsMan: 1200,
  downPaymentMan: 400,
  customPropertyPriceMan: 6480,
  bankId: 'neo-mix-bank',
  customRateType: 'mix',
  mixFixedRatioPercent: 70,
  termYears: 40,
};
const challengeUrl = buildShareChallengeUrl(shareCfg);
assert.ok(
  challengeUrl.startsWith('https://zatsudan-gacha.app/mortgage-life?'),
  'Challenge URL must start with https://zatsudan-gacha.app/mortgage-life?'
);
const queryPart = challengeUrl.split('?')[1] ?? '';
const restoredCfg = parseShareChallengeParams(`?${queryPart}`, baseSetup);
assert.ok(restoredCfg, 'parseShareChallengeParams must restore valid challenge query parameters');
assert.equal(restoredCfg.age, 34, 'Restored config age must match');
assert.equal(restoredCfg.customPropertyPriceMan, 6480, 'Restored config property price must match');
assert.equal(restoredCfg.termYears, 40, 'Restored config termYears must match');
assert.equal(restoredCfg.mixFixedRatioPercent, 70, 'Restored config mixFixedRatioPercent must match');

const certShare = generateCertShareText(shareCfg);
assert.ok(certShare.text.includes('6,480万円'), 'Certificate share text must include property price');
assert.ok(certShare.intentUrl.includes('twitter.com/intent/tweet'), 'Certificate share must produce valid X intent URL');

const livePlayShare = generateViralXShareText(createMortgageGame(shareCfg), 'standard');
assert.ok(livePlayShare.text.includes('実況'), 'Playing state share text must include live commentary header');

const finishedGameForShare = {
  ...createMortgageGame(shareCfg),
  status: 'cleared' as const,
  age: 74,
  yearIndex: 40,
  liquidSavingsMan: 3250,
  propertyValueMan: 4120,
  remainingBalanceMan: 0,
  totalPrincipalPaidMan: 6220,
  totalInterestPaidMan: 2480,
  totalRunningCostPaidMan: 2190,
  totalTaxCreditReceivedMan: 360,
};
finishedGameForShare.ending = evaluateEnding(finishedGameForShare, 'paid-off').ending;

const stdShare = generateViralXShareText(finishedGameForShare, 'standard');
const shockShare = generateViralXShareText(finishedGameForShare, 'shock');
const dramaShare = generateViralXShareText(finishedGameForShare, 'drama');

assert.ok(stdShare.text.includes('最終判定：'), 'Standard share text must include final verdict');
assert.ok(shockShare.text.includes('住居に払った生涯総額：'), 'Shock share text must highlight total housing outflow vs property price');
assert.ok(dramaShare.text.includes('家族の軌跡：'), 'Drama share text must include family trajectory');

// 9. Verify Zero Emojis, Zero Personal Surnames, Zero Copycat Title, and Zero Truncation in Mortgage files
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
