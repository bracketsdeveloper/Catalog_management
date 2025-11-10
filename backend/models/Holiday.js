// models/Holiday.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const holidaySchema = new Schema(
  {
    type: {
      type: String,
      enum: ["PUBLIC", "RESTRICTED"],
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    
    name: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // createdAt is provided by timestamps
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// make sure same type+date unique (no duplicate same-day entries for that list)
holidaySchema.index({ type: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Holiday", holidaySchema);
