import { Schema, model } from "mongoose";

const SlaPolicySchema = new Schema({
  id: { type: String, unique: true }, // We might let client generate or use UUID. 
                                      // types.ts says string. Let's generic ID or custom logic.
                                      // For simple config, maybe just string.
  name: String,
  appliesTo: [String], // WorkItemTypes
  stageDurations: { type: Map, of: Number }, // e.g. {'Triage': 4}
  businessHours: Boolean,
  breachThresholdPct: Number,
  reminderWindowHours: Number,
  holidays: [String]
}, {
  timestamps: true
});

SlaPolicySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret.id || ret._id.toString(); 
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const SlaPolicy = model("SlaPolicy", SlaPolicySchema);
