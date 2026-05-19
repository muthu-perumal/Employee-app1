
import mongoose from "mongoose";
import LeaveRequest from "./model/leaveRequest.model.js";
import LeaveBalance from "./model/leaveBalance.model.js";
import Holiday from "./model/holiday.model.js";

// Dummy data structure imitating frontend
const dummyRequest = {
    employeeId: 'emp-1',
    leaveType: 'EL',
    startDate: '2026-04-01',
    endDate: '2026-04-05',
    totalDays: 5,
    reason: 'Vacation',
    status: 'Submitted'
};

const validateSchemas = async () => {
    console.log("Validating schemas...");

    try {
        // validate LeaveRequest
        const req = new LeaveRequest(dummyRequest);
        await req.validate();
        console.log("✓ LeaveRequest schema valid.");

        // validate LeaveBalance defaults
        const bal = new LeaveBalance({ employeeId: 'emp-1' });
        await bal.validate();
        if (bal.EL_allocated !== 12 || bal.CL_allocated !== 6 || bal.SL_allocated !== 6) {
            throw new Error(`Default balances incorrect: EL=${bal.EL_allocated}, CL=${bal.CL_allocated}`);
        }
        console.log("✓ LeaveBalance schema valid and defaults correct.");

        // validate Holiday
        const holiday = new Holiday({
            date: '2026-01-01',
            title: 'New Year'
        });
        await holiday.validate();
        console.log("✓ Holiday schema valid.");

        console.log("All schemas validated successfully!");
    } catch (err) {
        console.error("Validation failed:", err.message);
        process.exit(1);
    }
};

validateSchemas();
