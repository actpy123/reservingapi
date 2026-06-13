export interface ControlSheet {
  id?: any;
  runNo: string;
  productCode: string;
  runIndicator: string;
  inputFilePath: string;
  data: File | null;
  outputFilePath: string;
  execution: string;
  progress: number;
  outputUrl?: string;
  cashflowUrl?: string;
  execSeconds?: number;
  successfulPolicies?: number;
  skippedPolicies?: number;
  sessionId?: string;
  controlSheetId?: string;
}

export enum LOADING_STATUS {
  IDLE = 0,
  LOADING = 1,
  LOADED = 2,
  ERROR = 3,
}
export interface Tab {
  label: string;
  content: React.ReactNode | null | undefined;
}
