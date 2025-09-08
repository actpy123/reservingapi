import { model, Schema, Document, Types } from 'mongoose';

interface ReserveResult {
  assumptionId: string;
  scenarioCode?: any;
  output?: any[]; // You can type this if you know the exact structure
  cashflow?: any[]; // You can type this if you know the exact structure
}

export interface ReserveResultDocument extends ReserveResult, Document {}

const ReserveResults = new Schema<ReserveResultDocument>(
  {
    scenarioCode: { type: String },
    assumptionId: { type: String, required: true },
    output: { type: [Schema.Types.Mixed] }, // Allows any type inside the array
    cashflow: { type: [Schema.Types.Mixed] }, // Allows any type inside the array
  },
  { timestamps: true }
);

export const ReserveResultModel = model<ReserveResultDocument>('ReserveResults', ReserveResults);
