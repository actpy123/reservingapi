export function calcSurvivalMultiplier(reserve: any, inputs: any): number {
  const { incomeSurvivalBenefitStartMonth } = inputs;
  const { duration, month } = reserve;

  const incomeFrequency = getIncomeFreqInd(inputs);

  // Excel AJ: IF(A>pt+1,0,IF(A<=start,0, payment-month indicator))
  if (duration > inputs.ptMonths + 1 || duration <= incomeSurvivalBenefitStartMonth) {
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
  // Excel AK: IF(A<=pt+1, IF(A<=start, 0, factor), 0)  (condition was inverted: benefit was only ever paid after the term)
  if (duration > ptMonths + 1 || duration <= incomeSurvivalBenefitStartMonth) {
    return 0;
  }

  return incomeSurvivalFactor;
}

export function calculateMaturityBenefit(inputs: any, reserve: any): number {
  const { maturityBenefitFactor } = reserve;
  const { hasMaturityBenefit, sumAssured, premium } = inputs;
  const flag = String(hasMaturityBenefit);
  const base = flag === '0' ? 0 : flag === '1' ? sumAssured : premium;

  return base * maturityBenefitFactor;
}

export function calculateUPR(inputs: any, reserve: any): number {
  // Excel AU: IF(A>pt,0,Premium*IF(ppt=1,(pt-A)/pt,IF(A>ppt,0,((12/fq)-AT)/(12/fq))))
  // AT (reserve.uprMonths) = months since the last premium due date. Previously used the calendar policy month
  // (negative UPR for non-annual modes), tested pt=1 instead of ppt=1, and ignored the premium term.
  const { duration } = reserve;
  const { ptMonths, pptMonths, premium } = inputs;
  if (duration > ptMonths) {
    return 0;
  }
  if (pptMonths === 1) {
    return premium * ((ptMonths - duration) / ptMonths);
  }
  if (duration > pptMonths) {
    return 0;
  }
  const modalMonths = 12 / inputs.premFq;
  return premium * ((modalMonths - reserve.uprMonths) / modalMonths);
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
  // Excel AW compares text case-insensitively; spaces are ignored here so "Max (GPV, UPR)" and "Max(GPV, UPR)" behave the same.
  const cleanedReserveType = String(reserveType ?? '').replace(/\s+/g, '').toLowerCase();
  if (duration <= ptMonths) {
    if (cleanedReserveType === 'gpv') {
      return Math.max(reservePerPolicy, 0);
    } else if (cleanedReserveType === 'upr') {
      return Math.max(upr, 0);
    } else if (cleanedReserveType === 'max(gpv,upr)' || cleanedReserveType === 'max(gpv,upr,0)') {
      return Math.max(reservePerPolicy, upr, 0);
    } else if (uIN === '163N003V01' || (uIN === '163N001V01' && ptMonths <= 12)) {
      return Math.max(upr, 0);
    } else {
      return Math.max(reservePerPolicy, 0);
    }
  }
  return 0;
}
