/**
 * List WhatsApp group IDs (lightweight — avoids broken getChats serialization).
 *
 * Usage:
 *   cd employee_db
 *   node scripts/list-whatsapp-groups.js
 */
import { existsSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

const { Client, LocalAuth } = pkg;

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

const chromeCandidates = [
  process.env.CHROME_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

const executablePath = chromeCandidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  console.error("Google Chrome not found.");
  process.exit(1);
}

console.log(`Using Chrome: ${executablePath}\n`);

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: {
    headless: process.env.WA_HEADLESS !== "false",
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

/** Read groups directly from WAWebCollections — skip heavy getChatModel(). */
async function fetchGroupsMinimal() {
  return client.pupPage.evaluate(() => {
    const errors = [];

    try {
      if (typeof window.require !== "function") {
        return { ok: false, error: "window.require not available", groups: [] };
      }

      const collections = window.require("WAWebCollections");
      const chatCollection = collections?.Chat;
      if (!chatCollection?.getModelsArray) {
        return { ok: false, error: "Chat collection not found", groups: [] };
      }

      const chats = chatCollection.getModelsArray();
      const groups = [];

      for (const chat of chats) {
        try {
          if (!chat?.groupMetadata && !chat?.id?._serialized?.endsWith("@g.us")) {
            continue;
          }

          const id = chat.id?._serialized || String(chat.id || "");
          if (!id.endsWith("@g.us")) continue;

          groups.push({
            name:
              chat.formattedTitle ||
              chat.name ||
              chat.contact?.formattedName ||
              chat.contact?.pushname ||
              "Unknown group",
            id,
          });
        } catch (inner) {
          errors.push(String(inner?.message || inner));
        }
      }

      return {
        ok: true,
        totalChats: chats.length,
        groups,
        errors: errors.slice(0, 3),
      };
    } catch (error) {
      return {
        ok: false,
        error: String(error?.message || error),
        groups: [],
      };
    }
  });
}

async function listGroupsWithRetry(maxAttempts = 6) {
  let lastResult;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    console.log(`Loading chats... attempt ${attempt}/${maxAttempts}`);
    await sleep(4000 + attempt * 2000);

    lastResult = await fetchGroupsMinimal();

    if (!lastResult.ok) {
      console.log(`Attempt ${attempt}: ${lastResult.error}`);
      continue;
    }

    console.log(`Found ${lastResult.totalChats} chats, ${lastResult.groups.length} groups`);
    if (lastResult.groups.length) return lastResult.groups;
  }

  throw new Error(lastResult?.error || "No groups found after sync");
}

client.on("qr", (qr) => {
  console.log("\nScan QR with WhatsApp on 7397499070:\n");
  qrcode.generate(qr, { small: true });
});

client.on("loading_screen", (percent, message) => {
  console.log(`Syncing... ${percent}% ${message || ""}`.trim());
});

client.on("ready", async () => {
  console.log("\nConnected. Fetching groups...\n");
  try {
    const groups = await listGroupsWithRetry();

    groups.forEach((group) => {
      console.log(`${group.name} → ${group.id}`);
    });

    const target = groups.find((g) =>
      g.name.toLowerCase().includes("ezofis team ind")
    );
    if (target) {
      console.log(`\n✓ Target group:\n${target.name} → ${target.id}`);
    }

    console.log("\nAdd to employee_db/.env:\nWHATSAPP_GROUP_ID=<id above>");
  } catch (error) {
    console.error("Failed:", error?.message || error);
    console.error(
      "\nTry: delete .wwebjs_auth folder, run again, and scan QR fresh.\n" +
        "Or set WA_HEADLESS=false to see the browser window."
    );
  } finally {
    try {
      await client.destroy();
    } catch {
      /* ignore */
    }
    process.exit(0);
  }
});

client.on("auth_failure", (message) => {
  console.error("Auth failed:", message);
  process.exit(1);
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
