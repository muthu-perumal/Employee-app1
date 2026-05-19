import { Schema, model } from "mongoose";
import { Counter } from "./counter.model.js";

const TaskWorklogSchema = new Schema({
  logId: { type: String, unique: true },
  workItemId: String,
  userId: String,
  action: { type: String, enum: ['start', 'pause', 'resume', 'end', 'log'] },
  timestamp: String,
  durationMinutes: Number,
  notes: String,
  activityType: String
}, { timestamps: true });

TaskWorklogSchema.pre("save", async function (next) {
  if (this.isNew && !this.logId) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'task_log' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.logId = `log-${counter.seq}`;
  }
  next();
});

TaskWorklogSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret.logId;
    delete ret._id;
    delete ret.__v;
    delete ret.logId;
    return ret;
  }
});

export const TaskWorklog = model("TaskWorklog", TaskWorklogSchema);
