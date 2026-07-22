/**
 * Resend WhatsApp for leave requests not yet notified today.
 * Usage: node scripts/resend-leave-whatsapp.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../utils/DbConnector.js";
import LeaveRequest from "../model/leaveRequest.model.js";
import { notifyLeaveApproved } from "../utils/leaveWhatsAppNotify.js";
import { formatDateIST } from "../utils/attendanceUtils.js";

await connectDB(process.env.MONGODB_CONNECTION_STRING, process.env.DB_NAME);

const today = formatDateIST(new Date());
const start = new Date(`${today}T00:00:00+05:30`);
const end = new Date(`${today}T23:59:59.999+05:30`);

const pending = await LeaveRequest.find({
  whatsappNotifiedAt: null,
  status: { $in: ["HR_Approved", "AutoProcessed"] },
  createdAt: { $gte: start, $lte: end },
})
  .sort({ createdAt: -1 })
  .lean();

console.log(`Found ${pending.length} leave(s) without WhatsApp notification.\n`);

for (const leave of pending) {
  console.log(`Sending: ${leave.employeeId} | ${leave.leaveType} | ${leave.startDate}`);
  const result = await notifyLeaveApproved(leave);
  if (result?.sent) {
    await LeaveRequest.updateOne(
      { _id: leave._id },
      { whatsappNotifiedAt: new Date() }
    );
    console.log("  ✓ Sent\n");
  } else {
    console.log("  ✗ Failed:", result?.error || "unknown", "\n");
  }
}

await mongoose.disconnect();
