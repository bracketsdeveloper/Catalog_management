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
  description: { type: String }, // For task completion or reopen descriptions
});

const taskSchema = new mongoose.Schema({
  taskRef: { type: String, unique: true },
  ticketName: { type: String, required: true },
  taskDescription: { type: String }, // New field
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: "Opportunity" },
  opportunityCode: { type: String },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Changed to array
  assignedOn: { type: Date, default: Date.now },
  fromDate: { type: Date },
  toDate: { type: Date },
  toBeClosedBy: { type: Date, required: true },
  completedOn: { 
    type: String, 
    enum: ["Done", "Not Done"], 
    default: "Not Done" 
  },
  completionRemarks: { type: String }, // New field for completion remarks
  schedule: {
    type: String,
    enum: ["None", "Daily", "Weekly", "Monthly", "AlternateDays", "SelectedDates"],
    default: "None",
  },
  selectedDates: [{ type: Date }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  reopened: { type: Boolean, default: false },
  reopenDescription: { type: String }, // New field for reopen description
  logs: [logSchema],
});

taskSchema.pre("save", async function (next) {
  try {
    // Generate taskRef if new task
    if (this.isNew && !this.taskRef) {
      const randomNum = Math.floor(10000000 + Math.random() * 90000000);
      const taskRef = `#${randomNum}`;
      const existingTask = await this.constructor.findOne({ taskRef });
      if (existingTask) {
        return this.save();
      }
      this.taskRef = taskRef;
    }

    // If opportunityId is provided but opportunityCode is empty/missing, fetch it
    if (this.opportunityId && (!this.opportunityCode || this.opportunityCode === "")) {
      try {
        const opportunity = await mongoose.model("Opportunity").findById(this.opportunityId);
        if (opportunity && opportunity.opportunityCode) {
          this.opportunityCode = `${opportunity.opportunityCode} - ${opportunity.opportunityName}`;
          console.log(`Set opportunityCode for task ${this.taskRef}: ${this.opportunityCode}`);
        }
      } catch (err) {
        console.error("Error fetching opportunity for task:", err);
      }
    }

    // Handle schedule dates generation
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
    } else if (this.isModified("schedule") || this.isModified("fromDate") || this.isModified("toDate")) {
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
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Task", taskSchema);