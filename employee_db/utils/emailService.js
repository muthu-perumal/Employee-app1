import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sendSmtpHtml } from "./smtpClient.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, "../assets/email/ezofis-logo.png");
export const LOGO_CID = "ezofis-logo@ezofis.com";

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function buildMultipartBody(html, attachments) {
  const boundary = `----=_Ezofis_${Date.now()}`;
  const lines = [];

  lines.push(`--${boundary}`);
  lines.push("Content-Type: text/html; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: 8bit");
  lines.push("");
  lines.push(html);

  for (const attachment of attachments) {
    const fileBuffer = fs.readFileSync(attachment.path);
    const base64 = fileBuffer.toString("base64");
    const wrapped = base64.match(/.{1,76}/g)?.join("\r\n") || base64;

    lines.push(`--${boundary}`);
    lines.push(`Content-Type: ${attachment.contentType}`);
    lines.push("Content-Transfer-Encoding: base64");
    lines.push(`Content-ID: <${attachment.cid}>`);
    lines.push(`Content-Disposition: inline; filename="${attachment.filename}"`);
    lines.push("");
    lines.push(wrapped);
  }

  lines.push(`--${boundary}--`);
  lines.push("");

  return {
    contentType: `multipart/related; boundary="${boundary}"`,
    body: lines.join("\r\n"),
  };
}

export async function sendBrandedEmail({ subject, html, to }) {
  const recipient = to || process.env.TASK_APP_NOTIFY_EMAIL;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass || !recipient) {
    console.warn("[email] SMTP not configured — skipping:", subject);
    return { skipped: true };
  }

  const fromName = process.env.SMTP_FROM_NAME || "EZOFIS WorkHub";
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;

  let htmlBody = html;
  let contentType = "text/html; charset=UTF-8";

  if (fs.existsSync(LOGO_PATH)) {
    const multipart = buildMultipartBody(html, [
      {
        path: LOGO_PATH,
        cid: LOGO_CID,
        filename: "ezofis-logo.png",
        contentType: "image/png",
      },
    ]);
    htmlBody = multipart.body;
    contentType = multipart.contentType;
  } else {
    console.warn("[email] Logo file missing at", LOGO_PATH);
  }

  await sendSmtpHtml({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    user,
    pass,
    from: fromEmail,
    fromName,
    to: recipient,
    subject,
    html: htmlBody,
    contentType,
  });

  console.log(`[email] Sent to ${recipient}: ${subject}`);
  return { sent: true };
}
