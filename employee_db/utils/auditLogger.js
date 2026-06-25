import { PublishAuditLog } from "../model/publishTracker.model.js";

export const createAuditLog = async ({ action, description = "", refId = "", userId = "", userName = "" }) => {
  try {
    await PublishAuditLog.create({ action, description, refId, userId, userName });
  } catch (error) {
    console.error("Publish Tracker audit log failed:", error.message);
  }
};
