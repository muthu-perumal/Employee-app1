import mongoose from "mongoose";
import fs from "fs";
import dotenv from "dotenv";
import LeaveBalance from "./model/leaveBalance.model.js";
import Employee from "./model/employee.model.js";
import LeaveRequest from "./model/leaveRequest.model.js";

dotenv.config();

const MONGO_URI = process.env.MONGODB_CONNECTION_STRING;
const DB_NAME = process.env.DB_NAME;

async function debug() {
  let output = "";
  const log = (msg) => {
    output += msg + "\n";
    console.log(msg);
  };

  try {
    await mongoose.connect(`${MONGO_URI}/${DB_NAME}`);
    log("Connected to MongoDB");

    const empIdStr = "EZO/IND/0061";

    log(`\n--- Checking Employee: ${empIdStr} ---`);
    const emp = await Employee.findOne({ employee_id: empIdStr });
    if (!emp) {
      log("Employee record not found!");
    } else {
      log(
        "Employee Found: " +
          JSON.stringify(
            {
              _id: emp._id,
              employee_id: emp.employee_id,
              first_name: emp.first_name,
              last_name: emp.last_name,
            },
            null,
            2,
          ),
      );
    }

    log(`\n--- Checking Leave Balance for ${empIdStr} ---`);
    const balances = await LeaveBalance.find({ employeeId: empIdStr });
    log("Balances found: " + JSON.stringify(balances, null, 2));

    log(`\n--- Checking Approved Leave Requests for ${empIdStr} ---`);
    const requests = await LeaveRequest.find({
      employeeId: empIdStr,
      status: "HR_Approved",
    });
    log("Approved Requests: " + JSON.stringify(requests, null, 2));

    const totalUsedEL = requests
      .filter((r) => r.leaveType === "EL")
      .reduce((sum, r) => sum + r.totalDays, 0);
    log(`\nCalculated Total Used EL from requests: ${totalUsedEL}`);

    fs.writeFileSync("debug_output.txt", output);
    await mongoose.disconnect();
  } catch (error) {
    fs.writeFileSync("debug_output.txt", output + "\nERROR: " + error.message);
    console.error("Debug failed:", error);
  }
}

debug();
