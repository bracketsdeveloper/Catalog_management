// routes/suspenseAccounts.js - Updated to work with BankStatements
const express = require("express");
const mongoose = require("mongoose");
const SuspenseAccount = require("../models/SuspenseAccount");
const BankStatement = require("../models/BankStatement");
const { authenticate } = require("../middleware/authenticate");

const router = express.Router();

/* ---------- Get Bank Statements with Suspense Transactions ---------- */
router.get("/bank-statements", authenticate, async (req, res) => {
  try {
    const { 
      page = 1,
      limit = 20,
      search,
      bankName,
      hasSuspense = "all" // all, with, without
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = {};
    
    // Search functionality
    if (search) {
      query.$or = [
        { originalFileName: { $regex: search, $options: "i" } },
        { bankName: { $regex: search, $options: "i" } },
        { accountNumber: { $regex: search, $options: "i" } }
      ];
    }

    // Filter by bank name
    if (bankName) {
      query.bankName = { $regex: bankName, $options: "i" };
    }

    // Get total count
    const total = await BankStatement.countDocuments(query);

    // Get bank statements with pagination
    const bankStatements = await BankStatement.find(query)
      .select("_id originalFileName bankName accountNumber statementFromDate statementToDate uploadDate")
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get suspense entries for these bank statements
    const statementIds = bankStatements.map(stmt => stmt._id);
    const suspenseEntries = await SuspenseAccount.find({
      bankStatementId: { $in: statementIds }
    }).lean();

    // Group suspense entries by bank statement
    const suspenseByStatement = {};
    suspenseEntries.forEach(entry => {
      const stmtId = entry.bankStatementId.toString();
      if (!suspenseByStatement[stmtId]) {
        suspenseByStatement[stmtId] = [];
      }
      suspenseByStatement[stmtId].push(entry);
    });

    // Format response with suspense info
    const formattedStatements = bankStatements.map(stmt => {
      const stmtId = stmt._id.toString();
      const suspenseCount = suspenseByStatement[stmtId]?.length || 0;
      const activeSuspense = suspenseByStatement[stmtId]?.filter(e => e.balanceAmount > 0).length || 0;
      
      return {
        id: stmt._id,
        fileName: stmt.originalFileName,
        bankName: stmt.bankName,
        accountNumber: stmt.accountNumber,
        statementFromDate: stmt.statementFromDate,
        statementToDate: stmt.statementToDate,
        uploadDate: stmt.uploadDate,
        suspenseInfo: {
          totalEntries: suspenseCount,
          activeEntries: activeSuspense,
          hasSuspense: suspenseCount > 0
        }
      };
    });

    // Filter by hasSuspense if needed
    let filteredStatements = formattedStatements;
    if (hasSuspense === "with") {
      filteredStatements = formattedStatements.filter(stmt => stmt.suspenseInfo.hasSuspense);
    } else if (hasSuspense === "without") {
      filteredStatements = formattedStatements.filter(stmt => !stmt.suspenseInfo.hasSuspense);
    }

    res.status(200).json({
      bankStatements: filteredStatements,
      pagination: {
        total: hasSuspense !== "all" ? filteredStatements.length : total,
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

/* ---------- Get Transactions from Bank Statement for Suspense ---------- */
router.get("/bank-statements/:id/transactions", authenticate, async (req, res) => {
  try {
    const { 
      type = "all", // debit, credit, all
      minAmount = 0,
      maxAmount,
      search
    } = req.query;

    const bankStatement = await BankStatement.findById(req.params.id);
    if (!bankStatement) {
      return res.status(404).json({ message: "Bank statement not found" });
    }

    let transactions = bankStatement.transactions || [];

    // Filter by type
    if (type !== "all") {
      transactions = transactions.filter(txn => 
        txn.transactionType && txn.transactionType.toLowerCase() === type.toLowerCase()
      );
    }

    // Filter by amount
    transactions = transactions.filter(txn => {
      const amount = Math.max(txn.withdrawalAmount || 0, txn.depositAmount || 0);
      return amount >= parseFloat(minAmount) && 
             (!maxAmount || amount <= parseFloat(maxAmount));
    });

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      transactions = transactions.filter(txn =>
        (txn.narration && txn.narration.toLowerCase().includes(searchLower)) ||
        (txn.chequeRefNumber && txn.chequeRefNumber.toLowerCase().includes(searchLower)) ||
        (txn.beneficiaryName && txn.beneficiaryName.toLowerCase().includes(searchLower))
      );
    }

    // Get existing suspense entries for these transactions
    const transactionIds = transactions.map(t => t._id?.toString() || JSON.stringify(t));
    const existingSuspense = await SuspenseAccount.find({
      bankStatementId: req.params.id,
      transactionId: { $in: transactionIds }
    }).lean();

    const suspenseByTransaction = {};
    existingSuspense.forEach(entry => {
      suspenseByTransaction[entry.transactionId] = entry;
    });

    // Format transactions with suspense info
    const formattedTransactions = transactions.map((txn, index) => {
      const transactionId = txn._id?.toString() || `txn-${index}`;
      const existingEntry = suspenseByTransaction[transactionId];
      
      const amount = Math.max(txn.withdrawalAmount || 0, txn.depositAmount || 0);
      const transactionType = txn.transactionType || (txn.withdrawalAmount > 0 ? "DEBIT" : "CREDIT");
      
      // Determine client name from transaction data
      let clientName = "Unknown Client";
      if (txn.beneficiaryName && txn.beneficiaryName.trim()) {
        clientName = txn.beneficiaryName;
      } else if (txn.remitterName && txn.remitterName.trim()) {
        clientName = txn.remitterName;
      } else if (txn.narration) {
        // Try to extract client name from narration
        const parts = txn.narration.split('-').filter(p => p.trim());
        if (parts.length >= 4) {
          clientName = parts[parts.length - 2]?.trim() || clientName;
        }
      }

      return {
        transactionId,
        date: txn.date,
        narration: txn.narration || "",
        chequeRefNumber: txn.chequeRefNumber || "",
        withdrawalAmount: txn.withdrawalAmount || 0,
        depositAmount: txn.depositAmount || 0,
        balanceAfterTransaction: txn.balanceAfterTransaction || 0,
        transactionType,
        paymentMode: txn.paymentMode || "OTHER",
        beneficiaryName: txn.beneficiaryName || "",
        remitterName: txn.remitterName || "",
        bankName: txn.bankName || "",
        amount,
        clientName,
        hasSuspenseEntry: !!existingEntry,
        suspenseEntryId: existingEntry?._id,
        suspenseBalance: existingEntry?.balanceAmount || 0,
        suspenseStatus: existingEntry?.status
      };
    });

    // Filter out transactions already in suspense (if requested)
    const showAll = req.query.showAll === "true";
    const finalTransactions = showAll 
      ? formattedTransactions
      : formattedTransactions.filter(txn => !txn.hasSuspenseEntry);

    res.status(200).json({
      bankStatement: {
        id: bankStatement._id,
        fileName: bankStatement.originalFileName,
        bankName: bankStatement.bankName,
        accountNumber: bankStatement.accountNumber
      },
      transactions: finalTransactions,
      total: finalTransactions.length,
      existingSuspenseCount: existingSuspense.length
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching transactions",
      error: error.message
    });
  }
});

/* ---------- Get All Suspense Account Entries ---------- */
router.get("/", authenticate, async (req, res) => {
  try {
    const {
      status,
      client,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      sortBy = "date",
      sortOrder = "desc",
      page = 1,
      limit = 50,
      showCleared = false
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = {};

    // Show only entries with positive balance by default
    if (!showCleared) {
      query.balanceAmount = { $gt: 0 };
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by client
    if (client) {
      query.$or = [
        { client: { $regex: client, $options: "i" } },
        { manualClient: { $regex: client, $options: "i" } }
      ];
    }

    // Filter by date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    // Filter by amount range
    if (minAmount || maxAmount) {
      query.balanceAmount = query.balanceAmount || {};
      if (minAmount) {
        query.balanceAmount.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        query.balanceAmount.$lte = parseFloat(maxAmount);
      }
    }

    // Search functionality
    if (search) {
      query.$or = [
        { client: { $regex: search, $options: "i" } },
        { manualClient: { $regex: search, $options: "i" } },
        { referenceNumber: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { manualDescription: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } }
      ];
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Get total count
    const total = await SuspenseAccount.countDocuments(query);

    // Get entries with pagination and populate bank statement info
    const entries = await SuspenseAccount.find(query)
      .populate("bankStatementId", "originalFileName bankName accountNumber statementFromDate statementToDate")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("clearedBy", "name email")
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Format response
    const formattedEntries = entries.map(entry => {
      const displayClient = entry.manualClient || entry.client;
      const displayDescription = entry.manualDescription || entry.description;
      
      return {
        id: entry._id,
        balanceAmount: entry.balanceAmount,
        client: displayClient,
        date: entry.date,
        referenceNumber: entry.referenceNumber,
        description: displayDescription,
        status: entry.status,
        isCleared: entry.balanceAmount === 0,
        notes: entry.notes,
        bankStatement: entry.bankStatementId ? {
          id: entry.bankStatementId._id,
          fileName: entry.bankStatementId.originalFileName,
          bankName: entry.bankStatementId.bankName,
          accountNumber: entry.bankStatementId.accountNumber,
          period: {
            from: entry.bankStatementId.statementFromDate,
            to: entry.bankStatementId.statementToDate
          }
        } : null,
        createdBy: entry.createdBy,
        updatedBy: entry.updatedBy,
        clearedAt: entry.clearedAt,
        clearedBy: entry.clearedBy,
        daysPending: Math.ceil((new Date() - new Date(entry.createdAt)) / (1000 * 60 * 60 * 24)),
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        transactionId: entry.transactionId
      };
    });

    // Calculate totals
    const totals = await SuspenseAccount.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$balanceAmount" },
          totalEntries: { $sum: 1 },
          totalCleared: { 
            $sum: { 
              $cond: [{ $eq: ["$balanceAmount", 0] }, 1, 0] 
            }
          }
        }
      }
    ]);

    res.status(200).json({
      entries: formattedEntries,
      totals: totals[0] || {
        totalBalance: 0,
        totalEntries: 0,
        totalCleared: 0
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching suspense account entries",
      error: error.message
    });
  }
});

/* ---------- Create Suspense Entry from Bank Statement Transaction ---------- */
router.post("/from-transaction", authenticate, async (req, res) => {
  try {
    const {
      bankStatementId,
      transactionId,
      balanceAmount,
      client,
      description,
      notes
    } = req.body;

    // Validate required fields
    if (!bankStatementId || !transactionId || balanceAmount === undefined) {
      return res.status(400).json({
        message: "Bank statement ID, transaction ID, and balance amount are required"
      });
    }

    // Check if bank statement exists
    const bankStatement = await BankStatement.findById(bankStatementId);
    if (!bankStatement) {
      return res.status(404).json({ message: "Bank statement not found" });
    }

    // Find the transaction in the bank statement
    const transaction = bankStatement.transactions.find(
      txn => (txn._id?.toString() === transactionId) || 
             (JSON.stringify(txn) === transactionId)
    );

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found in bank statement" });
    }

    // Check if suspense entry already exists for this transaction
    const existingEntry = await SuspenseAccount.findOne({
      bankStatementId,
      transactionId
    });

    if (existingEntry) {
      return res.status(400).json({
        message: "Suspense entry already exists for this transaction",
        entryId: existingEntry._id
      });
    }

    // Determine client name if not provided
    let clientName = client;
    if (!clientName || clientName.trim() === "") {
      if (transaction.beneficiaryName && transaction.beneficiaryName.trim()) {
        clientName = transaction.beneficiaryName;
      } else if (transaction.remitterName && transaction.remitterName.trim()) {
        clientName = transaction.remitterName;
      } else if (transaction.narration) {
        // Try to extract from narration
        const parts = transaction.narration.split('-').filter(p => p.trim());
        if (parts.length >= 4) {
          clientName = parts[parts.length - 2]?.trim() || "Unknown Client";
        } else {
          clientName = "Unknown Client";
        }
      } else {
        clientName = "Unknown Client";
      }
    }

    // Determine description if not provided
    let entryDescription = description;
    if (!entryDescription || entryDescription.trim() === "") {
      entryDescription = transaction.narration || "Bank transaction";
    }

    // Determine reference number
    const referenceNumber = transaction.chequeRefNumber || 
                           `SUSP-${bankStatementId.toString().slice(-6)}-${Date.now().toString().slice(-4)}`;

    // Create suspense account entry
    const suspenseAccount = new SuspenseAccount({
      bankStatementId,
      transactionId,
      balanceAmount: parseFloat(balanceAmount),
      client: clientName,
      date: transaction.date || new Date(),
      referenceNumber,
      description: entryDescription,
      manualClient: client || "",
      manualDescription: description || "",
      notes: notes || "",
      createdBy: req.user.id,
      status: parseFloat(balanceAmount) === 0 ? "CLEARED" : "ACTIVE",
      metadata: {
        sourceTransaction: {
          id: transaction._id,
          date: transaction.date,
          narration: transaction.narration,
          type: transaction.transactionType,
          withdrawalAmount: transaction.withdrawalAmount,
          depositAmount: transaction.depositAmount,
          balanceAfterTransaction: transaction.balanceAfterTransaction
        }
      }
    });

    await suspenseAccount.save();

    // Populate the response
    const populatedEntry = await SuspenseAccount.findById(suspenseAccount._id)
      .populate("bankStatementId", "originalFileName bankName accountNumber")
      .populate("createdBy", "name email");

    res.status(201).json({
      message: "Suspense account entry created successfully",
      entry: populatedEntry,
      sourceTransaction: {
        date: transaction.date,
        narration: transaction.narration,
        amount: Math.max(transaction.withdrawalAmount || 0, transaction.depositAmount || 0),
        type: transaction.transactionType
      }
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error while creating suspense account entry",
      error: error.message
    });
  }
});

/* ---------- Bulk Create from Bank Statement ---------- */
router.post("/bulk-from-bank-statement", authenticate, async (req, res) => {
  try {
    const { bankStatementId, transactionIds, balanceAmounts } = req.body;

    if (!bankStatementId || !transactionIds || !Array.isArray(transactionIds)) {
      return res.status(400).json({
        message: "Bank statement ID and transaction IDs array are required"
      });
    }

    // Check if bank statement exists
    const bankStatement = await BankStatement.findById(bankStatementId);
    if (!bankStatement) {
      return res.status(404).json({ message: "Bank statement not found" });
    }

    const createdEntries = [];
    const errors = [];

    for (let i = 0; i < transactionIds.length; i++) {
      const transactionId = transactionIds[i];
      const balanceAmount = balanceAmounts?.[i] || 0;

      try {
        // Find the transaction
        const transaction = bankStatement.transactions.find(
          txn => (txn._id?.toString() === transactionId) || 
                 (JSON.stringify(txn) === transactionId)
        );

        if (!transaction) {
          errors.push(`Transaction ${transactionId} not found`);
          continue;
        }

        // Check if already exists
        const existingEntry = await SuspenseAccount.findOne({
          bankStatementId,
          transactionId
        });

        if (existingEntry) {
          errors.push(`Entry already exists for transaction ${transactionId}`);
          continue;
        }

        // Determine client name
        let clientName = "Unknown Client";
        if (transaction.beneficiaryName && transaction.beneficiaryName.trim()) {
          clientName = transaction.beneficiaryName;
        } else if (transaction.remitterName && transaction.remitterName.trim()) {
          clientName = transaction.remitterName;
        }

        // Create suspense entry
        const suspenseAccount = new SuspenseAccount({
          bankStatementId,
          transactionId,
          balanceAmount: parseFloat(balanceAmount),
          client: clientName,
          date: transaction.date || new Date(),
          referenceNumber: transaction.chequeRefNumber || 
                         `SUSP-${bankStatementId.toString().slice(-6)}-${i + 1}`,
          description: transaction.narration || "Bank transaction",
          createdBy: req.user.id,
          status: parseFloat(balanceAmount) === 0 ? "CLEARED" : "ACTIVE",
          metadata: {
            sourceTransaction: {
              id: transaction._id,
              date: transaction.date,
              narration: transaction.narration
            }
          }
        });

        await suspenseAccount.save();
        createdEntries.push(suspenseAccount);

      } catch (error) {
        errors.push(`Error processing transaction ${transactionId}: ${error.message}`);
      }
    }

    res.status(201).json({
      message: `Created ${createdEntries.length} suspense entries`,
      createdCount: createdEntries.length,
      createdEntries: createdEntries.map(entry => ({
        id: entry._id,
        referenceNumber: entry.referenceNumber,
        client: entry.client,
        balanceAmount: entry.balanceAmount
      })),
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error while bulk creating suspense entries",
      error: error.message
    });
  }
});

/* ---------- Update Suspense Entry Balance ---------- */
router.put("/:id/balance", authenticate, async (req, res) => {
  try {
    const { balanceAmount, notes } = req.body;

    if (balanceAmount === undefined) {
      return res.status(400).json({ message: "Balance amount is required" });
    }

    const entry = await SuspenseAccount.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: "Suspense account entry not found" });
    }

    const oldBalance = entry.balanceAmount;
    entry.balanceAmount = parseFloat(balanceAmount);
    entry.updatedBy = req.user.id;

    // Add note about balance change
    if (notes) {
      entry.notes = entry.notes ? `${entry.notes}\n${notes}` : notes;
    }

    // Add comment about balance change
    entry.comments.push({
      comment: `Balance updated from ${oldBalance} to ${balanceAmount}`,
      commentedBy: req.user.id
    });

    // If balance becomes zero, mark as cleared
    if (entry.balanceAmount === 0 && entry.status !== "CLEARED") {
      entry.status = "CLEARED";
      entry.clearedAt = new Date();
      entry.clearedBy = req.user.id;
    } else if (entry.balanceAmount > 0 && entry.status === "CLEARED") {
      entry.status = "ACTIVE";
      entry.clearedAt = undefined;
      entry.clearedBy = undefined;
    }

    await entry.save();

    // Populate the response
    const populatedEntry = await SuspenseAccount.findById(entry._id)
      .populate("bankStatementId", "originalFileName bankName")
      .populate("updatedBy", "name email");

    res.status(200).json({
      message: "Balance updated successfully",
      entry: populatedEntry,
      changes: {
        oldBalance,
        newBalance: entry.balanceAmount,
        cleared: entry.balanceAmount === 0
      }
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error while updating balance",
      error: error.message
    });
  }
});

/* ---------- Clear Entry (Set Balance to 0) ---------- */
router.post("/:id/clear", authenticate, async (req, res) => {
  try {
    const { notes } = req.body;

    const entry = await SuspenseAccount.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: "Suspense account entry not found" });
    }

    const oldBalance = entry.balanceAmount;
    entry.balanceAmount = 0;
    entry.status = "CLEARED";
    entry.clearedAt = new Date();
    entry.clearedBy = req.user.id;
    entry.updatedBy = req.user.id;

    // Add notes
    if (notes) {
      entry.notes = entry.notes ? `${entry.notes}\n${notes}` : notes;
    }

    // Add comment about clearing
    entry.comments.push({
      comment: `Entry cleared. Balance was ${oldBalance}`,
      commentedBy: req.user.id
    });

    await entry.save();

    res.status(200).json({
      message: "Suspense account entry cleared successfully",
      entry: {
        id: entry._id,
        balanceAmount: entry.balanceAmount,
        status: entry.status,
        clearedAt: entry.clearedAt
      }
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error while clearing entry",
      error: error.message
    });
  }
});

/* ---------- Get Statistics ---------- */
router.get("/stats/summary", authenticate, async (req, res) => {
  try {
    // Get total suspense balance
    const balanceStats = await SuspenseAccount.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$balanceAmount" },
          totalEntries: { $sum: 1 },
          activeEntries: { $sum: { $cond: [{ $gt: ["$balanceAmount", 0] }, 1, 0] } },
          clearedEntries: { $sum: { $cond: [{ $eq: ["$balanceAmount", 0] }, 1, 0] } },
          averageBalance: { $avg: "$balanceAmount" }
        }
      }
    ]);

    // Get by bank
    const bankStats = await SuspenseAccount.aggregate([
      {
        $lookup: {
          from: "bankstatements",
          localField: "bankStatementId",
          foreignField: "_id",
          as: "bankStatement"
        }
      },
      { $unwind: "$bankStatement" },
      {
        $group: {
          _id: "$bankStatement.bankName",
          count: { $sum: 1 },
          totalBalance: { $sum: "$balanceAmount" }
        }
      },
      { $sort: { totalBalance: -1 } },
      { $limit: 5 }
    ]);

    // Get oldest pending entries
    const oldestPending = await SuspenseAccount.find({ balanceAmount: { $gt: 0 } })
      .sort({ date: 1 })
      .limit(5)
      .populate("bankStatementId", "bankName")
      .select("client balanceAmount date referenceNumber bankStatementId")
      .lean();

    res.status(200).json({
      summary: balanceStats[0] || {
        totalBalance: 0,
        totalEntries: 0,
        activeEntries: 0,
        clearedEntries: 0,
        averageBalance: 0
      },
      bankStats,
      oldestPending: oldestPending.map(entry => ({
        client: entry.client,
        balanceAmount: entry.balanceAmount,
        referenceNumber: entry.referenceNumber,
        date: entry.date,
        bankName: entry.bankStatementId?.bankName,
        daysPending: Math.ceil((new Date() - new Date(entry.date)) / (1000 * 60 * 60 * 24))
      }))
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching suspense account statistics",
      error: error.message
    });
  }
});

module.exports = router;