import mongoose from "mongoose";

const meetingActionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    owner: { type: String, default: "" },
    dueDate: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Done"],
      default: "Pending",
    },
  },
  { _id: true }
);

const meetingSchema = new mongoose.Schema(
  {
    meetingId: {
      type: String,
      unique: true,
      index: true,
    },
    title: { type: String, required: true },
    type: { type: String, default: "Client Demo" },
    outcome: { type: String, default: "Positive" },
    status: { type: String, default: "Completed" },
    presenter: { type: String, default: "" },
    organization: { type: String, default: "" },
    attendees: { type: String, default: "" },
    istTime: { type: String, default: "" },
    agenda: { type: String, default: "" },
    notes: { type: String, default: "" },
    followUpDate: { type: String, default: "" },
    recordingLink: { type: String, default: "" },
    teamsMeetingLink: { type: String, default: "" },
    notifyUserId: { type: String, default: "" },
    notifyEmail: { type: String, default: "" },
    actions: [meetingActionSchema],
  },
  { timestamps: true }
);

meetingSchema.pre("save", function (next) {
  if (!this.meetingId) {
    this.meetingId = `MTG-${Date.now()}`;
  }
  next();
});

export const Meeting = mongoose.model("Meeting", meetingSchema);