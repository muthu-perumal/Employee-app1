import { WorkItem } from "../model/workItem.model.js";
import { TaskNote } from "../model/taskNote.model.js";
import { SlaPolicy } from "../model/slaPolicy.model.js";
import { NotificationRule } from "../model/notificationRule.model.js";
import { TimelinePlan } from "../model/timelinePlan.model.js";
import { TaskWorklog } from "../model/taskWorklog.model.js";
import { Team } from "../model/team.model.js";

// --- WorkItems ---
export const getWorkItems = async (req, res) => {
  try {
    const { type, status, priority, ownerId, customer, teamId } = req.query;
    const query = {};
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
    const newItem = new WorkItem(req.body);
    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateWorkItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await WorkItem.findOneAndUpdate({ workItemId: id }, req.body, { new: true })
      || await WorkItem.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!updated) return res.status(404).json({ message: "WorkItem not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
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
    res.json(updated);
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
    const updated = await Team.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Team not found" });
    res.json(updated);
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
    const updated = await SlaPolicy.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updated);
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
