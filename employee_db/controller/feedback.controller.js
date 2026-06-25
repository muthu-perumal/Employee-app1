import mongoose from "mongoose";
import { Feedback } from "../model/publishTracker.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { createAuditLog } from "../utils/auditLogger.js";

export const getFeedback = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const patchId = req.query.patchId || "";

    const query = { isDeleted: false };
    if (status) query.status = status;
    if (patchId && mongoose.Types.ObjectId.isValid(patchId)) query.patchId = patchId;
    if (search) {
      query.$or = [
        { clientName: { $regex: search, $options: "i" } },
        { feedback: { $regex: search, $options: "i" } },
      ];
    }

    const totalRecords = await Feedback.countDocuments(query);
    const data = await Feedback.find(query).populate("patchId", "title version status").sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    return sendSuccess(res, data, "Feedback fetched successfully", 200, {
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: page,
      pageSize: limit,
    });
  } catch (error) {
    return sendError(res, error, 500, "Failed to fetch feedback");
  }
};

export const createFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.create(req.body);
    await createAuditLog({ action: "FEEDBACK_CREATED", description: `Feedback created for ${feedback.clientName}`, refId: feedback._id.toString(), userId: req.body.userId, userName: req.body.userName });
    return sendSuccess(res, feedback, "Feedback created successfully", 201);
  } catch (error) {
    return sendError(res, error, 400, "Failed to create feedback");
  }
};

export const updateFeedbackStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return sendError(res, new Error("Invalid feedback id"), 400);
    const feedback = await Feedback.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { status: req.body.status, remarks: req.body.remarks || "", updatedBy: req.body.updatedBy || "" },
      { new: true, runValidators: true }
    );
    if (!feedback) return sendError(res, new Error("Feedback not found"), 404);
    await createAuditLog({ action: "FEEDBACK_STATUS_UPDATED", description: `Feedback status changed to ${feedback.status}`, refId: feedback._id.toString(), userId: req.body.userId, userName: req.body.userName });
    return sendSuccess(res, feedback, "Feedback status updated successfully");
  } catch (error) {
    return sendError(res, error, 400, "Failed to update feedback status");
  }
};
