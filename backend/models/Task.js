// Task.js
const mongoose = require("mongoose");
const Counter = require("./Counter");

const logSchema = new mongoose.Schema({
  action: { type: String, required: true },
  field: { type: String },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  performedAt: { type: Date, default: Date.now },
  ipAddress: { type: String },
});

const taskSchema = new mongoose.Schema({
  taskRef: { type: String, unique: true },
  ticketName: { type: String, required: true },
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: "Opportunity" },
  opportunityCode: { type: String },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedOn: { type: Date, default: Date.now },
  fromDate: { type: Date },
  toDate: { type: Date },
  toBeClosedBy: { type: Date, required: true },
  completedOn: { type: String, enum: ["Done", "Not Done"], default: "Not Done" },
  schedule: {
    type: String,
    enum: ["None", "Daily", "Weekly", "Monthly", "AlternateDays", "SelectedDates"],
    default: "None",
  },
  selectedDates: [{ type: Date }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  logs: [logSchema],
});

taskSchema.pre("save", async function (next) {
  if (this.isNew && !this.taskRef) {
    try {
      const randomNum = Math.floor(10000000 + Math.random() * 90000000);
      const taskRef = `#${randomNum}`;
      const existingTask = await this.constructor.findOne({ taskRef });
      if (existingTask) {
        return this.save();
      }
      this.taskRef = taskRef;
      if (this.schedule !== "None" && this.schedule !== "SelectedDates" && this.fromDate && this.toDate) {
        const dates = [];
        let currentDate = new Date(this.fromDate);
        const endDate = new Date(this.toDate);
        switch (this.schedule) {
          case "Daily":
            while (currentDate <= endDate) {
              dates.push(new Date(currentDate));
              currentDate.setDate(currentDate.getDate() + 1);
            }
            break;
          case "Weekly":
            while (currentDate <= endDate) {
              dates.push(new Date(currentDate));
              currentDate.setDate(currentDate.getDate() + 7);
            }
            break;
          case "Monthly":
            const yearEnd = new Date(currentDate.getFullYear(), 11, 31);
            const maxDate = endDate < yearEnd ? endDate : yearEnd;
            while (currentDate <= maxDate) {
              dates.push(new Date(currentDate));
              currentDate.setMonth(currentDate.getMonth() + 1);
            }
            break;
          case "AlternateDays":
            while (currentDate <= endDate) {
              dates.push(new Date(currentDate));
              currentDate.setDate(currentDate.getDate() + 2);
            }
            break;
        }
        this.selectedDates = dates;
      }
      next();
    } catch (err) {
      next(err);
    }
  } else {
    if (this.isModified("schedule") || this.isModified("fromDate") || this.isModified("toDate")) {
      if (this.schedule !== "None" && this.schedule !== "SelectedDates" && this.fromDate && this.toDate) {
        const dates = [];
        let currentDate = new Date(this.fromDate);
        const endDate = new Date(this.toDate);
        switch (this.schedule) {
          case "Daily":
            while (currentDate <= endDate) {
              dates.push(new Date(currentDate));
              currentDate.setDate(currentDate.getDate() + 1);
            }
            break;
          case "Weekly":
            while (currentDate <= endDate) {
              dates.push(new Date(currentDate));
              currentDate.setDate(currentDate.getDate() + 7);
            }
            break;
          case "Monthly":
            const yearEnd = new Date(currentDate.getFullYear(), 11, 31);
            const maxDate = endDate < yearEnd ? endDate : yearEnd;
            while (currentDate <= maxDate) {
              dates.push(new Date(currentDate));
              currentDate.setMonth(currentDate.getMonth() + 1);
            }
            break;
          case "AlternateDays":
            while (currentDate <= endDate) {
              dates.push(new Date(currentDate));
              currentDate.setDate(currentDate.getDate() + 2);
            }
            break;
        }
        this.selectedDates = dates;
      } else {
        this.selectedDates = [];
      }
    }
    next();
  }
});

module.exports = mongoose.model("Task", taskSchema);