import { Router } from "express";
import {
  checkEmail,
  createEmployee,
  editEmployee,
  deleteEmployee,
  getAllEmployee,getAllEmployees,
  getDashboardData,getTodaysBirthdays,
  getEmployeeProfileImage,
  getEmployeeAvatar,
} from "../controller/employee.controller.js";
import { checkSubscription } from "../middleware/checkSubscription.js";
const router = Router();

router.post("/addEmployee", createEmployee);
router.get("/getAllEmployee", getAllEmployee);
router.get("/getAllEmployees",getAllEmployees);
router.get("/getTodaysBirthdays", getTodaysBirthdays);
router.get("/profileImage/:empId", getEmployeeProfileImage);
router.get("/avatar/:empId", getEmployeeAvatar);
router.patch("/editEmployee/:empId", editEmployee);
router.delete("/deleteEmployee/:empId", deleteEmployee);
router.get("/checkEmail", checkSubscription, checkEmail);
router.get("/getDashboardData", getDashboardData);
export default router;
