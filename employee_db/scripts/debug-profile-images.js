import "dotenv/config";
import connectDB from "../utils/DbConnector.js";
import Employee from "../model/employee.model.js";
import mongoose from "mongoose";

await connectDB(process.env.MONGODB_CONNECTION_STRING, process.env.DB_NAME);

const sample = await Employee.findOne({
  isDeleted: false,
  profile_imageFile: { $nin: [null, ""] },
})
  .select("employee_id first_name profile_imageFile profile_image")
  .lean();

if (!sample) {
  console.log("NO_EMPLOYEE_WITH_IMAGE");
} else {
  const img = sample.profile_imageFile || "";
  console.log(
    JSON.stringify(
      {
        id: String(sample._id),
        employee_id: sample.employee_id,
        name: sample.first_name,
        profile_image_empty: !sample.profile_image,
        file_len: img.length,
        file_prefix: img.slice(0, 40),
      },
      null,
      2
    )
  );
}

const listed = await Employee.aggregate([
  { $match: { isDeleted: false } },
  {
    $project: {
      employee_id: 1,
      first_name: 1,
      has_ne: {
        $and: [{ $ne: [{ $ifNull: ["$profile_imageFile", ""] }, ""] }],
      },
      has_strlen: {
        $gt: [{ $strLenCP: { $ifNull: ["$profile_imageFile", ""] } }, 0],
      },
    },
  },
  { $limit: 8 },
]);

console.log(
  "flags:",
  listed.map((e) => ({
    id: e.employee_id,
    name: e.first_name,
    has_ne: e.has_ne,
    has_strlen: e.has_strlen,
  }))
);

await mongoose.disconnect();
