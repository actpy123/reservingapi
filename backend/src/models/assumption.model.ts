import { model, Schema, Document, Types } from 'mongoose';

interface Assumption {
  name?: string;
  data?: any[]; // You can type this if you know the exact structure
  assumptionId?: Types.ObjectId; // Proper ObjectId type
  valid?: boolean; // new field
}

export interface AssumptionDocument extends Assumption, Document {}

const AssumptionSchema = new Schema<AssumptionDocument>(
  {
    name: { type: String },
    data: { type: [Schema.Types.Mixed] }, // Allows any type inside the array
    assumptionId: { type: String, required: true },
    valid: { type: Boolean, default: true }, // default to true
  },
  { timestamps: true }
);

export const AssumptionModel = model<AssumptionDocument>('Assumptions', AssumptionSchema);
