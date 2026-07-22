import { existsSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import pkg from "whatsapp-web.js";

const { Client, LocalAuth } = pkg;

let client = null;
let readyPromise = null;
let chatsSynced = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isEnabled = () =>
  String(process.env.WHATSAPP_ENABLED || "").toLowerCase() === "true";

const getGroupId = () =>
  process.env.WHATSAPP_GROUP_ID || "919659035458-1456841983@g.us";

const getGroupNameHint = () =>
  process.env.WHATSAPP_GROUP_NAME || "ezofis Team IND";

const getChromePath = () => {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
};

function cleanupStaleSession() {
  const sessionDir = path.resolve(".wwebjs_auth", "session");
  const devToolsPort = path.join(sessionDir, "DevToolsActivePort");
  const singletonLock = path.join(sessionDir, "SingletonLock");
  const singletonCookie = path.join(sessionDir, "SingletonCookie");

  for (const file of [devToolsPort, singletonLock, singletonCookie]) {
    if (existsSync(file)) {
      try {
        unlinkSync(file);
      } catch {
        /* ignore */
      }
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

async function getClient() {
  if (!isEnabled()) return null;
  if (client) return client;
  if (readyPromise) return readyPromise;

  const executablePath = getChromePath();
  if (!executablePath) {
    console.warn("[whatsapp] Chrome not found — notifications disabled");
    return null;
  }

  cleanupStaleSession();

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
    puppeteer: {
      headless: process.env.WA_HEADLESS !== "false",
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  readyPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("WhatsApp init timeout (120s)")),
      120000
    );

    client.on("ready", async () => {
      clearTimeout(timeout);
      console.log("[whatsapp] Client ready — syncing chats...");
      await sleep(6000);
      chatsSynced = true;
      resolve(client);
    });

    client.on("auth_failure", (msg) => {
      clearTimeout(timeout);
      readyPromise = null;
      client = null;
      reject(new Error(`WhatsApp auth failed: ${msg}`));
    });

    client.on("disconnected", () => {
      console.warn("[whatsapp] Client disconnected — will reconnect on next send");
      client = null;
      readyPromise = null;
      chatsSynced = false;
    });

    client.initialize().catch((error) => {
      clearTimeout(timeout);
      readyPromise = null;
      client = null;
      reject(error);
    });
  });

  return readyPromise;
}

/** Send inside browser context — chat objects cannot be serialized to Node. */
async function sendGroupMessageInPage(page, groupId, groupNameHint, message) {
  return page.evaluate(
    async ({ groupId, groupNameHint, message }) => {
      const chats = window.require("WAWebCollections").Chat.getModelsArray();
      const hint = groupNameHint.toLowerCase();

      const group =
        chats.find((chat) => chat.id?._serialized === groupId) ||
        chats.find((chat) =>
          (chat.formattedTitle || chat.name || "")
            .toLowerCase()
            .includes(hint)
        );

      if (!group) {
        const groupNames = chats
          .filter((c) => c.id?._serialized?.endsWith("@g.us"))
          .slice(0, 8)
          .map((c) => c.formattedTitle || c.name || c.id?._serialized);
        return {
          ok: false,
          error: `Group not found: ${groupNameHint} (id: ${groupId})`,
          availableGroups: groupNames,
        };
      }

      const groupName = group.formattedTitle || group.name;
      const resolvedId = group.id._serialized;
      let sendError = null;

      try {
        await window.WWebJS.sendMessage(group, message, {
          waitUntilMsgSent: true,
        });
      } catch (error) {
        sendError = String(error?.message || error);
      }

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
          groupId: resolvedId,
          messageId: match.id?._serialized,
        };
      }

      return {
        ok: false,
        groupName,
        groupId: resolvedId,
        error:
          sendError ||
          "Message not confirmed in chat after send",
      };
    },
    { groupId, groupNameHint, message }
  );
}

export async function sendWhatsAppGroupMessage(message) {
  if (!isEnabled()) {
    console.log("[whatsapp] Disabled — skipped group message");
    return { ok: false, skipped: true };
  }

  try {
    const waClient = await getClient();
    if (!waClient?.pupPage) return { ok: false, error: "WhatsApp client not ready" };

    if (!chatsSynced) await sleep(4000);

    const groupId = getGroupId();
    const groupNameHint = getGroupNameHint();

    let result = await sendGroupMessageInPage(
      waClient.pupPage,
      groupId,
      groupNameHint,
      message
    );

    // Retry once after extra sync time if group not found on first attempt
    if (!result.ok && result.error?.includes("Group not found")) {
      console.log("[whatsapp] Retrying after chat sync...");
      await sleep(5000);
      result = await sendGroupMessageInPage(
        waClient.pupPage,
        groupId,
        groupNameHint,
        message
      );
    }

    if (!result.ok) {
      console.error("[whatsapp] Group send failed:", result.error);
      if (result.availableGroups?.length) {
        console.error("[whatsapp] Available groups:", result.availableGroups.join(", "));
      }
      return { ok: false, error: result.error };
    }

    console.log(
      `[whatsapp] Group message sent → ${result.groupName} (${result.groupId})`
    );
    return { ok: true, groupId: result.groupId, groupName: result.groupName };
  } catch (error) {
    console.error("[whatsapp] Group send failed:", error?.message || error);
    client = null;
    readyPromise = null;
    chatsSynced = false;
    return { ok: false, error: error?.message || String(error) };
  }
}

export async function sendWhatsAppDirectMessage(phone, message) {
  if (!isEnabled()) return { ok: false, skipped: true };

  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return { ok: false, error: "Invalid phone number" };

  const chatId = digits.includes("@") ? digits : `${digits}@c.us`;

  try {
    const waClient = await getClient();
    if (!waClient) return { ok: false, skipped: true };

    await sleep(2000);
    await waClient.sendMessage(chatId, message);
    console.log(`[whatsapp] Direct message sent to ${chatId}`);
    return { ok: true };
  } catch (error) {
    console.error("[whatsapp] Direct send failed:", error?.message || error);
    return { ok: false, error: error?.message || String(error) };
  }
}

export function fireWhatsAppGroupMessage(message) {
  sendWhatsAppGroupMessage(message).catch((error) => {
    console.error("[whatsapp] Async group send failed:", error?.message || error);
  });
}

export function fireWhatsAppDirectMessage(phone, message) {
  sendWhatsAppDirectMessage(phone, message).catch((error) => {
    console.error("[whatsapp] Async direct send failed:", error?.message || error);
  });
}
