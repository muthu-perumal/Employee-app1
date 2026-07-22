/**
 * Send a test WhatsApp message to the configured group.
 */
import { existsSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import dotenv from "dotenv";
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

dotenv.config();

const { Client, LocalAuth } = pkg;

const groupNameHint =
  process.env.WHATSAPP_GROUP_NAME || "ezofis Team IND";
const groupIdEnv = process.env.WHATSAPP_GROUP_ID || "";
const testMessage =
  process.argv.slice(2).join(" ").trim() ||
  process.env.WHATSAPP_TEST_MESSAGE ||
  "Test message from EZOFIS WorkHub";

const sessionDir = path.resolve(".wwebjs_auth", "session");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanupStaleSession() {
  const devToolsPort = path.join(sessionDir, "DevToolsActivePort");
  if (existsSync(devToolsPort)) {
    try {
      unlinkSync(devToolsPort);
    } catch {
      /* ignore */
    }
  }

  if (process.platform === "win32") {
    try {
      execSync(
        'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"name=\'chrome.exe\'\\" | Where-Object { $_.CommandLine -like \'*wwebjs_auth*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"',
        { stdio: "ignore" }
      );
    } catch {
      /* ignore */
    }
  }
}

const executablePath = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => candidate && existsSync(candidate));

if (!executablePath) {
  console.error("Google Chrome not found.");
  process.exit(1);
}

console.log(`Using Chrome: ${executablePath}`);
console.log(`Target group: ${groupNameHint}`);
console.log(`Message: ${testMessage}\n`);

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: {
    headless: process.env.WA_HEADLESS !== "false",
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

async function sendAndVerify(message) {
  return client.pupPage.evaluate(
    async ({ message, groupNameHint, groupIdEnv }) => {
      const collections = window.require("WAWebCollections");
      const chats = collections.Chat.getModelsArray();
      const hint = groupNameHint.toLowerCase();

      const group =
        chats.find((chat) => chat.id?._serialized === groupIdEnv) ||
        chats.find((chat) =>
          (chat.formattedTitle || chat.name || "")
            .toLowerCase()
            .includes(hint)
        );

      if (!group) {
        return { ok: false, error: `Group not found: ${groupNameHint}` };
      }

      const groupName = group.formattedTitle || group.name;
      const groupId = group.id._serialized;
      let sendError = null;

      try {
        await window.WWebJS.sendMessage(group, message, {
          waitUntilMsgSent: true,
        });
      } catch (error) {
        sendError = String(error?.message || error);
      }

      // Wait for message to appear in chat (library return value is unreliable with LID groups)
      await new Promise((resolve) => setTimeout(resolve, 4000));

      const recent = group.msgs?.getModelsArray?.()?.slice(-8) || [];
      const match = [...recent]
        .reverse()
        .find(
          (msg) =>
            msg.id?.fromMe &&
            String(msg.body || "").trim() === String(message).trim()
        );

      if (match) {
        return {
          ok: true,
          groupName,
          groupId,
          messageId: match.id?._serialized,
          ack: match.ack,
        };
      }

      return {
        ok: false,
        groupName,
        groupId,
        error:
          sendError ||
          "Message not found in chat after send — may not have been delivered",
        recentFromMe: recent
          .filter((msg) => msg.id?.fromMe)
          .slice(-3)
          .map((msg) => msg.body),
      };
    },
    { message, groupNameHint, groupIdEnv }
  );
}

client.on("qr", (qr) => {
  console.log("\nScan QR with 7397499070:\n");
  qrcode.generate(qr, { small: true });
});

client.on("loading_screen", (percent, message) => {
  console.log(`Syncing... ${percent}% ${message || ""}`.trim());
});

client.on("ready", async () => {
  try {
    await sleep(6000);
    const result = await sendAndVerify(testMessage);

    if (!result.ok) {
      console.error("\n❌ Message NOT delivered.");
      console.error(`Reason: ${result.error}`);
      if (result.groupName) {
        console.error(`Group: ${result.groupName} (${result.groupId})`);
      }
      if (result.recentFromMe?.length) {
        console.error("Your recent messages in that chat:", result.recentFromMe);
      }
      process.exitCode = 1;
      return;
    }

    console.log("\n✅ Message delivered!");
    console.log(`Group: ${result.groupName}`);
    console.log(`Group ID: ${result.groupId}`);
    if (result.messageId) console.log(`Message ID: ${result.messageId}`);
    console.log("\nRefresh WhatsApp Web on ezofis Team IND — it should appear at the bottom.");
  } catch (error) {
    console.error("\n❌ Failed:", error?.message || error);
    process.exitCode = 1;
  } finally {
    try {
      await client.destroy();
    } catch {
      /* ignore */
    }
    process.exit(process.exitCode || 0);
  }
});

process.on("SIGINT", async () => {
  try {
    await client.destroy();
  } catch {
    /* ignore */
  }
  process.exit(0);
});

cleanupStaleSession();
client.initialize().catch((error) => {
  console.error("Start failed:", error?.message || error);
  process.exit(1);
});
