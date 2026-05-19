import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      enum: ["EL", "CL", "SL", "LOP"],
      required: true,
    },
    startDate: {
      type: String, // Stored as YYYY-MM-DD to match frontend string comparisons
      required: true,
    },
    endDate: {
      type: String, // Stored as YYYY-MM-DD to match frontend string comparisons
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 0.5,
    },
    reason: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "Submitted",
        "HR_Approved",
        "HR_Rejected",
        "Cancelled",
        "AutoProcessed",
      ],
      default: "Submitted",
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    hrApproverId: {
      type: String,
      default: null,
    },
    hrActionAt: {
      type: Date,
      default: null,
    },
    cancelledById: {
      type: String,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    approverRemarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);
export default LeaveRequest;
