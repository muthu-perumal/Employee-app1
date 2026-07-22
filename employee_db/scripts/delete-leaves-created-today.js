/**
 * Delete leave requests created today (IST).
 * Usage: node scripts/delete-leaves-created-today.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../utils/DbConnector.js";
import LeaveRequest from "../model/leaveRequest.model.js";
import { formatDateIST } from "../utils/attendanceUtils.js";

const today = formatDateIST(new Date());
const start = new Date(`${today}T00:00:00+05:30`);
const end = new Date(`${today}T23:59:59.999+05:30`);

await connectDB(process.env.MONGODB_CONNECTION_STRING, process.env.DB_NAME);

const preview = await LeaveRequest.find({
  createdAt: { $gte: start, $lte: end },
})
  .select("employeeId leaveType leaveCategory startDate status createdAt reason")
  .lean();

console.log(`Today (IST): ${today}`);
console.log(`Found ${preview.length} record(s) to delete:\n`);

preview.forEach((r, i) => {
  console.log(
    `${i + 1}. ${r.employeeId} | ${r.leaveType} | ${r.leaveCategory || "-"} | ${r.startDate} | ${r.status} | ${(r.reason || "").slice(0, 50)}`
  );
});

const result = await LeaveRequest.deleteMany({
  createdAt: { $gte: start, $lte: end },
});

console.log(`\nDeleted ${result.deletedCount} leave record(s) created today.`);

await mongoose.disconnect();
