export const assumption = {
  gsv: 'gsv_file.csv',
  gsvTable1: 'GSV_Table_1.csv',
  inflationRate: 'Inflation_Rate_Table_1.csv',
  interestRate: 'Interest_Rate_Table_1.csv',
  lapse1: 'Lapse_Table_No_1.csv',
  lapse2: 'Lapse_Table_No_2.csv',
  maturity: 'Maturity_Table_1.csv',
  morbidity1: 'Morbidity_Table_No_1.csv',
  morbidity2: 'Morbidity_Table_No_2.csv',
  mortalityLoading: 'Mortality_Loading_BE_Table_1.csv',
  mortality1: 'Mortality_Table_No_1.csv',
  mortality2: 'Mortality_Table_No_2.csv',
  productMaster: 'product_master.csv',
  ssv: 'SSV_Table_1.csv',
  survival: 'Survival_Table_1.csv',
} as const;

// Create reverse lookup
export const assumptionReverse: Record<string, keyof typeof assumption> = Object.fromEntries(
  Object.entries(assumption).map(([key, value]) => [value, key])
) as Record<string, keyof typeof assumption>;
