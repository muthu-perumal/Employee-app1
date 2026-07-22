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
      enum: ["AL", "CSL", "EL", "CL", "SL", "LOP", "Permission", "HalfDay"],
      required: true,
    },
    leaveCategory: {
      type: String,
      enum: ["multi_day", "half_day", "hourly_permission"],
      default: "multi_day",
    },
    startDate: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      required: true,
    },
    startTime: {
      type: String,
      default: null,
    },
    endTime: {
      type: String,
      default: null,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 0.125,
    },
    reason: {
      type: String,
      default: "",
    },
    isPaidLeave: {
      type: Boolean,
      default: true,
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
    whatsappNotifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);
export default LeaveRequest;
