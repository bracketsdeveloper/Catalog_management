// models/Opportunity.js
const mongoose = require("mongoose");

/**
 * Optional: a separate schema for logs,
 * which record who did what action and when.
 */
const logSchema = new mongoose.Schema({
  userName: { type: String, default: "Unknown" },
  action: { type: String, required: true },    // e.g. "Created", "Updated", "Deleted"
  date: { type: Date, default: Date.now },
});

const opportunitySchema = new mongoose.Schema({
  opportunityName: { type: String, required: true },
  account: { type: String, required: true },       // e.g. store company name or _id
  contact: { type: String },                       // e.g. store contact name from that company

  // Opportunity Type, Stage, Status
  opportunityType: { type: String },               // e.g. "Non-Tender", "Tender", etc.
  opportunityStage: { type: String, required: true }, // e.g. "Commit", "Negotiation"
  opportunityStatus: { type: String },             // e.g. "Won", "Lost", or "Discontinued"

  // Additional fields
  opportunityDetail: { type: String },
  opportunityValue: { type: Number },
  currency: { type: String, default: "Indian Rupee" },
  leadSource: { type: String, default: "others" }, // "cold call", "existing client reference", "others"
  closureDate: { type: Date, required: true },
  closureProbability: { type: Number },            // 0 - 100
  grossProfit: { type: String },

  opportunityPriority: { type: String, default: "Low" },
  isRecurring: { type: Boolean, default: false },
  dealRegistrationNumber: { type: String },
  freeTextField: { type: String },

  // The user who "owns" this Opportunity (storing just the name or email)
  opportunityOwner: { type: String, required: true },

  // Auto-generated or assigned code
  opportunityCode: { type: String },

  // Active or not
  isActive: { type: Boolean, default: true },

  // The user who created this record
  createdBy: { type: String },  // or store user ID with ref if you prefer

  // Timestamps
  createdAt: { type: Date, default: Date.now },

  // Logs array for CRUD actions or other significant updates
  logs: [logSchema],

  // Product Tab
  products: [
    {
      productCode: String,
      productName: String,
      listPrice: String,
      // Expand more if needed
    },
  ],

  // Contact Tab
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
      fileName: String,     // e.g. the stored or original name
      mediaName: String,    // display name
      contentType: String,
      description: String,
      // If storing path or URL, you can add that too
    },
  ],

  // Team Tab
  teamMembers: [
    {
      teamMemberCode: String,
      userName: String,     // or user ID
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
