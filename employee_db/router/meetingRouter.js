import express from "express";
import {
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
} from "../controller/meeting.controller.js";

const router = express.Router();

router.get("/", getMeetings);
router.get("/:id", getMeetingById);
router.post("/", createMeeting);
router.put("/:id", updateMeeting);
router.delete("/:id", deleteMeeting);

export default router;