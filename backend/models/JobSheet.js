// models/JobSheet.js
const mongoose = require("mongoose");
const Counter = require("./Counter"); // Ensure this path is correct

const jobSheetItemSchema = new mongoose.Schema({
  slNo: { type: Number, required: true },
  product: { type: String, required: true },
  color: { type: String },
  size: { type: String },
  quantity: { type: Number, required: true },
  sourcingFrom: { type: String },
  brandingType: { type: String },
  brandingVendor: { type: String },
  remarks: { type: String },
});

const jobSheetSchema = new mongoose.Schema({
  eventName: { type: String },
  jobSheetNumber: { type: String, unique: true },
  referenceQuotation: { type: String },
  orderDate: { type: Date, required: true },
  clientCompanyName: { type: String, required: true },
  clientName: { type: String, required: true },
  contactNumber: { type: String },
  deliveryDate: { type: Date, required: true },
  deliveryTime: { type: String },
  crmIncharge: { type: String },
  items: [jobSheetItemSchema],
  poNumber: { type: String },
  poStatus: { type: String },
  deliveryType: { type: String },
  deliveryMode: { type: String },
  deliveryCharges: { type: String },
  
  // Delivery addresses revert to an array of strings:
  deliveryAddress: {
    type: [String],
    default: [],
  },

  // New top-level field for branding file name:
  brandingFileName: { type: String },

  giftBoxBagsDetails: { type: String },
  packagingInstructions: { type: String },
  otherDetails: { type: String },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Auto-increment logic with a starting sequence of 5000
jobSheetSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const updatedCounter = await Counter.findOneAndUpdate(
        { id: "jobSheetNumber" },
        {
          $inc: { seq: 1 },
          // If no doc exists, create one with seq=4999, then increment to 5000
          $setOnInsert: { seq: 4999 },
        },
        { new: true, upsert: true }
      );

      // Now updatedCounter.seq will be 5000 if newly created
      this.jobSheetNumber = updatedCounter.seq.toString().padStart(4, "0");
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model("JobSheet", jobSheetSchema);
