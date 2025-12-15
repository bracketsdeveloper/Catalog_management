// models/SuspenseAccount.js - Updated version
const mongoose = require("mongoose");

const suspenseAccountSchema = new mongoose.Schema(
  {
    // Reference to the Bank Statement transaction
    bankStatementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankStatement",
      required: true
    },
    
    // Reference to specific transaction within the bank statement
    transactionId: {
      type: String,
      required: true
    },
    
    // Main Fields (fetched from bank statement)
    balanceAmount: {
      type: Number,
      required: true,
      default: 0
    },
    client: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    referenceNumber: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: false
    },
    
    // Manual override fields (if needed)
    manualClient: {
      type: String,
      default: ""
    },
    manualDescription: {
      type: String,
      default: ""
    },
    
    // Status Tracking
    status: {
      type: String,
      enum: ["ACTIVE", "CLEARED", "PENDING", "DISPUTED"],
      default: "ACTIVE"
    },
    clearedAt: {
      type: Date,
      required: false
    },
    clearedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    
    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    
    // Notes and Comments
    notes: { type: String },
    comments: [
      {
        comment: String,
        commentedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        commentedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    
    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for checking if balance is zero
suspenseAccountSchema.virtual("isCleared").get(function() {
  return this.balanceAmount === 0 || this.status === "CLEARED";
});

// Virtual for days pending
suspenseAccountSchema.virtual("daysPending").get(function() {
  const created = new Date(this.createdAt);
  const now = new Date();
  const diffTime = Math.abs(now - created);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Indexes
suspenseAccountSchema.index({ status: 1 });
suspenseAccountSchema.index({ balanceAmount: 1 });
suspenseAccountSchema.index({ client: 1 });
suspenseAccountSchema.index({ date: -1 });
suspenseAccountSchema.index({ referenceNumber: 1 });
suspenseAccountSchema.index({ bankStatementId: 1 });
suspenseAccountSchema.index({ createdBy: 1 });
suspenseAccountSchema.index({ "metadata.sourceTransaction.id": 1 });

module.exports = mongoose.model("SuspenseAccount", suspenseAccountSchema);