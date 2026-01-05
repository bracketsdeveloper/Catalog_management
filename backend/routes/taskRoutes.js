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

async function sendTaskPendingConfirmationEmail(task, completedByUser) {
  try {
    const assignedByUser = await User.findById(task.assignedBy);
    if (!assignedByUser || !assignedByUser.email) return;

    const taskDate = formatDateForDisplay(task.toBeClosedBy);
    const subject = `Task Pending Confirmation: ${task.ticketName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F59E0B;">Task Pending Confirmation</h2>
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${task.ticketName}</h3>
          <p><strong>Task Reference:</strong> ${task.taskRef || 'N/A'}</p>
          <p><strong>Marked Complete By:</strong> ${completedByUser.name} (${completedByUser.email})</p>
          <p><strong>Completion Date:</strong> ${formatDateForDisplay(new Date())}</p>
          <p><strong>Completion Remarks:</strong> ${task.completionRemarks || 'No remarks provided'}</p>
        </div>
        <p>Please log in to the system to confirm or reject the task completion.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated notification from the Task Management System.</p>
      </div>
    `;

    await sendMail({
      to: assignedByUser.email,
      subject,
      html,
      text: `Task Pending Confirmation: ${task.ticketName}\n\nMarked Complete By: ${completedByUser.name}\n\nRemarks: ${task.completionRemarks || 'None'}\n\nPlease log in to confirm.`
    });

    console.log(`Task pending confirmation email sent to: ${assignedByUser.email}`);
  } catch (error) {
    console.error("Error sending task pending confirmation email:", error);
  }
}

async function sendTaskConfirmedEmail(task, confirmedByUser) {
  try {
    const assignedUsers = await User.find({ _id: { $in: task.assignedTo } });
    const userEmails = assignedUsers.map(user => user.email).filter(email => email);
    
    if (userEmails.length === 0) return;

    const subject = `Task Confirmed & Closed: ${task.ticketName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Task Confirmed & Closed</h2>
        <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${task.ticketName}</h3>
          <p><strong>Task Reference:</strong> ${task.taskRef || 'N/A'}</p>
          <p><strong>Confirmed By:</strong> ${confirmedByUser.name} (${confirmedByUser.email})</p>
          <p><strong>Confirmed At:</strong> ${formatDateForDisplay(new Date())}</p>
        </div>
        <p>This task has been successfully completed and closed.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated notification from the Task Management System.</p>
      </div>
    `;

    await sendMail({
      to: userEmails,
      subject,
      html,
      text: `Task Confirmed & Closed: ${task.ticketName}\n\nConfirmed By: ${confirmedByUser.name}\n\nThis task has been successfully completed.`
    });

    console.log(`Task confirmed email sent to: ${userEmails.join(', ')}`);
  } catch (error) {
    console.error("Error sending task confirmed email:", error);
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

// Helper function to extract user ID from either string or object
function getUserId(user) {
  if (!user) return null;
  if (typeof user === 'string') return user;
  if (user._id) return user._id.toString ? user._id.toString() : user._id;
  return null;
}

// Helper function to extract user email from either string or object
function getUserEmail(user) {
  if (!user) return null;
  if (typeof user === 'string') return user;
  if (user.email) return user.email;
  return null;
}

async function sendTaskCreatorReplyNotification(task, reply, replyByUser) {
  try {
    const taskCreatorId = getUserId(task.createdBy);
    if (!taskCreatorId || taskCreatorId === replyByUser._id.toString()) {
      console.log('Task creator is the one replying or not found, skipping notification');
      return;
    }

    const taskCreator = await User.findById(taskCreatorId);
    if (!taskCreator || !taskCreator.email) {
      console.log('Task creator has no email, skipping notification');
      return;
    }

    const subject = `New Reply on Your Task: ${task.ticketName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Someone Replied to Your Task</h2>
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bae6fd;">
          <h3 style="margin-top: 0; color: #0369a1;">${task.ticketName}</h3>
          <p><strong>Task Reference:</strong> ${task.taskRef || 'N/A'}</p>
          <p><strong>Your Task:</strong> ${task.taskDescription || 'No description provided'}</p>
          <p><strong>Reply From:</strong> ${replyByUser.name} (${replyByUser.email})</p>
          <p><strong>Reply Time:</strong> ${formatDateForDisplay(reply.createdAt)}</p>
          <div style="background-color: white; padding: 15px; border-radius: 4px; border-left: 4px solid #3B82F6; margin-top: 10px;">
            <strong>Reply Message:</strong><br>
            ${reply.message.replace(/\n/g, '<br>')}
          </div>
        </div>
        <p style="margin-bottom: 20px; text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-dashboard/manage-tickets" 
             style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View & Respond to Reply
          </a>
        </p>
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 4px; margin: 20px 0; border: 1px solid #fbbf24;">
          <p style="margin: 0; color: #92400e;">
            <strong>Note:</strong> As the task creator, you can confirm/reject completion or add additional replies.
          </p>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px; text-align: center;">
          This task was created by you on ${formatDateForDisplay(task.createdAt)}<br>
          Task Management System • Automated Notification
        </p>
      </div>
    `;

    await sendMail({
      to: taskCreator.email,
      subject,
      html,
      text: `New Reply on Your Task: ${task.ticketName}\n\nTask: ${task.taskDescription || 'No description'}\n\nReply From: ${replyByUser.name}\n\nMessage: ${reply.message}\n\nPlease log in to view and respond to this reply.`
    });

    console.log(`Task creator notification sent to: ${taskCreator.email} (${taskCreator.name})`);
    
  } catch (error) {
    console.error("Error sending task creator reply notification:", error);
  }
}

async function sendReplyNotificationEmail(task, reply, replyByUser) {
  try {
    const recipientIds = new Set();
    
    // Get task creator ID (handle both object and string)
    const taskCreatorId = getUserId(task.createdBy);
    if (taskCreatorId && taskCreatorId !== replyByUser._id.toString()) {
      recipientIds.add(taskCreatorId);
    }
    
    // Include all assigned users except the one replying
    if (task.assignedTo && Array.isArray(task.assignedTo)) {
      task.assignedTo.forEach(user => {
        const userId = getUserId(user);
        if (userId && userId !== replyByUser._id.toString()) {
          recipientIds.add(userId);
        }
      });
    }

    // Include assignedBy user if different
    const assignedById = getUserId(task.assignedBy);
    if (assignedById && assignedById !== replyByUser._id.toString()) {
      recipientIds.add(assignedById);
    }

    if (recipientIds.size === 0) {
      console.log('No recipients found for reply notification');
      return;
    }

    // Convert Set to array of valid ObjectIds
    const recipientIdArray = Array.from(recipientIds).filter(id => 
      id && mongoose.Types.ObjectId.isValid(id)
    );

    const recipients = await User.find({ _id: { $in: recipientIdArray } });
    const emails = recipients.map(u => u.email).filter(e => e);

    if (emails.length === 0) {
      console.log('No valid email addresses found for recipients');
      return;
    }

    const subject = `New Reply on Task: ${task.ticketName}`;
    
    // Get task creator name for personalized message
    let creatorName = 'Task Creator';
    if (taskCreatorId) {
      const taskCreator = await User.findById(taskCreatorId);
      if (taskCreator) {
        creatorName = taskCreator.name;
      }
    }
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">New Reply on Task</h2>
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${task.ticketName}</h3>
          <p><strong>Task Reference:</strong> ${task.taskRef || 'N/A'}</p>
          <p><strong>Created By:</strong> ${creatorName}</p>
          <p><strong>Reply From:</strong> ${replyByUser.name} (${replyByUser.email})</p>
          <p><strong>Reply Time:</strong> ${formatDateForDisplay(reply.createdAt)}</p>
          <p><strong>Message:</strong></p>
          <div style="background-color: white; padding: 15px; border-radius: 4px; border-left: 4px solid #3B82F6; margin-top: 10px;">
            ${reply.message.replace(/\n/g, '<br>')}
          </div>
        </div>
        <p style="margin-bottom: 20px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-dashboard/manage-tickets" 
             style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Task & Reply
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          This is an automated notification from the Task Management System.<br>
          To stop receiving these notifications, please update your notification settings.
        </p>
      </div>
    `;

    await sendMail({
      to: emails,
      subject,
      html,
      text: `New Reply on Task: ${task.ticketName}\n\nTask Created By: ${creatorName}\n\nReply From: ${replyByUser.name}\n\nMessage: ${reply.message}\n\nPlease log in to the system to view and respond.`
    });

    console.log(`Reply notification email sent to ${emails.length} recipients:`, emails);
    
    // Log who was notified
    const notifiedUsers = recipients.map(u => `${u.name} (${u.email})`).join(', ');
    console.log(`Notified users: ${notifiedUsers}`);
    
  } catch (error) {
    console.error("Error sending reply notification email:", error);
  }
}


// GET all users for assignment dropdown (accessible to all authenticated users)
router.get("/tasks/users", authenticate, async (req, res) => {
  try {
    const users = await User.find({ isVerified: true })
      .select("name email _id")
      .sort({ name: 1 });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error fetching users" });
  }
});

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
      .populate("createdBy", "name email")
      .populate("confirmedBy", "name email")
      .populate("replies.createdBy", "name email")
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
        replies: [],
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

// GET all tasks (with visibility restrictions)
router.get("/tasks", authenticate, async (req, res) => {
  try {
    const { searchTerm } = req.query;
    
    // Allow all authenticated users to see all tasks
    const query = {};
    
    if (searchTerm) {
      const regex = new RegExp(searchTerm, "i");
      const searchConditions = [
        { taskRef: regex },
        { ticketName: regex },
        { taskDescription: regex },
        { opportunityCode: regex }
      ];
      query.$or = searchConditions;
    }
    
    const tasks = await Task.find(query)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .populate("confirmedBy", "name email")
      .populate("replies.createdBy", "name email")
      .populate("opportunityId", "opportunityCode opportunityName")
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Server error fetching tasks" });
  }
});

// GET tasks for calendar (with visibility restrictions)
router.get("/tasks/calendar", authenticate, async (req, res) => {
  try {
    const query = {}; // Allow all authenticated users to see all calendar tasks
    
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
        const isPending = task.completedOn === "Pending Confirmation";
        
        flatTasks.push({
          task,
          dateKey: dateOnly,
          eventObj: {
            title: `${task.taskRef}: ${task.ticketName}${task.opportunityId ? ` (${task.opportunityId.opportunityName})` : ""}`,
            date: dateOnly,
            backgroundColor: isPending ? "orange" : (isOverdue ? "red" : undefined),
            borderColor: isPending ? "orange" : (isOverdue ? "red" : undefined),
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

// POST add reply to task
router.post("/tasks/:id/reply", authenticate, async (req, res) => {
  try {
    // Find task without populating initially to get clean IDs
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    
    // Allow any authenticated user to reply to tasks
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { message } = req.body;
    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const reply = {
      message: message.trim(),
      createdBy: req.user._id,
      createdAt: new Date(),
      isRead: false,
    };

    task.replies.push(reply);
    task.logs.push(createLogEntry(req, "reply", null, null, message, "Added reply"));
    
    // Mark as unread for other users
    if (task.readBy) {
      task.readBy = task.readBy.filter(id => id.toString() !== req.user._id.toString());
    }
    
    await task.save();

    // Get reply by user info
    const replyByUser = await User.findById(req.user._id);
    
    // Get the populated task with all necessary data for response
    const populatedTask = await Task.findById(task._id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .populate("replies.createdBy", "name email");

    const addedReply = populatedTask.replies[populatedTask.replies.length - 1];
    
    // Send notification emails
    await sendReplyNotificationEmail(populatedTask, addedReply, replyByUser);
    await sendTaskCreatorReplyNotification(populatedTask, addedReply, replyByUser);

    res.json({ 
      message: "Reply added successfully", 
      task: populatedTask,
      reply: addedReply
    });
  } catch (error) {
    console.error("Error adding reply:", error);
    res.status(500).json({ message: "Server error adding reply", error: error.message });
  }
});

// POST confirm task completion (only creator can confirm)
router.post("/tasks/:id/confirm", authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    
    const userId = req.user._id.toString();
    const isCreator = task.createdBy?.toString() === userId;
    
    // Only task creator can confirm completion
    if (!isCreator) {
      return res.status(403).json({ message: "Only the task creator can confirm completion" });
    }

    if (task.completedOn !== "Pending Confirmation") {
      return res.status(400).json({ message: "Task is not pending confirmation" });
    }

    task.completedOn = "Done";
    task.confirmedBy = req.user._id;
    task.confirmedAt = new Date();
    task.logs.push(createLogEntry(req, "confirm", "completedOn", "Pending Confirmation", "Done", "Task confirmed"));
    
    await task.save();

    const confirmedByUser = await User.findById(req.user._id);
    await sendTaskConfirmedEmail(task, confirmedByUser);

    const populatedTask = await Task.findById(task._id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("confirmedBy", "name email")
      .populate("replies.createdBy", "name email");

    res.json({ message: "Task confirmed and closed", task: populatedTask });
  } catch (error) {
    console.error("Error confirming task:", error);
    res.status(500).json({ message: "Server error confirming task" });
  }
});

// POST reject task completion (send back to Not Done)
router.post("/tasks/:id/reject", authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    
    const userId = req.user._id.toString();
    const isCreator = task.createdBy?.toString() === userId;
    
    // Only task creator can reject completion
    if (!isCreator) {
      return res.status(403).json({ message: "Only the task creator can reject completion" });
    }

    if (task.completedOn !== "Pending Confirmation") {
      return res.status(400).json({ message: "Task is not pending confirmation" });
    }

    const { rejectionReason } = req.body;

    task.completedOn = "Not Done";
    task.logs.push(createLogEntry(req, "reject", "completedOn", "Pending Confirmation", "Not Done", rejectionReason || "Completion rejected"));
    
    if (rejectionReason) {
      task.replies.push({
        message: `Completion rejected: ${rejectionReason}`,
        createdBy: req.user._id,
        createdAt: new Date(),
        isRead: false,
      });
    }
    
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("replies.createdBy", "name email");

    const rejectByUser = await User.findById(req.user._id);
    if (rejectionReason) {
      const rejectionReply = populatedTask.replies[populatedTask.replies.length - 1];
      await sendReplyNotificationEmail(populatedTask, rejectionReply, rejectByUser);
      await sendTaskCreatorReplyNotification(populatedTask, rejectionReply, rejectByUser);
    }

    res.json({ message: "Task completion rejected", task: populatedTask });
  } catch (error) {
    console.error("Error rejecting task:", error);
    res.status(500).json({ message: "Server error rejecting task" });
  }
});

// PUT update task
router.put("/tasks/:id", authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    
    // Allow any authenticated user to update tasks
    // Basic authentication check
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Authentication required" });
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
        
        if (["toBeClosedBy", "fromDate", "toDate"].includes(field)) {
          if (req.body[field]) {
            newVal = new Date(req.body[field]);
            console.log(`[UPDATE] ${field}: ${req.body[field]} -> ${formatDateForDisplay(newVal)}`);
          } else {
            newVal = null;
          }
        }
        
        if (field === "selectedDates" && req.body[field]) {
          newVal = req.body[field].map((d) => new Date(d));
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
        
        // Handle completion status - assigned users mark as Pending Confirmation
        if (field === "completedOn" && newVal === "Done" && oldVal !== "Done") {
          // Check if user is assigned to the task
          const userId = req.user._id.toString();
          const isAssigned = task.assignedTo.some(id => id.toString() === userId);
          const isCreator = task.createdBy?.toString() === userId;
          
          if (isAssigned && !isCreator) {
            newVal = "Pending Confirmation";
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
      for (const usrId of task.assignedTo) {
        if (mongoose.Types.ObjectId.isValid(usrId)) {
          const user = await User.findById(usrId);
          if (!user) {
            return res.status(404).json({ message: `Assigned user ${usrId} not found` });
          }
        }
      }
    }

    if (schedule === "None" || schedule === "SelectedDates") {
      task.selectedDates = selectedDates 
        ? [...new Set(selectedDates.map((d) => new Date(d)))] 
        : [];
    }

    // Handle completion with pending confirmation
    if (completedOn === "Done" && task.completedOn === "Not Done") {
      const userId = req.user._id.toString();
      const isAssigned = task.assignedTo.some(id => id.toString() === userId);
      const isCreator = task.createdBy?.toString() === userId;
      
      if (isAssigned && !isCreator) {
        task.completedOn = "Pending Confirmation";
        task.completionRemarks = completionRemarks || "";
        logs.push(createLogEntry(req, "update", "completedOn", "Not Done", "Pending Confirmation", completionRemarks));
        
        const completedByUser = await User.findById(req.user._id);
        if (completedByUser) {
          await sendTaskPendingConfirmationEmail(task, completedByUser);
        }
      } else {
        task.completedOn = "Done";
        task.completionRemarks = completionRemarks || "";
        task.confirmedBy = req.user._id;
        task.confirmedAt = new Date();
      }
    }

    if (reopened === true && task.reopened !== true) {
      logs.push(createLogEntry(req, "update", "reopened", task.reopened, true, reopenDescription));
      task.reopenDescription = reopenDescription || "";
      task.completedOn = "Not Done";
      
      const reopenedByUser = await User.findById(req.user._id);
      if (reopenedByUser) {
        await sendTaskReopenEmail(task, reopenedByUser);
      }
    }

    if (logs.length > 0) {
      task.logs.push(...logs);
      await task.save();
      
      console.log(`[UPDATE] Task saved. Due: ${formatDateForDisplay(task.toBeClosedBy)}`);
      
      const assignedToChanged = JSON.stringify(oldAssignedTo.sort()) !== JSON.stringify(task.assignedTo.sort());
      if (assignedToChanged) {
        const assignedUsers = await User.find({ _id: { $in: task.assignedTo } });
        const assignedByUser = await User.findById(req.user._id);
        if (assignedByUser && assignedUsers.length > 0) {
          await sendTaskAssignmentEmail(task, assignedUsers, assignedByUser, true);
        }
      }
      
      const populatedTask = await Task.findById(task._id)
        .populate("createdBy", "name email")
        .populate("assignedTo", "name email")
        .populate("assignedBy", "name email")
        .populate("confirmedBy", "name email")
        .populate("replies.createdBy", "name email");
      
      res.json({ 
        message: "Task updated successfully", 
        task: populatedTask,
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
    
    // Allow any authenticated user to delete tasks
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Optionally, you might want to keep creator-only deletion
    const userId = req.user._id.toString();
    const isCreator = task.createdBy?.toString() === userId;

    if (!isCreator) {
      return res.status(403).json({ message: "Only the task creator can delete tasks" });
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

// NEW ROUTE: Get notification data for notification bell
router.get("/tasks/notifications", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get tasks assigned to user
    const assignedTasks = await Task.find({
      assignedTo: userId,
      isActive: true,
      completedOn: { $ne: "Done" }
    })
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .populate("replies.createdBy", "name email")
      .sort({ toBeClosedBy: 1 })
      .lean();

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter tasks: Only show today's, future, or reopened future tasks
    const filteredTasks = assignedTasks.filter(task => {
      const dueDate = new Date(task.toBeClosedBy);
      const dueDateOnly = new Date(dueDate);
      dueDateOnly.setHours(0, 0, 0, 0);
      
      // If task is reopened, show it regardless of date
      if (task.reopened) {
        return task.completedOn === "Not Done" && task.isActive !== false;
      }
      
      // Otherwise, only show tasks that are due today or in the future
      const isTodayOrFuture = dueDateOnly >= today;
      return isTodayOrFuture && task.completedOn === "Not Done" && task.isActive !== false;
    });

    // Check for new replies in tasks where user is creator or assigned
    const userTasks = await Task.find({
      $or: [
        { createdBy: userId },
        { assignedTo: userId }
      ],
      isActive: true
    })
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("replies.createdBy", "name email")
      .lean();

    const replyNotifications = [];
    
    userTasks.forEach(task => {
      if (task.replies && task.replies.length > 0) {
        // Check for unread replies
        const unreadReplies = task.replies.filter(reply => {
          // Check if this reply is from someone else
          const isFromOthers = reply.createdBy?._id?.toString() !== userId.toString();
          
          // Check if user has read this reply (simple implementation - you might want to add a readBy field to replies)
          const isRead = task.readBy && task.readBy.includes(userId.toString());
          
          return isFromOthers && !isRead;
        });

        if (unreadReplies.length > 0) {
          const latestUnreadReply = unreadReplies[unreadReplies.length - 1];
          replyNotifications.push({
            type: "reply",
            taskId: task._id,
            taskRef: task.taskRef,
            ticketName: task.ticketName,
            replyFrom: latestUnreadReply.createdBy?.name || "Someone",
            replyMessage: latestUnreadReply.message,
            replyTime: latestUnreadReply.createdAt,
            unreadCount: unreadReplies.length
          });
        }
      }
    });

    // Sort tasks by priority
    const sortedTasks = filteredTasks.sort((a, b) => {
      const now = new Date();
      const dateA = new Date(a.toBeClosedBy);
      const dateB = new Date(b.toBeClosedBy);
      
      const isAOverdue = dateA < now;
      const isBOverdue = dateB < now;
      
      // Overdue tasks first (but only if they're from today)
      if (isAOverdue && !isBOverdue) return -1;
      if (!isAOverdue && isBOverdue) return 1;
      
      const isAToday = dateA.toDateString() === now.toDateString();
      const isBToday = dateB.toDateString() === now.toDateString();
      
      // Today's tasks next
      if (isAToday && !isBToday) return -1;
      if (!isAToday && isBToday) return 1;
      
      // Reopened tasks have priority over regular future tasks
      if (a.reopened && !b.reopened) return -1;
      if (!a.reopened && b.reopened) return 1;
      
      // Sort by closest due date
      return dateA - dateB;
    });

    res.json({
      success: true,
      tasks: sortedTasks,
      replyNotifications: replyNotifications,
      totalNotifications: sortedTasks.length + replyNotifications.length
    });
    
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching notifications"
    });
  }
});

module.exports = router;