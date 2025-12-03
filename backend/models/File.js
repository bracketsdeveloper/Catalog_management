const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileType: { type: String, required: true },
    uploadedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    uploadedByName: { type: String, required: true },
    accessibleRoles: {
      type: [String],
      enum: require("./User").ROLE_ENUM,
      required: true
    },
    description: { type: String, default: "" },
    // NEW: Document content for rich text editor
    documentContent: { type: String, default: "" },
    isDocument: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Index for better query performance
fileSchema.index({ accessibleRoles: 1 });
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ createdAt: -1 });
fileSchema.index({ isDocument: 1 }); // NEW: Index for document filtering

module.exports = mongoose.model("File", fileSchema);