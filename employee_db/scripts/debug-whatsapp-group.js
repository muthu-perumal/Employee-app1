import dotenv from "dotenv";
import pkg from "whatsapp-web.js";

dotenv.config();
const { Client, LocalAuth } = pkg;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: {
    headless: true,
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox"],
  },
});

client.on("ready", async () => {
  try {
    await sleep(8000);
    const info = await client.pupPage.evaluate(() => {
      const chats = window.require("WAWebCollections").Chat.getModelsArray();
      const g = chats.find((c) =>
        (c.formattedTitle || c.name || "")
          .toLowerCase()
          .includes("ezofis team ind")
      );
      if (!g) return { error: "not found" };

      const meta = g.groupMetadata?.serialize?.() || {};
      const { getMaybeMeLidUser, getMaybeMePnUser } = window.require(
        "WAWebUserPrefsMeUser"
      );

      return {
        name: g.formattedTitle,
        id: g.id._serialized,
        announce: meta.announce,
        restrict: meta.restrict,
        isLidAddressingMode: meta.isLidAddressingMode,
        lidUser: getMaybeMeLidUser()?._serialized || null,
        pnUser: getMaybeMePnUser()?._serialized || null,
        memberCount: meta.participants?.length || 0,
      };
    });
    console.log(JSON.stringify(info, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await client.destroy();
    process.exit(0);
  }
});

client.initialize();
