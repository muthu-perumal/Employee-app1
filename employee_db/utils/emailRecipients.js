import Employee from "../model/employee.model.js";

function splitValues(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function resolveNotifyEmails(entity = {}) {
  const emails = new Set();

  const common = process.env.TASK_APP_NOTIFY_EMAIL;
  if (common) {
    splitValues(common).forEach((email) => emails.add(email.toLowerCase()));
  }

  splitValues(entity.notifyEmail).forEach((email) => {
    emails.add(email.toLowerCase());
  });

  try {
    const userIds = splitValues(entity.notifyUserId);
    if (userIds.length) {
      const employees = await Employee.find({
        employee_id: { $in: userIds.map(String) },
      }).select("email employee_id");

      employees.forEach((employee) => {
        if (employee?.email) {
          emails.add(employee.email.trim().toLowerCase());
        }
      });
    }
  } catch (error) {
    console.error("[email] Error resolving employee emails:", error?.message || error);
  }

  return [...emails].filter(Boolean);
}
