/**
 * Trigger WhatsApp group message for Permission or Half Day leave.
 *
 * IMPORTANT: Stop the backend (npm run dev) before running — only one
 * process can use the WhatsApp session at a time.
 *
 * Usage:
 *   # Permission — custom sample message
 *   node scripts/trigger-leave-whatsapp.js permission --employee EZO/IND/0036 --date 2026-07-21 --from 15:00 --to 16:00 --reason "Doctor visit"
 *
 *   # Half day — custom sample message
 *   node scripts/trigger-leave-whatsapp.js half-day --employee EZO/IND/0036 --date 2026-07-21 --from 09:00 --to 13:00 --reason "Personal work"
 *
 *   # Send for latest permission / half-day record in database
 *   node scripts/trigger-leave-whatsapp.js permission --latest
 *   node scripts/trigger-leave-whatsapp.js half-day --latest
 *
 *   # Send for a specific leave request ID
 *   node scripts/trigger-leave-whatsapp.js permission --id 6789abc123def
 *
 * Options:
 *   --employee   Employee ID (required unless --latest or --id)
 *   --date       Leave date YYYY-MM-DD (default: today IST)
 *   --from       Start time HH:mm (default permission: next hour, half-day: 09:00)
 *   --to         End time HH:mm (default permission: +1h, half-day: 13:00)
 *   --reason     Reason text (default: "Test notification")
 *   --latest     Use most recent matching leave from DB
 *   --id         MongoDB _id of leave request
 *   --dry-run    Print message only, do not send
 */
import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../utils/DbConnector.js";
import LeaveRequest from "../model/leaveRequest.model.js";
import {
  buildLeaveApplicationMessage,
  notifyLeaveApproved,
} from "../utils/leaveWhatsAppNotify.js";
import Employee from "../model/employee.model.js";
import { formatDateIST } from "../utils/attendanceUtils.js";

const MODES = {
  permission: {
    leaveType: "Permission",
    leaveCategory: "hourly_permission",
    defaultFrom: "14:00",
    defaultTo: "15:00",
    defaultDays: 0.125,
  },
  "half-day": {
    leaveType: "HalfDay",
    leaveCategory: "half_day",
    defaultFrom: "09:00",
    defaultTo: "13:00",
    defaultDays: 0.5,
  },
};

function parseArgs(argv) {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const mode = positional[0];

  const get = (flag, fallback = "") => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--")
      ? argv[i + 1]
      : fallback;
  };

  return {
    mode,
    employee: get("--employee"),
    date: get("--date", formatDateIST(new Date())),
    from: get("--from"),
    to: get("--to"),
    reason: get("--reason", "Test notification"),
    latest: argv.includes("--latest"),
    id: get("--id"),
    dryRun: argv.includes("--dry-run"),
  };
}

function usage() {
  console.log(`
Trigger WhatsApp for Permission or Half Day leave

  node scripts/trigger-leave-whatsapp.js permission [options]
  node scripts/trigger-leave-whatsapp.js half-day [options]

Options:
  --employee ID    Employee ID
  --date YYYY-MM-DD
  --from HH:mm     Start time
  --to HH:mm       End time
  --reason TEXT
  --latest         Latest matching record from DB
  --id MONGO_ID    Specific leave request _id
  --dry-run        Preview message only

Examples:
  node scripts/trigger-leave-whatsapp.js permission --employee EZO/IND/0036 --from 15:00 --to 15:15 --reason "Test"
  node scripts/trigger-leave-whatsapp.js half-day --latest
`);
}

const args = parseArgs(process.argv.slice(2));

if (!args.mode || !MODES[args.mode]) {
  usage();
  process.exit(1);
}

if (String(process.env.WHATSAPP_ENABLED || "").toLowerCase() !== "true") {
  console.error("WHATSAPP_ENABLED is not true in employee_db/.env");
  process.exit(1);
}

const cfg = MODES[args.mode];
const startTime = args.from || cfg.defaultFrom;
const endTime = args.to || cfg.defaultTo;

await connectDB(process.env.MONGODB_CONNECTION_STRING, process.env.DB_NAME);

let leaveRequest;

if (args.id) {
  leaveRequest = await LeaveRequest.findById(args.id).lean();
  if (!leaveRequest) {
    console.error(`Leave request not found: ${args.id}`);
    process.exit(1);
  }
} else if (args.latest) {
  const filter =
    args.mode === "permission"
      ? { leaveCategory: "hourly_permission", leaveType: "Permission" }
      : { leaveCategory: "half_day" };

  leaveRequest = await LeaveRequest.findOne(filter)
    .sort({ createdAt: -1 })
    .lean();

  if (!leaveRequest) {
    console.error(`No ${args.mode} leave record found in database.`);
    process.exit(1);
  }
} else {
  if (!args.employee) {
    console.error("--employee is required (or use --latest / --id)");
    usage();
    process.exit(1);
  }
  leaveRequest = {
    employeeId: args.employee,
    leaveType: cfg.leaveType,
    leaveCategory: cfg.leaveCategory,
    startDate: args.date,
    endDate: args.date,
    startTime,
    endTime,
    totalDays: cfg.defaultDays,
    reason: args.reason,
    status: "Submitted",
  };
}

const employee = await Employee.findOne({
  employee_id: leaveRequest.employeeId,
})
  .select("employee_id first_name last_name name email")
  .lean();

const employeeName =
  employee?.name ||
  `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim() ||
  leaveRequest.employeeId;

const message = buildLeaveApplicationMessage(leaveRequest, employeeName, {
  approved: true,
});

console.log(`Mode: ${args.mode}`);
console.log(`Employee: ${employeeName} (${leaveRequest.employeeId})`);
console.log(`Date: ${leaveRequest.startDate}`);
if (leaveRequest.startTime && leaveRequest.endTime) {
  console.log(`Time: ${leaveRequest.startTime} → ${leaveRequest.endTime}`);
}
console.log(`Reason: ${leaveRequest.reason || "—"}`);
console.log("\n--- Message preview ---\n");
console.log(message);
console.log("\n-----------------------\n");

if (args.dryRun) {
  console.log("Dry run — message not sent.");
  await mongoose.disconnect();
  process.exit(0);
}

console.log("Sending to WhatsApp group...\n");

const result = await notifyLeaveApproved(leaveRequest);

if (result?.sent) {
  if (leaveRequest._id) {
    await LeaveRequest.updateOne(
      { _id: leaveRequest._id },
      { whatsappNotifiedAt: new Date() }
    );
  }
  console.log("✅ Message delivered to group!");
} else {
  console.error("❌ Failed:", result?.error || result?.skipped || "unknown");
  console.error("\nTip: Stop the backend server first, then run this script again.");
  process.exitCode = 1;
}

await mongoose.disconnect();
process.exit(process.exitCode || 0);
