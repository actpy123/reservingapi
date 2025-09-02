import cache from '@libs/cache';
import { AssumptionModel } from '@models/assumption.model';
import { unzip } from '@utils/app.utils';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import * as Papa from 'papaparse';
import { parse } from 'path';
import { Scenario } from '@CustomTypes/app.type';
import { complieInputs, createPolicySummaryArray, findProductByScenario, loadRates, normalizeProductPercents } from '@libs/reserve.libs';
import { calcReserve } from '@libs/calc_reserve.lib';
import { percentToDecimal, toNumber } from '@utils/number.utils';
import { generateLoanSchedule } from '@utils/loan.utils';
import { calcReservePerPolicy, calculateValue } from '@libs/survival-calc.lib';

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
    cache.set('assumptions', assumptions);
    const saved = await AssumptionModel.insertMany(assumptions);

    res.sendCustomResponse(200, {
      message: 'Files uploaded and stored in memory.',
      data: {
        files: assumptions,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to unzip file');
  }
}

export async function reserveCalculator(req: Request, res: Response) {
  const scenarios: Scenario[] = req.body;
  const assumptions: any = await cache.get('assumptions');
  const policySummaries = createPolicySummaryArray(1201);
  let skippedPolicies = 0;
  let successfulPolicies = 0;
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
    let reserves = [];
    let result = [];

    for (const [index, policyData] of scenarios[0].data.entries()) {
      try {
        // if (index === 0) {
        const cleanPolicyData = complieInputs(policyData, product);
        console.log(cleanPolicyData);
        const loadSchedule = generateLoanSchedule(
          {
            policyTermMonths: cleanPolicyData.ptMonths,
            sumAssured: cleanPolicyData.sumAssured,
            moratoriumPeriod: cleanPolicyData.moratoriumPeriod,
            loanInterestRate: cleanPolicyData.loanInterestRate,
          },
          false // set true if you want JSON strings
        );
        cleanPolicyData.incomeSurvivalFactor = percentToDecimal(incomeSurvivalBenefitRates[cleanPolicyData.phEntryAge][(cleanPolicyData.ptMonths / 12).toString()]) ?? 0;
        cleanPolicyData.maturityBenefitFactor = percentToDecimal(maturityBenefitRates[cleanPolicyData.phEntryAge][(cleanPolicyData.ptMonths / 12).toString()]) ?? 0;
        reserves = await calcReserve(
          cleanPolicyData,
          product,
          mortalityRates,
          mortalityBERates,
          morbidityRates,
          lapseRates,
          inflationRates,
          interestRates,
          loadSchedule,
          gsvRates,
          ssvRates
        );

        for (let i = reserves.length - 1; i >= 0; i--) {
          const netCashflow = reserves[i + 1]?.netCashflow ?? 0;
          const reserveVal = reserves[i + 1]?.reserves ?? 0;
          const intialYieldRate = reserves[i + 1]?.intialYieldRate ?? 0;
          reserves[i].reserves = (reserveVal - netCashflow) / (1 + intialYieldRate);
          reserves[i].solvencyMargin = calculateValue(i, reserves, cleanPolicyData);
          reserves[i].reservePerPolicy = calcReservePerPolicy(reserves[i], cleanPolicyData);
        }
        // }

        result.push(reserves);
      } catch (error) {
        console.log(error);

        skippedPolicies = skippedPolicies + 1;
      }
    }

    // You could process files here or send them back
    res.sendCustomResponse(200, {
      data: result,
    });
  } catch (error: any) {
    console.log(error);

    res.sendCustomResponse(400, {
      message: error.message,
    });
  }
}
