import { sendBrandedEmail } from "./emailService.js";
import { resolveNotifyEmails } from "./emailRecipients.js";
import {
  buildWorkItemEmail,
  buildNoteEmail,
  buildMeetingEmail,
  buildIssueEmail,
} from "./taskAppEmailTemplates.js";

const ACTION_SUBJECT = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
};

async function dispatchEntityEmail({ label, action, subject, html, entity, includeCommonInbox = true }) {
  const recipients = await resolveNotifyEmails(entity, { includeCommonInbox });
  if (!recipients.length) {
    console.warn(`[email] No recipients for ${label}`);
    return;
  }

  for (const to of recipients) {
    await sendBrandedEmail({ subject, html, to });
    console.log(`[email] Sent ${label} to ${to}`);
  }
}

function fireAndForget(task, label) {
  task().catch((error) => {
    console.error(`[email] Failed to send ${label}:`, error?.message || error);
    if (error?.stack) console.error("[email] Stack:", error.stack);
  });
}

export function notifyWorkItemChange(action, item) {
  const subjectAction = ACTION_SUBJECT[action] || "Updated";
  const id = item?.workItemId || item?.id || "";
  const title = item?.title || "Work item";

  fireAndForget(
    () =>
      dispatchEntityEmail({
        label: "work item notification",
        action,
        subject: `[EZOFIS] Work Item ${subjectAction}: ${title}${id ? ` (${id})` : ""}`,
        html: buildWorkItemEmail(action, item),
        entity: item,
      }),
    "work item notification"
  );
}

export function notifyNoteChange(action, note) {
  const subjectAction = ACTION_SUBJECT[action] || "Updated";
  const id = note?.noteId || note?.id || "";
  const title = note?.title || "Meeting note";

  fireAndForget(
    () =>
      dispatchEntityEmail({
        label: "note notification",
        action,
        subject: `[EZOFIS] Meeting Note ${subjectAction}: ${title}${id ? ` (${id})` : ""}`,
        html: buildNoteEmail(action, note),
        entity: note,
      }),
    "note notification"
  );
}

export function notifyMeetingChange(action, meeting) {
  const subjectAction = ACTION_SUBJECT[action] || "Updated";
  const id = meeting?.meetingId || meeting?.id || "";
  const title = meeting?.title || "Meeting";

  fireAndForget(
    () =>
      dispatchEntityEmail({
        label: "meeting notification",
        action,
        subject: `[EZOFIS] Meeting ${subjectAction}: ${title}${id ? ` (${id})` : ""}`,
        html: buildMeetingEmail(action, meeting),
        entity: meeting,
        // Meetings: email only selected notify users — not TASK_APP_NOTIFY_EMAIL / ezallindia
        includeCommonInbox: false,
      }),
    "meeting notification"
  );
}

export function notifyIssueChange(action, issue) {
  const subjectAction = ACTION_SUBJECT[action] || "Updated";
  const id = issue?.issueId || issue?.id || "";
  const employee = issue?.employeeName || "Employee";

  fireAndForget(
    () =>
      dispatchEntityEmail({
        label: "issue notification",
        action,
        subject: `[EZOFIS] Issue ${subjectAction}: ${employee}${id ? ` (${id})` : ""}`,
        html: buildIssueEmail(action, issue),
        entity: issue,
      }),
    "issue notification"
  );
}

export function resolveWorkItemAction(body, fallback = "updated") {
  if (body?.isDeleted === true) return "deleted";
  return fallback;
}
