import mongoose from 'mongoose';
import Employee from './model/employee.model.js';
import "dotenv/config";

const URI = process.env.MONGODB_CONNECTION_STRING;
const DB = process.env.DB_NAME;

const connect = async () => {
    try {
        await mongoose.connect(URI, { dbName: DB });
        console.log("Connected to DB");

        const employees = await Employee.find({});
        console.log(`Found ${employees.length} employees:`);
        employees.forEach(e => {
            console.log(`- ${e.first_name} ${e.last_name} (${e.employee_id}) [${e.status}]`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

connect();
