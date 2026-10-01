import { Assumption, PolicySummary } from '@CustomTypes/app.type';
import { IAssumption } from '@models/assumption.model';
import { getPremiumFrequencyValue, parseFactor, parsePercent, toFloat, toVariableName } from '@utils/app.utils';
import { safeParseDate } from '@utils/date.utils';
import { percentToDecimal, toNumber } from '@utils/number.utils';

export function createPolicySummaryArray(length: number): PolicySummary[] {
  const initialPolicySummary: PolicySummary = {
    Period: 0,
    premium: 0,
    investment_income: 0,
    FY_commission: 0,
    initial_expense: 0,
    renewal_variable_exp: 0,
    renewal_fixed_exp: 0,
    claim_expense: 0,
    death_payments: 0,
    morbidity_benifit: 0,
    surrender_payments: 0,
    survival_payments: 0,
    maturity_outgo: 0,
    death_outgo: 0,
    morbidity_outgo: 0,
    surrender_outgo: 0,
    survival_outgo: 0,
    net_cashflow: 0,
    reserves: 0,
    solvency_margin: 0,
    upr: 0,
  };

  return Array.from({ length }, (_, i) => ({
    ...initialPolicySummary,
    Period: i,
  }));
}

export function findProductByScenario(assumptions: Assumption[], scenarioCode: string): any | undefined {
  const productMaster = assumptions.find((a) => a.name === 'product_master');
  if (!productMaster) return undefined;

  return productMaster.data.find((product: any) => product['Scenario Code'] === scenarioCode);
}

export function loadRates<T = any>(assumptions: Assumption[], rateName: string): T[] {
  const rateTable = assumptions.find((a) => {
    return a.name === rateName;
  });
  if (!rateTable) {
    throw new Error(`Rate table ${rateName} not found in assumptions.`);
  }
  return rateTable ? rateTable.data : [];
}

export function normalizeProductPercents(product: Record<string, any>) {
  const percentFields = [
    'UnexpiredRiskPremium',
    'First Year Commission (FYC)',
    'Renewal Commission (RC)',
    'Initial(%of Prem) Exp',
    'Renewal (% Prem) Exp',
    'Sol Margin_Res Factor',
    'Sol Margin_SAR Factor',
  ];
  // Multipliers: may legitimately exceed 100% (e.g. MAD 120% = 1.2), so they must not go through parsePercent,
  // which divides any value > 1 by 100.
  const factorFields = [
    'Lapse_Assumption_BE',
    'Mortality_Assumption_BE',
    'Morbidity_Assumption_BE',
    'Lapse_MAD',
    'Mortality_MAD',
    'Morbidity_MAD',
    'Expense_MAD',
    'PercentageOfPremsPaid_Death', // 1.05 or "105%"
    'PercentageOfPremsPaid_Morb',
  ];

  percentFields.forEach((field) => {
    if (field in product) {
      product[field] = parsePercent(product[field]);
    }
  });
  factorFields.forEach((field) => {
    if (field in product) {
      product[field] = parseFactor(product[field], 1);
    }
  });
  // Excel multiplies by these indicators; a blank cell counts as 0 (parseInt('') would give NaN and poison every row)
  product['ApplyMortality'] = toFloat(product['ApplyMortality'], 0);
  product['ApplyMorbidity'] = toFloat(product['ApplyMorbidity'], 0);
  product['ApplyLapse'] = toFloat(product['ApplyLapse'], 0);
  // Benefit indicators are compared as strings ('0'..'3') throughout the engine; normalise so numbers also work
  ['HasDeathBenefit', 'HasMorbidityBenefit', 'HasSurrenderBenefit', 'HasSurvivalBenefit', 'HasMaturityBenefit'].forEach((field) => {
    if (field in product) product[field] = String(toFloat(product[field], 0));
  });
  return product;
}

function getAssumptionVal(assumptionBE: number | string, mad: number, madFlag: number): number {
  if (typeof assumptionBE === 'string') {
    assumptionBE = parseFloat(assumptionBE);
    if (isNaN(assumptionBE)) {
      return 0;
    }
  }
  return madFlag === 1 ? assumptionBE * mad : assumptionBE;
}

export function complieInputs(inputs: any, product: any) {
  const keyToIgnore: string[] = ['Policy Term_Month', 'Premium Term_Month', 'Premium Frequency', 'Coverage Effective date', 'PH Entry Age'];
  const productkeyToIgnore: string[] = [
    'Fixed Renewal Exp BE',
    'Initial(%of Prem) Exp',
    'Lapse_Assumption_BE',
    'Morbidity_Assumption_BE',
    'Fixed Initial Exp BE',
    'Fixed Renewal Exp BE',
  ];

  const inputKeys = Object.keys(inputs).filter((item: string) => !keyToIgnore.includes(item));

  const compliedInputs: any = new Object();
  for (const key of inputKeys) {
    compliedInputs[toVariableName(key)] = inputs[key];
  }

  const productKeys = Object.keys(product).filter((item: string) => !productkeyToIgnore.includes(item));

  for (const key of productKeys) {
    compliedInputs[toVariableName(key)] = product[key];
  }

  compliedInputs.policyEffectiveDate = inputs['Coverage Effective date'];
  compliedInputs.phEntryAge = toNumber(inputs['PH Entry Age']);
  compliedInputs.ptMonths = toNumber(inputs['Policy Term_Month']);
  compliedInputs.pptMonths = toNumber(inputs['Premium Term_Month']);
  compliedInputs.premFq = getPremiumFrequencyValue(inputs['Premium Frequency']);
  if (String(inputs['Premium Frequency']).trim() === 'Single') {
    compliedInputs.pptMonths = 1; // a single premium is one payment at duration 1, whatever the premium term field says
  }
  // Excel: IF(ph_sex="Male",2,3) -> case-insensitive, anything other than "male" uses the Female column
  compliedInputs.phGender = String(inputs['PH Gender'] ?? '').trim().toLowerCase() === 'male' ? 'Male' : 'Female';

  // Numeric policy fields (CSV values arrive as strings; JS string arithmetic silently breaks, e.g. 1 + "10.5" = "110.5")
  compliedInputs.sumAssured = toFloat(inputs['Sum Assured']);
  compliedInputs.premium = toFloat(inputs['Premium']);
  compliedInputs.anualisedPremium = toFloat(inputs['Anualised Premium']);
  compliedInputs.moratoriumPeriod = toFloat(inputs['Moratorium Period']);
  compliedInputs.incomeSurvivalBenefitStartMonth = toFloat(inputs['Income/Survival Benefit Start Month']);
  // Loan rate is supplied in percent in the policy file (10.5 = 10.5% p.a.). Excel V3.15 (Sep-2026): Input!C28 = U3/100.
  compliedInputs.loanInterestRate = toFloat(String(inputs['Loan Interest Rate'] ?? '').replace('%', '')) / 100;

  // MAD handling mirrors Excel Input!L10:L19 : factor applies only when MAD FLAG = 1, otherwise 1.
  // NB: Excel V3.15 hard-codes Input!L9 = 1; Node honours the product master's MAD FLAG (all current products = 1)
  const madOn = toFloat(product['MAD FLAG'], 1) === 1;
  const mad = (key: string) => (madOn ? parseFactor(product[key], 1) : 1);
  compliedInputs.expenseMad = mad('Expense_MAD');
  compliedInputs.mortalityMad = mad('Mortality_MAD');
  compliedInputs.lapseMad = mad('Lapse_MAD');
  compliedInputs.morbidityMad = mad('Morbidity_MAD');

  compliedInputs.renExpBE = toFloat(product['Fixed Renewal Exp BE']);
  compliedInputs.varExpInitialBE = percentToDecimal(product['Initial(%of Prem) Exp']);
  compliedInputs.lapseAssumpBE = parseFactor(product['Lapse_Assumption_BE'], 1);
  compliedInputs.morbAssumpBE = parseFactor(product['Morbidity_Assumption_BE'], 1);

  compliedInputs.fixedInitialExpBE = toFloat(product['Fixed Initial Exp BE']); // Excel FixedExp_Val = FixedExp_BE (no MAD)
  compliedInputs.fixedRenewalExpVal = compliedInputs.renExpBE * compliedInputs.expenseMad; // Excel RenExp_Val
  compliedInputs.claimExpenseFixedVal = toFloat(product['Claim Expense Fixed BE']) * compliedInputs.expenseMad; // Excel Claim_expense_fixed_Val
  compliedInputs.lapseAssumpVal = compliedInputs.lapseAssumpBE * compliedInputs.lapseMad; // Excel LapseAssump_Val
  compliedInputs.morbAssumpVal = compliedInputs.morbAssumpBE * compliedInputs.morbidityMad; // Excel MorbAssump_Val

  // Solvency margin factors from the product master (were hard-coded to 0.03 / 0.0003)
  compliedInputs.resSolFactor = parsePercent(product['Sol Margin_Res Factor']);
  compliedInputs.sarSolFactor = parsePercent(product['Sol Margin_SAR Factor']);
  compliedInputs.rsmRatioReg = toFloat(product['RSM_Ratio_Reg']);

  compliedInputs.policyEffectiveDate = safeParseDate(compliedInputs['policyEffectiveDate']);
  compliedInputs.maturityDate = safeParseDate(compliedInputs['maturityDate']);
  compliedInputs.policyTermDuration = Math.abs(compliedInputs.maturityDate.diff(compliedInputs.policyEffectiveDate, 'month'));

  return compliedInputs;
}
