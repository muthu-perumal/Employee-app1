import "dotenv/config";
import connectDB from "./utils/DbConnector.js";

const uri = process.env.MONGODB_CONNECTION_STRING?.trim();
const dbName = process.env.DB_NAME?.trim();

try {
  await connectDB(uri, dbName);
  console.log("CONNECTED OK via DbConnector");
  process.exit(0);
} catch (error) {
  console.error("FAILED:", error.message);
  process.exit(1);
}
