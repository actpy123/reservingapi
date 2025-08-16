export type Scenario = {
  scenarioCode: string;
  data: { [key: string]: any }[];
};

export interface PolicySummary {
  Period: number;
  premium: number;
  investment_income: number;
  FY_commission: number;
  initial_expense: number;
  renewal_variable_exp: number;
  renewal_fixed_exp: number;
  claim_expense: number;
  death_payments: number;
  morbidity_benifit: number;
  surrender_payments: number;
  survival_payments: number;
  maturity_outgo: number;
  death_outgo: number;
  morbidity_outgo: number;
  surrender_outgo: number;
  survival_outgo: number;
  net_cashflow: number;
  reserves: number;
  solvency_margin: number;
  upr: number;
}

export interface Assumption {
  name: string;
  data: any[];
}
