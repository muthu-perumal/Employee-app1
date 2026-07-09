import express from "express";
import {
  getPatches,
  getPatchStats,
  getPatchById,
  createPatch,
  updatePatch,
  deletePatch,
  summarizePatch,
} from "../controller/patch.controller.js";
import {
  getFeedback,
  createFeedback,
  updateFeedbackStatus,
} from "../controller/feedback.controller.js";
import { getReports } from "../controller/report.controller.js";
import { getAuditLogs } from "../controller/audits.controller.js";
import { getTimeline } from "../controller/timeline.controller.js";
import {
  askAI,
  getConversations,
  getConversation,
} from "../controller/ai.controller.js";

const router = express.Router();

// Patches
router.get("/patches", getPatches);
router.get("/patches/stats", getPatchStats);
router.get("/patches/:id", getPatchById);
router.post("/patches/:id/summarize", summarizePatch);
router.post("/patches", createPatch);
router.put("/patches/:id", updatePatch);
router.delete("/patches/:id", deletePatch);

// Feedback
router.get("/feedback", getFeedback);
router.post("/feedback", createFeedback);
router.patch("/feedback/:id/status", updateFeedbackStatus);

// Reports, audit logs & timeline
router.get("/reports", getReports);
router.get("/audit-logs", getAuditLogs);
router.get("/timeline", getTimeline);

// AI assistant
router.post("/ai/ask", askAI);
router.get("/ai/conversations", getConversations);
router.get("/ai/conversations/:id", getConversation);

export default router;
