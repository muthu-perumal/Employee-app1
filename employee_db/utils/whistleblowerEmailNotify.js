import { sendBrandedEmailWithAttachments } from "./emailService.js";
import { buildTaskAppEmail } from "./taskAppEmailTemplates.js";
import { getWhistleblowerReviewers } from "./whistleblowerAccess.js";

const APP_URL = process.env.APP_PUBLIC_URL || "https://ez-emp-ui.azurewebsites.net";

function buildWhistleblowerEmail(report) {
  const reporter =
    report.isAnonymous || !report.reporterName
      ? "Anonymous"
      : `${report.reporterName}${report.reporterEmail ? ` (${report.reporterEmail})` : ""}`;

  return buildTaskAppEmail({
    entityLabel: "Whistleblower Report",
    action: "created",
    summary: `A new confidential report (${report.referenceId}) has been submitted and requires review by designated recipients.`,
    primaryAction: {
      label: "Open Whistleblower Portal",
      url: `${APP_URL.replace(/\/$/, "")}/WhistleblowerReport`,
    },
    footerNote:
      "This message is sent only to designated whistleblower reviewers. Handle per the EZOFIS Whistleblower Policy.",
    rows: [
      ["Reference ID", report.referenceId],
      ["Reporting mode", report.isAnonymous ? "Anonymous" : "Identified"],
      ["Reporter", reporter],
      ["Category", report.category],
      ["Incident date", report.incidentDate || "—"],
      ["Department / people", report.department || "—"],
      ["Description", report.description],
      ["Attachments", report.attachments?.length ? `${report.attachments.length} file(s)` : "None"],
      ["Submitted at", report.createdAt || new Date()],
    ],
  });
}

export async function notifyWhistleblowerSubmission(report) {
  const recipients = getWhistleblowerReviewers();
  if (!recipients.length) {
    console.warn("[email] No whistleblower reviewers configured");
    return;
  }

  const subject = `[EZOFIS] Confidential Report — ${report.referenceId} (${report.category})`;
  const html = buildWhistleblowerEmail(report);
  const attachments = (report.attachments || []).map((file) => ({
    filename: file.filename,
    contentType: file.contentType || "application/octet-stream",
    content: Buffer.from(file.data, "base64"),
  }));

  for (const to of recipients) {
    await sendBrandedEmailWithAttachments({ subject, html, to, attachments });
    console.log(`[email] Whistleblower notification sent to ${to}`);
  }
}
