
import express from "express";
import {
    getLeaves,
    createLeave,
    updateLeaveStatus,
    getBalances,
    getAllBalances,
    getHolidays,
    createHoliday,
    ensureAllBalances 
} from "../controller/leave.controller.js";

const router = express.Router();

router.get("/", getLeaves);
router.post("/", createLeave);
router.patch("/:id/status", updateLeaveStatus);
router.get("/balances", getBalances);
router.get("/all-balances", getAllBalances);
router.get("/holidays", getHolidays);
router.post("/holidays", createHoliday);
router.post("/ensure-balances", ensureAllBalances);

export default router;
