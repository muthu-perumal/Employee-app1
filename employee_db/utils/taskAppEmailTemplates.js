import { LOGO_CID } from "./emailService.js";

const ACCENT = "#8300E6";
const APP_URL = process.env.APP_PUBLIC_URL || "https://ez-emp-ui.azurewebsites.net";

const ACTION_LABELS = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
};

const ACTION_COLORS = {
  created: "#059669",
  updated: "#2563eb",
  deleted: "#dc2626",
};

function escapeHtml(value) {
  if (value === null || value === undefined) return "—";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

function renderRows(rows) {
  return rows
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;width:34%;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px;font-weight:500;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");
}

export function buildTaskAppEmail({
  entityLabel,
  action,
  summary,
  rows = [],
  footerNote,
  primaryAction,
  secondaryAction,
}) {
  const actionLabel = ACTION_LABELS[action] || "Updated";
  const actionColor = ACTION_COLORS[action] || ACTION_COLORS.updated;
  const timestamp = formatDate(new Date());

  const defaultPrimary = {
    label: "Open WorkHub",
    url: `${APP_URL}/tasks`,
  };
  const primary = primaryAction || defaultPrimary;
  const secondary = secondaryAction?.url ? secondaryAction : null;

  const buttonStyle = `display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;margin-right:10px;margin-top:8px;`;
  const secondaryButtonStyle = `display:inline-block;background:#ffffff;color:${ACCENT};text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;border:1px solid ${ACCENT};margin-top:8px;`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(entityLabel)} ${actionLabel}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%);padding:28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;color:rgba(255,255,255,0.85);font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">EZOFIS WorkHub</p>
                    <h1 style="margin:10px 0 0;color:#ffffff;font-size:24px;line-height:1.3;font-weight:700;">${escapeHtml(entityLabel)} ${actionLabel}</h1>
                  </td>
                  <td style="vertical-align:middle;text-align:right;width:60px;">
                    <img src="cid:${LOGO_CID}" alt="EZOFIS" width="48" style="display:block;max-width:48px;height:auto;border-radius:8px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px;">
              <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${actionColor}1a;color:${actionColor};font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${actionLabel}</span>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(summary)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;background:#fcfdff;">
                ${renderRows(rows)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">${escapeHtml(footerNote || "This is an automated notification from EZOFIS WorkHub.")}</p>
              <p style="margin:14px 0 0;">
                <a href="${primary.url}" style="${buttonStyle}">${escapeHtml(primary.label)}</a>
                ${secondary ? `<a href="${secondary.url}" style="${secondaryButtonStyle}">${escapeHtml(secondary.label)}</a>` : ""}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} EZOFIS · Employee Portal Notification</p>
              <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1;">Sent on ${timestamp}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function listValue(value) {
  if (Array.isArray(value)) {
    const items = value.filter(Boolean);
    return items.length ? items.join(", ") : "—";
  }
  return value ?? "—";
}

export function buildWorkItemEmail(action, item) {
  const id = item.workItemId || item.id || "—";
  const title = item.title || "Untitled work item";
  const openUrl = id !== "—" ? `${APP_URL}/tasks/work-items?itemId=${encodeURIComponent(id)}` : `${APP_URL}/tasks/work-items`;

  return buildTaskAppEmail({
    entityLabel: "Work Item",
    action,
    summary:
      action === "deleted"
        ? `Work item "${title}" (${id}) has been removed from the backlog.`
        : action === "created"
          ? `A new work item "${title}" has been added to the EZOFIS backlog.`
          : `Work item "${title}" (${id}) has been updated in WorkHub.`,
    primaryAction: { label: "Open Work Item", url: openUrl },
    rows: [
      ["Work Item ID", id],
      ["Title", title],
      ["Type", item.workItemType],
      ["Status", item.status],
      ["Priority", item.priority],
      ["Owner", item.ownerId],
      ["Team", item.teamId],
      ["Due Date", formatDate(item.dueDate)],
      ["Department", item.department],
      ["Description", item.description],
      ["SLA State", item.slaState],
      ["Effort Estimate", item.effortEstimate != null ? `${item.effortEstimate}h` : "—"],
    ],
  });
}

export function buildNoteEmail(action, note) {
  const id = note.noteId || note.id || "—";
  const title = note.title || "Untitled note";
  const openUrl = id !== "—" ? `${APP_URL}/tasks/notes?noteId=${encodeURIComponent(id)}` : `${APP_URL}/tasks/notes`;

  return buildTaskAppEmail({
    entityLabel: "Meeting Note",
    action,
    summary:
      action === "deleted"
        ? `Meeting note "${title}" (${id}) has been deleted.`
        : action === "created"
          ? `A new meeting note "${title}" has been captured in WorkHub.`
          : `Meeting note "${title}" (${id}) has been updated.`,
    primaryAction: { label: "Open Note", url: openUrl },
    rows: [
      ["Note ID", id],
      ["Title", title],
      ["Type", note.type],
      ["Date & Time", formatDate(note.dateTime)],
      ["Summary", note.summary],
      ["Participants", listValue(note.participants)],
      ["Decisions", listValue(note.decisions)],
      ["Risks", listValue(note.risks)],
      ["Action Items", listValue(note.actionItems)],
      ["Recording", note.recordingUrl],
      ["Created By", note.createdBy],
    ],
  });
}

export function buildMeetingEmail(action, meeting) {
  const id = meeting.meetingId || meeting.id || "—";
  const title = meeting.title || "Untitled meeting";
  const pendingActions = Array.isArray(meeting.actions)
    ? meeting.actions.filter((a) => a.status !== "Done").length
    : 0;
  const openUrl =
    id !== "—"
      ? `${APP_URL}/tasks/meetings?meetingId=${encodeURIComponent(id)}`
      : `${APP_URL}/tasks/meetings`;
  const teamsLink = meeting.teamsMeetingLink || "";

  return buildTaskAppEmail({
    entityLabel: "Meeting / Demo",
    action,
    summary:
      action === "deleted"
        ? `Meeting "${title}" (${id}) has been deleted from WorkHub.`
        : action === "created"
          ? `A new meeting "${title}" has been logged in WorkHub.`
          : `Meeting "${title}" (${id}) has been updated.`,
    primaryAction: { label: "Open Meeting", url: openUrl },
    secondaryAction: teamsLink
      ? { label: "Join Teams Meeting", url: teamsLink }
      : undefined,
    rows: [
      ["Meeting ID", id],
      ["Title", title],
      ["Type", meeting.type],
      ["Status", meeting.status],
      ["Outcome", meeting.outcome],
      ["Presenter", meeting.presenter],
      ["Organization", meeting.organization],
      ["Attendees", meeting.attendees],
      ["Notify User", meeting.notifyEmail],
      ["Meeting Time (IST)", formatDate(meeting.istTime)],
      ["Follow-up Date", formatDate(meeting.followUpDate)],
      ["Agenda", meeting.agenda],
      ["Notes", meeting.notes],
      ["Pending Actions", pendingActions],
      ["Teams Meeting Link", teamsLink],
      ["Recording Link", meeting.recordingLink],
    ],
  });
}

export function buildIssueEmail(action, issue) {
  const id = issue.issueId || issue.id || "—";
  const employee = issue.employeeName || "—";

  return buildTaskAppEmail({
    entityLabel: "Issue / Backmark",
    action,
    summary:
      action === "deleted"
        ? `Issue for ${employee} (${id}) has been deleted from WorkHub.`
        : action === "created"
          ? `A new issue has been logged for ${employee} in WorkHub.`
          : `Issue for ${employee} (${id}) has been updated.`,
    rows: [
      ["Issue ID", id],
      ["Employee", employee],
      ["Date", formatDate(issue.date)],
      ["Issue Type", issue.issueType],
      ["Severity", issue.severity],
      ["Status", issue.status],
      ["Repeated", issue.repeated],
      ["Description", issue.description],
      ["Action Taken", issue.actionTaken],
      ["Remarks", issue.remarks],
    ],
  });
}
