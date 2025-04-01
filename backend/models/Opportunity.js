// models/Opportunity.js
const mongoose = require("mongoose");

/**
 * A more detailed Log Schema:
 * - action: 'create', 'update', or 'delete'
 * - field: which field changed (for updates)
 * - oldValue: previous value
 * - newValue: updated value
 * - performedBy: user _id or name
 * - performedAt: date/time
 * - ipAddress: capture the IP if available
 */
const logSchema = new mongoose.Schema({
  action: { type: String, required: true }, // 'create', 'update', 'delete'
  field: { type: String },                  // which field was changed (for 'update')
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  performedAt: { type: Date, default: Date.now },
  ipAddress: { type: String },
});

/**
 * Main Opportunity Schema
 */
const opportunitySchema = new mongoose.Schema({
  opportunityName: { type: String, required: true },
  account: { type: String, required: true },  // e.g. company name or ID
  contact: { type: String },                  // contact name or ID

  // Opportunity Type, Stage, Status
  opportunityType: { type: String },
  opportunityStage: { type: String, required: true },
  opportunityStatus: { type: String },

  // More fields
  opportunityDetail: { type: String },
  opportunityValue: { type: Number },
  currency: { type: String, default: "Indian Rupee" },
  leadSource: { type: String, default: "others" },
  closureDate: { type: Date, required: true },
  closureProbability: { type: Number },
  grossProfit: { type: String },

  opportunityPriority: { type: String, default: "Low" },
  isRecurring: { type: Boolean, default: false },
  dealRegistrationNumber: { type: String },
  freeTextField: { type: String },

  // The user who owns the Opportunity
  opportunityOwner: { type: String, required: true },
  opportunityCode: { type: String, unique: true },
  isActive: { type: Boolean, default: true },

  // The user who created this record
  createdBy: { type: String }, // or store a user _id

  createdAt: { type: Date, default: Date.now },

  // Enhanced logs array
  logs: [logSchema],

  // Products Tab
  products: [
    {
      productCode: String,
      productName: String,
      listPrice: String,
    },
  ],
  // Contacts Tab
  contacts: [
    {
      contactCode: String,
      contactName: String,
      description: String,
      isActive: Boolean,
    },
  ],
  // Media Tab
  mediaItems: [
    {
      mediaCode: String,
      fileName: String,
      mediaName: String,
      contentType: String,
      description: String,
    },
  ],
  // Team Tab
  teamMembers: [
    {
      teamMemberCode: String,
      userName: String,
      description: String,
      isActive: Boolean,
    },
  ],
  // Competitor Tab
  competitors: [
    {
      competitorCode: String,
      competitorName: String,
      competitorActivity: String,
    },
  ],
  // Note Tab
  notes: [
    {
      noteCode: String,
      noteDate: Date,
      noteContent: String,
      isActive: Boolean,
    },
  ],
});

module.exports = mongoose.model("Opportunity", opportunitySchema);
