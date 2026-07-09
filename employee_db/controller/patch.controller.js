import mongoose from "mongoose";
import { Patch } from "../model/publishTracker.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { createAuditLog } from "../utils/auditLogger.js";

export const getPatches = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const priority = req.query.priority || "";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const query = { isDeleted: false };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { version: { $regex: search, $options: "i" } },
        { clientName: { $regex: search, $options: "i" } },
        { moduleName: { $regex: search, $options: "i" } },
        { assignedTo: { $regex: search, $options: "i" } },
      ];
    }

    const totalRecords = await Patch.countDocuments(query);
    const raw = await Patch.find(query)
      .select("-description")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    // notes holds large JSON (attachments, etc.) — extract list fields only
    const data = raw.map((patch) => {
      let patchType = "Feature";
      let serverType = "Trial";
      let reviewedBy = "";
      if (patch.notes) {
        try {
          const extra = JSON.parse(patch.notes);
          patchType = extra.patch_type || patchType;
          serverType = extra.server_type || serverType;
          reviewedBy = extra.reviewed_by || "";
        } catch {
          // legacy plain-text notes
        }
      }
      const { notes, ...rest } = patch;
      return { ...rest, patchType, serverType, reviewedBy };
    });

    return sendSuccess(res, data, "Patches fetched successfully", 200, {
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: page,
      pageSize: limit,
    });
  } catch (error) {
    return sendError(res, error, 500, "Failed to fetch patches");
  }
};

export const getPatchStats = async (_req, res) => {
  try {
    const [total, pending, inProgress, testing, completed, failed, onHold] = await Promise.all([
      Patch.countDocuments({ isDeleted: false }),
      Patch.countDocuments({ isDeleted: false, status: "Pending" }),
      Patch.countDocuments({ isDeleted: false, status: "In Progress" }),
      Patch.countDocuments({ isDeleted: false, status: "Testing" }),
      Patch.countDocuments({ isDeleted: false, status: "Completed" }),
      Patch.countDocuments({ isDeleted: false, status: "Failed" }),
      Patch.countDocuments({ isDeleted: false, status: "On Hold" }),
    ]);

    return sendSuccess(res, { total, pending, inProgress, testing, completed, failed, onHold }, "Patch stats fetched successfully");
  } catch (error) {
    return sendError(res, error, 500, "Failed to fetch patch stats");
  }
};

export const getPatchById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return sendError(res, new Error("Invalid patch id"), 400);
    const patch = await Patch.findOne({ _id: req.params.id, isDeleted: false });
    if (!patch) return sendError(res, new Error("Patch not found"), 404);
    return sendSuccess(res, patch, "Patch fetched successfully");
  } catch (error) {
    return sendError(res, error, 500, "Failed to fetch patch");
  }
};

export const createPatch = async (req, res) => {
  try {
    const patch = await Patch.create(req.body);
    await createAuditLog({ action: "PATCH_CREATED", description: `Patch created: ${patch.title}`, refId: patch._id.toString(), userId: req.body.userId, userName: req.body.userName });
    return sendSuccess(res, patch, "Patch created successfully", 201);
  } catch (error) {
    return sendError(res, error, 400, "Failed to create patch");
  }
};

export const updatePatch = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return sendError(res, new Error("Invalid patch id"), 400);
    const patch = await Patch.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, req.body, { new: true, runValidators: true });
    if (!patch) return sendError(res, new Error("Patch not found"), 404);
    await createAuditLog({ action: "PATCH_UPDATED", description: `Patch updated: ${patch.title}`, refId: patch._id.toString(), userId: req.body.userId, userName: req.body.userName });
    return sendSuccess(res, patch, "Patch updated successfully");
  } catch (error) {
    return sendError(res, error, 400, "Failed to update patch");
  }
};

export const deletePatch = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return sendError(res, new Error("Invalid patch id"), 400);
    const patch = await Patch.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, { isDeleted: true }, { new: true });
    if (!patch) return sendError(res, new Error("Patch not found"), 404);
    await createAuditLog({ action: "PATCH_DELETED", description: `Patch deleted: ${patch.title}`, refId: patch._id.toString(), userId: req.query.userId, userName: req.query.userName });
    return sendSuccess(res, patch, "Patch deleted successfully");
  } catch (error) {
    return sendError(res, error, 500, "Failed to delete patch");
  }
};

function blocksToPlainText(text) {
  if (!text) return "";
  if (typeof text === "string") return text.trim();
  const blocks = text.blocks;
  if (!Array.isArray(blocks)) return "";
  return blocks.map((b) => b?.text || "").filter(Boolean).join("\n\n").trim();
}

export const summarizePatch = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, new Error("Invalid patch id"), 400);
    }

    const patch = await Patch.findOne({ _id: id, isDeleted: false }).lean();
    if (!patch) {
      return sendError(res, new Error("Patch not found"), 404);
    }

    const summaryApiUrl = (process.env.SUMMARY_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
    const response = await fetch(`${summaryApiUrl}/api/chatbot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `summarize patch ${patch.title}` }),
    });

    if (!response.ok) {
      const text = await response.text();
      return sendError(res, new Error(`Summary service error (${response.status}): ${text}`), 502);
    }

    const payload = await response.json();
    const text = payload.text || null;
    const summary = blocksToPlainText(text) || payload.summary || "";
    if (!summary.trim()) {
      return sendError(res, new Error("Summary service returned an empty response"), 502);
    }

    return sendSuccess(
      res,
      {
        summary,
        conversationId: payload.conversation_id || null,
        text,
        objectId: id,
      },
      "Patch summary generated successfully"
    );
  } catch (error) {
    const summaryApiUrl = (process.env.SUMMARY_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
    const refused = error?.cause?.code === "ECONNREFUSED" || error?.code === "ECONNREFUSED";
    const message = refused
      ? `Cannot reach the summary service at ${summaryApiUrl}. Check SUMMARY_API_URL in employee_db/.env and restart the API server.`
      : error?.message;
    return sendError(res, new Error(message || "Failed to generate patch summary"), 500);
  }
};
