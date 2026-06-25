import mongoose from "mongoose";

const PatchSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    version: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    clientName: { type: String, default: "" },
    moduleName: { type: String, default: "" },
    assignedTo: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Testing", "Completed", "Failed", "On Hold"],
      default: "Pending",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    releaseDate: { type: Date, default: null },
    completedDate: { type: Date, default: null },
    notes: { type: String, default: "" },
    createdBy: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const FeedbackSchema = new mongoose.Schema(
  {
    patchId: { type: mongoose.Schema.Types.ObjectId, ref: "Patch", default: null },
    clientName: { type: String, required: true, trim: true },
    feedback: { type: String, required: true, trim: true },
    remarks: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Open", "Reviewed", "Resolved", "Rejected"],
      default: "Open",
    },
    createdBy: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const AuditLogSchema = new mongoose.Schema(
  {
    module: { type: String, default: "Publish Tracker" },
    action: { type: String, required: true },
    description: { type: String, default: "" },
    refId: { type: String, default: "" },
    userId: { type: String, default: "" },
    userName: { type: String, default: "" },
  },
  { timestamps: true }
);

const AIConversationSchema = new mongoose.Schema(
  {
    title: { type: String, default: "New Conversation" },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Patch = mongoose.models.Patch || mongoose.model("Patch", PatchSchema);
export const Feedback = mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema);
export const PublishAuditLog = mongoose.models.PublishAuditLog || mongoose.model("PublishAuditLog", AuditLogSchema);
export const AIConversation = mongoose.models.AIConversation || mongoose.model("AIConversation", AIConversationSchema);
