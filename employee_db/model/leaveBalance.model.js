import mongoose from "mongoose";

const leaveBalanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
    },
    // Annual Leave Pool
    AL_allocated: { type: Number, default: 0 },
    AL_used: { type: Number, default: 0 },
    AL_available: { type: Number, default: 0 },

    // Casual/Sick Leave Pool
    CSL_allocated: { type: Number, default: 0 },
    CSL_used: { type: Number, default: 0 },
    CSL_available: { type: Number, default: 0 },

    // Old fields (kept for compatibility during migration if needed, but defaulted to 0)
    EL_allocated: { type: Number, default: 0 },
    EL_used: { type: Number, default: 0 },
    EL_available: { type: Number, default: 0 },
    CL_allocated: { type: Number, default: 0 },
    CL_used: { type: Number, default: 0 },
    CL_available: { type: Number, default: 0 },
    SL_allocated: { type: Number, default: 0 },
    SL_used: { type: Number, default: 0 },
    SL_available: { type: Number, default: 0 },

    lastCreditMonth: {
      type: String, // format: "YYYY-MM"
      default: null,
    },
    lastRecalculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure one balance record per employee per year
leaveBalanceSchema.index({ employeeId: 1, year: 1 }, { unique: true });

const LeaveBalance = mongoose.model("LeaveBalance", leaveBalanceSchema);
export default LeaveBalance;
