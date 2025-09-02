export function calcSurvivalMultiplier(reserve: any, inputs: any): number {
  const { incomeSurvivalBenefitStartMonth } = inputs;
  const { duration, month } = reserve;

  const incomeFrequency = getIncomeFreqInd(inputs);

  if (duration <= incomeSurvivalBenefitStartMonth) {
    return 0;
  }

  const value = 1 + (12 / incomeFrequency) * Math.floor((incomeFrequency * (month - 1)) / 12);
  return month === value ? 1 : 0;
}

function getIncomeFreqInd(inputs: any): number {
  const freq = inputs.incomeSurvivalBenefitFrequency;

  if (freq === 'Annual') return 1;
  if (freq === 'Half Yearly') return 2;
  if (freq === 'Quarterly') return 4;
  if (freq === 'Monthly') return 12;

  return 0; // default / unknown
}

export function calculateIncomeSurvivalBenefit(duration: number, inputs: any): number {
  const { ptMonths, incomeSurvivalFactor, incomeSurvivalBenefitStartMonth } = inputs;
  if (duration <= ptMonths + 1 || duration <= incomeSurvivalBenefitStartMonth) {
    return 0;
  }

  return incomeSurvivalFactor;
}

export function calculateMaturityBenefit(inputs: any, reserve: any): number {
  const { maturityBenefitFactor } = reserve;
  const { hasMaturityBenefit, sumAssured, premium } = inputs;
  const base = hasMaturityBenefit === '0' ? 0 : hasMaturityBenefit === '1' ? sumAssured : premium;

  return base * maturityBenefitFactor;
}

export function calculateUPR(inputs: any, reserve: any): number {
  const { duration } = reserve;
  const { ptMonths, premium } = inputs;
  if (duration >= ptMonths + 1) {
    return 0;
  }

  const factor = ptMonths === 1 ? (ptMonths - duration) / inputs.ptMonths : (12 / inputs.premFq - reserve.month) / (12 / inputs.premFq);

  return premium * factor;
}

export function calculateValue(index: number, reservesItems: any[], inputs: any): number {
  const { reserves, upr, duration, month } = reservesItems[index + 1] ?? {};
  const { ptMonths, resSolFactor, sumAssured, sarSolFactor, rsmRatioReg } = inputs;

  if (month === '' || month === null || month === undefined) {
    return 0;
  }

  if (duration <= ptMonths) {
    const maxVal = Math.max(reserves, upr);
    return (maxVal * resSolFactor + (sumAssured - maxVal) * sarSolFactor) * parseFloat(rsmRatioReg);
  }

  return 0;
}

export function calcReservePerPolicy(reverse: any, inputs: any): number {
  const { duration, deathOutGo } = reverse;
  const { ptMonths } = inputs;
  if (duration <= ptMonths) {
    const numerator = duration === ptMonths ? Math.max(deathOutGo, reverse.reserves) : reverse.reserves;
    return numerator / reverse.livesAtStart;
  }
  return 0;
}

export function calculateFinalReserve(inputs: any, reserve: any): number {
  const { ptMonths, reserveType, uIN } = inputs;
  const { upr, reservePerPolicy, duration } = reserve;
  const cleanedReserveType = reserveType.replace(/\s+/g, '');
  if (duration <= ptMonths) {
    if (cleanedReserveType === 'GPV') {
      return Math.max(reservePerPolicy, 0);
    } else if (cleanedReserveType === 'UPR') {
      return Math.max(upr, 0);
    } else if (cleanedReserveType.replace(' ', '') === 'Max(GPV,UPR,0)') {
      return Math.max(reservePerPolicy, upr, 0);
    } else if (uIN === '163N003V01' || (uIN === '163N001V01' && ptMonths <= 12)) {
      return Math.max(upr, 0);
    } else {
      return Math.max(reservePerPolicy, 0);
    }
  }
  return 0;
}
