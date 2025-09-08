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
  const reserves = [];
  const { phEntryAge, ptMonths, pptMonths, premFq, premium, phGender, mortalityMad, morbAssumpVal, lapseAssumpVal } = inputs;
  const { ApplyMortality, ApplyMorbidity, ApplyLapse } = product;

  for (let duration = 1; duration < ptMonths + 2; duration++) {
    try {
      const month = ((duration - 1) % 12) + 1;
      const year = Math.floor((duration - 1) / 12) + 1;
      const age = phEntryAge + Math.floor((duration - 1) / 12) + 1;
      const livesAtStart = month === 1 && year === 1 ? 1 : reserves[duration - 2]?.livesAtEnd ?? 1;
      const premiumFrequency = duration > pptMonths ? 0 : month === 1 + (12 / premFq) * Math.floor((premFq * (month - 1)) / 12) ? 1 : 0;
      const reservePremium = premium * livesAtStart * premiumFrequency;
      const cumulativePremium = calcCumulatedPremium([...reserves, { premium: reservePremium }]);
      const mortalityRate = calculateMortalityRate(age, phGender, mortalityMad, ApplyMortality, mortalityRates, mortalityBERates);
      const morbidityRate = calculateMorbidityRate(age, phGender, morbAssumpVal, ApplyMorbidity, morbidityRates);
      const lapseRate = calculateLapse(month, year, phGender, lapseAssumpVal, lapseRates, ApplyLapse);
      const mortalityYear = mortalityRate * livesAtStart * (1 - 0.5 * morbidityRate);
      const morbidityYear = morbidityRate * livesAtStart * (1 - 0.5 * mortalityRate);
      const lapseYear = lapseRate * (livesAtStart - mortalityYear - morbidityYear);
      const livesAtEnd = livesAtStart - mortalityYear - morbidityYear - lapseYear;

      const inflationFactor =
        month === 1 && year === 1
          ? 1
          : month > 1
          ? reserves[duration - 2].inflationFactor
          : reserves[duration - 2].inflationFactor * (1 + parseFloat(inflationRates[year - 1].Reserving));

      const intialYieldRate = Math.pow(1 + parseFloat(interestRates[year - 1].Reserving), 1 / 12) - 1;

      const reserve: any = {
        duration: duration,
        month: month,
        year: year,
        age: age,
        livesAtStart: livesAtStart,
        premiumFrequency: premiumFrequency,
        premium: reservePremium,
        cumulativePremium: cumulativePremium,
        mortalityRate: mortalityRate,
        morbidityRate: mortalityRate,
        lapseRate: lapseRate,
        mortalityYear,
        morbidityYear,
        lapseYear,
        livesAtEnd,
        inflationFactor,
        intialYieldRate,
      };

      reserve.FYCommission = reserve.premium * (reserve.year === 1 ? percentToDecimal(inputs.firstYearCommissionFyc) ?? 0 : percentToDecimal(inputs.renewalCommissionRc) ?? 0);
      reserve.initialExpense =
        duration >= (inputs.ptMonths ?? 0) + 1
          ? 0
          : reserve.premium * (reserve.year === 1 ? inputs.varExpInitialBE ?? 0 : 0) + (duration === 1 ? inputs.fixedInitialExpBE ?? 0 : 0);

      reserve.renewalVariableExp = duration >= (inputs.ptMonths ?? 0) + 1 ? 0 : reserve.year !== 1 ? (product.renewalPremExp ?? 0) * reserve.premium : 0;
      reserve.renewalFixedExp =
        duration <= inputs.ptMonths ? (duration === 1 ? 0 : (inputs.fixedRenewalExpVal ?? 0) / 12) * (reserve.inflationFactor ?? 0) * (reserve.livesAtStart ?? 0) : 0;
      reserve.claimExpense =
        duration <= inputs.ptMonths
          ? inputs.claimExpenseFixedVal *
            reserve.inflationFactor *
            (reserve.mortalityYear * (inputs.hasDeathBenefit === '0' ? 0 : 1) + reserve.morbidityYear * (inputs.hasMorbidityBenefit === '0' ? 0 : 1))
          : 0;

      reserve.deathBenefit = calculateDeathBenefit(
        inputs.hasDeathBenefit,
        inputs.sumAssured,
        loadSchedule[duration - 1].openingBalance,
        parseFloat(inputs.percentageofpremspaidDeath),
        reserve.cumulativePremium,
        inputs.multipleofanualisedpremiumDeath,
        inputs.anualisedPremium
      );

      reserve.deathOutGo = duration <= inputs.ptMonths ? reserve.mortalityYear * reserve.deathBenefit : 0;
      reserve.morbidityBenefit = calculateMorbidityBenefit(inputs, reserve.cumulativePremium, reserve.annualisedPremium);
      reserve.morbidityOutGo = reserve.morbidityBenefit * reserve.mortalityYear;

      reserve.gsvFactor = inputs.hasSurrenderBenefit === '2' ? percentToDecimal(gsvRates[reserve.year - 1][Math.ceil(inputs.ptMonths / 12) - 1 + 2]) : 0;
      reserve.guaranteedSurrenderValue = reserve.cumulativePremium * reserve.gsvFactor;
      reserve.ssvFactor = inputs.hasSurrenderBenefit === '2' ? percentToDecimal(ssvRates[reserve.year - 1][Math.ceil(inputs.ptMonths / 12) - 1 + 2]) : 0;
      reserve.specialSurrenderValue = inputs.sumAssured * reserve.ssvFactor * Math.min(1, duration / inputs.ptMonths);
      reserve.surrenderBenefit = calculateSurrenderBenefit(inputs, reserve);
      reserve.surrenderOutgo = reserve.lapseYear * reserve.surrenderBenefit;
      reserve.survivalMultiplier = calcSurvivalMultiplier(reserve, inputs);
      reserve.survivalBenefitFactor = calculateIncomeSurvivalBenefit(reserve.duration, inputs);
      reserve.survivalBenefit =
        (inputs.hasSurvivalBenefit === '0' ? 0 : inputs.hasSurvivalBenefit === '1' ? inputs.sumAssured : inputs.premium) *
        reserve.survivalBenefitFactor *
        reserve.survivalMultiplier;

      reserve.survivalOutgo = reserve.livesAtStart * reserve.survivalBenefit;
      reserve.maturityBenefitFactor = duration === inputs.ptMonths + 1 ? inputs.maturityBenefitFactor : 0;
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
