import { model, Schema, Document, Types } from 'mongoose';

export interface IAssumption {
  name?: string;
  data?: any[]; // You can type this if you know the exact structure
  assumptionId?: Types.ObjectId; // Proper ObjectId type
  userId: Types.ObjectId; // Proper ObjectId type
  sessionId: Types.ObjectId; // Proper ObjectId type
  valid?: boolean; // new field
}

export interface AssumptionDocument extends IAssumption, Document {}

const AssumptionSchema = new Schema<AssumptionDocument>(
  {
    name: { type: String },
    data: { type: [Schema.Types.Mixed] }, // Allows any type inside the array
    assumptionId: { type: String, required: true },
    valid: { type: Boolean, default: true }, // default to true,
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    sessionId: { type: Schema.Types.ObjectId, ref: 'SessionSimulation' },
  },
  { timestamps: true },
);

export const AssumptionModel = model<AssumptionDocument>('Assumptions', AssumptionSchema);
