// routes/bankStatements.js - Fixed version
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const BankStatement = require("../models/BankStatement");
const User = require("../models/User");
const { authenticate } = require("../middleware/authenticate");

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/bank-statements");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for large statements
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/csv"
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed."), false);
    }
  }
});

// Helper function to parse date from various formats
const parseDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;
  
  // Clean the date string
  const cleanDate = dateString.toString().trim();
  if (!cleanDate) return null;
  
  // Try different date formats commonly used in bank statements
  const dateFormats = [
    "DD/MM/YY", "DD/MM/YYYY", "DD-MM-YY", "DD-MM-YYYY",
    "DD.MM.YY", "DD.MM.YYYY", "DD/MMM/YY", "DD/MMM/YYYY",
    "YYYY-MM-DD", "YY-MM-DD", "MM/DD/YY", "MM/DD/YYYY"
  ];
  
  for (const format of dateFormats) {
    try {
      const moment = require("moment");
      const date = moment(cleanDate, format, true);
      if (date.isValid()) {
        return date.toDate();
      }
    } catch (error) {
      continue;
    }
  }
  
  // Try to parse as Date object
  try {
    const parsedDate = new Date(cleanDate);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (error) {
    // Ignore and return null
  }
  
  return null;
};

// Helper to parse amount strings
const parseAmount = (amount) => {
  if (!amount && amount !== 0) return 0;
  
  if (typeof amount === 'number') return amount;
  
  if (typeof amount === 'string') {
    // Remove commas, currency symbols, and whitespace
    const cleanAmount = amount
      .replace(/,/g, '')
      .replace(/₹/g, '')
      .replace(/Rs\.?/gi, '')
      .replace(/\s+/g, '')
      .trim();
    
    const parsed = parseFloat(cleanAmount);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
};

// Extract bank information from Excel
const extractBankInfo = (data) => {
  const bankInfo = {
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    statementFrom: null,
    statementTo: null,
    branchName: "",
    ifscCode: "",
    micrCode: "",
    address: "",
    city: "",
    state: "",
    phoneNumber: "",
    email: "",
    gstin: "",
    customerId: "",
    accountOpenDate: null,
    accountStatus: "",
    odLimit: 0,
    currency: "INR",
    nominationStatus: "",
    generatedOn: null,
    generatedBy: "",
    requestingBranch: "",
    pageNumber: "",
    statementType: "Statement of accounts"
  };

  // Look for bank information in first 50 rows
  for (let i = 0; i < Math.min(data.length, 50); i++) {
    const row = data[i];
    if (!row || !Array.isArray(row)) continue;
    
    const rowText = row.join(' ').toLowerCase();
    
    // Extract bank name (check common bank names)
    if (rowText.includes('hdfc')) bankInfo.bankName = 'HDFC Bank';
    else if (rowText.includes('icici')) bankInfo.bankName = 'ICICI Bank';
    else if (rowText.includes('sbi') || rowText.includes('state bank')) bankInfo.bankName = 'State Bank of India';
    else if (rowText.includes('axis')) bankInfo.bankName = 'Axis Bank';
    else if (rowText.includes('kotak')) bankInfo.bankName = 'Kotak Mahindra Bank';
    else if (rowText.includes('yes bank')) bankInfo.bankName = 'Yes Bank';
    else if (rowText.includes('idbi')) bankInfo.bankName = 'IDBI Bank';
    else if (rowText.includes('pnb')) bankInfo.bankName = 'Punjab National Bank';
    else if (rowText.includes('bank of baroda')) bankInfo.bankName = 'Bank of Baroda';
    else if (rowText.includes('canara')) bankInfo.bankName = 'Canara Bank';
    
    // Extract account holder name
    if (rowText.includes('m/s.') || rowText.includes('a/c holder') || rowText.includes('account holder')) {
      for (const cell of row) {
        if (cell && typeof cell === 'string') {
          const cellStr = cell.trim();
          if (cellStr.startsWith('M/S.')) {
            bankInfo.accountHolderName = cellStr.replace('M/S.', '').trim();
            break;
          } else if (cellStr.includes('A/C HOLDER')) {
            const match = cellStr.match(/A\/C HOLDER[:\s]*(.+)/i);
            if (match) bankInfo.accountHolderName = match[1].trim();
            break;
          }
        }
      }
    }
    
    // Extract account number
    if (rowText.includes('account no') || rowText.includes('account number')) {
      for (const cell of row) {
        if (cell && typeof cell === 'string') {
          const match = cell.match(/Account\s*(?:No|Number)[:\s]*([\d\s]+)/i);
          if (match) {
            bankInfo.accountNumber = match[1].replace(/\s+/g, '');
            break;
          }
        }
      }
    }
    
    // Extract statement period
    if (rowText.includes('statement from') || rowText.includes('from') && rowText.includes('to')) {
      for (const cell of row) {
        if (cell && typeof cell === 'string') {
          const match = cell.match(/FROM\s*:\s*([\d\/\-\.]+)\s*TO\s*:\s*([\d\/\-\.]+)/i);
          if (match) {
            bankInfo.statementFrom = parseDate(match[1]);
            bankInfo.statementTo = parseDate(match[2]);
            break;
          }
        }
      }
    }
    
    // Extract IFSC
    if (rowText.includes('ifsc')) {
      for (const cell of row) {
        if (cell && typeof cell === 'string') {
          const match = cell.match(/IFSC[:\s]*([A-Z0-9]{11})/i);
          if (match) {
            bankInfo.ifscCode = match[1];
            break;
          }
        }
      }
    }
    
    // Extract MICR
    if (rowText.includes('micr')) {
      for (const cell of row) {
        if (cell && typeof cell === 'string') {
          const match = cell.match(/MICR[:\s]*([\d]+)/i);
          if (match) {
            bankInfo.micrCode = match[1];
            break;
          }
        }
      }
    }
    
    // Extract GSTIN
    if (rowText.includes('gst')) {
      for (const cell of row) {
        if (cell && typeof cell === 'string') {
          const match = cell.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i);
          if (match) {
            bankInfo.gstin = match[1];
            break;
          }
        }
      }
    }
    
    // Extract customer ID
    if (rowText.includes('cust id') || rowText.includes('customer id')) {
      for (const cell of row) {
        if (cell && typeof cell === 'string') {
          const match = cell.match(/Cust\s*ID[:\s]*([\d]+)/i);
          if (match) {
            bankInfo.customerId = match[1];
            break;
          }
        }
      }
    }
    
    // Extract address information
    if (rowText.includes('address :') || rowText.includes('city :') || rowText.includes('state :')) {
      for (const cell of row) {
        if (cell && typeof cell === 'string') {
          if (cell.includes('Address :')) bankInfo.address = cell.split('Address :')[1]?.trim() || '';
          if (cell.includes('City :')) bankInfo.city = cell.split('City :')[1]?.trim() || '';
          if (cell.includes('State :')) bankInfo.state = cell.split('State :')[1]?.trim() || '';
          if (cell.includes('Phone no. :')) bankInfo.phoneNumber = cell.split('Phone no. :')[1]?.trim() || '';
          if (cell.includes('Email :')) bankInfo.email = cell.split('Email :')[1]?.trim() || '';
        }
      }
    }
  }
  
  return bankInfo;
};

// Extract transactions from Excel
const extractTransactions = (data) => {
  const transactions = [];
  
  // Find the header row for transactions
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(data.length, 100); i++) {
    const row = data[i];
    if (!row || !Array.isArray(row)) continue;
    
    const rowText = row.join(' ').toLowerCase();
    
    // Look for transaction headers
    if (rowText.includes('date') && 
        (rowText.includes('narration') || rowText.includes('description')) &&
        (rowText.includes('withdrawal') || rowText.includes('debit') || 
         rowText.includes('deposit') || rowText.includes('credit') ||
         rowText.includes('amount'))) {
      headerRowIndex = i;
      break;
    }
  }
  
  if (headerRowIndex === -1) return transactions;
  
  // Determine column indices based on header row
  const headerRow = data[headerRowIndex];
  const columnIndices = {
    date: -1,
    narration: -1,
    chequeRef: -1,
    valueDate: -1,
    withdrawal: -1,
    deposit: -1,
    balance: -1
  };
  
  for (let j = 0; j < headerRow.length; j++) {
    const cell = headerRow[j];
    if (typeof cell === 'string') {
      const cellLower = cell.toLowerCase();
      if (cellLower.includes('date') && !cellLower.includes('value')) {
        columnIndices.date = j;
      } else if (cellLower.includes('narration') || cellLower.includes('description')) {
        columnIndices.narration = j;
      } else if (cellLower.includes('chq') || cellLower.includes('ref') || cellLower.includes('cheque')) {
        columnIndices.chequeRef = j;
      } else if (cellLower.includes('value')) {
        columnIndices.valueDate = j;
      } else if (cellLower.includes('withdrawal') || cellLower.includes('debit')) {
        columnIndices.withdrawal = j;
      } else if (cellLower.includes('deposit') || cellLower.includes('credit')) {
        columnIndices.deposit = j;
      } else if (cellLower.includes('balance')) {
        columnIndices.balance = j;
      }
    }
  }
  
  // Extract transactions
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;
    
    // Skip separator rows or empty rows
    const firstCell = row[0];
    if (!firstCell || (typeof firstCell === 'string' && 
        (firstCell.includes('***') || firstCell.includes('---') || 
         firstCell.trim() === '' || firstCell.toLowerCase().includes('statement')))) {
      continue;
    }
    
    // Check if we've reached the summary section
    if (typeof firstCell === 'string' && firstCell.toLowerCase().includes('statement summary')) {
      break;
    }
    
    // Create transaction object
    const transaction = {
      date: null,
      narration: "",
      chequeRefNumber: "",
      valueDate: null,
      withdrawalAmount: 0,
      depositAmount: 0,
      balanceAfterTransaction: 0,
      transactionType: "OTHER",
      paymentMode: "OTHER",
      beneficiaryName: "",
      remitterName: "",
      bankName: "",
      originalData: {}
    };
    
    // Extract date
    if (columnIndices.date !== -1 && row[columnIndices.date]) {
      transaction.date = parseDate(row[columnIndices.date]);
    }
    
    // Extract value date
    if (columnIndices.valueDate !== -1 && row[columnIndices.valueDate]) {
      transaction.valueDate = parseDate(row[columnIndices.valueDate]);
    }
    
    // Extract narration
    if (columnIndices.narration !== -1 && row[columnIndices.narration]) {
      transaction.narration = String(row[columnIndices.narration]).trim();
      
      // Determine payment mode from narration
      const narrationUpper = transaction.narration.toUpperCase();
      if (narrationUpper.includes('NEFT')) transaction.paymentMode = 'NEFT';
      else if (narrationUpper.includes('RTGS')) transaction.paymentMode = 'RTGS';
      else if (narrationUpper.includes('IMPS')) transaction.paymentMode = 'IMPS';
      else if (narrationUpper.includes('CHEQUE') || narrationUpper.includes('CHQ')) transaction.paymentMode = 'CHEQUE';
      else if (narrationUpper.includes('UPI')) transaction.paymentMode = 'UPI';
      else if (narrationUpper.includes('CASH')) transaction.paymentMode = 'CASH';
      
      // Extract names from narration (common patterns)
      const parts = transaction.narration.split('-').filter(p => p.trim());
      if (parts.length > 1) {
        // Usually format: MODE-FromBank-ToBank-FromName-ToName-Reference
        if (parts.length >= 4) {
          transaction.remitterName = parts[parts.length - 3]?.trim() || "";
          transaction.beneficiaryName = parts[parts.length - 2]?.trim() || "";
          transaction.bankName = parts[1]?.trim() || "";
        }
      }
      
      // Set transaction type based on narration keywords
      if (narrationUpper.includes('CR-')) transaction.transactionType = 'CREDIT';
      else if (narrationUpper.includes('DR-')) transaction.transactionType = 'DEBIT';
      else if (narrationUpper.includes('TRANSFER')) transaction.transactionType = 'TRANSFER';
    }
    
    // Extract cheque/ref number
    if (columnIndices.chequeRef !== -1 && row[columnIndices.chequeRef]) {
      transaction.chequeRefNumber = String(row[columnIndices.chequeRef]).trim();
    }
    
    // Extract withdrawal amount
    if (columnIndices.withdrawal !== -1 && row[columnIndices.withdrawal]) {
      transaction.withdrawalAmount = parseAmount(row[columnIndices.withdrawal]);
      if (transaction.withdrawalAmount > 0) {
        transaction.transactionType = 'DEBIT';
      }
    }
    
    // Extract deposit amount
    if (columnIndices.deposit !== -1 && row[columnIndices.deposit]) {
      transaction.depositAmount = parseAmount(row[columnIndices.deposit]);
      if (transaction.depositAmount > 0) {
        transaction.transactionType = 'CREDIT';
      }
    }
    
    // Extract balance
    if (columnIndices.balance !== -1 && row[columnIndices.balance]) {
      transaction.balanceAfterTransaction = parseAmount(row[columnIndices.balance]);
    }
    
    // Store original row data
    transaction.originalData = { ...row };
    
    // Only add if we have at least a date
    if (transaction.date) {
      transactions.push(transaction);
    }
  }
  
  return transactions;
};

// Extract summary information
const extractSummary = (data, transactions) => {
  const summary = {
    openingBalance: 0,
    closingBalance: 0,
    totalDebits: 0,
    totalCredits: 0,
    debitCount: 0,
    creditCount: 0
  };
  
  // First, calculate from transactions
  transactions.forEach(txn => {
    if (txn.transactionType === 'DEBIT') {
      summary.totalDebits += txn.withdrawalAmount;
      summary.debitCount++;
    } else if (txn.transactionType === 'CREDIT') {
      summary.totalCredits += txn.depositAmount;
      summary.creditCount++;
    }
  });
  
  // Try to find summary section in data
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || !Array.isArray(row)) continue;
    
    const rowText = row.join(' ').toLowerCase();
    
    if (rowText.includes('opening balance') || rowText.includes('closing balance') ||
        rowText.includes('statement summary')) {
      
      // Look for balances in surrounding rows
      for (let j = Math.max(0, i - 5); j < Math.min(i + 10, data.length); j++) {
        const summaryRow = data[j];
        if (!summaryRow || !Array.isArray(summaryRow)) continue;
        
        for (let k = 0; k < summaryRow.length; k++) {
          const cell = summaryRow[k];
          if (typeof cell === 'string') {
            const cellLower = cell.toLowerCase();
            if (cellLower.includes('opening balance')) {
              // Next cell or same cell might have the value
              if (k + 1 < summaryRow.length) {
                summary.openingBalance = parseAmount(summaryRow[k + 1]);
              }
            } else if (cellLower.includes('closing balance')) {
              if (k + 1 < summaryRow.length) {
                summary.closingBalance = parseAmount(summaryRow[k + 1]);
              }
            } else if (cellLower.includes('debits')) {
              if (k + 1 < summaryRow.length) {
                summary.totalDebits = parseAmount(summaryRow[k + 1]);
              }
            } else if (cellLower.includes('credits')) {
              if (k + 1 < summaryRow.length) {
                summary.totalCredits = parseAmount(summaryRow[k + 1]);
              }
            } else if (cellLower.includes('dr count')) {
              if (k + 1 < summaryRow.length) {
                summary.debitCount = parseInt(summaryRow[k + 1]) || summary.debitCount;
              }
            } else if (cellLower.includes('cr count')) {
              if (k + 1 < summaryRow.length) {
                summary.creditCount = parseInt(summaryRow[k + 1]) || summary.creditCount;
              }
            }
          }
        }
      }
      break;
    }
  }
  
  // If closing balance not found in summary, use last transaction balance
  if (summary.closingBalance === 0 && transactions.length > 0) {
    summary.closingBalance = transactions[transactions.length - 1].balanceAfterTransaction;
  }
  
  return summary;
};

/* ---------- Upload Bank Statement ---------- */
router.post("/upload", authenticate, upload.single("statementFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: "User not found" });
    }

    // Read and process Excel file
    const workbook = XLSX.readFile(req.file.path);
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];
    
    // Convert to JSON with headers preserved
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    
    // Extract information from Excel
    const bankInfo = extractBankInfo(rawData);
    const transactions = extractTransactions(rawData);
    const summary = extractSummary(rawData, transactions);
    
    // Calculate additional summary
    const netFlow = summary.totalCredits - summary.totalDebits;
    const avgTransaction = transactions.length > 0 ? 
      (summary.totalCredits + summary.totalDebits) / transactions.length : 0;
    
    // Create bank statement record
    const bankStatement = new BankStatement({
      // Basic Information
      originalFileName: req.file.originalname,
      uploadDate: new Date(),
      uploadedBy: user.name,
      uploadedByUserId: req.user.id,
      
      // Statement Information
      bankName: bankInfo.bankName || "Unknown Bank",
      accountNumber: bankInfo.accountNumber,
      accountHolderName: bankInfo.accountHolderName,
      
      // Date Range
      statementFromDate: bankInfo.statementFrom,
      statementToDate: bankInfo.statementTo,
      
      // File Information
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      filePath: req.file.path,
      
      // Statement Summary
      openingBalance: summary.openingBalance,
      closingBalance: summary.closingBalance,
      totalDebits: summary.totalDebits,
      totalCredits: summary.totalCredits,
      totalTransactions: transactions.length,
      
      // All Transactions Data
      transactions: transactions,
      
      // All Bank Details
      bankDetails: {
        branchName: bankInfo.branchName,
        ifscCode: bankInfo.ifscCode,
        micrCode: bankInfo.micrCode,
        customerId: bankInfo.customerId,
        accountOpenDate: bankInfo.accountOpenDate,
        accountStatus: bankInfo.accountStatus,
        currency: bankInfo.currency,
        odLimit: bankInfo.odLimit,
        address: bankInfo.address,
        city: bankInfo.city,
        state: bankInfo.state,
        phoneNumber: bankInfo.phoneNumber,
        email: bankInfo.email,
        gstin: bankInfo.gstin,
        bankGstin: bankInfo.bankGstin,
        nominationStatus: bankInfo.nominationStatus,
        generatedOn: bankInfo.generatedOn,
        generatedBy: bankInfo.generatedBy,
        requestingBranch: bankInfo.requestingBranch,
        pageNumber: bankInfo.pageNumber,
        statementType: bankInfo.statementType
      },
      
      // Statement Summary Details
      statementSummary: {
        debitCount: summary.debitCount,
        creditCount: summary.creditCount,
        netFlow: netFlow,
        averageTransactionAmount: avgTransaction
      },
      
      // Raw Excel Data
      rawExcelData: rawData,
      
      // Processing Information
      processingStatus: "COMPLETED",
      processedAt: new Date(),
      
      // Tags
      tags: [
        bankInfo.bankName || "Bank Statement",
        bankInfo.statementFrom ? `${bankInfo.statementFrom.getFullYear()}-${String(bankInfo.statementFrom.getMonth() + 1).padStart(2, '0')}` : "Unknown Period"
      ],
      
      // Metadata
      metadata: {
        sheetName: firstSheet,
        totalRows: rawData.length,
        fileHash: req.file.filename,
        uploadedVia: "Web Interface"
      }
    });

    await bankStatement.save();

    res.status(201).json({
      message: "Bank statement uploaded and processed successfully",
      data: {
        id: bankStatement._id,
        fileName: bankStatement.originalFileName,
        bankName: bankStatement.bankName,
        accountNumber: bankStatement.accountNumber,
        dateRange: {
          from: bankStatement.statementFromDate,
          to: bankStatement.statementToDate
        },
        uploadedBy: bankStatement.uploadedBy,
        uploadDate: bankStatement.uploadDate,
        transactionsCount: bankStatement.transactions.length,
        summary: {
          openingBalance: bankStatement.openingBalance,
          closingBalance: bankStatement.closingBalance,
          totalDebits: bankStatement.totalDebits,
          totalCredits: bankStatement.totalCredits
        }
      }
    });

  } catch (error) {
    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      message: "Server error while processing bank statement", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/* ---------- Get All Bank Statements (Simple List) ---------- */
router.get("/", authenticate, async (req, res) => {
  try {
    const { 
      search, 
      bankName, 
      startDate, 
      endDate,
      sortBy = "uploadDate", 
      sortOrder = "desc",
      page = 1,
      limit = 20
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = {};
    
    // Search functionality
    if (search) {
      query.$or = [
        { originalFileName: { $regex: search, $options: "i" } },
        { bankName: { $regex: search, $options: "i" } },
        { accountNumber: { $regex: search, $options: "i" } },
        { accountHolderName: { $regex: search, $options: "i" } },
        { uploadedBy: { $regex: search, $options: "i" } },
        { "tags": { $regex: search, $options: "i" } }
      ];
    }

    // Filter by bank name
    if (bankName) {
      query.bankName = { $regex: bankName, $options: "i" };
    }

    // Filter by date range
    if (startDate || endDate) {
      query.uploadDate = {};
      if (startDate) {
        query.uploadDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.uploadDate.$lte = new Date(endDate);
      }
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Get total count for pagination
    const total = await BankStatement.countDocuments(query);

    // Get statements with pagination
    const statements = await BankStatement.find(query)
      .select("originalFileName uploadDate statementFromDate statementToDate bankName accountNumber uploadedBy uploadedByUserId openingBalance closingBalance totalTransactions fileSize")
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const formattedStatements = statements.map(stmt => ({
      id: stmt._id,
      fileName: stmt.originalFileName,
      uploadDate: stmt.uploadDate,
      bankName: stmt.bankName,
      accountNumber: stmt.accountNumber,
      dateRange: {
        from: stmt.statementFromDate,
        to: stmt.statementToDate
      },
      uploadedBy: stmt.uploadedBy,
      uploadedById: stmt.uploadedByUserId,
      summary: {
        openingBalance: stmt.openingBalance,
        closingBalance: stmt.closingBalance,
        totalTransactions: stmt.totalTransactions
      },
      fileSize: stmt.fileSize
    }));

    res.status(200).json({
      statements: formattedStatements,
      pagination: {
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Server error while fetching bank statements", 
      error: error.message 
    });
  }
});

/* ---------- Get Single Bank Statement with All Data ---------- */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const statement = await BankStatement.findById(req.params.id);
    
    if (!statement) {
      return res.status(404).json({ message: "Bank statement not found" });
    }

    res.status(200).json({
      statement: {
        id: statement._id,
        // Basic Information
        fileName: statement.originalFileName,
        uploadDate: statement.uploadDate,
        uploadedBy: statement.uploadedBy,
        
        // Statement Information
        bankName: statement.bankName,
        accountNumber: statement.accountNumber,
        accountHolderName: statement.accountHolderName,
        
        // Date Range
        statementFromDate: statement.statementFromDate,
        statementToDate: statement.statementToDate,
        
        // File Information
        fileSize: statement.fileSize,
        fileType: statement.fileType,
        
        // Summary
        openingBalance: statement.openingBalance,
        closingBalance: statement.closingBalance,
        totalDebits: statement.totalDebits,
        totalCredits: statement.totalCredits,
        totalTransactions: statement.totalTransactions,
        
        // All Transactions Data
        transactions: statement.transactions,
        
        // All Bank Details
        bankDetails: statement.bankDetails,
        
        // Statement Summary Details
        statementSummary: statement.statementSummary,
        
        // Processing Information
        processingStatus: statement.processingStatus,
        processedAt: statement.processedAt,
        processingErrors: statement.processingErrors,
        
        // Tags
        tags: statement.tags,
        
        // Metadata
        metadata: statement.metadata,
        
        // Raw Excel Data
        rawExcelData: statement.rawExcelData,
        
        // File Path
        filePath: statement.filePath,
        
        // Uploaded By User ID
        uploadedByUserId: statement.uploadedByUserId,
        
        // Timestamps
        createdAt: statement.createdAt,
        updatedAt: statement.updatedAt
      }
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Server error while fetching bank statement", 
      error: error.message 
    });
  }
});

/* ---------- Get All Transactions for a Statement ---------- */
router.get("/:id/transactions", authenticate, async (req, res) => {
  try {
    const { 
      page = 1,
      limit = 50,
      type, // "credit", "debit", "all"
      sortBy = "date",
      sortOrder = "desc"
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const statement = await BankStatement.findById(req.params.id)
      .select("transactions");
    
    if (!statement) {
      return res.status(404).json({ message: "Bank statement not found" });
    }

    let transactions = [...statement.transactions];
    
    // Filter by type
    if (type && type !== 'all') {
      transactions = transactions.filter(txn => 
        txn.transactionType.toLowerCase() === type.toLowerCase()
      );
    }
    
    // Sort transactions
    transactions.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortBy === 'date') {
        return sortOrder === 'asc' ? 
          new Date(aValue) - new Date(bValue) : 
          new Date(bValue) - new Date(aValue);
      }
      
      // For amounts
      if (sortBy === 'withdrawalAmount' || sortBy === 'depositAmount' || sortBy === 'balanceAfterTransaction') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // For strings
      return sortOrder === 'asc' ? 
        String(aValue).localeCompare(String(bValue)) : 
        String(bValue).localeCompare(String(aValue));
    });
    
    // Apply pagination
    const total = transactions.length;
    const paginatedTransactions = transactions.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      transactions: paginatedTransactions,
      pagination: {
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Server error while fetching transactions", 
      error: error.message 
    });
  }
});

/* ---------- Download Raw Excel Data ---------- */
router.get("/:id/download", authenticate, async (req, res) => {
  try {
    const statement = await BankStatement.findById(req.params.id);
    
    if (!statement) {
      return res.status(404).json({ message: "Bank statement not found" });
    }

    // Create Excel workbook from raw data
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(statement.rawExcelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Statement");
    
    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="bank-statement-${statement._id}.xlsx"`);
    
    res.send(excelBuffer);

  } catch (error) {
    res.status(500).json({ 
      message: "Server error while downloading bank statement", 
      error: error.message 
    });
  }
});

/* ---------- Get Statistics ---------- */
router.get("/stats/summary", authenticate, async (req, res) => {
  try {
    const stats = await BankStatement.aggregate([
      {
        $group: {
          _id: null,
          totalStatements: { $sum: 1 },
          totalTransactions: { $sum: "$totalTransactions" },
          totalDebits: { $sum: "$totalDebits" },
          totalCredits: { $sum: "$totalCredits" },
          uniqueBanks: { $addToSet: "$bankName" },
          totalFileSize: { $sum: "$fileSize" }
        }
      },
      {
        $project: {
          totalStatements: 1,
          totalTransactions: 1,
          totalDebits: 1,
          totalCredits: 1,
          uniqueBanksCount: { $size: "$uniqueBanks" },
          totalFileSize: 1,
          netFlow: { $subtract: ["$totalCredits", "$totalDebits"] }
        }
      }
    ]);

    // Recent uploads
    const recentUploads = await BankStatement.find()
      .select("originalFileName uploadDate bankName uploadedBy")
      .sort({ uploadDate: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      summary: stats[0] || {
        totalStatements: 0,
        totalTransactions: 0,
        totalDebits: 0,
        totalCredits: 0,
        uniqueBanksCount: 0,
        totalFileSize: 0,
        netFlow: 0
      },
      recentUploads: recentUploads.map(stmt => ({
        fileName: stmt.originalFileName,
        uploadDate: stmt.uploadDate,
        bankName: stmt.bankName,
        uploadedBy: stmt.uploadedBy
      }))
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Server error while fetching statistics", 
      error: error.message 
    });
  }
});

/* ---------- Delete Bank Statement ---------- */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Check if user is admin or super admin
    if (!user || (!user.isSuperAdmin && user.role !== "ADMIN")) {
      return res.status(403).json({ message: "Only Admin or Super Admin can delete bank statements" });
    }

    const statement = await BankStatement.findById(req.params.id);
    if (!statement) {
      return res.status(404).json({ message: "Bank statement not found" });
    }

    // Delete physical file if it exists
    if (statement.filePath && fs.existsSync(statement.filePath)) {
      fs.unlinkSync(statement.filePath);
    }

    // Delete database record
    await BankStatement.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Bank statement deleted successfully" });

  } catch (error) {
    res.status(500).json({ 
      message: "Server error while deleting bank statement", 
      error: error.message 
    });
  }
});

module.exports = router;