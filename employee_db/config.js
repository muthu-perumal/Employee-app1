import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

export const URI = process.env.MONGODB_CONNECTION_STRING;
export const DATABASE_NAME = process.env.DB_NAME;
export const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
export const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;