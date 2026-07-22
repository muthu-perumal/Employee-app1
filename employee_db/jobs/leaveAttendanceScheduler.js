import cron from "node-cron";
import Attendance from "../model/attendance.model.js";
import Employee from "../model/employee.model.js";
import LeaveRequest from "../model/leaveRequest.model.js";
import Holiday from "../model/holiday.model.js";
import { formatDateIST } from "../utils/attendanceUtils.js";
import {
  notifyMissingAttendance,
  notifyMorningLeaveDigest,
  runScheduledLeaveNotifications,
} from "../utils/leaveWhatsAppNotify.js";

const isWorkingDay = async (dateKey) => {
  const date = new Date(`${dateKey}T12:00:00`);
  const day = date.getDay();
  if (day === 0 || day === 6) return false;

  const holiday = await Holiday.findOne({ date: dateKey, isActive: true }).lean();
  return !holiday;
};

const getEmployeeNameMap = async (employeeIds) => {
  const employees = await Employee.find({
    employee_id: { $in: employeeIds },
    isDeleted: false,
  })
    .select("employee_id first_name last_name name email")
    .lean();

  const map = new Map();
  for (const emp of employees) {
    map.set(
      emp.employee_id,
      emp.name ||
        `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
        emp.email ||
        emp.employee_id
    );
  }
  return map;
};

export async function runMorningLeaveDigest() {
  const today = formatDateIST(new Date());
  if (!(await isWorkingDay(today))) return;

  const [attendanceRows, approvedLeaves] = await Promise.all([
    Attendance.find({ date: today, status: "On Leave" }).lean(),
    LeaveRequest.find({
      status: { $in: ["HR_Approved", "AutoProcessed", "Submitted"] },
      startDate: { $lte: today },
      endDate: { $gte: today },
    }).lean(),
  ]);

  const ids = new Set([
    ...attendanceRows.map((row) => row.employeeId),
    ...approvedLeaves.map((row) => row.employeeId),
  ]);

  if (!ids.size) return;

  const nameMap = await getEmployeeNameMap([...ids]);
  const names = [...ids].map((id) => nameMap.get(id) || id);
  await notifyMorningLeaveDigest(names, today);
}

export async function runAttendanceReminder() {
  const today = formatDateIST(new Date());
  if (!(await isWorkingDay(today))) return;

  const activeEmployees = await Employee.find({
    isDeleted: false,
    status: "active",
  })
    .select("employee_id")
    .lean();

  const activeIds = activeEmployees.map((emp) => emp.employee_id).filter(Boolean);
  if (!activeIds.length) return;

  const [todayAttendance, onLeaveToday, approvedLeaveToday] = await Promise.all([
    Attendance.find({ date: today, employeeId: { $in: activeIds } }).lean(),
    Attendance.find({ date: today, status: "On Leave" }).lean(),
    LeaveRequest.find({
      status: { $in: ["HR_Approved", "AutoProcessed", "Submitted"] },
      startDate: { $lte: today },
      endDate: { $gte: today },
    }).lean(),
  ]);

  const registered = new Set(todayAttendance.map((row) => row.employeeId));
  const onLeave = new Set([
    ...onLeaveToday.map((row) => row.employeeId),
    ...approvedLeaveToday.map((row) => row.employeeId),
  ]);

  const missingIds = activeIds.filter(
    (id) => !registered.has(id) && !onLeave.has(id)
  );

  if (!missingIds.length) return;

  const nameMap = await getEmployeeNameMap(missingIds);
  const names = missingIds.map((id) => nameMap.get(id) || id);
  await notifyMissingAttendance(names, today);
}

export function startLeaveAttendanceSchedulers() {
  if (String(process.env.WHATSAPP_ENABLED || "").toLowerCase() !== "true") {
    console.log("[scheduler] WhatsApp disabled — leave/attendance cron not started");
    return;
  }

  cron.schedule(
    "0 7 * * *",
    () => {
      runScheduledLeaveNotifications().catch((error) =>
        console.error("[scheduler] 7am leave notify failed:", error?.message || error)
      );
      runMorningLeaveDigest().catch((error) =>
        console.error("[scheduler] 7am leave digest failed:", error?.message || error)
      );
    },
    { timezone: "Asia/Kolkata" }
  );

  cron.schedule(
    "45 9 * * 1-5",
    () => {
      runAttendanceReminder().catch((error) =>
        console.error("[scheduler] 9:45am attendance reminder failed:", error?.message || error)
      );
    },
    { timezone: "Asia/Kolkata" }
  );

  console.log("[scheduler] WhatsApp leave/attendance jobs scheduled (7:00 AM & 9:45 AM IST)");
}
