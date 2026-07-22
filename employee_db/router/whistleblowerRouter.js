import { Router } from "express";
import {
  createWhistleblowerReport,
  getWhistleblowerReports,
  getWhistleblowerReportById,
  updateWhistleblowerStatus,
  downloadWhistleblowerAttachment,
} from "../controller/whistleblower.controller.js";

const router = Router();

router.post("/", createWhistleblowerReport);
router.get("/", getWhistleblowerReports);
router.get("/:id", getWhistleblowerReportById);
router.patch("/:id/status", updateWhistleblowerStatus);
router.get("/:id/attachments/:fileIndex", downloadWhistleblowerAttachment);

export default router;
