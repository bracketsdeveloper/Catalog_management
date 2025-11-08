// models/Vendor.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/** Contact person (unchanged) */
const clientSchema = new Schema({
  name: { type: String },
  contactNumber: { type: String },
});

/** Multiple GSTs */
const gstSchema = new Schema({
  gst: { type: String, trim: true }, // keep format flexible; validate upstream if you want
  label: { type: String, trim: true, default: "" }, // optional tag like "Head Office"
  isPrimary: { type: Boolean, default: false },
});

/** Multiple bank accounts */
const bankAccountSchema = new Schema({
  bankName: { type: String, trim: true },
  accountNumber: { type: String, trim: true }, // keep as string to preserve leading zeros
  ifscCode: { type: String, trim: true },
  accountHolder: { type: String, trim: true, default: "" },
  branch: { type: String, trim: true, default: "" },
  isPrimary: { type: Boolean, default: false },
});

const vendorSchema = new Schema({
  vendorName: { type: String },
  vendorCompany: { type: String },
  brandDealing: { type: String },
  location: { type: String },

  clients: { type: [clientSchema], default: [] },

  /** NEW: arrays */
  gstNumbers: { type: [gstSchema], default: [] },
  bankAccounts: { type: [bankAccountSchema], default: [] },

  /** Legacy single fields kept for backward-compat input. We won’t store new data here. */
  gst: { type: String }, // retained so old dumps don’t crash reads
  bankName: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },

  postalCode: {
    type: String,
    validate: {
      validator: (v) => !v || /^\d{6}$/.test(v),
      message: "Postal code must be exactly 6 digits",
    },
  },

  // Lowercase enum + default to non-reliable (unchanged)
  reliability: {
    type: String,
    enum: ["reliable", "non-reliable"],
    default: "non-reliable",
    lowercase: true,
    trim: true,
  },

  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.model("Vendor", vendorSchema);
