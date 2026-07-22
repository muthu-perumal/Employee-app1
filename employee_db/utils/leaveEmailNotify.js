import { sendBrandedEmail } from "./emailService.js";
import { buildTaskAppEmail } from "./taskAppEmailTemplates.js";
import Employee from "../model/employee.model.js";
import { getLeaveCategoryLabel } from "./leaveWhatsAppNotify.js";

const DEFAULT_APPROVER_EMAILS = [
  "arun@ezofis.com",
  "muthu.perumal@ezofis.com",
  "hilda.merlin@ezofis.com",
];

const LEAVE_TYPE_LABELS = {
  AL: "Annual Leave (AL)",
  EL: "Earned Leave (EL)",
  CSL: "Casual/Sick Leave (CSL)",
  CL: "Casual Leave (CL)",
  SL: "Sick Leave (SL)",
  LOP: "Loss of Pay (LOP)",
  Permission: "Permission",
  HalfDay: "Half Day",
};

function splitEmails(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getApproverEmails() {
  const fromEnv = splitEmails(process.env.LEAVE_APPROVER_EMAILS);
  const emails = fromEnv.length ? fromEnv : DEFAULT_APPROVER_EMAILS;
  return [...new Set(emails.map((email) => email.toLowerCase()))];
}

function formatEmployeeName(employee, fallbackId) {
  if (!employee) return fallbackId || "Employee";
  return (
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
    employee.email ||
    fallbackId
  );
}

function formatTime12(time24) {
  if (!time24) return "—";
  const [h, m] = String(time24).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return String(time24);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDuration(leaveRequest) {
  const category = leaveRequest.leaveCategory || "multi_day";
  if (category === "hourly_permission") {
    if (!leaveRequest.startTime || !leaveRequest.endTime) return "—";
    const [sh, sm] = String(leaveRequest.startTime).split(":").map(Number);
    const [eh, em] = String(leaveRequest.endTime).split(":").map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm);
    if (!Number.isFinite(mins) || mins <= 0) return "—";
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    if (hours && rem) return `${hours}h ${rem}m`;
    if (hours) return `${hours} hour${hours === 1 ? "" : "s"}`;
    return `${rem} min`;
  }

  const days = Number(leaveRequest.totalDays) || 0;
  if (category === "half_day") return "0.5 day";
  return `${days} day${days === 1 ? "" : "s"}`;
}

function formatDateRange(leaveRequest) {
  const start = leaveRequest.startDate || "—";
  const end = leaveRequest.endDate || start;
  if (start === end) return start;
  return `${start} → ${end}`;
}

function getLeaveManageUrl() {
  const base = (
    process.env.APP_PUBLIC_URL || "https://ez-emp-ui.azurewebsites.net"
  ).replace(/\/$/, "");
  return `${base}/LeaveManagement`;
}

export function buildLeaveApplicationEmail({ leaveRequest, employeeName, employeeEmail }) {
  const category = leaveRequest.leaveCategory || "multi_day";
  const categoryLabel = getLeaveCategoryLabel(category);
  const leaveTypeLabel =
    LEAVE_TYPE_LABELS[leaveRequest.leaveType] || leaveRequest.leaveType || "Leave";
  const manageUrl = getLeaveManageUrl();
  const hasTime =
    category === "half_day" || category === "hourly_permission";

  return buildTaskAppEmail({
    entityLabel: "Leave Request",
    action: "created",
    summary: `${employeeName} has submitted a ${categoryLabel.toLowerCase()} leave request and is awaiting your approval.`,
    primaryAction: {
      label: "Open Leave Management",
      url: manageUrl,
    },
    footerNote:
      "Please review this request in Leave Management and approve or reject it. This is an automated notification from EZOFIS WorkHub.",
    rows: [
      ["Employee", employeeName],
      ["Employee ID", leaveRequest.employeeId],
      ["Email", employeeEmail || "—"],
      ["Request Type", categoryLabel],
      ["Leave Type", leaveTypeLabel],
      ["Date(s)", formatDateRange(leaveRequest)],
      ...(hasTime
        ? [
            [
              "Time",
              `${formatTime12(leaveRequest.startTime)} → ${formatTime12(
                leaveRequest.endTime
              )}`,
            ],
          ]
        : []),
      ["Duration", formatDuration(leaveRequest)],
      ["Paid Leave", leaveRequest.isPaidLeave ? "Yes" : "No"],
      ["Reason", leaveRequest.reason || "—"],
      ["Status", leaveRequest.status || "Submitted"],
      ["Applied At", leaveRequest.appliedAt || new Date()],
    ],
  });
}

/**
 * Email leave approvers when an employee applies for leave.
 * Fire-and-forget from createLeave — failures are logged only.
 */
export function notifyLeaveApplicationEmail(leaveRequest) {
  const task = async () => {
    const employee = await Employee.findOne({
      employee_id: leaveRequest.employeeId,
      isDeleted: false,
    })
      .select("first_name last_name email employee_id")
      .lean();

    const employeeName = formatEmployeeName(
      employee,
      leaveRequest.employeeId
    );
    const employeeEmail = employee?.email || "";
    const categoryLabel = getLeaveCategoryLabel(
      leaveRequest.leaveCategory || "multi_day"
    );
    const subject = `[EZOFIS] Leave Approval Needed: ${employeeName} — ${categoryLabel} (${formatDateRange(leaveRequest)})`;
    const html = buildLeaveApplicationEmail({
      leaveRequest,
      employeeName,
      employeeEmail,
    });

    const recipients = getApproverEmails();
    if (!recipients.length) {
      console.warn("[email] No leave approver recipients configured");
      return;
    }

    for (const to of recipients) {
      await sendBrandedEmail({ subject, html, to });
    }
  };

  task().catch((error) => {
    console.error(
      "[email] Failed to send leave application mail:",
      error?.message || error
    );
    if (error?.stack) console.error("[email] Stack:", error.stack);
  });
}
