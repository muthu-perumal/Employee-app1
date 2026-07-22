const parseDate = (value) => {
  const [y, m, d] = String(value).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const countWorkingDays = (from, to, holidays = []) => {
  const start = parseDate(from);
  const end = parseDate(to);
  if (end < start) return 0;

  const holidaySet = new Set(holidays);
  let total = 0;
  for (let pointer = new Date(start); pointer <= end; pointer.setDate(pointer.getDate() + 1)) {
    const key = pointer.toISOString().slice(0, 10);
    if (isWeekend(pointer)) continue;
    if (holidaySet.has(key)) continue;
    total += 1;
  }
  return total;
};

const parseMinutes = (time) => {
  const [hours, minutes] = String(time).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

/** @param {{ leaveCategory?: string, startDate: string, endDate: string, startTime?: string, endTime?: string, holidays?: string[] }} input */
export const calculateLeaveDuration = ({
  leaveCategory = "multi_day",
  startDate,
  endDate,
  startTime,
  endTime,
  holidays = [],
}) => {
  if (!startDate || !endDate) {
    throw new Error("Start and end dates are required");
  }

  if (leaveCategory === "half_day") {
    return 0.5;
  }

  if (leaveCategory === "hourly_permission") {
    const startMins = parseMinutes(startTime);
    const endMins = parseMinutes(endTime);
    if (startMins == null || endMins == null || endMins <= startMins) {
      throw new Error("Valid start and end times are required for hourly permission");
    }
    const hours = (endMins - startMins) / 60;
    return Math.max(0.125, Math.round((hours / 8) * 100) / 100);
  }

  return countWorkingDays(startDate, endDate, holidays);
};

export const isPaidLeaveType = (leaveType) =>
  ["AL", "EL", "CSL", "CL", "SL"].includes(String(leaveType || "").toUpperCase());
