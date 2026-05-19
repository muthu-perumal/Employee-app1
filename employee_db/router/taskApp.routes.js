import express from "express";
import {
  getWorkItems,
  createWorkItem,
  updateWorkItem,
  getNotes,
  createNote,
  updateNote,
  getTeams,
  createTeam,
  updateTeam,
  getConfigs,
  createSlaPolicy,
  updateSlaPolicy,
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
router.post("/items", createWorkItem);
router.put("/items/:id", updateWorkItem);

// Notes
router.get("/notes", getNotes);
router.post("/notes", createNote);
router.put("/notes/:id", updateNote);

// Teams
router.get("/teams", getTeams);
router.post("/teams", createTeam);
router.put("/teams/:id", updateTeam);

// Worklogs
router.get("/worklogs", getWorklogs);
router.post("/worklogs", createWorklog);
router.put("/worklogs/:id", updateWorklog);

// Configs (Aggregated GET)
router.get("/configs", getConfigs);

// Config Creations/Updates
router.post("/configs/sla", createSlaPolicy);
router.put("/configs/sla/:id", updateSlaPolicy);

router.post("/configs/rules", createNotificationRule);
router.put("/configs/rules/:id", updateNotificationRule);

router.post("/configs/plans", createTimelinePlan);
router.put("/configs/plans/:id", updateTimelinePlan);

export default router;
