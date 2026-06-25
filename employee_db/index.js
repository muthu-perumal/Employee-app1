import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./utils/DbConnector.js";
import { URI, DATABASE_NAME } from "./config.js";
import employeeRoutes from "./router/employeeRouter.js";
import attendanceRoutes from "./router/attendanceRouter.js";
import clientRoutes from "./router/clientRouter.js";
import pushRoutes from "./router/webPush.js";
import worklogRoutes from "./router/worklog.routes.js";
import amcRoutes from "./router/amcRouter.js";
import assetRoutes from "./router/assetRouter.js";
import leaveRoutes from "./router/leaveRouter.js";
import holidayRoutes from "./router/holidayRouter.js";
import notificationRoutes from "./router/notificationRouter.js";
import auditRoutes from "./router/auditRouter.js";
import meetingRoutes from "./router/meetingRouter.js";
import issueRoutes from "./router/issue.routes.js";
import taskAppRoutes from "./router/taskApp.routes.js";
import publishTrackerRoutes from "./router/publishTracker.routes.js";
import { getConfiguredProviders } from "./utils/aiService.js";

const app = express();
const PORT = process.env.PORT || 8080;
let dbConnected = false;

const requireDb = (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({
      success: false,
      message:
        "Database unavailable. In MongoDB Atlas go to Network Access → Add IP Address → add your current IP, then restart employee_db.",
    });
  }
  next();
};

app.disable("x-powered-by");
app.disable("etag");
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: ["http://localhost:5173", "https://ez-emp-ui.azurewebsites.net"],
    credentials: true,
  })
);

app.use("/api/publish-tracker", requireDb, publishTrackerRoutes);
app.use("/api/attendance", requireDb, attendanceRoutes);
app.use("/api/employee", requireDb, employeeRoutes);
app.use("/api/asset", requireDb, assetRoutes);
app.use("/api/client", requireDb, clientRoutes);
app.use("/api/push", requireDb, pushRoutes);
app.use("/api/worklog", requireDb, worklogRoutes);
app.use("/api/amcInfo", requireDb, amcRoutes);
app.use("/api/leave", requireDb, leaveRoutes);
app.use("/api/meetings", requireDb, meetingRoutes);
app.use("/api/holiday", requireDb, holidayRoutes);
app.use("/api/notifications", requireDb, notificationRoutes);
app.use("/api/audit", requireDb, auditRoutes);
app.use("/api/task-app", requireDb, taskAppRoutes);
app.use("/api/issues-backmarks", requireDb, issueRoutes);
app.get("/api/health", (_req, res) =>
  res.status(200).json({ status: "ok", database: dbConnected ? "connected" : "disconnected" })
);
app.get("/", (_req, res) => res.status(200).send("OK"));
const startingServer = async () => {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (!URI || !DATABASE_NAME) {
        throw new Error("Either URI or Database name is an empty string");
      }
      await connectDB(URI, DATABASE_NAME);
      dbConnected = true;
      console.log("MongoDB connected successfully");
      break;
    } catch (error) {
      const message = error?.message || String(error);
      console.error(`MongoDB connection attempt ${attempt}/${maxAttempts} failed:`, message);

      if (message.includes("certificate") || message.includes("TLS")) {
        console.error(
          "\n→ Fix: Add MONGODB_TLS_ALLOW_INVALID=true to employee_db/.env (already added if missing)\n"
        );
      }

      if (message.includes("whitelist") || message.includes("IP")) {
        console.error(
          "\n→ Fix: MongoDB Atlas → Network Access → Add IP Address → Add Current IP (or 0.0.0.0/0 for dev)\n"
        );
      }

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } else if (process.env.NODE_ENV === "production") {
        process.exit(1);
      } else {
        console.warn(
          "Starting API server without database (development only). Whitelist your IP in MongoDB Atlas and restart."
        );
      }
    }
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Database: ${dbConnected ? "connected" : "disconnected"}`);
    console.log(`Access the Employee API at http://localhost:${PORT}/api/employee`);
    console.log(`Publish Tracker API at http://localhost:${PORT}/api/publish-tracker/patches`);
    const aiProviders = getConfiguredProviders();
    console.log(`AI providers: ${aiProviders.length ? aiProviders.join(" → ") : "none (database-only answers)"}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
};
process.on("unhandledRejection", (e) => {
  console.error(e);
  process.exit(1);
});
process.on("uncaughtException", (e) => {
  console.error(e);
  process.exit(1);
});

startingServer();
