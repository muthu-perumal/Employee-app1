import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    date: {
      type: String, // Stored as YYYY-MM-DD
      required: true,
      unique: true, // Assuming one holiday entry per date per region (or globally if region is All)
    },
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: "Government",
    },
    region: {
      type: String,
      default: "All",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Holiday = mongoose.model("Holiday", holidaySchema);
export default Holiday;
