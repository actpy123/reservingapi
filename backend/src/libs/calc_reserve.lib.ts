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
      const age = phEntryAge + year - 1;
      const livesAtStart = month === 1 && year === 1 ? 1 : Math.max(reserves[duration - 2]?.livesAtEnd ?? 1, 0);
      const premiumFrequency = duration > pptMonths ? 0 : month === 1 + (12 / premFq) * Math.floor((premFq * (month - 1)) / 12) ? 1 : 0;
      const reservePremium = premium * livesAtStart * premiumFrequency;
      // Excel Y: running total of premium, zero after the policy term
      const cumulativePremium = duration <= ptMonths ? (reserves[duration - 2]?.runningPremium ?? 0) + reservePremium : 0;
      const runningPremium = (reserves[duration - 2]?.runningPremium ?? 0) + reservePremium;
      const mortalityRate = calculateMortalityRate(age, phGender, mortalityMad, ApplyMortality, mortalityRates, mortalityBERates);
      const morbidityRate = calculateMorbidityRate(age, phGender, morbAssumpVal, ApplyMorbidity, morbidityRates);
      const lapseRate = calculateLapse(month, year, phGender, lapseAssumpVal, lapseRates, Number(ApplyLapse ?? 1));
      const mortalityYear = mortalityRate * livesAtStart * (1 - 0.5 * morbidityRate);
      const morbidityYear = morbidityRate * livesAtStart * (1 - 0.5 * mortalityRate);
      const lapseYear = lapseRate * (livesAtStart - mortalityYear - morbidityYear);
      const livesAtEnd = Math.max(livesAtStart - mortalityYear - morbidityYear - lapseYear, 0);

      const inflationFactor =
        month === 1 && year === 1
          ? 1
          : month > 1
          ? reserves[duration - 2].inflationFactor
          : reserves[duration - 2].inflationFactor * (1 + parseFloat(inflationRates[year - 2].Reserving)); // Excel uses the prior year's rate

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
        runningPremium,
        mortalityRate: mortalityRate,
        morbidityRate: morbidityRate,
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

      reserve.renewalVariableExp = duration >= (inputs.ptMonths ?? 0) + 1 ? 0 : reserve.year !== 1 ? (inputs.renewalPremExp ?? 0) * reserve.premium : 0;
      reserve.renewalFixedExp =
        duration <= inputs.ptMonths ? (duration === 1 ? 0 : (inputs.fixedRenewalExpVal ?? 0) / 12) * (reserve.inflationFactor ?? 0) * (reserve.livesAtStart ?? 0) : 0;
      reserve.claimExpense =
        duration <= inputs.ptMonths
          ? inputs.claimExpenseFixedVal *
            reserve.inflationFactor *
            (reserve.mortalityYear * (inputs.hasDeathBenefit === '0' ? 0 : 1) + reserve.morbidityYear * (inputs.hasMorbidityBenefit === '0' ? 0 : 1))
          : 0;

      reserve.deathBenefit = duration > inputs.ptMonths ? 0 : calculateDeathBenefit(
        inputs.hasDeathBenefit,
        inputs.sumAssured,
        loadSchedule[duration - 1].openingBalance,
        Number(inputs.percentageofpremspaidDeath),
        reserve.cumulativePremium,
        inputs.multipleofanualisedpremiumDeath,
        inputs.anualisedPremium
      );

      reserve.deathOutGo = duration <= inputs.ptMonths ? reserve.mortalityYear * reserve.deathBenefit : 0;
      reserve.morbidityBenefit = duration > inputs.ptMonths ? 0 : calculateMorbidityBenefit(inputs, reserve.cumulativePremium, inputs.anualisedPremium);
      reserve.morbidityOutGo = reserve.morbidityBenefit * reserve.morbidityYear; // was * mortalityYear

      const termKey = String(Math.ceil(inputs.ptMonths / 12)); // Excel: VLOOKUP(year, GSV_Table, ROUNDUP(pt/12)-B1+2) = column headed by the term
      const inTerm = duration <= inputs.ptMonths;
      reserve.gsvFactor = inTerm && String(inputs.hasSurrenderBenefit) === '2' ? percentToDecimal(gsvRates[reserve.year - 1]?.[termKey] ?? 0) : 0;
      reserve.guaranteedSurrenderValue = reserve.cumulativePremium * reserve.gsvFactor;
      reserve.ssvFactor = inTerm && String(inputs.hasSurrenderBenefit) === '2' ? percentToDecimal(ssvRates[reserve.year - 1]?.[termKey] ?? 0) : 0;
      reserve.specialSurrenderValue = inTerm ? inputs.sumAssured * reserve.ssvFactor * Math.min(1, duration / inputs.ptMonths) : 0;
      reserve.surrenderBenefit = inTerm ? calculateSurrenderBenefit(inputs, reserve) : 0;
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

      // Excel AT: months elapsed since the last premium due date (1 in a premium month), 0 after the premium term
      reserve.uprMonths = duration <= pptMonths ? (premiumFrequency !== 0 ? 1 : (reserves[duration - 2]?.uprMonths ?? 0) + 1) : 0;
      reserve.upr = calculateUPR(inputs, reserve);
 
      reserves.push(reserve);
    } catch (error) {
      console.log(error);
    }
  }

  return reserves;
}

function calculateMortalityRate(age: number, gender: string, mortalityMad: number, ApplyMortality: string, mortalityRates: any, mortalityBERates: any): number {
  // blank table cells count as 0, as in Excel
  const mortalityGrad = parseFloat(mortalityRates[age]?.[gender]) || 0;
  const mortalityBeGrad = parseFloat(mortalityBERates[age]?.[gender]) || 0;
  return (1 - Math.pow(1 - mortalityGrad * mortalityBeGrad * mortalityMad, 1 / 12)) * parseFloat(ApplyMortality);
}

function calculateMorbidityRate(age: number, gender: string, morbAssumpVal: number, ApplyMorbidity: number, morbidityRates: any): number {
  const morbidityRate = parseFloat(morbidityRates[age]?.[gender]) || 0;
  return (1 - Math.pow(1 - morbidityRate * morbAssumpVal, 1 / 12)) * ApplyMorbidity;
}

function calculateLapse(currentMonth: number, year: number, gender: string, lapseAssumpVal: number, lapseTableGrad: any, applyLapse: number) {
  // Excel G: IF(month=12, lapse(year)*LapseAssump_Val, 0) * ApplyLapse  (ApplyLapse was previously ignored due to operator precedence)
  return (currentMonth === 12 ? parseFloat(lapseTableGrad[year][gender]) * lapseAssumpVal : 0) * applyLapse;
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

  return Math.max(sumAssured, Number(percentageofpremspaidMorb) * cumulativePremium, Number(multipleofanualisedpremiumMorb) * annualisedPremium);
}

function calculateSurrenderBenefit(inputs: any, reserve: any): number {
  const { unexpiredRiskPremium, ptMonths, sumAssured } = inputs;
  const hasSurrenderBenefit = String(inputs.hasSurrenderBenefit);
  // deathBenefit must come from the current row (Excel Z); inputs.deathBenefit is undefined -> NaN reserves
  const { cumulativePremium, duration, guaranteedSurrenderValue, specialSurrenderValue, deathBenefit } = reserve;
  if (hasSurrenderBenefit === '0') {
    return 0;
  }

  if (hasSurrenderBenefit === '1') {
    const value = cumulativePremium * (1 - duration / ptMonths) * (deathBenefit / sumAssured) * unexpiredRiskPremium;
    return Math.max(value, 0);
  }

  return Math.max(guaranteedSurrenderValue, specialSurrenderValue, 0);
}
