export interface ControlSheet {
  id: string;
  runNo: string;
  productCode: string;
  runIndicator: string;
  inputFilePath: string;
  inputFile?: File | null;
  outputFilePath: string;
  execution: string;
  progress: number;
  outputUrl?: string;
  cashflowUrl?: string;
  execSeconds?: number;
  successfulPolicies?: number;
  skippedPolicies?: number;
}


