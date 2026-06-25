import { Patch, Feedback, PublishAuditLog } from "../model/publishTracker.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

export const getTimeline = async (_req, res) => {
  try {
    const [patches, feedbacks, audits] = await Promise.all([
      Patch.find({ isDeleted: false }).select("title status createdAt updatedAt").sort({ updatedAt: -1 }).limit(20).lean(),
      Feedback.find({ isDeleted: false }).select("clientName status createdAt updatedAt").sort({ updatedAt: -1 }).limit(20).lean(),
      PublishAuditLog.find({}).select("action description createdAt userName").sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const data = [
      ...patches.map((x) => ({ type: "Patch", title: x.title, status: x.status, date: x.updatedAt || x.createdAt, refId: x._id })),
      ...feedbacks.map((x) => ({ type: "Feedback", title: x.clientName, status: x.status, date: x.updatedAt || x.createdAt, refId: x._id })),
      ...audits.map((x) => ({ type: "Audit", title: x.action, description: x.description, userName: x.userName, date: x.createdAt, refId: x._id })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    return sendSuccess(res, data, "Timeline fetched successfully");
  } catch (error) {
    return sendError(res, error, 500, "Failed to fetch timeline");
  }
};
