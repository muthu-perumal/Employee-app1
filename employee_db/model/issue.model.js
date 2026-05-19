import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    issueId: {
      type: String,
      unique: true,
      index: true,
    },

    employeeId: {
      type: String,
      default: "",
    },

    employeeName: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
    },

    issueType: {
      type: String,
      enum: [
        "Delay",
        "Quality",
        "Behavior",
        "Policy Violation",
        "Availability",
        "Communication",
      ],
      required: true,
    },

    severity: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    description: {
      type: String,
      default: "",
    },

    repeated: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },

    status: {
      type: String,
      enum: ["Pending", "Improving", "Resolved"],
      default: "Pending",
    },

    actionTaken: {
      type: String,
      default: "",
    },

    remarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

issueSchema.pre("save", function (next) {
  if (!this.issueId) {
    this.issueId = `ISS-${Date.now()}`;
  }
  next();
});

export const Issue = mongoose.model("Issue", issueSchema);