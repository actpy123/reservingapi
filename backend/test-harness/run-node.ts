/**
 * Offline harness: runs the Node reserving engine exactly as reserveCalculator() does,
 * but without Express/Mongo. Reads the assumptions zip + a policy CSV, writes JSON results.
 *
 * Usage:
 *   npx ts-node -T -r tsconfig-paths/register test-harness/run-node.ts <assumptions.zip> <policies.csv> <scenarioCode> <out.json>
 */
import fs from 'fs';
import * as Papa from 'papaparse';
import { parse } from 'path';
import { unzip } from '@utils/app.utils';
import { findProductByScenario, loadRates, normalizeProductPercents } from '@libs/reserve.libs';
import { toNumber } from '@utils/number.utils';
import { computePolicy } from '../src/workers/reserve-calculator.worker';

async function main() {
  const [zipPath, policyCsv, scenarioCode, outPath] = process.argv.slice(2);
  const realLog = console.log;
  console.log = () => {}; // engine is very chatty

  // --- same as uploadAssumptions()
  const assumptions: any[] = [];
  for (const file of unzip(fs.readFileSync(zipPath))) {
    if (file.fileName.includes('.csv')) {
      const result = Papa.parse(file.content.toString('utf8'), { header: true, skipEmptyLines: true });
      assumptions.push({ name: parse(file.fileName).name, data: result.data });
    }
  }

  // --- same as createControlSheet()
  const fileData = Papa.parse(fs.readFileSync(policyCsv, 'utf8'), { header: true, skipEmptyLines: true }).data as any[];

  // --- same as reserveCalculator()
  let product = findProductByScenario(assumptions, scenarioCode);
  product = normalizeProductPercents(product);
  const common = {
    product,
    mortalityRates: loadRates(assumptions, product['Mortality Table Number']),
    mortalityBERates: loadRates(assumptions, product['Mortality Loading BE Table Number']),
    morbidityRates: loadRates(assumptions, product['Morbidity Table Number']),
    lapseRates: loadRates(assumptions, product['Lapse Table Number']),
    interestRates: loadRates(assumptions, product['Interest Rate Table']),
    inflationRates: loadRates(assumptions, product['Expense Inflation Table']),
    gsvRates: loadRates(assumptions, product['GSV Table']),
    ssvRates: loadRates(assumptions, product['SSV Table']),
    maturityBenefitRates: loadRates(assumptions, product['Maturity Benefit Table']) as any,
    incomeSurvivalBenefitRates: loadRates(assumptions, product['Income_Survival Benefit Table']) as any,
  };
  product['MAD FLAG'] = product['MAD FLAG'] === undefined || product['MAD FLAG'] === '' ? 1 : toNumber(product['MAD FLAG']);

  const results: any[] = [];
  for (const policyData of fileData) {
    const policy = policyData['Policy/CoI Number'];
    try {
      // structuredClone mimics the Piscina worker boundary (inputs are copied, not shared)
      const r = await computePolicy(structuredClone({ policyData, ...common }));
      results.push({ policy, status: 'ok', output: r.output, reserves: r.reserves });
    } catch (e: any) {
      results.push({ policy, status: 'skipped', error: String(e?.message ?? e) });
    }
  }
  fs.writeFileSync(outPath, JSON.stringify(results));
  realLog(`${scenarioCode}: ${results.filter((r) => r.status === 'ok').length} ok, ${results.filter((r) => r.status !== 'ok').length} skipped`);
}

main();
