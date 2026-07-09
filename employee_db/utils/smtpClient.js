import net from "net";
import tls from "tls";

function readResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = "";

    const cleanup = () => {
      socket.removeListener("data", onData);
      socket.removeListener("error", onError);
    };

    const onData = (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/).filter((line) => line.length > 0);

      for (let i = lines.length - 1; i >= 0; i -= 1) {
        const match = lines[i].match(/^(\d{3}) (.*)$/);
        if (match) {
          cleanup();
          const code = Number(match[1]);
          const message = lines.join("\n");
          if (code >= 400) reject(new Error(message));
          else resolve(message);
          return;
        }
      }
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function sendCommand(socket, command) {
  if (command) socket.write(`${command}\r\n`);
  return readResponse(socket);
}

async function upgradeToTls(socket, host) {
  await sendCommand(socket, "STARTTLS");
  const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "true";

  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect(
      { socket, servername: host, rejectUnauthorized },
      () => resolve(secureSocket)
    );
    secureSocket.on("error", reject);
  });
}

function encodeSubject(subject) {
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

export async function sendSmtpHtml({ host, port, user, pass, from, fromName, to, subject, html, contentType }) {
  let socket = await new Promise((resolve, reject) => {
    const client = net.connect(port, host, () => resolve(client));
    client.setTimeout(30000);
    client.on("error", reject);
    client.on("timeout", () => reject(new Error("SMTP connection timed out")));
  });

  try {
    await readResponse(socket);
    await sendCommand(socket, "EHLO ezofis.local");
    socket = await upgradeToTls(socket, host);
    await sendCommand(socket, "EHLO ezofis.local");
    await sendCommand(socket, "AUTH LOGIN");
    await sendCommand(socket, Buffer.from(user).toString("base64"));
    await sendCommand(socket, Buffer.from(pass).toString("base64"));
    await sendCommand(socket, `MAIL FROM:<${from}>`);
    await sendCommand(socket, `RCPT TO:<${to}>`);
    await sendCommand(socket, "DATA");

    const mimeType = contentType || "text/html; charset=UTF-8";
    const isMultipart = mimeType.startsWith("multipart/");
    const fromHeader = fromName ? `"${fromName}" <${from}>` : from;
    const msgId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@ezofis.com>`;
    const dateHeader = new Date().toUTCString();

    const headers = [
      `From: ${fromHeader}`,
      `To: ${to}`,
      `Subject: ${encodeSubject(subject)}`,
      `Date: ${dateHeader}`,
      `Message-ID: ${msgId}`,
      "MIME-Version: 1.0",
      `Content-Type: ${mimeType}`,
    ];

    if (!isMultipart) {
      headers.push("Content-Transfer-Encoding: 8bit");
    }

    const message = [...headers, "", html, "."].join("\r\n");

    await sendCommand(socket, message);
    await sendCommand(socket, "QUIT");
  } finally {
    socket.end();
  }
}
