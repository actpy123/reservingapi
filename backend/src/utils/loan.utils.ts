type LoanInput = {
  policyTermMonths: number;
  sumAssured: number;
  moratoriumPeriod: number;
  loanInterestRate: number; // annual rate, e.g., 0.08 for 8%
  modelPoint?: string;
};

type LoanSchedule = {
  duration: number;
  month: number;
  openingBalance: number;
  interest: number;
  emi: number;
  closingBalance: number;
};

const MONTHS_IN_YEAR = 12;

/** PMT formula (equivalent to Excel/NumPy financial PMT) */
function pmt(rate: number, nper: number, pv: number, fv = 0, type = 0): number {
  if (rate === 0) return -(pv + fv) / nper;
  const pvif = Math.pow(1 + rate, nper);
  let payment = (rate / (pvif - 1)) * -(pv * pvif + fv);
  if (type === 1) payment /= 1 + rate;
  return payment;
}

/** Calculate monthly interest */
function calculateMonthlyInterest(openingBalance: number, duration: number, moratoriumMonths: number, annualRate: number): number {
  if (duration <= moratoriumMonths) return 0;
  const monthlyRate = Math.pow(1 + annualRate, 1 / MONTHS_IN_YEAR) - 1;
  return openingBalance * monthlyRate;
}

/** Generate Loan Schedule */
export function generateLoanSchedule(input: LoanInput, returnJson = false): (LoanSchedule | string)[] {
  const result: LoanSchedule[] = [];
  let month = 1;
  let emiValue = 0;
  const totalMonths = Math.round(input.policyTermMonths);

  for (let duration = 1; duration <= totalMonths + 5; duration++) {
    let schedule: LoanSchedule;

    if (duration <= totalMonths) {
      const prev = result[duration - 2] as LoanSchedule;
      const openingBalance = duration === 1 ? input.sumAssured : prev?.closingBalance;
      const interest = duration <= input.moratoriumPeriod ? 0 : openingBalance * (Math.pow(1 + input.loanInterestRate, 1 / 12) - 1);

      if (duration === 1) {
        try {
          emiValue = -pmt(input.loanInterestRate / MONTHS_IN_YEAR, totalMonths - input.moratoriumPeriod, openingBalance, 1, 0);
        } catch (e) {
          console.error(`Error calculating EMI: ${e}, Model Point: ${input.modelPoint}`);
        }
      }

      const emi = duration <= input.moratoriumPeriod ? 0 : emiValue;
      const closingBalance = Math.max(openingBalance + interest - emi, 0);

      schedule = {
        duration,
        month,
        openingBalance,
        interest,
        emi,
        closingBalance,
      };

      month = month === MONTHS_IN_YEAR ? 1 : month + 1;
    } else {
      schedule = {
        duration,
        month: 0,
        openingBalance: 0,
        interest: 0,
        emi: 0,
        closingBalance: 0,
      };
    }

    result.push(schedule);
  }

  return result;
}
