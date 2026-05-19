import Notification from "../model/notification.model.js";

export const getNotifications = async (req, res) => {
    try {
        const { recipientId } = req.query;
        if (!recipientId) return res.status(400).json({ message: "Recipient ID is required" });

        const notifications = await Notification.find({ recipientId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
        if (!notification) return res.status(404).json({ message: "Notification not found" });
        res.status(200).json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const { recipientId } = req.body;
        await Notification.updateMany({ recipientId, isRead: false }, { isRead: true });
        res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
