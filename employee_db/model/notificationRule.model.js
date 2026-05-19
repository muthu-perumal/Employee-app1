import { Schema, model } from "mongoose";

const NotificationRuleSchema = new Schema({
  id: { type: String, unique: true },
  name: String,
  trigger: String,
  channel: String,
  leadHours: Number,
  appliesToPriorities: [String],
  appliesToTypes: [String],
  template: String,
  active: Boolean
}, { timestamps: true });

NotificationRuleSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret.id || ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const NotificationRule = model("NotificationRule", NotificationRuleSchema);
