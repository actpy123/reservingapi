import { calcReserve } from '@libs/calc_reserve.lib';
import { complieInputs } from '@libs/reserve.libs';
import { calculateValue, calcReservePerPolicy, calculateFinalReserve } from '@libs/survival-calc.lib';
import { generateLoanSchedule } from '@utils/loan.utils';
import { percentToDecimal } from '@utils/number.utils';
import dayjs from 'dayjs';

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
    'UPR Per Policy': reserves[policyMonths].uprPerPolicy,
    'Outstanding Term(Months)': getOutstandingTermMonths(d1, d2),
    'Final Reserve': reserves[policyMonths].finalReserve,
    'SV Deficiency Reserve': reserves[policyMonths].svDeficiencyReserve,
    UIN: cleanPolicyData.uIN,
    'Policy Term_Month': cleanPolicyData.ptMonths,
    Premium: cleanPolicyData.premium,
    'Sum Assured': cleanPolicyData.sumAssured,
    Status: cleanPolicyData.policyStatus,
  };

  return output;
}
