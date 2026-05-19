
import mongoose from "mongoose";
import Holiday from "../model/holiday.model.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const holidays2026 = [
  { date: "2026-01-01", title: "New Year", type: "Government", region: "All" },
  { date: "2026-01-15", title: "Pongal", type: "Government", region: "All" },
  { date: "2026-01-16", title: "Thiruvalluvar Day", type: "Government", region: "All" },
  { date: "2026-01-26", title: "Republic Day", type: "Government", region: "All" },
  { date: "2026-03-21", title: "Ramzan", type: "Government", region: "All" },
  { date: "2026-04-03", title: "Good Friday", type: "Government", region: "All" },
  { date: "2026-04-14", title: "Tamil New Year's Day", type: "Government", region: "All" },
  { date: "2026-05-01", title: "May Day", type: "Government", region: "All" },
  { date: "2026-05-28", title: "Bakrid", type: "Government", region: "All" },
  { date: "2026-06-26", title: "Muharram", type: "Government", region: "All" },
  { date: "2026-08-15", title: "Independence Day", type: "Government", region: "All" },
  { date: "2026-08-26", title: "Milad-un-Nabi", type: "Government", region: "All" },
  { date: "2026-09-04", title: "Krishna Jayanthi", type: "Government", region: "All" },
  { date: "2026-09-14", title: "Vinayakar Chathurthi", type: "Government", region: "All" },
  { date: "2026-10-02", title: "Gandhi Jayanthi", type: "Government", region: "All" },
  { date: "2026-10-19", title: "Ayutha Pooja", type: "Government", region: "All" },
  { date: "2026-10-20", title: "Vijaya Dasami", type: "Government", region: "All" },
  { date: "2026-11-08", title: "Deepawali", type: "Government", region: "All" },
  { date: "2026-12-25", title: "Christmas", type: "Government", region: "All" },
];

const seedHolidays = async () => {
  try {
    // Check if we have a connection string
    const uri = process.env.MONGODB_CONNECTION_STRING || process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!uri) {
       console.log("No MONGODB_CONNECTION_STRING found in .env, skipping actual DB connection for now.");
       console.log("Would insert:");
       console.log(holidays2026);
       return;
    }

    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");

    for (const holiday of holidays2026) {
      await Holiday.findOneAndUpdate(
        { date: holiday.date },
        { ...holiday, isActive: true },
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded/Updated ${holidays2026.length} holidays for 2026.`);
    await mongoose.disconnect();
    console.log("Disconnected.");
  } catch (error) {
    console.error("Error seeding holidays:", error);
    process.exit(1);
  }
};

seedHolidays();
