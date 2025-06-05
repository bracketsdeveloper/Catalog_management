const mongoose = require("mongoose");
const Counter = require("./Counterforjobsheet"); // Ensure this path is correct

const jobSheetItemSchema = new mongoose.Schema({
  slNo: { type: Number, required: true },
  product: { type: String, required: true },
  color: { type: String },
  size: { type: String },
  quantity: { type: Number, required: true },
  sourcingFrom: { type: String },
  brandingType: [{ type: String }],
  brandingVendor: { type: String },
  remarks: { type: String },
});

const jobSheetSchema = new mongoose.Schema({
  eventName: { type: String },
  jobSheetNumber: { type: String, unique: true },
  opportunityNumber: { type: String }, // New field for opportunity number
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
  deliveryAddress: {
    type: [String],
    default: [],
  },
  brandingFileName: { type: String },
  giftBoxBagsDetails: { type: String },
  packagingInstructions: { type: String },
  otherDetails: { type: String },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  isDraft: { type: Boolean, default: false },
});

// Auto-increment logic with a starting sequence of 5000
jobSheetSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    let counterDoc = await Counter.findOne({ id: "jobSheetNumber" });
    if (!counterDoc) {
      counterDoc = new Counter({ id: "jobSheetNumber", seq: 5000 });
      await counterDoc.save();
    } else {
      counterDoc.seq += 1;
      await counterDoc.save();
    }

    this.jobSheetNumber = String(counterDoc.seq).padStart(4, "0");
    next();
  } catch (error) {
    console.error("Error updating job sheet number:", error);
    next(error);
  }
});

module.exports = mongoose.model("JobSheet", jobSheetSchema);