const mongoose = require("mongoose");

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
  deliveryType: { type: String },
  deliveryMode: { type: String },
  deliveryCharges: { type: String },
  deliveryAddress: { type: [String], default: [] },
  giftBoxBagsDetails: { type: String },
  packagingInstructions: { type: String },
  otherDetails: { type: String },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
});

jobSheetSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    const newNumber = (count + 1).toString().padStart(4, "0");
    this.jobSheetNumber = newNumber;
  }
  next();
});

module.exports = mongoose.model("JobSheet", jobSheetSchema);
