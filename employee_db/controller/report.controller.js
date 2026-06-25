import { Patch, Feedback } from "../model/publishTracker.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

export const getReports = async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    const dateQuery = { isDeleted: false };
    if (from || to) {
      dateQuery.createdAt = {};
      if (from) dateQuery.createdAt.$gte = from;
      if (to) dateQuery.createdAt.$lte = to;
    }

    const patchesByStatus = await Patch.aggregate([
      { $match: dateQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const patchesByPriority = await Patch.aggregate([
      { $match: dateQuery },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const feedbackByStatus = await Feedback.aggregate([
      { $match: dateQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return sendSuccess(res, { patchesByStatus, patchesByPriority, feedbackByStatus }, "Reports fetched successfully");
  } catch (error) {
    return sendError(res, error, 500, "Failed to fetch reports");
  }
};
