const mongoose = require("mongoose");

const RestrictedHolidayRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    employeeId: { type: String, required: true, index: true }, // Employee.personal.employeeId
    holidayId: { type: mongoose.Schema.Types.ObjectId, ref: "Holiday", required: true },
    holidayDate: { type: Date, required: true },
    holidayName: { type: String, required: true },
    status: {
      type: String,
      enum: ["applied", "pending", "approved", "rejected", "cancelled"],
      default: "applied",
      index: true,
    },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

RestrictedHolidayRequestSchema.index({ userId: 1, holidayId: 1 }, { unique: true });

module.exports = mongoose.model("RestrictedHolidayRequest", RestrictedHolidayRequestSchema);
