import mongoose from "mongoose";
import { WorkItem } from "../model/workItem.model.js";
import { TaskNote } from "../model/taskNote.model.js";
import { SlaPolicy } from "../model/slaPolicy.model.js";
import { NotificationRule } from "../model/notificationRule.model.js";
import { TimelinePlan } from "../model/timelinePlan.model.js";
import { TaskWorklog } from "../model/taskWorklog.model.js";
import { Team } from "../model/team.model.js";
import {
  notifyWorkItemChange,
  notifyNoteChange,
  resolveWorkItemAction,
} from "../utils/taskAppEmailNotify.js";
import {
  buildCreateAuditEntry,
  buildWorkItemAuditEntries,
} from "../utils/workItemAudit.js";

const isObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;

async function findWorkItemById(id) {
  const byCustomId = await WorkItem.findOne({ workItemId: id });
  if (byCustomId) return byCustomId;
  if (isObjectId(id)) {
    return WorkItem.findById(id);
  }
  return null;
}

async function updateDocById(Model, id, body) {
  if (isObjectId(id)) {
    const updated = await Model.findByIdAndUpdate(id, body, { new: true });
    if (updated) return updated;
  }
  return Model.findOneAndUpdate({ id }, body, { new: true });
}

async function deleteDocById(Model, id) {
  if (isObjectId(id)) {
    const deleted = await Model.findByIdAndDelete(id);
    if (deleted) return deleted;
  }
  return Model.findOneAndDelete({ id });
}

// --- WorkItems ---
export const getWorkItems = async (req, res) => {
  try {
    const { type, status, priority, ownerId, customer, teamId } = req.query;

    const query = {
      $or: [
        { isDeleted: false },
        { isDeleted: { $exists: false } }
      ]
    };

    if (type) query.workItemType = type;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (ownerId) query.ownerId = ownerId;
    if (customer) query.customer = new RegExp(customer, 'i');
    if (teamId) query.teamId = teamId;

    const items = await WorkItem.find(query).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createWorkItem = async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.auditLog;
    delete body.id;
    delete body.workItemId;

    const actorId = body.createdBy || body.ownerId || req.query.userId || "system";
    const now = new Date().toISOString();

    const newItem = new WorkItem({
      ...body,
      createdBy: actorId,
      createdAt: body.createdAt || now,
      modifiedBy: actorId,
      modifiedAt: now,
      auditLog: [buildCreateAuditEntry(actorId, body.title)],
    });

    const saved = await newItem.save();
    notifyWorkItemChange("created", saved.toObject());
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateWorkItem = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await findWorkItemById(id);

    if (!existing) return res.status(404).json({ message: "WorkItem not found" });

    const patch = { ...req.body };
    delete patch.auditLog;
    delete patch.id;
    delete patch.workItemId;
    delete patch.createdAt;
    delete patch.createdBy;

    const actorId = patch.modifiedBy || req.query.userId || patch.actorId || existing.modifiedBy || "system";
    delete patch.actorId;

    const auditEntries = buildWorkItemAuditEntries(existing.toObject(), patch, actorId);
    const now = new Date().toISOString();

    const updateQuery = {
      $set: {
        ...patch,
        modifiedBy: actorId,
        modifiedAt: now,
      },
    };

    if (auditEntries.length) {
      updateQuery.$push = { auditLog: { $each: auditEntries } };
    }

    const updated =
      (await WorkItem.findOneAndUpdate({ workItemId: existing.workItemId }, updateQuery, { new: true })) ||
      (isObjectId(String(existing._id))
        ? await WorkItem.findByIdAndUpdate(existing._id, updateQuery, { new: true })
        : null);

    if (!updated) return res.status(404).json({ message: "WorkItem not found" });
    notifyWorkItemChange(resolveWorkItemAction(req.body, "updated"), updated.toObject());
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getWorkItemHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await findWorkItemById(id);

    if (!item) return res.status(404).json({ message: "WorkItem not found" });

    const history = [...(item.auditLog || [])].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json({
      workItemId: item.workItemId || item.id,
      history,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Notes ---
export const getNotes = async (req, res) => {
  try {
    const notes = await TaskNote.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createNote = async (req, res) => {
  try {
    const newNote = new TaskNote(req.body);
    const saved = await newNote.save();
    notifyNoteChange("created", saved.toObject());
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await TaskNote.findOneAndUpdate({ noteId: id }, req.body, { new: true })
      || await TaskNote.findByIdAndUpdate(id, req.body, { new: true });

    if (!updated) return res.status(404).json({ message: "Note not found" });
    notifyNoteChange("updated", updated.toObject());
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TaskNote.findOneAndDelete({ noteId: id })
      || (isObjectId(id) ? await TaskNote.findByIdAndDelete(id) : null);

    if (!deleted) return res.status(404).json({ message: "Note not found" });
    notifyNoteChange("deleted", deleted.toObject());
    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// --- Teams ---
export const getTeams = async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createTeam = async (req, res) => {
  try {
    const saved = await new Team(req.body).save();
    res.status(201).json(saved);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateDocById(Team, id, req.body);
    if (!updated) return res.status(404).json({ message: "Team not found" });
    res.json(updated);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteDocById(Team, id);
    if (!deleted) return res.status(404).json({ message: "Team not found" });
    res.json({ message: "Team deleted successfully" });
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// --- Configs (SLA, Rules, Timeline) ---
export const getConfigs = async (req, res) => {
  try {
    const [slaPolicies, rules, plans, teams] = await Promise.all([
      SlaPolicy.find(),
      NotificationRule.find(),
      TimelinePlan.find(),
      Team.find()
    ]);
    res.json({ slaPolicies, rules, plans, teams });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createSlaPolicy = async (req, res) => {
  try {
    const saved = await new SlaPolicy(req.body).save();
    res.status(201).json(saved);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const updateSlaPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateDocById(SlaPolicy, id, req.body);
    if (!updated) return res.status(404).json({ message: "SLA policy not found" });
    res.json(updated);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const deleteSlaPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteDocById(SlaPolicy, id);
    if (!deleted) return res.status(404).json({ message: "SLA policy not found" });
    res.json({ message: "SLA policy deleted successfully" });
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const createNotificationRule = async (req, res) => {
  try {
    const saved = await new NotificationRule(req.body).save();
    res.status(201).json(saved);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const updateNotificationRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await NotificationRule.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updated);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const createTimelinePlan = async (req, res) => {
  try {
    const saved = await new TimelinePlan(req.body).save();
    res.status(201).json(saved);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const updateTimelinePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await TimelinePlan.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updated);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// --- Worklogs ---
export const getWorklogs = async (req, res) => {
  try {
    const logs = await TaskWorklog.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createWorklog = async (req, res) => {
  try {
    const saved = await new TaskWorklog(req.body).save();
    res.status(201).json(saved);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const updateWorklog = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await TaskWorklog.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updated);
  } catch (error) { res.status(400).json({ message: error.message }); }
};
