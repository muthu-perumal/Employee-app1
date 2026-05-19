import Holiday from "../model/holiday.model.js";

export const getHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    let query = { isActive: true };

    if (year) {
      // Assuming date is stored as YYYY-MM-DD string
      query.date = { $regex: `^${year}-` };
    }

    const holidays = await Holiday.find(query).sort({ date: 1 });
    res.status(200).json(holidays);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createHoliday = async (req, res) => {
  try {
    const holiday = new Holiday(req.body);
    const savedHoliday = await holiday.save();
    res.status(201).json(savedHoliday);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedHoliday = await Holiday.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedHoliday) return res.status(404).json({ message: "Holiday not found" });
    res.status(200).json(updatedHoliday);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedHoliday = await Holiday.findByIdAndDelete(id);
    if (!deletedHoliday) return res.status(404).json({ message: "Holiday not found" });
    res.status(200).json({ message: "Holiday deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const seedInitialHolidays = async (req, res) => {
  try {
    const holidays2026 = [
      { date: "2026-01-01", title: "New Year", type: "Government", region: "All" },
      { date: "2026-01-15", title: "Pongal", type: "Government", region: "All" },
      { date: "2026-01-16", title: "Thiruvalluvar Day", type: "Government", region: "All" },
      { date: "2026-01-26", title: "Republic Day", type: "Government", region: "All" },
      { date: "2026-03-21", title: "Ramzan", type: "Government", region: "All" },
      { date: "2026-04-03", title: "Good Friday", type: "Government", region: "All" },
      { date: "2026-04-14", title: "Tamil New Year's Day", type: "Government", region: "All" },
      { date: "2026-05-01", title: "May Day", type: "Government", region: "All" },
      { date: "2026-05-28", title: "Bakrid", type: "Government", region: "All" },
      { date: "2026-06-26", title: "Muharram", type: "Government", region: "All" },
      { date: "2026-08-15", title: "Independence Day", type: "Government", region: "All" },
      { date: "2026-08-26", title: "Milad-un-Nabi", type: "Government", region: "All" },
      { date: "2026-09-04", title: "Krishna Jayanthi", type: "Government", region: "All" },
      { date: "2026-09-14", title: "Vinayakar Chathurthi", type: "Government", region: "All" },
      { date: "2026-10-02", title: "Gandhi Jayanthi", type: "Government", region: "All" },
      { date: "2026-10-19", title: "Ayutha Pooja", type: "Government", region: "All" },
      { date: "2026-10-20", title: "Vijaya Dasami", type: "Government", region: "All" },
      { date: "2026-11-08", title: "Deepawali", type: "Government", region: "All" },
      { date: "2026-12-25", title: "Christmas", type: "Government", region: "All" },
    ];

    for (const holiday of holidays2026) {
      await Holiday.findOneAndUpdate(
        { date: holiday.date },
        { ...holiday, isActive: true },
        { upsert: true, new: true }
      );
    }
    res.status(200).json({ message: "2026 Holidays seeded successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
