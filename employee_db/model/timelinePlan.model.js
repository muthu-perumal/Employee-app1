import { Schema, model } from "mongoose";

const TimelinePlanSchema = new Schema({
  id: { type: String, unique: true },
  name: String,
  startDate: String,
  endDate: String,
  plannedDeliveries: Number,
  teamCapacity: { type: Map, of: Number },
  burndownPercent: Number
}, { timestamps: true });

TimelinePlanSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret.id || ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const TimelinePlan = model("TimelinePlan", TimelinePlanSchema);
