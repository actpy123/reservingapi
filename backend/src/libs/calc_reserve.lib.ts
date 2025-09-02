import { percentToDecimal, toNumber } from '@utils/number.utils';
import { calcSurvivalMultiplier, calculateIncomeSurvivalBenefit, calculateMaturityBenefit, calculateUPR } from './survival-calc.lib';

export async function calcReserve(
  inputs: any,
  product: any,
  mortalityRates: any,
  mortalityBERates: any,
  morbidityRates: any,
  lapseRates: any,
  inflationRates: any[],
  interestRates: any[],
  loadSchedule: any[],
  gsvRates: any[],
  ssvRates: any[]
) {
  const decrements = [];
  const reserves = [];
  const finacialFactors = [];

  for (let x = 1; x < inputs['ptMonths'] + 2; x++) {
    try {
      const reserve: any = {};
      const month = ((x - 1) % 12) + 1;
      const year = Math.floor((x - 1) / 12) + 1;
      const age = Math.floor((x - 1) / 12) + 1;

      reserve.duration = x;
      reserve.month = month;
      reserve.year = year;
      reserve.age = age;
      reserve.livesAtStart = calLivesStart(reserve, reserves, x);
      reserve.premiumFrequency = calcPremiumFrequency(reserve, inputs);
      reserve.premium = inputs.premium * reserve.livesAtStart * reserve.premiumFrequency;

      reserve.cumulativePremium = calcCumulatedPremium([...reserves, reserve]);

      reserve.mortalityRate = calculateMortalityRate(reserve.age, inputs.phGender, inputs.mortalityMad, product['ApplyMortality'], mortalityRates, mortalityBERates);
      reserve.morbidityRate = calculateMorbidityRate(reserve.age, inputs.phGender, inputs.morbAssumpVal, product['ApplyMorbidity'], morbidityRates);
      reserve.lapseRate = calculateLapse(reserve.month, reserve.year, inputs.phGender, inputs.lapseAssumpVal, lapseRates, product['ApplyLapse']);

      reserve.mortalityYear = reserve.mortalityRate * reserve.livesAtStart * (1 - 0.5 * reserve.morbidityRate);
      reserve.morbidityYear = reserve.morbidityRate * reserve.livesAtStart * (1 - 0.5 * reserve.mortalityRate);
      reserve.lapseYear = reserve.lapseRate * (reserve.livesAtStart - reserve.mortalityYear - reserve.morbidityYear);
      reserve.livesAtEnd = reserve.livesAtStart - reserve.mortalityYear - reserve.morbidityYear - reserve.lapseYear;
      reserve.inflationFactor = calcInflationFactor(reserve, reserves, x, inflationRates);
      reserve.intialYieldRate = calcInitialYieldRate(reserve, interestRates);

      reserve.FYCommission = reserve.premium * (reserve.year === 1 ? percentToDecimal(inputs.firstYearCommissionFyc) ?? 0 : percentToDecimal(inputs.renewalCommissionRc) ?? 0);
      reserve.initialExpense =
        x >= (inputs.ptMonths ?? 0) + 1 ? 0 : reserve.premium * (reserve.year === 1 ? inputs.varExpInitialBE ?? 0 : 0) + (x === 1 ? inputs.fixedInitialExpBE ?? 0 : 0);

      reserve.renewalVariableExp = x >= (inputs.ptMonths ?? 0) + 1 ? 0 : reserve.year !== 1 ? (product.renewalPremExp ?? 0) * reserve.premium : 0;
      reserve.renewalFixedExp = x <= inputs.ptMonths ? (x === 1 ? 0 : (inputs.fixedRenewalExpVal ?? 0) / 12) * (reserve.inflationFactor ?? 0) * (reserve.livesAtStart ?? 0) : 0;
      reserve.claimExpense =
        x <= inputs.ptMonths
          ? inputs.claimExpenseFixedVal *
            reserve.inflationFactor *
            (reserve.mortalityYear * (inputs.hasDeathBenefit === '0' ? 0 : 1) + reserve.morbidityYear * (inputs.hasMorbidityBenefit === '0' ? 0 : 1))
          : 0;

      reserve.deathBenefit = calculateDeathBenefit(
        inputs.hasDeathBenefit,
        inputs.sumAssured,
        loadSchedule[x - 1].openingBalance,
        parseFloat(inputs.percentageofpremspaidDeath),
        reserve.cumulativePremium,
        inputs.multipleofanualisedpremiumDeath,
        inputs.anualisedPremium
      );

      reserve.deathOutGo = x <= inputs.ptMonths ? reserve.mortalityYear * reserve.deathBenefit : 0;
      reserve.morbidityBenefit = calculateMorbidityBenefit(inputs, reserve.cumulativePremium, reserve.annualisedPremium);
      reserve.morbidityOutGo = reserve.morbidityBenefit * reserve.mortalityYear;

      reserve.gsvFactor = inputs.hasSurrenderBenefit === '2' ? percentToDecimal(gsvRates[reserve.year - 1][Math.ceil(inputs.ptMonths / 12) - 1 + 2]) : 0;
      reserve.guaranteedSurrenderValue = reserve.cumulativePremium * reserve.gsvFactor;
      reserve.ssvFactor = inputs.hasSurrenderBenefit === '2' ? percentToDecimal(ssvRates[reserve.year - 1][Math.ceil(inputs.ptMonths / 12) - 1 + 2]) : 0;
      reserve.specialSurrenderValue = inputs.sumAssured * reserve.ssvFactor * Math.min(1, x / inputs.ptMonths);
      reserve.surrenderBenefit = calculateSurrenderBenefit(inputs, reserve);
      reserve.surrenderOutgo = reserve.lapseYear * reserve.surrenderBenefit;
      reserve.survivalMultiplier = calcSurvivalMultiplier(reserve, inputs);
      reserve.survivalBenefitFactor = calculateIncomeSurvivalBenefit(reserve.duration, inputs);
      reserve.survivalBenefit =
        (inputs.hasSurvivalBenefit === '0' ? 0 : inputs.hasSurvivalBenefit === '1' ? inputs.sumAssured : inputs.premium) *
        reserve.survivalBenefitFactor *
        reserve.survivalMultiplier;

      reserve.survivalOutgo = reserve.livesAtStart * reserve.survivalBenefit;
      reserve.maturityBenefitFactor = x === inputs.ptMonths + 1 ? inputs.maturityBenefitFactor : 0;
      reserve.maturityBenefit = calculateMaturityBenefit(inputs, reserve);
      reserve.maturityOutgo = reserve.livesAtStart * reserve.maturityBenefit;
      reserve.investmentIncome = (reserve.premium - reserve.FYCommission - reserve.initialExpense - reserve.renewalVariableExp - reserve.renewalFixedExp) * reserve.intialYieldRate;
      const r = structuredClone(reserve);
      reserve.netCashflow =
        r.duration <= inputs.ptMonths + 1
          ? r.premium +
            r.investmentIncome -
            r.FYCommission -
            r.initialExpense -
            r.renewalVariableExp -
            r.renewalFixedExp -
            r.claimExpense -
            r.deathOutGo -
            r.morbidityOutGo -
            r.surrenderOutgo -
            r.survivalOutgo -
            r.maturityOutgo
          : 0;

      reserve.upr = calculateUPR(inputs, reserve);

      reserves.push(reserve);
    } catch (error) {
      console.log(error);
    }
  }

  return reserves;
}

function calculateMortalityRate(age: number, gender: string, mortalityMad: number, ApplyMortality: string, mortalityRates: any, mortalityBERates: any): number {
  const mortalityGrad = mortalityRates[age][gender];
  const mortalityBeGrad = mortalityBERates[age][gender];
  return (1 - Math.pow(1 - parseFloat(mortalityGrad) * parseFloat(mortalityBeGrad) * percentToDecimal(mortalityMad), 1 / 12)) * parseFloat(ApplyMortality);
}

function calculateMorbidityRate(age: number, gender: string, morbAssumpVal: number, ApplyMorbidity: number, morbidityRates: any): number {
  const morbidityRate = morbidityRates[age][gender];
  return (1 - Math.pow(1 - parseFloat(morbidityRate) * morbAssumpVal, 1 / 12)) * ApplyMorbidity;
}

function calculateLapse(currentMonth: number, year: number, gender: string, lapseAssumpVal: number, lapseTableGrad: any, applyLapse: number) {
  return currentMonth === 12 ? lapseTableGrad[year][gender] * lapseAssumpVal : 0 * applyLapse;
}

function calLivesStart(reserve: any, reserves: any[], x: number): number {
  if (reserve.month === 1 && reserve.year === 1) {
    return 1;
  }
  const prevItem = reserves[x - 2];
  return prevItem?.livesAtEnd ?? 1;
}

function calcInflationFactor(reserve: any, reserves: any[], x: number, inflationRates: any) {
  if (reserve.month === 1 && reserve.year === 1) {
    return 1;
  }
  const previousInflationFactor = reserves[x - 2].inflationFactor;
  if (reserve.month > 1) {
    return previousInflationFactor;
  } else {
    return previousInflationFactor * (1 + parseFloat(inflationRates[reserve.year - 1].Reserving));
  }
}

function calcInitialYieldRate(reserve: any, interestRateTable: any) {
  return Math.pow(1 + parseFloat(interestRateTable[reserve.year - 1].Reserving), 1 / 12) - 1;
}

function calcPremiumFrequency(reserve: any, inputs: any): number {
  const { duration, month } = reserve;
  const { pptMonths, premFq } = inputs;

  if (duration > pptMonths) {
    return 0;
  }
  const condition = month === 1 + (12 / premFq) * Math.floor((premFq * (month - 1)) / 12);
  return condition ? 1 : 0;
}

function calcCumulatedPremium(reserves: any[]) {
  const reverseReserves = structuredClone(reserves).reverse();
  return reverseReserves.reduce((acc: number, row) => {
    return acc + row.premium;
  }, 0);
}

function calculateDeathBenefit(
  HasDeathBenefit: string,
  SA: number,
  loanScheduleC6: number,
  percentageofpremspaidDeath: number,
  cumulativePremium: number,
  multipleofanualisedpremiumDeath: number,
  anualisedPremium: number
): number {
  if (HasDeathBenefit === '0') {
    return 0;
  } else if (HasDeathBenefit === '1') {
    return SA;
  } else if (HasDeathBenefit === '2') {
    return loanScheduleC6;
  } else {
    return Math.max(SA, percentageofpremspaidDeath * cumulativePremium, multipleofanualisedpremiumDeath * anualisedPremium);
  }
}

function calculateMorbidityBenefit(inputs: any, cumulativePremium: number, annualisedPremium: number): number {
  const { hasMorbidityBenefit, sumAssured, percentageofpremspaidMorb, multipleofanualisedpremiumMorb } = inputs;
  if (hasMorbidityBenefit === '0') {
    return 0;
  }

  if (hasMorbidityBenefit === '1' || hasMorbidityBenefit === '2') {
    return sumAssured;
  }

  return Math.max(sumAssured, parseFloat(percentageofpremspaidMorb) * cumulativePremium, multipleofanualisedpremiumMorb * annualisedPremium);
}

function calculateSurrenderBenefit(inputs: any, reserve: any): number {
  const { hasSurrenderBenefit, unexpiredRiskPremium, ptMonths, sumAssured, deathBenefit } = inputs;
  const { cumulativePremium, duration, guaranteedSurrenderValue, specialSurrenderValue } = reserve;
  if (hasSurrenderBenefit === '0') {
    return 0;
  }

  if (hasSurrenderBenefit === '1') {
    const value = cumulativePremium * (1 - duration / ptMonths) * (deathBenefit / sumAssured) * unexpiredRiskPremium;
    return Math.max(value, 0);
  }

  return Math.max(guaranteedSurrenderValue, specialSurrenderValue, 0);
}
