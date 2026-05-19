import { Issue } from "../model/issue.model.js";

export const getIssues = async (req, res) => {
  try {
    const {
      severity,
      issueType,
      status,
      repeated,
      employeeName,
      search,
      page = 1,
      limit = 15,
    } = req.query;

    const query = {};

    if (severity && severity !== "All Severities") query.severity = severity;
    if (issueType && issueType !== "All Types") query.issueType = issueType;
    if (status && status !== "All Status") query.status = status;
    if (repeated && repeated !== "All") query.repeated = repeated;

    if (employeeName) {
      query.employeeName = new RegExp(employeeName, "i");
    }

    if (search) {
      query.$or = [
        { employeeName: new RegExp(search, "i") },
        { issueType: new RegExp(search, "i") },
        { severity: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { status: new RegExp(search, "i") },
        { actionTaken: new RegExp(search, "i") },
        { remarks: new RegExp(search, "i") },
      ];
    }

    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.max(Number(limit), 1);
    const skip = (pageNumber - 1) * pageSize;

    const [items, total] = await Promise.all([
      Issue.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      Issue.countDocuments(query),
    ]);

    res.json({
      items,
      page: pageNumber,
      limit: pageSize,
      total,
      hasMore: skip + items.length < total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getIssueById = async (req, res) => {
  try {
    const { id } = req.params;

    const issue =
      (await Issue.findOne({ issueId: id })) ||
      (await Issue.findById(id));

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    res.json(issue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createIssue = async (req, res) => {
  try {
    const saved = await new Issue(req.body).save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateIssue = async (req, res) => {
  try {
    const { id } = req.params;

    const updated =
      (await Issue.findOneAndUpdate({ issueId: id }, req.body, {
        new: true,
        runValidators: true,
      })) ||
      (await Issue.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      }));

    if (!updated) {
      return res.status(404).json({ message: "Issue not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteIssue = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted =
      (await Issue.findOneAndDelete({ issueId: id })) ||
      (await Issue.findByIdAndDelete(id));

    if (!deleted) {
      return res.status(404).json({ message: "Issue not found" });
    }

    res.json({ message: "Issue deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};