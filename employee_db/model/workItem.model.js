import { Schema, model } from "mongoose";
import { Counter } from "./counter.model.js";

const AttachmentSchema = new Schema({
  id: String,
  label: String,
  type: { type: String, enum: ['file', 'link'] },
  url: String,
  uploadedBy: String
}); // _id: false? Maybe leave it for now.

const CommentLogSchema = new Schema({
  id: String,
  authorId: String,
  content: String,
  createdAt: String,
  mentions: [String]
});

const SlaEventSchema = new Schema({
  id: String,
  workItemId: String,
  stageName: String,
  stageStart: String,
  stageEnd: String,
  stageDurationHours: Number,
  slaStatus: { type: String, enum: ['WithinSLA', 'AtRisk', 'Breached'] }
});

const AuditEntrySchema = new Schema({
  id: String,
  action: String,
  actorId: String,
  detail: String,
  timestamp: String,
  changes: [
    {
      field: String,
      label: String,
      from: String,
      to: String,
    },
  ],
});

const ChecklistItemSchema = new Schema({
  id: String,
  title: String,
  completed: Boolean,
  assigneeId: String
});

const ActionItemSchema = new Schema({
  id: String,
  title: String,
  assigneeIds: [String]
});

const WorkItemSchema = new Schema({
  workItemId: { type: String, unique: true, index: true }, // The custom ID e.g. DEV-001
  workItemType: { 
    type: String, 
    required: true,
    enum: ['InternalDev', 'CustomerSupport', 'Feature', 'ChangeRequest', 'Release', 'AITools', 'MeetingAction', 'DiscussionAction'] 
  },
  title: { type: String, required: true },
  description: String,
  customer: String,
  project: String,
  module: String,
  priority: { type: String, enum: ['P0', 'P1', 'P2', 'P3'], default: 'P2' },
  status: { type: String, default: 'New' }, // We can add queue validation if needed
  slaPolicyId: String,
  teamId: String,
  ownerId: String,
  approverId: String,
  plannedStart: String, // ISO Date string
  dueDate: String,
  actualStart: String,
  actualEnd: String,
  effortEstimate: { type: Number, default: 0 },
  effortSpent: { type: Number, default: 0 },
  tags: [String],
  components: [String],
  environment: { type: String, enum: ['Dev', 'Test', 'Prod', 'Staging', 'None'] },
  dependencies: [String],
  
  attachments: [AttachmentSchema],
  comments: [CommentLogSchema],
  slaEvents: [SlaEventSchema],
  slaState: { type: String, enum: ['WithinSLA', 'AtRisk', 'Breached'], default: 'WithinSLA' },
  checklist: [ChecklistItemSchema],
  auditLog: [AuditEntrySchema],
  department: String,
  actionItems: [ActionItemSchema],
isDeleted: { type: Boolean, default: false },
  createdBy: String,
  createdAt: String,
  modifiedBy: String,
  modifiedAt: String
}, {
  timestamps: true 
});

// Map types to prefixes
const TYPE_PREFIXES = {
  InternalDev: 'DEV',
  CustomerSupport: 'SUP',
  Feature: 'FEA',
  ChangeRequest: 'CR',
  Release: 'REL',
  AITools: 'AI',
  MeetingAction: 'MTG',
  DiscussionAction: 'DSC'
};

WorkItemSchema.pre("save", async function (next) {
  if (this.isNew && !this.workItemId) {
    const prefix = TYPE_PREFIXES[this.workItemType] || 'WI';
    const counter = await Counter.findByIdAndUpdate(
      { _id: prefix },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    // Pad with zeros, e.g. DEV-005
    const seq = counter.seq.toString().padStart(3, '0');
    this.workItemId = `${prefix}-${seq}`;
  }
  next();
});

// Use workItemId as the 'id' in JSON
WorkItemSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret.workItemId;
    delete ret._id;
    delete ret.__v;
    delete ret.workItemId; // Ensure we don't duplicate
    return ret;
  }
});

export const WorkItem = model("WorkItem", WorkItemSchema);
