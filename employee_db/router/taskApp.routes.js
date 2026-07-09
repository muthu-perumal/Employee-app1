import express from "express";
import {
  getWorkItems,
  createWorkItem,
  updateWorkItem,
  getWorkItemHistory,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getConfigs,
  createSlaPolicy,
  updateSlaPolicy,
  deleteSlaPolicy,
  createNotificationRule,
  updateNotificationRule,
  createTimelinePlan,
  updateTimelinePlan,
  getWorklogs,
  createWorklog,
  updateWorklog
} from "../controller/taskApp.controller.js";

const router = express.Router();

// WorkItems
router.get("/items", getWorkItems);
router.get("/items/:id/history", getWorkItemHistory);
router.post("/items", createWorkItem);
router.put("/items/:id", updateWorkItem);

// Notes
router.get("/notes", getNotes);
router.post("/notes", createNote);
router.put("/notes/:id", updateNote);
router.delete("/notes/:id", deleteNote);

// Teams
router.get("/teams", getTeams);
router.post("/teams", createTeam);
router.put("/teams/:id", updateTeam);
router.delete("/teams/:id", deleteTeam);

// Worklogs
router.get("/worklogs", getWorklogs);
router.post("/worklogs", createWorklog);
router.put("/worklogs/:id", updateWorklog);

// Configs (Aggregated GET)
router.get("/configs", getConfigs);

// Config Creations/Updates
router.post("/configs/sla", createSlaPolicy);
router.put("/configs/sla/:id", updateSlaPolicy);
router.delete("/configs/sla/:id", deleteSlaPolicy);

router.post("/configs/rules", createNotificationRule);
router.put("/configs/rules/:id", updateNotificationRule);

router.post("/configs/plans", createTimelinePlan);
router.put("/configs/plans/:id", updateTimelinePlan);

export default router;
