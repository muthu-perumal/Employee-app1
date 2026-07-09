import "dotenv/config";
import connectDB from "../utils/DbConnector.js";
import Employee from "../model/employee.model.js";

await connectDB(process.env.MONGODB_CONNECTION_STRING, process.env.DB_NAME);

const rows = await Employee.find({
  status: "active",
  isDeleted: { $ne: true },
  email: { $exists: true, $ne: "" },
})
  .select("employee_id first_name last_name email status")
  .sort({ first_name: 1 });

console.log(`Active employees (${rows.length}):`);
rows.forEach((employee) => {
  console.log(
    `  ${employee.employee_id} | ${employee.first_name} ${employee.last_name} | ${employee.email}`
  );
});

process.exit(0);
