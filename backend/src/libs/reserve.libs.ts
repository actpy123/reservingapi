import { Assumption, PolicySummary } from '@CustomTypes/app.type';
import { getPremiumFrequencyValue, parsePercent, toVariableName } from '@utils/app.utils';
import { toNumber } from '@utils/number.utils';

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
    'Mortality_MAD',
    'UnexpiredRiskPremium',
    'First Year Commission (FYC)',
    'Renewal Commission (RC)',
    'Initial(%of Prem) Exp',
    'Renewal (% Prem) Exp',
    'Lapse_Assumption_BE',
    'Morbidity_Assumption_BE',
    'Lapse_MAD',
    'Mortality_MAD',
    'Morbidity_MAD',
    'Expense_MAD',
    'Sol Margin_Res Factor',
    'Sol Margin_SAR Factor',
  ];

  percentFields.forEach((field) => {
    if (field in product) {
      product[field] = parsePercent(product[field]);
    }
  });
  return product;
}

function getAssumptionVal(assumptionBE: number | string, mad: number, madFlag: number): number {
  if (typeof assumptionBE === 'string') {
    return 0;
  }
  return madFlag === 1 ? assumptionBE * mad : assumptionBE;
}

export function complieInputs(inputs: any, product: any) {
  const keyToIgnore: string[] = ['Policy Term_Month', 'Premium Term_Month', 'Premium Frequency'];
  const productkeyToIgnore: string[] = [
    'Fixed Initial Exp BE',
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
  compliedInputs.ptMonth = toNumber(inputs['Policy Term_Month']);
  compliedInputs.pptMonth = toNumber(inputs['Premium Term_Month']);
  compliedInputs.premFq = getPremiumFrequencyValue(inputs['Premium Frequency']);

  compliedInputs.fixedExpBE = toNumber(product['Fixed Initial Exp BE']);
  compliedInputs.renExpBE = toNumber(product['Fixed Renewal Exp BE']);
  compliedInputs.varExpInitialBE = toNumber(product['Initial(%of Prem) Exp']);
  compliedInputs.lapseAssumpBE = toNumber(product['Lapse_Assumption_BE']);
  compliedInputs.morbAssumpBE = toNumber(product['Morbidity_Assumption_BE']);
  compliedInputs.claimExpenseFixedVal = 55;
  compliedInputs.InterestAssump_BE = 0;
  compliedInputs.InterestAssump_Val = 0;
  compliedInputs.resSolFactor = 0.045;
  compliedInputs.sarSolFactor = 0.00045;

  compliedInputs.lapseAssumpVal = getAssumptionVal(
    product['Lapse_Assumption_BE'],
    product['Lapse_MAD'],
    product['MAD FLAG']
  );
  compliedInputs.lapseAssumpVal = getAssumptionVal(
    product['Morbidity_Assumption_BE'],
    product['Morbidity_MAD'],
    product['MAD FLAG']
  );

  return compliedInputs;
}
