import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    lead: { type: String }, // Can be name or ID
    members: [{ type: String }], // IDs of employees
    department: { type: String },
    keyskills: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Team = mongoose.model("Team", teamSchema);
