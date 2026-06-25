import { PublishAuditLog } from "../model/publishTracker.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

export const getAuditLogs = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const refId = req.query.refId || "";

    const query = {};
    if (refId) query.refId = refId;
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
      ];
    }

    const totalRecords = await PublishAuditLog.countDocuments(query);
    const data = await PublishAuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    return sendSuccess(res, data, "Audit logs fetched successfully", 200, {
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: page,
      pageSize: limit,
    });
  } catch (error) {
    return sendError(res, error, 500, "Failed to fetch audit logs");
  }
};
