import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../utils/DbConnector.js";

const TASK_APP_COLLECTIONS = [
  "workitems",
  "tasknotes",
  "taskworklogs",
  "teams",
  "slapolicies",
  "notificationrules",
  "timelineplans",
  "meetings",
  "issues",
  "counters",
];

const uri = process.env.MONGODB_CONNECTION_STRING;
const dbName = process.env.DB_NAME;

if (!uri || !dbName) {
  console.error("Missing MONGODB_CONNECTION_STRING or DB_NAME in .env");
  process.exit(1);
}

await connectDB(uri, dbName);

console.log(`Connected to database: ${dbName}`);
console.log("Truncating Task App collections...\n");

for (const name of TASK_APP_COLLECTIONS) {
  const result = await mongoose.connection.db.collection(name).deleteMany({});
  console.log(`${name}: deleted ${result.deletedCount} document(s)`);
}

await mongoose.disconnect();
console.log("\nTask App data truncated successfully (employees collection untouched).");
