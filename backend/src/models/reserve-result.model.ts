import { model, Schema, Types } from 'mongoose';

interface ReserveResult {
  // controlSheetId: Schema.Types.Mixed;
  assumptionId: string;
  scenarioCode?: string;
  output?: any[];
  cashflow?: any[];
}

export interface ReserveResultDocument extends ReserveResult, Document {}

const ReserveResults = new Schema<ReserveResultDocument>(
  {
    // controlSheetId: {
    //   type: Types.ObjectId,
    //   ref: 'ControlSheet',
    //   required: true,
    //   unique: true, // one result per control sheet
    // },
    assumptionId: { type: String, required: true },
    scenarioCode: { type: String },
    output: { type: [Schema.Types.Mixed] },
    cashflow: { type: [Schema.Types.Mixed] },
  },
  { timestamps: true },
);

export const ReserveResultModel = model<ReserveResultDocument>('ReserveResults', ReserveResults);
