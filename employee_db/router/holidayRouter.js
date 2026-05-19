import express from "express";
import {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  seedInitialHolidays,
} from "../controller/holiday.controller.js";

const router = express.Router();

router.get("/", getHolidays);
router.post("/", createHoliday);
router.patch("/:id", updateHoliday);
router.delete("/:id", deleteHoliday);
router.post("/seed", seedInitialHolidays);

export default router;
