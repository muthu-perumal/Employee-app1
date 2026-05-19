import { AuditLogModel } from "../model/auditLog.model.js";

export const getAuditLogs = async (req, res) => {
    try {
        const { entity, entityId } = req.query;
        const query = {};
        if (entity) query.entity = entity;
        if (entityId) query.entityId = entityId;

        const logs = await AuditLogModel.find(query)
            .sort({ createdAt: -1 })
            .limit(100);
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createAuditLog = async (req, res) => {
    try {
        const { entity, entityId, action, changes, actor } = req.body;
        const newLog = new AuditLogModel({
            entity,
            entityId,
            action,
            changes,
            actor
        });
        await newLog.save();
        res.status(201).json(newLog);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
