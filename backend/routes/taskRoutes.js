const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const Opportunity = require("../models/Opportunity");
const User = require("../models/User");
const Counter = require("../models/Counter");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const mongoose = require("mongoose");

function createLogEntry(req, action, field, oldValue, newValue) {
  return {
    action,
    field,
    oldValue,
    newValue,
    performedBy: req.user._id,
    performedAt: new Date(),
    ipAddress: req.ip,
  };
}

router.post("/tasks", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const tasksData = Array.isArray(req.body) ? req.body : [req.body];
    const createdTasks = [];

    for (const taskData of tasksData) {
      const { opportunityId, toBeClosedBy, schedule, selectedDates, assignedTo, fromDate, toDate } = taskData;
      let opportunityCode = "";
      let validOpportunityId = null;

      if (opportunityId && mongoose.Types.ObjectId.isValid(opportunityId)) {
        const opp = await Opportunity.findById(opportunityId);
        if (!opp) return res.status(404).json({ message: "Opportunity not found" });
        opportunityCode = `${opp.opportunityCode} - ${opp.opportunityName}`;
        validOpportunityId = opportunityId;
      }

      if (assignedTo) {
        const user = await User.findById(assignedTo);
        if (!user) return res.status(404).json({ message: "Assigned user not found" });
      }

      let toBeClosedByDate = toBeClosedBy ? new Date(toBeClosedBy) : null;
      if (toBeClosedByDate) {
        toBeClosedByDate.setHours(0, 0, 0, 0);
        toBeClosedByDate = new Date(toBeClosedByDate.getTime() - 5.5 * 60 * 60 * 1000);
      }
      const toBeClosedByNormalized = toBeClosedByDate ? toBeClosedByDate.toISOString().split("T")[0] : null;

      if (toBeClosedByNormalized) {
        const existingTask = await Task.findOne({
          ticketName: taskData.ticketName,
          createdBy: req.user._id,
          toBeClosedBy: {
            $gte: new Date(toBeClosedByNormalized),
            $lt: new Date(new Date(toBeClosedByNormalized).setDate(new Date(toBeClosedByNormalized).getDate() + 1)),
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
        fromDateNormalized = new Date(fromDateNormalized.getTime() - 5.5 * 60 * 60 * 1000);
      }
      if (toDateNormalized) {
        toDateNormalized.setHours(0, 0, 0, 0);
        toDateNormalized = new Date(toDateNormalized.getTime() - 5.5 * 60 * 60 * 1000);
      }
      if (selectedDatesNormalized.length) {
        selectedDatesNormalized = selectedDatesNormalized.map((d) => {
          const date = new Date(d);
          date.setHours(0, 0, 0, 0);
          return new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
        });
      }

      const task = new Task({
        ...taskData,
        opportunityId: validOpportunityId,
        opportunityCode,
        assignedBy: req.user._id,
        createdBy: req.user._id,
        assignedTo: assignedTo || req.user._id,
        toBeClosedBy: toBeClosedByDate,
        fromDate: fromDateNormalized,
        toDate: toDateNormalized,
        selectedDates: selectedDatesNormalized,
        logs: [createLogEntry(req, "create", null, null, null)],
      });
      await task.save();
      createdTasks.push(task);
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
      // Use only the toBeClosedBy date for calendar display
      if (task.toBeClosedBy) {
        const date = new Date(task.toBeClosedBy);
        if (!date) {
          console.warn("Invalid toBeClosedBy date for task:", { taskId: task._id });
          return;
        }
        // Reverse the IST adjustment made during storage (+5.5 hours)
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
    if (!isSuperAdmin && task.createdBy.toString() !== req.user._id.toString() && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { toBeClosedBy, selectedDates, assignedTo, fromDate, toDate, schedule, opportunityId } = req.body;
    const logs = [];
    const fieldsToCheck = [
      "ticketName",
      "opportunityId",
      "toBeClosedBy",
      "completedOn",
      "schedule",
      "selectedDates",
      "assignedTo",
      "fromDate",
      "toDate",
    ];
    let opportunityCode = task.opportunityCode;

    if (opportunityId !== undefined) {
      if (mongoose.Types.ObjectId.isValid(opportunityId)) {
        const opp = await Opportunity.findById(opportunityId);
        if (!opp) return res.status(404).json({ message: "Opportunity not found" });
        opportunityCode = `${opp.opportunityCode} - ${opp.opportunityName}`;
        if (task.opportunityId?.toString() !== opportunityId) {
          logs.push(createLogEntry(req, "update", "opportunityId", task.opportunityId, opportunityId));
          task.opportunityId = opportunityId;
        }
      } else if (opportunityId === null || opportunityId === "") {
        if (task.opportunityId) {
          logs.push(createLogEntry(req, "update", "opportunityId", task.opportunityId, null));
          task.opportunityId = null;
          opportunityCode = "";
        }
      }
    }

    fieldsToCheck.forEach((field) => {
      if (req.body[field] !== undefined) {
        const oldVal = task[field];
        let newVal = req.body[field];
        if (["toBeClosedBy", "fromDate", "toDate"].includes(field)) {
          newVal = new Date(new Date(req.body[field]).getTime() - 5.5 * 60 * 60 * 1000);
          newVal.setHours(0, 0, 0, 0);
        }
        if (field === "selectedDates" && req.body[field]) {
          newVal = req.body[field].map((d) => {
            const date = new Date(new Date(d).getTime() - 5.5 * 60 * 60 * 1000);
            date.setHours(0, 0, 0, 0);
            return date;
          });
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

    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      const user = await User.findById(assignedTo);
      if (!user) return res.status(404).json({ message: "Assigned user not found" });
    }

    task.opportunityCode = opportunityCode;

    if (schedule === "None" || schedule === "SelectedDates") {
      task.selectedDates = selectedDates ? [...new Set(selectedDates.map((d) => {
        const date = new Date(new Date(d).getTime() - 5.5 * 60 * 60 * 1000);
        date.setHours(0, 0, 0, 0);
        return date;
      }))] : [];
    }

    if (logs.length) task.logs.push(...logs);
    await task.save();
    res.json({ message: "Task updated", task });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Server error updating task" });
  }
});

router.delete("/tasks/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    const isSuperAdmin = req.user.isSuperAdmin;
    if (!isSuperAdmin && task.createdBy.toString() !== req.user._id.toString() && task.assignedTo.toString() !== req.user._id.toString()) {
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