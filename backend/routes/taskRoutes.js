const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const Opportunity = require("../models/Opportunity");
const User = require("../models/User");
const Counter = require("../models/Counter");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const mongoose = require("mongoose");
const sendMail = require("../utils/sendMail");

function createLogEntry(req, action, field, oldValue, newValue, description = null) {
  return {
    action,
    field,
    oldValue,
    newValue,
    performedBy: req.user._id,
    performedAt: new Date(),
    ipAddress: req.ip,
    description,
  };
}

// Helper to format date for display in emails (IST)
function formatDateForDisplay(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

async function sendTaskAssignmentEmail(task, assignedUsers, assignedByUser, isUpdate = false) {
  try {
    const userEmails = assignedUsers.map(user => user.email).filter(email => email);
    
    if (userEmails.length === 0) return;

    const taskDate = formatDateForDisplay(task.toBeClosedBy);
    const subject = isUpdate 
      ? `Task Updated: ${task.ticketName}`
      : `New Task Assigned: ${task.ticketName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Task ${isUpdate ? 'Updated' : 'Assigned'}</h2>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${task.ticketName}</h3>
          <p><strong>Task Reference:</strong> ${task.taskRef || 'N/A'}</p>
          <p><strong>Description:</strong> ${task.taskDescription || 'No description provided'}</p>
          <p><strong>Due Date:</strong> ${taskDate}</p>
          <p><strong>Assigned By:</strong> ${assignedByUser.name} (${assignedByUser.email})</p>
          ${task.opportunityCode ? `<p><strong>Opportunity:</strong> ${task.opportunityCode}</p>` : ''}
        </div>
        <p>Please log in to the system to view and complete this task.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated notification from the Task Management System.</p>
      </div>
    `;

    await sendMail({
      to: userEmails,
      subject,
      html,
      text: `Task ${isUpdate ? 'Updated' : 'Assigned'}: ${task.ticketName}\n\nDue: ${taskDate}\n\nAssigned By: ${assignedByUser.name}\n\nDescription: ${task.taskDescription || 'No description'}\n\nPlease log in to the system to view details.`
    });

    console.log(`Task assignment email sent to: ${userEmails.join(', ')}`);
  } catch (error) {
    console.error("Error sending task assignment email:", error);
  }
}

async function sendTaskCompletionEmail(task, completedByUser, isPending = false) {
  try {
    const assignedByUser = await User.findById(task.assignedBy);
    if (!assignedByUser || !assignedByUser.email) return;

    const taskDate = formatDateForDisplay(task.toBeClosedBy);
    const subject = isPending 
      ? `Task Pending Approval: ${task.ticketName}`
      : `Task Confirmed: ${task.ticketName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isPending ? '#F59E0B' : '#10B981'};">${isPending ? 'Task Pending Approval' : 'Task Confirmed'}</h2>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${task.ticketName}</h3>
          <p><strong>Task Reference:</strong> ${task.taskRef || 'N/A'}</p>
          <p><strong>${isPending ? 'Completed By' : 'Confirmed By'}:</strong> ${completedByUser.name} (${completedByUser.email})</p>
          <p><strong>${isPending ? 'Completion Date' : 'Confirmation Date'}:</strong> ${formatDateForDisplay(new Date())}</p>
          <p><strong>Completion Remarks:</strong> ${task.completionRemarks || 'No remarks provided'}</p>
        </div>
        ${isPending ? `<p>Please log in to the system to review and confirm this task.</p>` : ''}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated notification from the Task Management System.</p>
      </div>
    `;

    await sendMail({
      to: assignedByUser.email,
      subject,
      html,
      text: `${isPending ? 'Task Pending Approval' : 'Task Confirmed'}: ${task.ticketName}\n\n${isPending ? 'Completed By' : 'Confirmed By'}: ${completedByUser.name}\n\nRemarks: ${task.completionRemarks || 'None'}\n\nTask was due on: ${taskDate}`
    });

    console.log(`Task ${isPending ? 'pending' : 'confirmation'} email sent to: ${assignedByUser.email}`);
  } catch (error) {
    console.error("Error sending task email:", error);
  }
}

async function sendTaskReopenEmail(task, reopenedByUser) {
  try {
    const assignedUsers = await User.find({ _id: { $in: task.assignedTo } });
    const userEmails = assignedUsers.map(user => user.email).filter(email => email);
    
    if (userEmails.length === 0) return;

    const taskDate = formatDateForDisplay(task.toBeClosedBy);
    const subject = `Task Reopened: ${task.ticketName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F59E0B;">Task Reopened</h2>
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${task.ticketName}</h3>
          <p><strong>Task Reference:</strong> ${task.taskRef || 'N/A'}</p>
          <p><strong>Reopened By:</strong> ${reopenedByUser.name} (${reopenedByUser.email})</p>
          <p><strong>New Due Date:</strong> ${taskDate}</p>
          <p><strong>Reopen Reason:</strong> ${task.reopenDescription || 'No reason provided'}</p>
        </div>
        <p>Please log in to the system to view and complete this reopened task.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated notification from the Task Management System.</p>
      </div>
    `;

    await sendMail({
      to: userEmails,
      subject,
      html,
      text: `Task Reopened: ${task.ticketName}\n\nReopened By: ${reopenedByUser.name}\n\nNew Due Date: ${taskDate}\n\nReason: ${task.reopenDescription || 'None'}\n\nPlease log in to view details.`
    });

    console.log(`Task reopen email sent to: ${userEmails.join(', ')}`);
  } catch (error) {
    console.error("Error sending task reopen email:", error);
  }
}

async function sendTaskReplyEmail(task, replyingUser, message, replyToUsers) {
  try {
    const userEmails = replyToUsers.map(user => user.email).filter(email => email);
    
    if (userEmails.length === 0) return;

    const subject = `New Reply on Task: ${task.ticketName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">New Reply on Task</h2>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${task.ticketName}</h3>
          <p><strong>Task Reference:</strong> ${task.taskRef || 'N/A'}</p>
          <p><strong>Replied By:</strong> ${replyingUser.name} (${replyingUser.email})</p>
          <p><strong>Reply Time:</strong> ${formatDateForDisplay(new Date())}</p>
          <div style="background-color: #f0f4ff; padding: 15px; border-left: 4px solid #4F46E5; margin: 15px 0;">
            <p style="margin: 0; font-style: italic;">"${message}"</p>
          </div>
        </div>
        <p>Please log in to the system to view and respond to this reply.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated notification from the Task Management System.</p>
      </div>
    `;

    await sendMail({
      to: userEmails,
      subject,
      html,
      text: `New Reply on Task: ${task.ticketName}\n\nReplied By: ${replyingUser.name}\n\nMessage: ${message}\n\nPlease log in to view and respond.`
    });

    console.log(`Task reply email sent to: ${userEmails.join(', ')}`);
  } catch (error) {
    console.error("Error sending task reply email:", error);
  }
}

// GET tasks assigned to current user
router.get("/tasks/assigned-to-me", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const tasks = await Task.find({
      assignedTo: userId,
      isActive: true
    })
      .populate("assignedBy", "name email")
      .populate("assignedTo", "name email")
      .populate("opportunityId", "opportunityCode opportunityName")
      .populate("replies.user", "name email")
      .populate("confirmedBy", "name email")
      .sort({ toBeClosedBy: 1 })
      .lean();

    const formattedTasks = tasks.map(task => {
      if (!task.opportunityCode && task.opportunityId) {
        return {
          ...task,
          opportunityCode: `${task.opportunityId.opportunityCode} - ${task.opportunityId.opportunityName}`
        };
      }
      return task;
    });

    res.json({
      success: true,
      count: formattedTasks.length,
      tasks: formattedTasks
    });
  } catch (error) {
    console.error("Error fetching assigned tasks:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching assigned tasks"
    });
  }
});

// GET tasks for current user (creator and assigned user)
router.get("/tasks/my-tasks", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { searchTerm } = req.query;
    
    const query = {
      $or: [
        { createdBy: userId },
        { assignedTo: userId },
        { assignedBy: userId }
      ],
      isActive: true
    };
    
    if (searchTerm) {
      const regex = new RegExp(searchTerm, "i");
      query.$or = query.$or || [];
      query.$or.push(
        { taskRef: regex },
        { ticketName: regex },
        { taskDescription: regex },
        { opportunityCode: regex }
      );
    }
    
    const tasks = await Task.find(query)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .populate("opportunityId", "opportunityCode opportunityName")
      .populate("replies.user", "name email")
      .populate("confirmedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error("Error fetching user tasks:", error);
    res.status(500).json({ message: "Server error fetching tasks" });
  }
});

// GET all tasks (super admin only)
router.get("/tasks", authenticate, async (req, res) => {
  try {
    const { searchTerm } = req.query;
    const isSuperAdmin = req.user.isSuperAdmin;
    
    // For super admins: see all tasks
    // For regular users: see only tasks they created or are assigned to
    const query = isSuperAdmin
      ? {}
      : {
          $or: [
            { createdBy: req.user._id },
            { assignedTo: req.user._id },
            { assignedBy: req.user._id }
          ],
        };
    
    if (searchTerm) {
      const regex = new RegExp(searchTerm, "i");
      query.$or = query.$or || [];
      query.$or.push(
        { taskRef: regex },
        { ticketName: regex },
        { taskDescription: regex },
        { opportunityCode: regex }
      );
    }
    
    const tasks = await Task.find(query)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .populate("opportunityId", "opportunityCode opportunityName")
      .populate("replies.user", "name email")
      .populate("confirmedBy", "name email")
      .sort({ createdAt: -1 });
    
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Server error fetching tasks" });
  }
});

// POST create task
router.post("/tasks", authenticate, async (req, res) => {
  try {
    const tasksData = Array.isArray(req.body) ? req.body : [req.body];
    const createdTasks = [];

    for (const taskData of tasksData) {
      const { 
        opportunityId, 
        opportunityCode: reqOpportunityCode,
        toBeClosedBy, 
        schedule, 
        selectedDates, 
        assignedTo, 
        fromDate, 
        toDate,
        taskDescription 
      } = taskData;
      
      let finalOpportunityCode = "";
      let validOpportunityId = null;

      if (reqOpportunityCode && reqOpportunityCode.trim() !== "") {
        finalOpportunityCode = reqOpportunityCode;
      }
      
      if (opportunityId && mongoose.Types.ObjectId.isValid(opportunityId)) {
        const opp = await Opportunity.findById(opportunityId);
        if (!opp) return res.status(404).json({ message: "Opportunity not found" });
        
        validOpportunityId = opportunityId;
        finalOpportunityCode = opp.opportunityCode ? 
          `${opp.opportunityCode} - ${opp.opportunityName}` : 
          `${opp._id} - ${opp.opportunityName}`;
      } else if (opportunityId && opportunityId.trim() !== "") {
        finalOpportunityCode = opportunityId;
      }

      let assignedUsers = [];
      if (assignedTo && Array.isArray(assignedTo)) {
        for (const userId of assignedTo) {
          const user = await User.findById(userId);
          if (!user) return res.status(404).json({ message: `Assigned user ${userId} not found` });
          assignedUsers.push(user);
        }
      } else if (assignedTo) {
        const user = await User.findById(assignedTo);
        if (!user) return res.status(404).json({ message: "Assigned user not found" });
        assignedUsers.push(user);
      }

      let toBeClosedByDate = toBeClosedBy ? new Date(toBeClosedBy) : null;
      
      if (toBeClosedByDate) {
        console.log(`[CREATE] Received toBeClosedBy: ${toBeClosedBy}`);
        console.log(`[CREATE] Parsed as UTC: ${toBeClosedByDate.toISOString()}`);
        console.log(`[CREATE] Display in IST: ${formatDateForDisplay(toBeClosedByDate)}`);
      }

      if (toBeClosedByDate) {
        const timeWindow = 5 * 60 * 1000;
        const existingTask = await Task.findOne({
          ticketName: taskData.ticketName,
          createdBy: req.user._id,
          toBeClosedBy: {
            $gte: new Date(toBeClosedByDate.getTime() - timeWindow),
            $lt: new Date(toBeClosedByDate.getTime() + timeWindow),
          },
        });

        if (existingTask) {
          console.log(`Skipping duplicate task for ${taskData.ticketName}`);
          continue;
        }
      }

      let fromDateParsed = fromDate ? new Date(fromDate) : null;
      let toDateParsed = toDate ? new Date(toDate) : null;
      let selectedDatesParsed = selectedDates 
        ? [...new Set(selectedDates.map((d) => new Date(d)))] 
        : [];

      const task = new Task({
        ...taskData,
        taskDescription: taskDescription || "",
        opportunityId: validOpportunityId,
        opportunityCode: finalOpportunityCode,
        assignedBy: req.user._id,
        createdBy: req.user._id,
        assignedTo: Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : [req.user._id]),
        toBeClosedBy: toBeClosedByDate,
        fromDate: fromDateParsed,
        toDate: toDateParsed,
        selectedDates: selectedDatesParsed,
        reopened: taskData.reopened || false,
        logs: [createLogEntry(req, "create", null, null, null)],
      });
      
      await task.save();
      createdTasks.push(task);

      console.log(`[CREATE] Task saved. Due: ${formatDateForDisplay(task.toBeClosedBy)}`);

      const assignedByUser = await User.findById(req.user._id);
      if (assignedByUser && assignedUsers.length > 0) {
        await sendTaskAssignmentEmail(task, assignedUsers, assignedByUser, false);
      }
    }

    res.status(201).json({ message: "Task(s) created successfully", tasks: createdTasks });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Server error creating task" });
  }
});

// POST add reply to task
router.post("/tasks/:id/reply", authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Check if user is authorized (assigned user, creator, or super admin)
    const isAuthorized = req.user.isSuperAdmin || 
      task.createdBy.toString() === req.user._id.toString() ||
      task.assignedTo.some(userId => userId.toString() === req.user._id.toString()) ||
      task.assignedBy.toString() === req.user._id.toString();

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to reply to this task" });
    }

    const { message, attachments } = req.body;
    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const reply = {
      user: req.user._id,
      message: message.trim(),
      attachments: attachments || []
    };

    task.replies.push(reply);
    task.logs.push(createLogEntry(req, "reply", "replies", null, reply, "Added a reply"));
    await task.save();

    // Send email notification to other users
    const replyingUser = await User.findById(req.user._id);
    const taskUsers = await User.find({
      $or: [
        { _id: task.createdBy },
        { _id: { $in: task.assignedTo } },
        { _id: task.assignedBy }
      ],
      _id: { $ne: req.user._id } // Exclude the user who replied
    });

    if (replyingUser && taskUsers.length > 0) {
      await sendTaskReplyEmail(task, replyingUser, message, taskUsers);
    }

    const populatedTask = await Task.findById(task._id)
      .populate("replies.user", "name email")
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email");

    res.json({
      message: "Reply added successfully",
      reply,
      task: populatedTask
    });
  } catch (error) {
    console.error("Error adding reply:", error);
    res.status(500).json({ message: "Server error adding reply" });
  }
});

// PUT confirm task completion
router.put("/tasks/:id/confirm", authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Only task creator or super admin can confirm
    const canConfirm = req.user.isSuperAdmin || 
      task.createdBy.toString() === req.user._id.toString() ||
      task.assignedBy.toString() === req.user._id.toString();

    if (!canConfirm) {
      return res.status(403).json({ message: "Only task creator or assigned by user can confirm completion" });
    }

    if (task.completedOn !== "Pending") {
      return res.status(400).json({ message: "Task is not pending confirmation" });
    }

    const oldStatus = task.completedOn;
    task.completedOn = "Done";
    task.confirmedBy = req.user._id;
    task.confirmedAt = new Date();
    task.logs.push(createLogEntry(req, "confirm", "completedOn", oldStatus, "Done", "Task confirmed as done"));

    await task.save();

    const confirmedByUser = await User.findById(req.user._id);
    if (confirmedByUser) {
      await sendTaskCompletionEmail(task, confirmedByUser, false);
    }

    res.json({
      message: "Task confirmed as completed",
      task
    });
  } catch (error) {
    console.error("Error confirming task:", error);
    res.status(500).json({ message: "Server error confirming task" });
  }
});

// NEW: Mark task as completed (sets to Pending)
router.put("/tasks/:id/complete", authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Check if user is assigned to this task
    const isAssigned = task.assignedTo.some(userId => userId.toString() === req.user._id.toString());
    const isSuperAdmin = req.user.isSuperAdmin;

    if (!isAssigned && !isSuperAdmin) {
      return res.status(403).json({ message: "Only assigned users can mark task as completed" });
    }

    if (task.completedOn !== "Not Done") {
      return res.status(400).json({ message: "Task is already marked as completed or pending" });
    }

    const { completionRemarks } = req.body;
    const oldStatus = task.completedOn;
    task.completedOn = "Pending";
    task.completionRemarks = completionRemarks || "Marked as completed by user";
    task.logs.push(createLogEntry(req, "complete", "completedOn", oldStatus, "Pending", "Marked as completed - pending confirmation"));

    await task.save();

    const completedByUser = await User.findById(req.user._id);
    if (completedByUser) {
      await sendTaskCompletionEmail(task, completedByUser, true);
    }

    res.json({
      message: "Task marked as completed. Waiting for confirmation.",
      task
    });
  } catch (error) {
    console.error("Error marking task as completed:", error);
    res.status(500).json({ message: "Server error marking task as completed" });
  }
});

router.get("/tasks/calendar", authenticate, async (req, res) => {
  try {
    const isSuperAdmin = req.user.isSuperAdmin;
    const query = isSuperAdmin
      ? {}
      : {
          $or: [
            { createdBy: req.user._id },
            { assignedTo: req.user._id },
            { assignedBy: req.user._id }
          ],
        };
    
    const tasks = await Task.find(query)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .populate("opportunityId", "opportunityCode opportunityName");

    const flatTasks = [];
    tasks.forEach((task) => {
      if (task.toBeClosedBy) {
        const date = new Date(task.toBeClosedBy);
        
        const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        const dateOnly = istDate.toISOString().split("T")[0];
        
        const isOverdue = date < new Date() && task.completedOn === "Not Done";
        
        flatTasks.push({
          task,
          dateKey: dateOnly,
          eventObj: {
            title: `${task.taskRef}: ${task.ticketName}${task.opportunityId ? ` (${task.opportunityId.opportunityName})` : ""}`,
            date: dateOnly,
            backgroundColor: isOverdue ? "red" : undefined,
            borderColor: isOverdue ? "red" : undefined,
            extendedProps: { task },
          },
        });
      }
    });

    res.json(flatTasks.map((t) => t.eventObj));
  } catch (error) {
    console.error("Error fetching tasks for calendar:", error);
    res.status(500).json({ message: "Server error fetching tasks for calendar" });
  }
});

router.put("/tasks/:id", authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    
    const isSuperAdmin = req.user.isSuperAdmin;
    
    // Authorization: super admin, creator, assigned user, or assigned by user
    const isAuthorized = isSuperAdmin || 
      task.createdBy.toString() === req.user._id.toString() || 
      task.assignedTo.includes(req.user._id.toString()) ||
      task.assignedBy.toString() === req.user._id.toString();
    
    if (!isAuthorized) {
      return res.status(403).json({ message: "Unauthorized to update this task" });
    }

    const { 
      toBeClosedBy, 
      selectedDates, 
      assignedTo, 
      fromDate, 
      toDate, 
      schedule, 
      opportunityId, 
      opportunityCode: reqOpportunityCode,
      reopened,
      taskDescription,
      completionRemarks,
      reopenDescription,
      completedOn 
    } = req.body;
    
    const logs = [];
    const fieldsToCheck = [
      "ticketName",
      "taskDescription",
      "opportunityId",
      "toBeClosedBy",
      "completedOn",
      "schedule",
      "selectedDates",
      "assignedTo",
      "fromDate",
      "toDate",
      "reopened",
      "completionRemarks",
      "reopenDescription",
    ];

    let opportunityCode = task.opportunityCode;
    let oldAssignedTo = [...task.assignedTo];

    // Handle opportunity update
    if (opportunityId !== undefined || reqOpportunityCode !== undefined) {
      if ((opportunityId === null || opportunityId === "") && (reqOpportunityCode === null || reqOpportunityCode === "")) {
        if (task.opportunityId) {
          logs.push(createLogEntry(req, "update", "opportunityId", task.opportunityId, null));
          logs.push(createLogEntry(req, "update", "opportunityCode", task.opportunityCode, ""));
          task.opportunityId = null;
          task.opportunityCode = "";
          opportunityCode = "";
        }
      } 
      else if (opportunityId && mongoose.Types.ObjectId.isValid(opportunityId)) {
        const opp = await Opportunity.findById(opportunityId);
        if (!opp) return res.status(404).json({ message: "Opportunity not found" });
        
        opportunityCode = opp.opportunityCode ? 
          `${opp.opportunityCode} - ${opp.opportunityName}` : 
          `${opp._id} - ${opp.opportunityName}`;
        
        const oldOppId = task.opportunityId ? task.opportunityId.toString() : null;
        const newOppId = opportunityId.toString();
        
        if (oldOppId !== newOppId) {
          logs.push(createLogEntry(req, "update", "opportunityId", task.opportunityId, opportunityId));
          logs.push(createLogEntry(req, "update", "opportunityCode", task.opportunityCode, opportunityCode));
          task.opportunityId = opportunityId;
          task.opportunityCode = opportunityCode;
        } else if (task.opportunityCode !== opportunityCode) {
          logs.push(createLogEntry(req, "update", "opportunityCode", task.opportunityCode, opportunityCode));
          task.opportunityCode = opportunityCode;
        }
      } else {
        if (reqOpportunityCode !== undefined) {
          opportunityCode = reqOpportunityCode;
        } else if (opportunityId !== undefined) {
          opportunityCode = opportunityId;
        }
        
        if (task.opportunityCode !== opportunityCode) {
          logs.push(createLogEntry(req, "update", "opportunityCode", task.opportunityCode, opportunityCode));
          task.opportunityCode = opportunityCode;
          
          if (task.opportunityId) {
            logs.push(createLogEntry(req, "update", "opportunityId", task.opportunityId, null));
            task.opportunityId = null;
          }
        }
      }
    }

    // Update other fields
    fieldsToCheck.forEach((field) => {
      if (req.body[field] !== undefined && field !== "opportunityId") {
        const oldVal = task[field];
        let newVal = req.body[field];
        
        // Handle date fields - frontend sends ISO strings (UTC)
        if (["toBeClosedBy", "fromDate", "toDate"].includes(field)) {
          if (req.body[field]) {
            newVal = new Date(req.body[field]);
            console.log(`[UPDATE] ${field}: ${req.body[field]} -> ${formatDateForDisplay(newVal)}`);
          } else {
            newVal = null;
          }
        }
        
        // Handle selected dates array
        if (field === "selectedDates" && req.body[field]) {
          newVal = req.body[field].map((d) => new Date(d));
        }
        
        // Handle boolean fields
        if (field === "reopened") {
          newVal = Boolean(req.body[field]);
        }
        
        // Handle assignedTo array
        if (field === "assignedTo") {
          if (Array.isArray(req.body[field])) {
            newVal = req.body[field];
          } else if (req.body[field]) {
            newVal = [req.body[field]];
          } else {
            newVal = [];
          }
        }
        
        // Check if value actually changed
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          logs.push(createLogEntry(req, "update", field, oldVal, newVal));
          task[field] = newVal;
        }
      }
    });

    // Validate assigned users
    if (task.assignedTo && task.assignedTo.length > 0) {
      for (const userId of task.assignedTo) {
        if (mongoose.Types.ObjectId.isValid(userId)) {
          const user = await User.findById(userId);
          if (!user) {
            return res.status(404).json({ message: `Assigned user ${userId} not found` });
          }
        }
      }
    }

    // Handle schedule-specific logic
    if (schedule === "None" || schedule === "SelectedDates") {
      task.selectedDates = selectedDates 
        ? [...new Set(selectedDates.map((d) => new Date(d)))] 
        : [];
    }

    // Handle completion with remarks
    if (completedOn === "Pending" && task.completedOn !== "Pending") {
      logs.push(createLogEntry(req, "update", "completedOn", task.completedOn, "Pending", completionRemarks));
      task.completionRemarks = completionRemarks || "";
      
      const completedByUser = await User.findById(req.user._id);
      if (completedByUser) {
        await sendTaskCompletionEmail(task, completedByUser, true);
      }
    } else if (completedOn === "Done" && task.completedOn !== "Done") {
      logs.push(createLogEntry(req, "update", "completedOn", task.completedOn, "Done", completionRemarks));
      task.completionRemarks = completionRemarks || "";
      
      const completedByUser = await User.findById(req.user._id);
      if (completedByUser) {
        await sendTaskCompletionEmail(task, completedByUser, false);
      }
    }

    // Handle reopening with description
    if (reopened === true && task.reopened !== true) {
      logs.push(createLogEntry(req, "update", "reopened", task.reopened, true, reopenDescription));
      task.reopenDescription = reopenDescription || "";
      
      const reopenedByUser = await User.findById(req.user._id);
      if (reopenedByUser) {
        await sendTaskReopenEmail(task, reopenedByUser);
      }
    }

    // Save the task if there are changes
    if (logs.length > 0) {
      task.logs.push(...logs);
      await task.save();
      
      console.log(`[UPDATE] Task saved. Due: ${formatDateForDisplay(task.toBeClosedBy)}`);
      
      // Send email notification if assigned users changed
      const assignedToChanged = JSON.stringify(oldAssignedTo.sort()) !== JSON.stringify(task.assignedTo.sort());
      if (assignedToChanged) {
        const assignedUsers = await User.find({ _id: { $in: task.assignedTo } });
        const assignedByUser = await User.findById(req.user._id);
        if (assignedByUser && assignedUsers.length > 0) {
          await sendTaskAssignmentEmail(task, assignedUsers, assignedByUser, true);
        }
      }
      
      res.json({ 
        message: "Task updated successfully", 
        task,
        changes: logs.map(log => ({ field: log.field, action: log.action }))
      });
    } else {
      res.status(200).json({ 
        message: "No changes detected", 
        task 
      });
    }
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Server error updating task", error: error.message });
  }
});

router.delete("/tasks/:id", authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    
    const isSuperAdmin = req.user.isSuperAdmin;
    if (!isSuperAdmin && task.createdBy.toString() !== req.user._id.toString() && !task.assignedTo.includes(req.user._id.toString())) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const deleteQuery = {
      ticketName: task.ticketName,
      createdBy: task.createdBy,
    };
    if (task.fromDate && task.toDate) {
      deleteQuery.fromDate = task.fromDate;
      deleteQuery.toDate = task.toDate;
    } else {
      deleteQuery.toBeClosedBy = task.toBeClosedBy;
    }

    const tasksToDelete = await Task.find(deleteQuery);
    for (const taskToDelete of tasksToDelete) {
      taskToDelete.logs.push(createLogEntry(req, "delete", null, taskToDelete.ticketName, null));
      await taskToDelete.save();
    }

    await Task.deleteMany(deleteQuery);
    res.json({ message: `Deleted ${tasksToDelete.length} task(s)` });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Server error deleting task" });
  }
});

router.get("/tasks/opportunities", authenticate, async (req, res) => {
  try {
    const { searchTerm } = req.query;
    const query = {
      opportunityStatus: { $nin: ["Won", "Lost", "Discontinued"] },
    };
    if (searchTerm) {
      const regex = new RegExp(searchTerm, "i");
      query.$or = [
        { opportunityCode: regex },
        { opportunityName: regex },
      ];
    }
    const opportunities = await Opportunity.find(query)
      .select("opportunityCode opportunityName account opportunityStage createdAt")
      .sort({ createdAt: -1 });
    res.json(opportunities);
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    res.status(500).json({ message: "Server error fetching opportunities" });
  }
});

module.exports = router;