/**
 * Unified E2E Test Suite Runner
 * Executes all 5 tiers of E2E tests across R1, R2, R3, and R4.
 * Asserts minimum threshold criteria (T = 346 tests) and exits with code 0 on success or non-zero on failure.
 *
 * Usage:
 *   npx tsx tests/e2e/run_all.ts
 */

import { spawn } from 'node:child_process';
import path from 'node:path';

interface SuiteResult {
  tier: string;
  name: string;
  file: string;
  required: number;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  success: boolean;
}

const SUITES: { tier: string; name: string; file: string; required: number }[] = [
  {
    tier: 'Tier 1',
    name: 'Feature Coverage (R1-R4)',
    file: 'tests/e2e/tier1_feature_coverage.test.ts',
    required: 120,
  },
  {
    tier: 'Tier 2',
    name: 'Boundary & Corner Cases (R1-R4)',
    file: 'tests/e2e/tier2_boundary_corner.test.ts',
    required: 120,
  },
  {
    tier: 'Tier 3',
    name: 'Cross-Feature Combinations',
    file: 'tests/e2e/tier3_cross_feature.test.ts',
    required: 20,
  },
  {
    tier: 'Tier 4',
    name: 'Real-World Application Scenarios',
    file: 'tests/e2e/tier4_real_world_scenarios.test.ts',
    required: 16,
  },
  {
    tier: 'Tier 5',
    name: 'Defense & Juice Adversarial',
    file: 'tests/e2e/tier5_adversarial_defense.test.ts',
    required: 40,
  },
  {
    tier: 'Tier 5',
    name: 'Survivor & Spiral Adversarial',
    file: 'tests/e2e/tier5_adversarial_survivor_spiral.test.ts',
    required: 30,
  },
];

const TOTAL_MINIMUM_THRESHOLD = 346; // 276 (Tiers 1-4) + 70 (Tier 5) = 346

function runSuite(file: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', '--test', file], {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '1' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
    });
  });
}

function parseTestCounts(output: string): { total: number; passed: number; failed: number } {
  // Strip ANSI color codes
  const clean = output.replace(/\x1b\[[0-9;]*m/g, '');

  const totalMatch = clean.match(/(?:ℹ|#)\s+tests\s+(\d+)/);
  const passMatch = clean.match(/(?:ℹ|#)\s+pass\s+(\d+)/);
  const failMatch = clean.match(/(?:ℹ|#)\s+fail\s+(\d+)/);

  const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : 0;

  return { total, passed, failed };
}

async function main(): Promise<void> {
  console.log('================================================================');
  console.log('🚀 Executing Complete E2E Test Suite (Tiers 1 - 5 for R1 - R4)  ');
  console.log('================================================================\n');

  const startTime = Date.now();
  const results: SuiteResult[] = [];
  let overallSuccess = true;

  for (const suite of SUITES) {
    process.stdout.write(`⏳ Running ${suite.tier}: ${suite.name}... `);
    const suiteStartTime = Date.now();
    const { stdout, stderr, exitCode } = await runSuite(suite.file);
    const durationMs = Date.now() - suiteStartTime;

    const counts = parseTestCounts(stdout + '\n' + stderr);
    const isSuccess = exitCode === 0 && counts.failed === 0 && counts.passed >= suite.required;

    if (!isSuccess) {
      overallSuccess = false;
      console.log('❌ FAILED');
      if (stderr) console.error(stderr);
      if (stdout && counts.failed > 0) console.error(stdout);
    } else {
      console.log(`✅ PASSED (${counts.passed}/${counts.total} tests in ${(durationMs / 1000).toFixed(2)}s)`);
    }

    results.push({
      tier: suite.tier,
      name: suite.name,
      file: suite.file,
      required: suite.required,
      total: counts.total,
      passed: counts.passed,
      failed: counts.failed,
      durationMs,
      success: isSuccess,
    });
  }

  const totalDurationMs = Date.now() - startTime;
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalExecuted = results.reduce((sum, r) => sum + r.total, 0);

  console.log('\n================================================================');
  console.log('📊 E2E Test Suite Execution Summary');
  console.log('================================================================');
  console.log('| Tier   | Description                     | Req | Exec | Pass | Fail | Result |');
  console.log('|--------|---------------------------------|-----|------|------|------|--------|');
  for (const r of results) {
    const pad = (s: any, len: number) => String(s).padEnd(len);
    const status = r.success ? 'PASS ✅' : 'FAIL ❌';
    console.log(`| ${pad(r.tier, 6)} | ${pad(r.name, 31)} | ${pad(r.required, 3)} | ${pad(r.total, 4)} | ${pad(r.passed, 4)} | ${pad(r.failed, 4)} | ${status} |`);
  }
  console.log('================================================================');
  console.log(`Total Tests Executed: ${totalExecuted}`);
  console.log(`Total Tests Passed:   ${totalPassed}`);
  console.log(`Total Tests Failed:   ${totalFailed}`);
  console.log(`Minimum Threshold:    ${TOTAL_MINIMUM_THRESHOLD}`);
  console.log(`Total Wall Time:      ${(totalDurationMs / 1000).toFixed(2)}s`);
  console.log('================================================================');

  if (totalExecuted < TOTAL_MINIMUM_THRESHOLD) {
    console.error(`\n❌ Threshold violation: Executed ${totalExecuted} tests, expected at least ${TOTAL_MINIMUM_THRESHOLD}.`);
    process.exit(1);
  }

  if (!overallSuccess || totalFailed > 0) {
    console.error(`\n❌ Test suite failed with ${totalFailed} failure(s).`);
    process.exit(1);
  }

  console.log(`\n🎉 All tests passed successfully! Minimum threshold satisfied (${totalExecuted} >= ${TOTAL_MINIMUM_THRESHOLD}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error running test runner:', err);
  process.exit(1);
});
