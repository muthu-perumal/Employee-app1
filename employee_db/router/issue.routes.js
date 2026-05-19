import express from "express";
import {
  getIssues,
  getIssueById,
  createIssue,
  updateIssue,
  deleteIssue,
} from "../controller/issue.controller.js";

const router = express.Router();

router.get("/", getIssues);
router.get("/:id", getIssueById);
router.post("/", createIssue);
router.put("/:id", updateIssue);
router.delete("/:id", deleteIssue);

export default router;