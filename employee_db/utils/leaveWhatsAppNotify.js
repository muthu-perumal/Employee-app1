import Employee from "../model/employee.model.js";
import LeaveRequest from "../model/leaveRequest.model.js";
import {
  fireWhatsAppDirectMessage,
  fireWhatsAppGroupMessage,
  sendWhatsAppGroupMessage,
} from "./whatsappClient.js";
import { isPaidLeaveType } from "./leaveDuration.js";
import { formatDateIST } from "./attendanceUtils.js";

const LEAVE_CATEGORY_LABELS = {
  multi_day: "Full Day",
  half_day: "Half Day",
  hourly_permission: "Permission",
};

const formatEmployeeName = (employee, fallbackId) => {
  if (!employee) return fallbackId || "Employee";
  return (
    employee.name ||
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
    employee.email ||
    fallbackId
  );
};

const formatTime12 = (time24) => {
  if (!time24) return "—";
  const [h, m] = String(time24).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

export const getLeaveCategoryLabel = (category) =>
  LEAVE_CATEGORY_LABELS[category] || "Leave";

export const buildLeaveApplicationMessage = (leaveRequest, employeeName, { approved = false } = {}) => {
  const category = leaveRequest.leaveCategory || "multi_day";
  const reason = leaveRequest.reason || "—";
  const approvedTag = approved ? " — Approved" : "";

  if (category === "hourly_permission") {
    const mins =
      leaveRequest.startTime && leaveRequest.endTime
        ? (() => {
            const [sh, sm] = String(leaveRequest.startTime).split(":").map(Number);
            const [eh, em] = String(leaveRequest.endTime).split(":").map(Number);
            return eh * 60 + em - (sh * 60 + sm);
          })()
        : 0;
    const hours = mins > 0 ? Math.floor(mins / 60) : 0;
    const rem = mins > 0 ? mins % 60 : 0;
    const duration =
      hours && rem
        ? `${hours}h ${rem}m`
        : hours
          ? `${hours} hour${hours === 1 ? "" : "s"}`
          : rem
            ? `${rem} min`
            : "—";
    return (
      `🕐 *Permission${approved ? " Approved" : " Request"}*\n` +
      `Employee: ${employeeName}\n` +
      `Date: ${leaveRequest.startDate}\n` +
      `Time: ${formatTime12(leaveRequest.startTime)} → ${formatTime12(leaveRequest.endTime)}\n` +
      `Duration: ${duration}\n` +
      `Reason: ${reason}\n` +
      `— EZOFIS Employee Portal`
    );
  }

  if (category === "half_day") {
    return (
      `🕐 *Half Day Leave${approvedTag}*\n` +
      `Employee: ${employeeName}\n` +
      `Date: ${leaveRequest.startDate}\n` +
      `Time: ${formatTime12(leaveRequest.startTime)} → ${formatTime12(leaveRequest.endTime)}\n` +
      `Reason: ${reason}\n` +
      `— EZOFIS Employee Portal`
    );
  }

  const dateLine =
    leaveRequest.startDate === leaveRequest.endDate
      ? leaveRequest.startDate
      : `${leaveRequest.startDate} → ${leaveRequest.endDate}`;

  const dayCount =
    leaveRequest.totalDays === 1
      ? "1 day"
      : Number.isInteger(leaveRequest.totalDays)
        ? `${leaveRequest.totalDays} days`
        : `${leaveRequest.totalDays} day(s)`;

  return (
    `🏖️ *Full Day Leave${approvedTag}*\n` +
    `Employee: ${employeeName}\n` +
    `Date: ${dateLine}\n` +
    `Duration: ${dayCount}\n` +
    `Reason: ${reason}\n` +
    `— EZOFIS Employee Portal`
  );
};

/** Send group notification when leave is approved. */
export async function notifyLeaveApproved(leaveRequest) {
  const employee = await Employee.findOne({
    employee_id: leaveRequest.employeeId,
  })
    .select("employee_id first_name last_name name email")
    .lean();

  const employeeName = formatEmployeeName(employee, leaveRequest.employeeId);
  const message = buildLeaveApplicationMessage(leaveRequest, employeeName, {
    approved: true,
  });

  const result = await sendWhatsAppGroupMessage(message);
  if (!result?.ok && !result?.skipped) {
    console.error("[leave] Group WhatsApp failed:", result?.error || "unknown error");
  }
  return { sent: !!result?.ok, immediate: true, scheduled: false, error: result?.error };
}

/** @deprecated Use notifyLeaveApproved — kept for scripts */
export async function notifyLeaveApplication(leaveRequest) {
  return notifyLeaveApproved(leaveRequest);
}

export async function runScheduledLeaveNotifications() {
  const today = formatDateIST(new Date());

  const pending = await LeaveRequest.find({
    startDate: today,
    status: { $in: ["HR_Approved", "AutoProcessed"] },
    whatsappNotifiedAt: null,
  }).lean();

  for (const leave of pending) {
    const employee = await Employee.findOne({ employee_id: leave.employeeId })
      .select("employee_id first_name last_name name email")
      .lean();

    const employeeName = formatEmployeeName(employee, leave.employeeId);
    const message = buildLeaveApplicationMessage(leave, employeeName, {
      approved: true,
    });

    try {
      await sendWhatsAppGroupMessage(message);
      await LeaveRequest.updateOne(
        { _id: leave._id },
        { whatsappNotifiedAt: new Date() }
      );
    } catch (error) {
      console.error(
        "[scheduler] Leave WhatsApp failed:",
        error?.message || error
      );
    }
  }
}

export async function notifyOnLeaveMarked(employeeIds = [], dateLabel) {
  if (!employeeIds.length) return;

  const employees = await Employee.find({ employee_id: { $in: employeeIds } })
    .select("employee_id first_name last_name name email")
    .lean();

  const names = employeeIds.map((id) => {
    const emp = employees.find((e) => e.employee_id === id);
    return formatEmployeeName(emp, id);
  });

  const list =
    names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;

  const message = `🏖️ *On Leave Update*\n${list} ${names.length > 1 ? "are" : "is"} on Full Day leave for ${dateLabel}.\n— EZOFIS Employee Portal`;

  fireWhatsAppGroupMessage(message);
}

export async function notifyMorningLeaveDigest(onLeaveNames = [], dateLabel) {
  if (!onLeaveNames.length) return;

  const list = onLeaveNames.join("\n• ");
  const message = `🌅 *Morning Leave List — ${dateLabel}*\n\n• ${list}\n\nPlease plan accordingly.\n— EZOFIS Employee Portal`;

  fireWhatsAppGroupMessage(message);
}

export async function notifyMissingAttendance(missingNames = [], dateLabel) {
  if (!missingNames.length) return;

  const list = missingNames.join("\n• ");
  const message = `⏰ *Attendance Reminder — ${dateLabel}*\n\nThe following employees have not registered attendance yet:\n• ${list}\n\n— EZOFIS Employee Portal`;

  fireWhatsAppGroupMessage(message);
}

export async function notifyPaidLeaveSubmitted(leaveRequest) {
  if (!isPaidLeaveType(leaveRequest.leaveType)) return;

  const employee = await Employee.findOne({
    employee_id: leaveRequest.employeeId,
  })
    .select("employee_id first_name last_name name email")
    .lean();

  const employeeName = formatEmployeeName(employee, leaveRequest.employeeId);
  const message = buildLeaveApplicationMessage(leaveRequest, employeeName, {
    approved: true,
  });

  const concernedPhones = String(process.env.WHATSAPP_PAID_LEAVE_PHONES || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const phone of concernedPhones) {
    fireWhatsAppDirectMessage(phone, message);
  }
}
