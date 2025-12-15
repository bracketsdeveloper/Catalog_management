const mongoose = require("mongoose");

// Types: "earned" (auto accrual), "sick", "additional", "special"
const leaveSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, index: true },
  type: { type: String, enum: ["earned","sick","additional","special"], required: true },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true },
  days: { type: Number, required: true },
  purpose: { type: String, default: "" },
  status: { 
    type: String, 
    enum: ["applied", "pending", "approved", "rejected", "cancelled"], 
    default: "pending", 
    index: true 
  },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  
  // NEW: Status change history tracking
  statusChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  statusChangedByName: { type: String, default: "" },
  statusChangedAt: { type: Date },
  
  // NEW: Full history of all status changes
  statusHistory: [{
    status: { type: String },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedByName: { type: String },
    changedAt: { type: Date, default: Date.now },
    remarks: { type: String, default: "" }
  }],
}, { timestamps: true });

// Pre-save middleware to track status changes
leaveSchema.pre('save', function(next) {
  // Check if status was modified
  if (this.isModified('status') && !this.isNew) {
    // Add to history
    if (!this.statusHistory) {
      this.statusHistory = [];
    }
    
    this.statusHistory.push({
      status: this.status,
      changedBy: this.statusChangedBy,
      changedByName: this.statusChangedByName,
      changedAt: new Date(),
    });
  }
  next();
});

module.exports = mongoose.model("Leave", leaveSchema);