import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    contentType: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
    data: { type: String, required: true },
  },
  { _id: false }
);

const whistleblowerReportSchema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true, index: true },
    isAnonymous: { type: Boolean, default: true },
    reporterName: { type: String, default: "" },
    reporterEmail: { type: String, default: "", index: true },
    submitterEmail: { type: String, default: "", index: true },
    category: { type: String, required: true },
    incidentDate: { type: String, default: "" },
    department: { type: String, default: "" },
    description: { type: String, required: true },
    attachments: { type: [attachmentSchema], default: [] },
    status: {
      type: String,
      enum: ["Submitted", "Verified", "Rejected", "Closed"],
      default: "Submitted",
      index: true,
    },
    reviewerRemarks: { type: String, default: "" },
    verifiedBy: { type: String, default: "" },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("WhistleblowerReport", whistleblowerReportSchema);
