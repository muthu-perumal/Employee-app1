import mongoose from 'mongoose';
import "dotenv/config";
import { URI, DATABASE_NAME } from './config.js';

const employeeSchema = new mongoose.Schema({
    first_name: String,
    last_name: String,
    employee_id: String,
    status: String,
    role: String
}, { collection: 'employees' }); // Explicit collection name if needed, but Mongoose usually pluralizes 'Employee' -> 'employees'

const Employee = mongoose.model('Employee', employeeSchema);

console.log("Connecting to:", URI);
console.log("DB Name:", DATABASE_NAME);

mongoose.connect(URI, { dbName: DATABASE_NAME })
    .then(async () => {
        console.log("Connected!");
        const employees = await Employee.find({});
        console.log(`Found ${employees.length} employees.`);
        console.log(JSON.stringify(employees, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error("Connection failed:", err);
        process.exit(1);
    });
