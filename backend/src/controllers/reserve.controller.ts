import cache from '@libs/cache';
import { AssumptionModel } from '@models/assumption.model';
import { unzip } from '@utils/app.utils';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import * as Papa from 'papaparse';
import { parse } from 'path';
import { Scenario } from '@CustomTypes/app.type';
import { findProductByScenario, loadRates, normalizeProductPercents } from '@libs/reserve.libs';
import { toNumber } from '@utils/number.utils';

import { resolve } from 'path';
import Piscina from 'piscina';
import { ReserveResultModel } from '@models/reserve-result.model';

console.log(resolve(process.cwd(), 'src/workers/reserve-calculator.worker.js'));

export async function getCurrentAssumptions(req: Request, res: Response) {
  // You could process files here or send them back
  res.sendCustomResponse(200, {
    message: 'Files uploaded and stored in memory.',
    data: {
      files: await cache.get('assumptions'),
    },
  });
}

export async function uploadAssumptions(req: Request, res: Response) {
  const assumptionFileZip = req.file as Express.Multer.File; // 👈 Type assertion here

  if (!assumptionFileZip) {
    return res.status(400).send('No file uploaded');
  }
  try {
    const extractedFiles = unzip(assumptionFileZip.buffer);
    await AssumptionModel.updateMany({ valid: true }, { $set: { valid: false } });
    cache.clear();
    const assumptionId = randomUUID();

    const assumptions = [];

    for (const file of extractedFiles) {
      if (file.fileName.includes('.csv')) {
        const assumptionName = parse(file.fileName).name;

        const csvString = file.content.toString('utf8');
        const result = Papa.parse(csvString, {
          header: true, // First row as header
          skipEmptyLines: true,
        });
        assumptions.push({ name: assumptionName, data: result.data, assumptionId });
      }
    }
    cache.set('assumptionId', assumptionId);
    cache.set('assumptions', assumptions);
    const saved = await AssumptionModel.insertMany(assumptions);

    res.sendCustomResponse(200, {
      message: 'Files uploaded and stored in memory.',
      data: {
        assumptionId,
        files: assumptions,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to unzip file');
  }
}

const piscina = new Piscina({
  filename: resolve(process.cwd(), 'src/workers/reserve-calculator.worker.ts'), // adjust path
  maxThreads: 8,
});

export async function reserveCalculator(req: Request, res: Response) {
  const scenarios: Scenario[] = req.body;
  const assumptions: any = await cache.get('assumptions');
  const assumptionId: any = await cache.get('assumptionId');
  // const policySummaries = createPolicySummaryArray(1201);
  let skippedPolicies = 0;
  let successfulPolicies = 0;
  let reserveResultId;
  try {
    let product = findProductByScenario(assumptions, scenarios[0].scenarioCode);
    product = normalizeProductPercents(product);
    const mortalityRates = loadRates(assumptions, product['Mortality Table Number']);
    const mortalityBERates = loadRates(assumptions, product['Mortality Loading BE Table Number']);
    const morbidityRates = loadRates(assumptions, product['Morbidity Table Number']);
    const lapseRates = loadRates(assumptions, product['Lapse Table Number']);
    const interestRates = loadRates(assumptions, product['Interest Rate Table']);
    const inflationRates = loadRates(assumptions, product['Expense Inflation Table']);
    const gsvRates = loadRates(assumptions, product['GSV Table']);
    const ssvRates = loadRates(assumptions, product['SSV Table']);
    const maturityBenefitRates = loadRates(assumptions, product['Maturity Benefit Table']);
    const incomeSurvivalBenefitRates = loadRates(assumptions, product['Income_Survival Benefit Table']);
    product['MAD FLAG'] = toNumber(product['MAD FLAG']);

    const promises = scenarios[0].data.map((policyData: any) =>
      piscina.run({
        policyData,
        product,
        incomeSurvivalBenefitRates,
        maturityBenefitRates,
        mortalityRates,
        mortalityBERates,
        morbidityRates,
        lapseRates,
        inflationRates,
        interestRates,
        gsvRates,
        ssvRates,
      })
    );

    const results = await Promise.allSettled(promises);

    const finalReserves = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    skippedPolicies += rejected.length;
    successfulPolicies += finalReserves.length;

    const reserveResult = new ReserveResultModel({
      scenarioCode: scenarios[0].scenarioCode,
      assumptionId,
      output: finalReserves,
    });

    await reserveResult.save();
    reserveResultId = reserveResult._id;
  } catch (error: any) {
    skippedPolicies += 1;
  }

  res.sendCustomResponse(200, {
    data: {
      skippedPolicies,
      successfulPolicies,
      outputFile: `http://localhost:3000/reserve/download/output/${reserveResultId}`,
    },
  });
}
