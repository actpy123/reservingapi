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
      default: getLocalDateTimeName,
    },
  },
  { timestamps: true }
);

export const SessionSimulation = model(
  "SessionSimulation",
  sessionSimulationSchema
);

function getLocalDateTimeName() {
  return new Date().toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}