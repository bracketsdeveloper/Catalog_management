// models/BankStatement.js
const mongoose = require("mongoose");

const bankStatementSchema = new mongoose.Schema(
  {
    // Basic Information
    originalFileName: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    uploadedBy: { type: String, required: true },
    uploadedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    
    // Statement Information
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: false },
    accountHolderName: { type: String, required: false },
    
    // Date Range from statement
    statementFromDate: { type: Date, required: false },
    statementToDate: { type: Date, required: false },
    
    // File Information
    fileSize: { type: Number, required: false },
    fileType: { type: String, required: false },
    filePath: { type: String, required: false },
    
    // Statement Summary
    openingBalance: { type: Number, default: 0 },
    closingBalance: { type: Number, default: 0 },
    totalDebits: { type: Number, default: 0 },
    totalCredits: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    
    // All Transactions Data (Complete Data)
    transactions: [
      {
        // Transaction Date
        date: { type: Date, required: true },
        
        // Transaction Details
        narration: { type: String, required: true },
        chequeRefNumber: { type: String, default: "" },
        valueDate: { type: Date, required: false },
        
        // Amounts
        withdrawalAmount: { type: Number, default: 0 },
        depositAmount: { type: Number, default: 0 },
        balanceAfterTransaction: { type: Number, default: 0 },
        
        // Transaction Type
        transactionType: { 
          type: String, 
          enum: ["CREDIT", "DEBIT", "TRANSFER", "OTHER"],
          default: "OTHER"
        },
        
        // Payment Mode
        paymentMode: {
          type: String,
          enum: ["NEFT", "RTGS", "IMPS", "CHEQUE", "UPI", "CASH", "OTHER"],
          default: "OTHER"
        },
        
        // Extracted Information
        beneficiaryName: { type: String, default: "" },
        remitterName: { type: String, default: "" },
        bankName: { type: String, default: "" },
        
        // Original Row Data (for reference)
        originalData: { type: mongoose.Schema.Types.Mixed, default: {} }
      }
    ],
    
    // All Bank Details (Complete Data)
    bankDetails: {
      branchName: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      micrCode: { type: String, default: "" },
      customerId: { type: String, default: "" },
      accountOpenDate: { type: Date, required: false },
      accountStatus: { type: String, default: "" },
      currency: { type: String, default: "INR" },
      odLimit: { type: Number, default: 0 },
      
      // Address
      address: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      phoneNumber: { type: String, default: "" },
      email: { type: String, default: "" },
      
      // GST Information
      gstin: { type: String, default: "" },
      bankGstin: { type: String, default: "" },
      
      // Nomination
      nominationStatus: { type: String, default: "" },
      
      // Generated Information
      generatedOn: { type: Date, required: false },
      generatedBy: { type: String, default: "" },
      requestingBranch: { type: String, default: "" },
      
      // Other Details
      pageNumber: { type: String, default: "" },
      statementType: { type: String, default: "" }
    },
    
    // Statement Summary Details
    statementSummary: {
      debitCount: { type: Number, default: 0 },
      creditCount: { type: Number, default: 0 },
      netFlow: { type: Number, default: 0 },
      averageTransactionAmount: { type: Number, default: 0 }
    },
    
    // Raw Excel Data (Complete dataset)
    rawExcelData: { type: mongoose.Schema.Types.Mixed, default: {} },
    
    // Processing Information
    processingStatus: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "PARTIAL"],
      default: "PENDING"
    },
    processingErrors: [{ type: String }],
    processedAt: { type: Date, required: false },
    
    // Tags for categorization
    tags: [{ type: String }],
    
    // Additional Metadata
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

// Indexes for query performance
bankStatementSchema.index({ uploadDate: -1 });
bankStatementSchema.index({ bankName: 1 });
bankStatementSchema.index({ accountNumber: 1 });
bankStatementSchema.index({ statementFromDate: 1, statementToDate: 1 });
bankStatementSchema.index({ uploadedByUserId: 1 });
bankStatementSchema.index({ "transactions.date": 1 });

module.exports = mongoose.model("BankStatement", bankStatementSchema);