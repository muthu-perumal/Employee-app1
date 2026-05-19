
import LeaveRequest from "../model/leaveRequest.model.js";
import LeaveBalance from "../model/leaveBalance.model.js";
import Holiday from "../model/holiday.model.js";
import Notification from "../model/notification.model.js";
import Employee from "../model/employee.model.js";
import { AuditLogModel } from "../model/auditLog.model.js";

// Helper to apply monthly credits (1 AL + 1 CSL on the 1st of every month)
const applyMonthlyCredits = async (balance) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Only apply if it hasn't been applied for the current month
    if (balance.lastCreditMonth !== currentMonth) {
        // Find how many months to credit (in case they haven't logged in for a while)
        let monthsToCredit = 1;
        if (balance.lastCreditMonth) {
            const [lastYear, lastMonth] = balance.lastCreditMonth.split('-').map(Number);
            const monthsDiff = (now.getFullYear() - lastYear) * 12 + (now.getMonth() + 1 - lastMonth);
            monthsToCredit = Math.max(0, monthsDiff);
        }

        if (monthsToCredit > 0) {
            balance.AL_allocated = (balance.AL_allocated || 0) + (1 * monthsToCredit);
            balance.CSL_allocated = (balance.CSL_allocated || 0) + (1 * monthsToCredit);
            
            // Recalculate available
            balance.AL_available = balance.AL_allocated - (balance.AL_used || 0);
            balance.CSL_available = balance.CSL_allocated - (balance.CSL_used || 0);
            
            balance.lastCreditMonth = currentMonth;
            balance.lastRecalculatedAt = new Date();
            await balance.save();
        }
    }
    return balance;
};

// Helper to get available balance
const getAvailableBalance = async (employeeId, type, year) => {
    let balance = await LeaveBalance.findOne({ employeeId, year });
    if (!balance) {
        // Create default balance if not exists
        balance = await LeaveBalance.create({ 
            employeeId, 
            year,
            AL_allocated: 0,
            CSL_allocated: 0,
            AL_available: 0,
            CSL_available: 0
        });
    }
    
    // Apply monthly credits
    balance = await applyMonthlyCredits(balance);

    if (type === 'LOP') return { balance, available: 999 };
    
    // Map old types to new pools if needed, or strictly use AL/CSL
    const map = {
        AL: balance.AL_available,
        CSL: balance.CSL_available,
        EL: balance.AL_available, // Map EL to AL
        CL: balance.CSL_available, // Map CL to CSL
        SL: balance.CSL_available, // Map SL to CSL
    };
    return { balance, available: map[type] || 0 };
};

export const getLeaves = async (req, res) => {
    try {
        const { employeeId, status } = req.query;
        const query = {};
        if (employeeId) query.employeeId = employeeId;
        if (status) query.status = status;

        const leaves = await LeaveRequest.find(query).sort({ appliedAt: -1 });
        res.status(200).json(leaves);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createLeave = async (req, res) => {
    try {
        const { employeeId, leaveType, startDate, endDate, totalDays, reason } = req.body;
        const year = new Date().getFullYear();

        // 1. Check for conflicts
        // TODO: A more robust overlap check could be done here, but trusting basic check for now
        
        // 2. Check balance
        const { balance, available } = await getAvailableBalance(employeeId, leaveType, year);
        if (available < totalDays) {
            return res.status(400).json({ message: "Insufficient leave balance" });
        }

        const newRequest = new LeaveRequest({
            employeeId,
            leaveType,
            startDate,
            endDate,
            totalDays,
            reason,
        });

        await newRequest.save();

        // Create Notifications for Admins
        const applicant = await Employee.findOne({ employee_id: employeeId });
        const applicantName = applicant ? `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() : employeeId;

        const admins = await Employee.find({ role: 'admin', isDeleted: false });
        for (const admin of admins) {
            await Notification.create({
                recipientId: admin.employee_id,
                senderId: employeeId,
                title: 'New Leave Application',
                message: `Employee ${applicantName} has applied for ${totalDays} day(s) of ${leaveType} leave starting from ${startDate}.`,
                type: 'leave',
                relatedId: newRequest._id
            });
        }

        // Create Audit Log
        await AuditLogModel.create({
            entity: 'Leave',
            entityId: newRequest._id,
            action: 'APPLY',
            actor: employeeId,
            changes: { after: newRequest }
        });

        res.status(201).json(newRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, hrApproverId, rejectionReason, cancelledById, approverRemarks } = req.body; // status: HR_Approved, HR_Rejected, Cancelled

        const request = await LeaveRequest.findById(id);
        if (!request) return res.status(404).json({ message: "Request not found" });

        const previousStatus = request.status;
        request.status = status;
        
        if (status === 'HR_Approved' || status === 'HR_Rejected') {
            request.hrApproverId = hrApproverId;
            request.hrActionAt = new Date();
            if (rejectionReason) request.rejectionReason = rejectionReason;
            if (approverRemarks) request.approverRemarks = approverRemarks;
        }

        if (status === 'Cancelled') {
            request.cancelledById = cancelledById || request.employeeId;
        }

        await request.save();

        // Create Notification for the Employee
        let title = '';
        let message = '';
        if (status === 'HR_Approved') {
            title = 'Leave Approved';
            message = `Your leave request for ${request.startDate} has been approved. ${approverRemarks ? 'Remarks: ' + approverRemarks : ''}`;
        } else if (status === 'HR_Rejected') {
            title = 'Leave Rejected';
            message = `Your leave request for ${request.startDate} has been rejected. Reason: ${approverRemarks || rejectionReason || 'No reason provided'}.`;
        } else if (status === 'Cancelled') {
            title = 'Leave Cancelled';
            message = `Your leave request for ${request.startDate} has been cancelled.`;
        }

        if (title) {
            await Notification.create({
                recipientId: request.employeeId,
                senderId: hrApproverId || cancelledById || 'system',
                title,
                message,
                type: 'leave',
                relatedId: request._id
            });
        }

        // Create Audit Log
        await AuditLogModel.create({
            entity: 'Leave',
            entityId: id,
            action: status === 'HR_Approved' ? 'APPROVE' : status === 'HR_Rejected' ? 'REJECT' : 'CANCEL',
            actor: hrApproverId || cancelledById || 'system',
            changes: { before: previousStatus, after: status }
        });

        // Handle Balance Updates
        if (status === 'HR_Approved' && previousStatus !== 'HR_Approved') {
            // Deduct balance
            const year = new Date().getFullYear();
            const balance = await LeaveBalance.findOne({ employeeId: (request.employeeId || "").trim(), year });
            if (balance) {
                if (request.leaveType === 'AL' || request.leaveType === 'EL') {
                    balance.AL_used = (balance.AL_used || 0) + request.totalDays;
                    balance.AL_available = balance.AL_allocated - balance.AL_used;
                } else if (request.leaveType === 'CSL' || request.leaveType === 'CL' || request.leaveType === 'SL') {
                    balance.CSL_used = (balance.CSL_used || 0) + request.totalDays;
                    balance.CSL_available = balance.CSL_allocated - balance.CSL_used;
                }
                await balance.save();
            }
        } else if (status === 'Cancelled' && (previousStatus === 'HR_Approved' || previousStatus === 'AutoProcessed')) {
            // Restore balance if it was approved previously
            const year = new Date().getFullYear();
            const balance = await LeaveBalance.findOne({ employeeId: (request.employeeId || "").trim(), year });
             if (balance) {
                if (request.leaveType === 'AL' || request.leaveType === 'EL') {
                    balance.AL_used = Math.max(0, (balance.AL_used || 0) - request.totalDays);
                    balance.AL_available = balance.AL_allocated - balance.AL_used;
                } else if (request.leaveType === 'CSL' || request.leaveType === 'CL' || request.leaveType === 'SL') {
                    balance.CSL_used = Math.max(0, (balance.CSL_used || 0) - request.totalDays);
                    balance.CSL_available = balance.CSL_allocated - balance.CSL_used;
                }
                await balance.save();
            }
        }

        res.status(200).json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getBalances = async (req, res) => {
    try {
        const { employeeId } = req.query;
        if (!employeeId) return res.status(400).json({ message: "Employee ID is required" });
        
        const year = new Date().getFullYear();
        let balance = await LeaveBalance.findOne({ employeeId: (employeeId || "").trim(), year });
        if (!balance) {
            balance = await LeaveBalance.create({ 
                employeeId: (employeeId || "").trim(), 
                year,
                AL_allocated: 0,
                CSL_allocated: 0,
                AL_available: 0,
                CSL_available: 0
            });
        }
        
        balance = await applyMonthlyCredits(balance);
        res.status(200).json(balance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getAllBalances = async (req, res) => {
    try {
        const year = new Date().getFullYear();
        const balances = await LeaveBalance.find({ year });
        
        // Apply credits for all (might be slow if redirected here, but ensures consistency)
        for (let balance of balances) {
            await applyMonthlyCredits(balance);
        }

        res.status(200).json(balances);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getHolidays = async (req, res) => {
    try {
        const holidays = await Holiday.find({ isActive: true }).sort({ date: 1 });
        res.status(200).json(holidays);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createHoliday = async (req, res) => {
    try {
        const { title, date, type, region } = req.body;
        const newHoliday = new Holiday({
            title,
            date,
            type: type || 'Government',
            region: region || 'All',
            isActive: true
        });
        await newHoliday.save();
        res.status(201).json(newHoliday);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const ensureAllBalances = async (req, res) => {
    try {
        const year = new Date().getFullYear();
        const employees = await Employee.find({ isDeleted: false, status: 'Active' });
        
        let createdCount = 0;
        for (const emp of employees) {
            const empId = (emp.employee_id || "").trim();
            let exists = await LeaveBalance.findOne({ employeeId: empId, year });
            if (!exists) {
                exists = await LeaveBalance.create({ 
                    employeeId: empId, 
                    year,
                    AL_allocated: 0,
                    CSL_allocated: 0,
                    AL_available: 0,
                    CSL_available: 0,
                    EL_allocated: 0,
                    CL_allocated: 0,
                    SL_allocated: 0
                });
                createdCount++;
            }
            // Apply monthly credits to both new and existing balances
            await applyMonthlyCredits(exists);
        }
        res.status(200).json({ message: `Processed ${employees.length} employees. Created ${createdCount} new balances.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
