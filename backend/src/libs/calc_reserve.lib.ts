import { percentToDecimal, toNumber } from '@utils/number.utils';
import jsonata from 'jsonata';

export async function calcReserve(
  inputs: any,
  product: any,
  mortalityRates: any,
  mortalityBERates: any,
  morbidityRates: any,
  lapseRates: any,
  inflationRates: any[],
  interestRates: any[]
) {
  const decrements = [];
  const reserves = [];
  const finacialFactors = [];

  for (let x = 1; x < inputs['ptMonths'] + 2; x++) {
    try {
      const reserve: any = {};

      reserve.duration = x;
      reserve.month = ((x - 1) % 12) + 1;
      reserve.year = Math.floor((x - 1) / 12) + 1;
      reserve.age = inputs.phEntryAge + (Math.floor((x - 1) / 12) + 1) - 1;
      reserve.livesAtStart = calLivesStart(reserve, reserves, x);

      const [mortalityRate, morbidityRate, lapseRate, inflationFactor, intialYieldRate] = await Promise.all([
        calculateMortalityRate(reserve.age, inputs.phGender, inputs.mortalityMad, product['ApplyMortality'], mortalityRates, mortalityBERates),
        calculateMorbidityRate(reserve.age, inputs.phGender, inputs.morbAssumpVal, product['ApplyMorbidity'], morbidityRates),
        calculateLapse(reserve.month, reserve.year, inputs.phGender, inputs.lapseAssumpVal, lapseRates, product['ApplyLapse']),
        calcInflationFactor(reserve, reserves, x, inflationRates),
        calcInitialYieldRate(reserve, interestRates),
      ]);

      reserve.mortalityRate = mortalityRate;
      reserve.morbidityRate = morbidityRate;
      reserve.lapseRate = lapseRate;

      reserve.mortalityYear = reserve.mortalityRate * reserve.livesAtStart * (1 - 0.5 * reserve.morbidityRate);
      reserve.morbidityYear = reserve.morbidityRate * reserve.livesAtStart * (1 - 0.5 * reserve.mortalityRate);
      reserve.lapseYear = reserve.lapseRate * (reserve.livesAtStart - reserve.mortalityYear - reserve.morbidityYear);
      reserve.livesAtEnd = reserve.livesAtStart - reserve.mortalityYear - reserve.morbidityYear - reserve.lapseYear;
      reserve.inflationFactor = inflationFactor;
      reserve.intialYieldRate = intialYieldRate;
      reserve.premiumFrequency = calcPremiumFrequency(reserve, inputs);
      reserve.premium = inputs.premium * reserve.livesAtStart * reserve.premiumFrequency;
      reserve.FYCommission = reserve.premium * (reserve.year === 1 ? percentToDecimal(inputs.firstYearCommissionFyc) ?? 0 : percentToDecimal(inputs.renewalCommissionRc) ?? 0);
      reserve.initialExpense =
        x >= (inputs.ptMonths ?? 0) + 1 ? 0 : reserve.premium * (reserve.year === 1 ? inputs.varExpInitialBE ?? 0 : 0) + (x === 1 ? inputs.fixedInitialExpBE ?? 0 : 0);

      reserve.renewalVariableExp = x >= (inputs.ptMonths ?? 0) + 1 ? 0 : reserve.year !== 1 ? (product.renewalPremExp ?? 0) * reserve.premium : 0;
      reserve.renewalVariableExp = (x === 1 ? 0 : (inputs.fixedRenewalExpVal ?? 0) / 12) * (inflationFactor ?? 0) * (reserve.livesAtStart ?? 0);
      reserve.claimExpense =
        inputs.claimExpenseFixedVal *
        inflationFactor *
        (reserve.mortalityYear * (inputs.hasDeathBenefit === '0' ? 0 : 1) + reserve.morbidityYear * (inputs.hasMorbidityBenefit === '0' ? 0 : 1));

      reserves.push(reserve);
    } catch (error) {
      console.log(error);
    }
  }

  return reserves;
}

async function calculateMortalityRate(age: number, gender: string, mortalityMad: number, ApplyMortality: string, mortalityRates: any, mortalityBERates: any): Promise<number> {
  const expression = `$[AGE="${age}"].${gender}`;
  const mortalityGradExpr = jsonata(expression);
  const [mortalityGrad, mortalityBeGrad] = await Promise.all([mortalityGradExpr.evaluate(mortalityRates), mortalityGradExpr.evaluate(mortalityBERates)]);

  return (1 - Math.pow(1 - parseFloat(mortalityGrad) * parseFloat(mortalityBeGrad) * percentToDecimal(mortalityMad), 1 / 12)) * parseFloat(ApplyMortality);
}

async function calculateMorbidityRate(age: number, gender: string, morbAssumpVal: number, ApplyMorbidity: number, morbidityRates: any): Promise<number> {
  const expression = `$[AGE="${age}"].${gender}`;
  const morbidityGradExpr = jsonata(expression);
  const morbidityRate = await morbidityGradExpr.evaluate(morbidityRates);
  return (1 - Math.pow(1 - parseFloat(morbidityRate) * morbAssumpVal, 1 / 12)) * ApplyMorbidity;
}

async function calculateLapse(currentMonth: number, year: number, gender: string, lapseAssumpVal: number, lapseTableGrad: any, applyLapse: number) {
  const expression = `(${currentMonth} = 12 ? $number($[\`Policy Year\`="${year}"].("${gender}" = "Male" ? Male : Female)) * ${lapseAssumpVal} : 0 ) * ${applyLapse}`;
  const lapseGradExpr = jsonata(expression);
  const morbidityRate = await lapseGradExpr.evaluate(lapseTableGrad);
  return morbidityRate;
}

function calLivesStart(reserve: any, reserves: any[], x: number): number {
  if (reserve.month === 1 && reserve.year === 1) {
    return 1;
  }
  const prevItem = reserves[x - 2];
  return prevItem?.livesAtEnd ?? 1;
}

async function calcInflationFactor(reserve: any, reserves: any[], x: number, inflationRates: any) {
  if (reserve.month === 1 && reserve.year === 1) {
    return 1;
  }
  const previousInflationFactor = reserves[x - 2].inflationFactor;
  if (reserve.month > 1) {
    return previousInflationFactor;
  } else {
    const lapseGradExpr = jsonata(`${previousInflationFactor} * (1 + $number($[\`Year\`="${reserve.year}"].Reserving))`);
    const inflationFactor = await lapseGradExpr.evaluate(inflationRates);
    return inflationFactor;
  }
}

async function calcInitialYieldRate(reserve: any, interestRateTable: any) {
  const { year } = reserve;
  const interestRateExpr = jsonata(`$number($[\`Year\`="${year}"].Reserving)`);
  const interestRate = await interestRateExpr.evaluate(interestRateTable);
  return Math.pow(1 + interestRate, 1 / 12) - 1;
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
