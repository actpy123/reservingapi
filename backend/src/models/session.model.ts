import { model, Schema, Types } from "mongoose";

const sessionSimulationSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      default: () => new Date().toISOString(),
    },
  },
  { timestamps: true }
);

export const SessionSimulation = model(
  "SessionSimulation",
  sessionSimulationSchema
);
