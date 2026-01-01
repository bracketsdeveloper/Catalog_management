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

async function sendTaskAssignmentEmail(task, assignedUsers, assignedByUser, isUpdate = false) {
  try {
    const userEmails = assignedUsers.map(user => user.email).filter(email => email);
    
    if (userEmails.length === 0) return;

    const taskDate = new Date(task.toBeClosedBy).toLocaleDateString();
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

async function sendTaskCompletionEmail(task, completedByUser) {
  try {
    const assignedByUser = await User.findById(task.assignedBy);
    if (!assignedByUser || !assignedByUser.email) return;

    const taskDate = new Date(task.toBeClosedBy).toLocaleDateString();
    const subject = `Task Completed: ${task.ticketName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Task Completed</h2>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${task.ticketName}</h3>
          <p><strong>Task Reference:</strong> ${task.taskRef || 'N/A'}</p>
          <p><strong>Completed By:</strong> ${completedByUser.name} (${completedByUser.email})</p>
          <p><strong>Completion Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Completion Remarks:</strong> ${task.completionRemarks || 'No remarks provided'}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated notification from the Task Management System.</p>
      </div>
    `;

    await sendMail({
      to: assignedByUser.email,
      subject,
      html,
      text: `Task Completed: ${task.ticketName}\n\nCompleted By: ${completedByUser.name}\n\nRemarks: ${task.completionRemarks || 'None'}\n\nTask was due on: ${taskDate}`
    });

    console.log(`Task completion email sent to: ${assignedByUser.email}`);
  } catch (error) {
    console.error("Error sending task completion email:", error);
  }
}

async function sendTaskReopenEmail(task, reopenedByUser) {
  try {
    const assignedUsers = await User.find({ _id: { $in: task.assignedTo } });
    const userEmails = assignedUsers.map(user => user.email).filter(email => email);
    
    if (userEmails.length === 0) return;

    const taskDate = new Date(task.toBeClosedBy).toLocaleDateString();
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

// POST create task
router.post("/tasks", authenticate, authorizeAdmin, async (req, res) => {
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
        console.log(`Using provided opportunity code from request: ${finalOpportunityCode}`);
      }
      
      if (opportunityId && mongoose.Types.ObjectId.isValid(opportunityId)) {
        const opp = await Opportunity.findById(opportunityId);
        if (!opp) return res.status(404).json({ message: "Opportunity not found" });
        
        validOpportunityId = opportunityId;
        finalOpportunityCode = opp.opportunityCode ? 
          `${opp.opportunityCode} - ${opp.opportunityName}` : 
          `${opp._id} - ${opp.opportunityName}`;
        
        console.log(`Opportunity found: ${finalOpportunityCode} for ID: ${opportunityId}`);
      } else if (opportunityId && opportunityId.trim() !== "") {
        finalOpportunityCode = opportunityId;
        console.log(`Using provided opportunityId as code: ${finalOpportunityCode}`);
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
        toBeClosedByDate.setHours(0, 0, 0, 0);
      }
      const toBeClosedByNormalized = toBeClosedByDate ? toBeClosedByDate.toISOString() : null;

      if (toBeClosedByNormalized) {
        const startOfDay = new Date(toBeClosedByNormalized);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(23, 59, 59, 999);

        const existingTask = await Task.findOne({
          ticketName: taskData.ticketName,
          createdBy: req.user._id,
          toBeClosedBy: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
        });

        if (existingTask) {
          console.log(`Skipping duplicate task for ${taskData.ticketName} on ${toBeClosedByNormalized}`);
          continue;
        }
      }

      let fromDateNormalized = fromDate ? new Date(fromDate) : null;
      let toDateNormalized = toDate ? new Date(toDate) : null;
      let selectedDatesNormalized = selectedDates ? [...new Set(selectedDates.map((d) => new Date(d)))] : [];

      if (fromDateNormalized) {
        fromDateNormalized.setHours(0, 0, 0, 0);
      }
      if (toDateNormalized) {
        toDateNormalized.setHours(0, 0, 0, 0);
      }
      if (selectedDatesNormalized.length) {
        selectedDatesNormalized = selectedDatesNormalized.map((d) => {
          const date = new Date(d);
          date.setHours(0, 0, 0, 0);
          return date;
        });
      }

      const task = new Task({
        ...taskData,
        taskDescription: taskDescription || "",
        opportunityId: validOpportunityId,
        opportunityCode: finalOpportunityCode,
        assignedBy: req.user._id,
        createdBy: req.user._id,
        assignedTo: Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : [req.user._id]),
        toBeClosedBy: toBeClosedByDate,
        fromDate: fromDateNormalized,
        toDate: toDateNormalized,
        selectedDates: selectedDatesNormalized,
        reopened: taskData.reopened || false,
        logs: [createLogEntry(req, "create", null, null, null)],
      });
      
      console.log(`Creating task with opportunityId: ${validOpportunityId}, opportunityCode: ${finalOpportunityCode}`);
      
      await task.save();
      createdTasks.push(task);

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

router.get("/tasks", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { searchTerm } = req.query;
    const isSuperAdmin = req.user.isSuperAdmin;
    const query = isSuperAdmin
      ? {}
      : {
          $or: [
            { createdBy: req.user._id },
            { assignedTo: req.user._id },
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
      .sort({ createdAt: -1 });
    console.log("Tasks fetched for list:", tasks.length);
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Server error fetching tasks" });
  }
});

router.get("/tasks/calendar", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const isSuperAdmin = req.user.isSuperAdmin;
    const query = isSuperAdmin
      ? {}
      : {
          $or: [
            { createdBy: req.user._id },
            { assignedTo: req.user._id },
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
        if (!date) {
          console.warn("Invalid toBeClosedBy date for task:", { taskId: task._id });
          return;
        }
        const adjustedDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
        const dateOnly = adjustedDate.toISOString().split("T")[0];
        const isOverdue = new Date(date) < new Date() && task.completedOn === "Not Done";
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

    console.log("Tasks fetched for calendar:", flatTasks.length);
    res.json(flatTasks.map((t) => t.eventObj));
  } catch (error) {
    console.error("Error fetching tasks for calendar:", error);
    res.status(500).json({ message: "Server error fetching tasks for calendar" });
  }
});

router.put("/tasks/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    
    const isSuperAdmin = req.user.isSuperAdmin;
    if (!isSuperAdmin && task.createdBy.toString() !== req.user._id.toString() && !task.assignedTo.includes(req.user._id.toString())) {
      return res.status(403).json({ message: "Unauthorized" });
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

    fieldsToCheck.forEach((field) => {
      if (req.body[field] !== undefined && field !== "opportunityId") {
        const oldVal = task[field];
        let newVal = req.body[field];
        
        if (["toBeClosedBy", "fromDate", "toDate"].includes(field)) {
          if (req.body[field]) {
            newVal = new Date(req.body[field]);
            newVal.setHours(0, 0, 0, 0);
          } else {
            newVal = null;
          }
        }
        
        if (field === "selectedDates" && req.body[field]) {
          newVal = req.body[field].map((d) => {
            const date = new Date(d);
            date.setHours(0, 0, 0, 0);
            return date;
          });
        }
        
        if (field === "reopened") {
          newVal = Boolean(req.body[field]);
        }
        
        if (field === "assignedTo") {
          if (Array.isArray(req.body[field])) {
            newVal = req.body[field];
          } else if (req.body[field]) {
            newVal = [req.body[field]];
          } else {
            newVal = [];
          }
        }
        
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          logs.push(createLogEntry(req, "update", field, oldVal, newVal));
          task[field] = newVal;
        }
      }
    });

    if (task.assignedBy?.toString() !== req.user._id.toString()) {
      logs.push(createLogEntry(req, "update", "assignedBy", task.assignedBy, req.user._id));
      task.assignedBy = req.user._id;
    }

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

    if (schedule === "None" || schedule === "SelectedDates") {
      task.selectedDates = selectedDates ? [...new Set(selectedDates.map((d) => {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return date;
      }))] : [];
    }

    if (completedOn === "Done" && task.completedOn !== "Done") {
      logs.push(createLogEntry(req, "update", "completedOn", task.completedOn, "Done", completionRemarks));
      task.completionRemarks = completionRemarks || "";
      
      const completedByUser = await User.findById(req.user._id);
      if (completedByUser) {
        await sendTaskCompletionEmail(task, completedByUser);
      }
    }

    if (reopened === true && task.reopened !== true) {
      logs.push(createLogEntry(req, "update", "reopened", task.reopened, true, reopenDescription));
      task.reopenDescription = reopenDescription || "";
      
      const reopenedByUser = await User.findById(req.user._id);
      if (reopenedByUser) {
        await sendTaskReopenEmail(task, reopenedByUser);
      }
    }

    if (logs.length > 0) {
      task.logs.push(...logs);
      await task.save();
      
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

router.delete("/tasks/:id", authenticate, authorizeAdmin, async (req, res) => {
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

router.get("/tasks/opportunities", authenticate, authorizeAdmin, async (req, res) => {
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
    console.log("Fetched opportunities:", opportunities.length);
    res.json(opportunities);
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    res.status(500).json({ message: "Server error fetching opportunities" });
  }
});

module.exports = router;