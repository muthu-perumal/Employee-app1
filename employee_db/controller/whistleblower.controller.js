import WhistleblowerReport from "../model/whistleblowerReport.model.js";
import {
  getWhistleblowerReviewers,
  isWhistleblowerReviewer,
  normalizeEmail,
} from "../utils/whistleblowerAccess.js";
import { notifyWhistleblowerSubmission } from "../utils/whistleblowerEmailNotify.js";

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 12 * 1024 * 1024;

async function generateReferenceId() {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const prefix = `WB-${stamp}-`;
  const latest = await WhistleblowerReport.findOne({
    referenceId: new RegExp(`^${prefix}`),
  })
    .sort({ referenceId: -1 })
    .select("referenceId")
    .lean();

  let next = 1;
  if (latest?.referenceId) {
    const tail = Number(latest.referenceId.split("-").pop());
    if (Number.isFinite(tail)) next = tail + 1;
  }
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function sanitizeAttachments(raw = []) {
  if (!Array.isArray(raw)) return [];
  const cleaned = [];
  let totalBytes = 0;

  for (const item of raw.slice(0, MAX_ATTACHMENTS)) {
    const filename = String(item?.filename || item?.name || "attachment").trim();
    const contentType = String(item?.contentType || item?.type || "application/octet-stream");
    const data = String(item?.data || "").replace(/^data:[^;]+;base64,/, "");
    if (!data) continue;

    const size = Math.ceil((data.length * 3) / 4);
    if (size > MAX_ATTACHMENT_BYTES) {
      throw new Error(`Attachment "${filename}" exceeds 5 MB limit.`);
    }
    totalBytes += size;
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      throw new Error("Total attachment size exceeds 12 MB limit.");
    }

    cleaned.push({ filename, contentType, size, data });
  }

  return cleaned;
}

function toPublicReport(report, { reviewer = false } = {}) {
  const base = {
    id: String(report._id),
    referenceId: report.referenceId,
    isAnonymous: report.isAnonymous,
    category: report.category,
    incidentDate: report.incidentDate || "",
    department: report.department || "",
    description: report.description,
    attachmentCount: report.attachments?.length || 0,
    attachments: (report.attachments || []).map((file) => ({
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
    })),
    status: report.status,
    reviewerRemarks: report.reviewerRemarks || "",
    verifiedBy: report.verifiedBy || "",
    verifiedAt: report.verifiedAt || null,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };

  if (reviewer || !report.isAnonymous) {
    base.reporterName = report.reporterName || "";
    base.reporterEmail = report.reporterEmail || "";
  } else {
    base.reporterName = "";
    base.reporterEmail = "";
  }

  return base;
}

export const createWhistleblowerReport = async (req, res) => {
  try {
    const {
      isAnonymous = true,
      reporterName = "",
      reporterEmail = "",
      submitterEmail = "",
      category,
      incidentDate = "",
      department = "",
      description,
      attachments = [],
    } = req.body;

    if (!category || !String(description || "").trim()) {
      return res.status(400).json({ message: "Category and description are required." });
    }

    const anonymous = Boolean(isAnonymous);
    const cleanedAttachments = sanitizeAttachments(attachments);
    const normalizedSubmitter = normalizeEmail(submitterEmail);
    const normalizedReporterEmail = normalizeEmail(reporterEmail);

    const report = await WhistleblowerReport.create({
      referenceId: await generateReferenceId(),
      isAnonymous: anonymous,
      reporterName: anonymous ? "" : String(reporterName || "").trim(),
      reporterEmail: anonymous ? "" : normalizedReporterEmail,
      submitterEmail: anonymous ? "" : normalizedSubmitter || normalizedReporterEmail,
      category: String(category).trim(),
      incidentDate: String(incidentDate || "").trim(),
      department: String(department || "").trim(),
      description: String(description).trim(),
      attachments: cleanedAttachments,
      status: "Submitted",
    });

    notifyWhistleblowerSubmission(report.toObject()).catch((error) => {
      console.error("[whistleblower] Email failed:", error?.message || error);
    });

    res.status(201).json(toPublicReport(report, { reviewer: false }));
  } catch (error) {
    console.error("[whistleblower] create failed:", error);
    res.status(error.message?.includes("MB") ? 400 : 500).json({
      message: error.message || "Failed to submit report.",
    });
  }
};

export const getWhistleblowerReports = async (req, res) => {
  try {
    const viewerEmail = normalizeEmail(req.query.viewerEmail);
    if (!viewerEmail) {
      return res.status(400).json({ message: "viewerEmail is required." });
    }

    const reviewer = isWhistleblowerReviewer(viewerEmail);
    const query = reviewer
      ? {}
      : {
          isAnonymous: false,
          $or: [
            { submitterEmail: viewerEmail },
            { reporterEmail: viewerEmail },
          ],
        };

    const reports = await WhistleblowerReport.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      isReviewer: reviewer,
      reviewers: reviewer ? getWhistleblowerReviewers() : undefined,
      reports: reports.map((report) => toPublicReport(report, { reviewer })),
    });
  } catch (error) {
    console.error("[whistleblower] list failed:", error);
    res.status(500).json({ message: error.message || "Failed to load reports." });
  }
};

export const getWhistleblowerReportById = async (req, res) => {
  try {
    const viewerEmail = normalizeEmail(req.query.viewerEmail);
    if (!viewerEmail) {
      return res.status(400).json({ message: "viewerEmail is required." });
    }

    const report = await WhistleblowerReport.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ message: "Report not found." });

    const reviewer = isWhistleblowerReviewer(viewerEmail);
    const ownsReport =
      !report.isAnonymous &&
      (report.submitterEmail === viewerEmail || report.reporterEmail === viewerEmail);

    if (!reviewer && !ownsReport) {
      return res.status(403).json({ message: "Access denied." });
    }

    res.status(200).json(toPublicReport(report, { reviewer }));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load report." });
  }
};

export const updateWhistleblowerStatus = async (req, res) => {
  try {
    const viewerEmail = normalizeEmail(req.body.viewerEmail);
    if (!isWhistleblowerReviewer(viewerEmail)) {
      return res.status(403).json({ message: "Only designated reviewers can verify reports." });
    }

    const { status, reviewerRemarks = "" } = req.body;
    const allowed = ["Verified", "Rejected", "Closed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const report = await WhistleblowerReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found." });

    report.status = status;
    report.reviewerRemarks = String(reviewerRemarks || "").trim();
    report.verifiedBy = viewerEmail;
    report.verifiedAt = new Date();
    await report.save();

    res.status(200).json(toPublicReport(report, { reviewer: true }));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update report." });
  }
};

export const downloadWhistleblowerAttachment = async (req, res) => {
  try {
    const viewerEmail = normalizeEmail(req.query.viewerEmail);
    if (!viewerEmail) {
      return res.status(400).json({ message: "viewerEmail is required." });
    }

    const report = await WhistleblowerReport.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ message: "Report not found." });

    const reviewer = isWhistleblowerReviewer(viewerEmail);
    const ownsReport =
      !report.isAnonymous &&
      (report.submitterEmail === viewerEmail || report.reporterEmail === viewerEmail);
    if (!reviewer && !ownsReport) {
      return res.status(403).json({ message: "Access denied." });
    }

    const index = Number(req.params.fileIndex);
    const file = report.attachments?.[index];
    if (!file) return res.status(404).json({ message: "Attachment not found." });

    res.setHeader("Content-Type", file.contentType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${String(file.filename).replace(/"/g, "'")}"`
    );
    return res.status(200).send(Buffer.from(file.data, "base64"));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to download attachment." });
  }
};
