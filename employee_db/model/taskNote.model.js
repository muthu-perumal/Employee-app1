import { Schema, model } from "mongoose";
import { Counter } from "./counter.model.js";

const TaskNoteSchema = new Schema({
  noteId: { type: String, unique: true, index: true },
  type: { type: String, enum: ['CustomerMeeting', 'InternalDiscussion'], required: true },
  title: { type: String, required: true },
  dateTime: String, // ISO String
  customer: String,
  project: String,
  participants: [String], // Names or IDs
  summary: String,
  decisions: [String],
  risks: [String],
  tags: [String],
  actionItems: [String], // Strings here, unlike WorkItem ActionItems which are objects in types.ts? 
                         // Check types.ts: export interface Note { ... actionItems: string[]; ... } -> Yes, strings.
  linkedWorkItems: [String], // WorkItem IDs
  createdBy: String,
  recordingUrl: String,
  notifyUserId: { type: String, default: "" },
  notifyEmail: { type: String, default: "" },
}, {
  timestamps: true
});

TaskNoteSchema.pre("save", async function (next) {
  if (this.isNew && !this.noteId) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'task_note' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const seq = counter.seq.toString().padStart(3, '0');
    this.noteId = `NOTE-${seq}`;
  }
  next();
});

TaskNoteSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret.noteId;
    delete ret._id;
    delete ret.__v;
    delete ret.noteId;
    return ret;
  }
});

export const TaskNote = model("TaskNote", TaskNoteSchema);
