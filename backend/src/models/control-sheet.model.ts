import { Schema, Types, model } from 'mongoose';


const controlSheetSchema = new Schema(
  {
    sessionId: {
      type: Types.ObjectId,
      ref: 'SessionSimulation',
      required: true,
    },
    scenarioCode: { type: String, required: true },

    inputFilePath: { type: String },
    inputFile: { type: String },
    outputFilePath: { type: String },

    execution: { type: Schema.Types.Mixed },
    progress: { type: Schema.Types.Mixed },
    execTime: { type: Number }, // seconds or ms
    rowNumber: { type: Number }, // seconds or ms
    success: { type: Schema.Types.Int32 },
    data: { type: [Schema.Types.Mixed] },
    outPutUrl: { type: String },
    cashFlowUrl: { type: String },
  },
  { timestamps: true },
);

export const ControlSheet = model('ControlSheet', controlSheetSchema);
