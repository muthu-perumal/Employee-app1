import { Meeting } from "../model/meeting.model.js";

export const getMeetings = async (req, res) => {
  try {
    const {
      type,
      outcome,
      status,
      presenter,
      organization,
      search,
      page = 1,
      limit = 15,
    } = req.query;

    const query = {};

    if (type && type !== "All Types") query.type = type;
    if (outcome && outcome !== "All Outcomes") query.outcome = outcome;
    if (status) query.status = status;
    if (presenter) query.presenter = new RegExp(presenter, "i");
    if (organization) query.organization = new RegExp(organization, "i");

    if (search) {
      query.$or = [
        { title: new RegExp(search, "i") },
        { presenter: new RegExp(search, "i") },
        { organization: new RegExp(search, "i") },
        { attendees: new RegExp(search, "i") },
        { agenda: new RegExp(search, "i") },
        { notes: new RegExp(search, "i") },
      ];
    }

    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.max(Number(limit), 1);
    const skip = (pageNumber - 1) * pageSize;

    const [items, total] = await Promise.all([
      Meeting.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      Meeting.countDocuments(query),
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

export const getMeetingById = async (req, res) => {
  try {
    const { id } = req.params;

    const meeting =
      (await Meeting.findOne({ meetingId: id })) ||
      (await Meeting.findById(id));

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    res.json(meeting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createMeeting = async (req, res) => {
  try {
    const saved = await new Meeting(req.body).save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;

    const updated =
      (await Meeting.findOneAndUpdate({ meetingId: id }, req.body, {
        new: true,
        runValidators: true,
      })) ||
      (await Meeting.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      }));

    if (!updated) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted =
      (await Meeting.findOneAndDelete({ meetingId: id })) ||
      (await Meeting.findByIdAndDelete(id));

    if (!deleted) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    res.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};