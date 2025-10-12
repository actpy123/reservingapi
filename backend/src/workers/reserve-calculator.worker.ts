import { calcReserve } from '@libs/calc_reserve.lib';
import { complieInputs } from '@libs/reserve.libs';
import { calculateValue, calcReservePerPolicy, calculateFinalReserve } from '@libs/survival-calc.lib';
import { generateLoanSchedule } from '@utils/loan.utils';
import { percentToDecimal } from '@utils/number.utils';
import dayjs from 'dayjs';
import fs from 'fs';
import * as Papa from 'papaparse';

export interface WorkerInput {
  policyData: any;
  product: any;
  incomeSurvivalBenefitRates: Record<string, any>;
  maturityBenefitRates: Record<string, any>;
  mortalityRates: any;
  mortalityBERates: any;
  morbidityRates: any;
  lapseRates: any;
  inflationRates: any;
  interestRates: any;
  gsvRates: any;
  ssvRates: any;
}

export default async function (input: WorkerInput) {
  const {
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
  } = input;

  const cleanPolicyData = complieInputs(policyData, product);

  const loadSchedule = generateLoanSchedule(
    {
      policyTermMonths: cleanPolicyData.ptMonths,
      sumAssured: cleanPolicyData.sumAssured,
      moratoriumPeriod: cleanPolicyData.moratoriumPeriod,
      loanInterestRate: cleanPolicyData.loanInterestRate,
    },
    false
  );

  cleanPolicyData.incomeSurvivalFactor = percentToDecimal(incomeSurvivalBenefitRates[cleanPolicyData.phEntryAge]?.[(cleanPolicyData.ptMonths / 12).toString()]) ?? 0;
  cleanPolicyData.maturityBenefitFactor = percentToDecimal(maturityBenefitRates[cleanPolicyData.phEntryAge]?.[(cleanPolicyData.ptMonths / 12).toString()]) ?? 0;

  let reserves = await calcReserve(
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
    const nextReserve = reserves[i + 1] ?? {};
    const netCashflow = nextReserve?.netCashflow ?? 0;
    const reserveVal = nextReserve?.reserves ?? 0;
    const intialYieldRate = nextReserve?.intialYieldRate ?? 0;

    const currentReserve = reserves[i];
    currentReserve.reserves = (reserveVal - netCashflow) / (1 + intialYieldRate);
    currentReserve.solvencyMargin = calculateValue(i, reserves, cleanPolicyData);
    currentReserve.reservePerPolicy = calcReservePerPolicy(currentReserve, cleanPolicyData);
    currentReserve.finalReserve = calculateFinalReserve(cleanPolicyData, currentReserve);
    currentReserve.svDeficiencyReserve = currentReserve.duration <= cleanPolicyData.ptMonths ? Math.max(currentReserve.surrenderBenefit - currentReserve.finalReserve, 0) : 0;

    reserves[i] = currentReserve;
  }

  function parseEffectiveDate(dateStr: string): Date {
    const formats = ['DD-MMM-YYYY', 'DD-MMM-YY', 'DD-MM-YYYY', 'DD/MM/YYYY'];

    for (const fmt of formats) {
      const parsed = dayjs(dateStr, fmt, true); // strict parsing
      if (parsed.isValid()) {
        return parsed.toDate();
      }
    }

    throw new Error(`Date format not recognized: ${dateStr}`);
  }

  function getOutstandingTermMonths(d1: Date, d2: Date): number {
    const start = dayjs(d1);
    const end = dayjs(d2);

    let years = end.year() - start.year();
    let months = end.month() - start.month();

    // Adjust if the day of end < day of start (like relativedelta does)
    if (end.date() < start.date()) {
      months -= 1;
      if (months < 0) {
        years -= 1;
        months += 12;
      }
    }

    return years * 12 + months;
  }
  function getPolicyMonths(d1: Date, d3: Date): number {
    return (d1.getFullYear() - d3.getFullYear()) * 12 + (d1.getMonth() - d3.getMonth());
  }

  const d1 = parseEffectiveDate(product['Valuation Date']);
  const d2 = parseEffectiveDate(cleanPolicyData['maturityDate']);
  const d3 = parseEffectiveDate(cleanPolicyData['policyEffectiveDate']);
  const policyMonths = getPolicyMonths(d1, d3);

  const output = {
    'Policy No': cleanPolicyData.policyCoiNumber,
    'Reserves Per Policy': reserves[policyMonths].reservePerPolicy,
    'UPR Per Policy': reserves[policyMonths].upr,
    'Outstanding Term(Months)': getOutstandingTermMonths(d1, d2),
    'Final Reserve': reserves[policyMonths].finalReserve,
    'SV Deficiency Reserve': reserves[policyMonths].svDeficiencyReserve,
    UIN: cleanPolicyData.uIN,
    'Policy Term_Month': cleanPolicyData.ptMonths,
    Premium: cleanPolicyData.premium,
    'Sum Assured': cleanPolicyData.sumAssured,
    Status: cleanPolicyData.policyStatus,
  };

  const cashFlows = [];

  // const csv = Papa.unparse(reserves);
  // fs.writeFileSync('output222.csv', csv);

  for (let x = 1; x <= cleanPolicyData.ptMonths; x++) {
    const reserveIndex = x - 1;
    const reserveRow = reserves[reserveIndex];
    const cashFlow = {
      Period: reserveIndex,
      premium: (reserves[policyMonths + 0 + reserveIndex]?.premium ?? 0) / (reserves[policyMonths]?.livesAtStart ?? 0),
      'Investment Income': (reserves[policyMonths + 0 + reserveIndex]?.investmentIncome ?? 0) / (reserves[policyMonths]?.livesAtStart ?? 0),
      'FY/Ren. Commission': (reserves[policyMonths + 0 + reserveIndex]?.FYCommission ?? 0) / (reserves[policyMonths]?.livesAtStart ?? 0),
      'Initial Expense (Fixed and Variable)': (reserves[policyMonths + 0 + reserveIndex]?.initialExpense ?? 0) / (reserves[policyMonths]?.livesAtStart ?? 0),
      'Renewal Variable Exp': (reserves[policyMonths + 0 + reserveIndex]?.renewalVariableExp ?? 0) / (reserves[policyMonths]?.livesAtStart ?? 0),
      'Renewal Fixed Exp': (reserves[policyMonths + 0 + reserveIndex]?.renewalFixedExp ?? 0) / (reserves[policyMonths]?.livesAtStart ?? 0),
      'Death Outgo': (reserves[policyMonths + 0 + reserveIndex]?.deathOutGo ?? 0) / (reserves[policyMonths]?.livesAtStart ?? 0),
      'Morbidity Outgo': (reserves[policyMonths + 0 + reserveIndex]?.morbidityOutGo ?? 0) / (reserves[policyMonths]?.livesAtStart ?? 0),
      'Surrender Outgo': (reserves[policyMonths + 0 + reserveIndex]?.surrenderOutgo ?? 0) / (reserves[policyMonths]?.livesAtStart ?? 0),
      'Survival Outgo': (reserves[policyMonths + 0 + reserveIndex]?.survivalOutgo ?? 0) / (reserves[policyMonths]?.livesAtStart ?? 0),
      'Maturity Outgo': (reserves[policyMonths + 0 + reserveIndex]?.maturityOutgo ?? 0) / (reserves[policyMonths]?.livesAtStart ?? 0),
      'Net Cashflow': (reserves[policyMonths + 0 + reserveIndex]?.netCashflow ?? 0) / (reserves[policyMonths]?.livesAtStart ?? 0),
      'Final Reserve': reserves[policyMonths + 0 + reserveIndex]?.finalReserve ?? 0,
      'Solvency Margin': reserves[policyMonths + 0 + reserveIndex]?.solvencyMargin ?? 0,
      UPR: reserves[policyMonths + 0 + reserveIndex]?.upr ?? 0,
    };
    cashFlows.push(cashFlow);
  }

  return { output, cashFlows };
}
