// components/BankStatementView.jsx
"use client";

import { useState, useEffect } from "react";
import axios from "axios";

const BankStatementView = ({ statementId, onClose }) => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSections, setExpandedSections] = useState({
    basicInfo: true,
    bankDetails: true,
    summary: true,
    transactions: true,
    processingInfo: false,
    metadata: false
  });
  
  const [transactionFilters, setTransactionFilters] = useState({
    type: "all",
    minAmount: "",
    maxAmount: "",
    search: "",
    paymentMode: "all"
  });
  
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [currentTransactionPage, setCurrentTransactionPage] = useState(1);
  const transactionsPerPage = 20;

  useEffect(() => {
    if (statementId) {
      fetchStatementDetails();
    }
  }, [statementId]);

  useEffect(() => {
    if (statement?.transactions) {
      applyTransactionFilters();
    }
  }, [statement?.transactions, transactionFilters]);

  const fetchStatementDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `${BACKEND_URL}/api/bank-statements/${statementId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      
      console.log("Fetched statement:", response.data); // Debug log
      setStatement(response.data.statement);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching statement:", err); // Debug log
      setError(err.response?.data?.message || "Failed to load statement details");
      setLoading(false);
    }
  };

  const applyTransactionFilters = () => {
    if (!statement?.transactions) {
      setFilteredTransactions([]);
      return;
    }
    
    let filtered = [...statement.transactions];
    
    // Filter by type
    if (transactionFilters.type !== "all") {
      filtered = filtered.filter(txn => 
        txn.transactionType && txn.transactionType.toLowerCase() === transactionFilters.type.toLowerCase()
      );
    }
    
    // Filter by payment mode
    if (transactionFilters.paymentMode !== "all") {
      filtered = filtered.filter(txn => 
        txn.paymentMode && txn.paymentMode.toLowerCase() === transactionFilters.paymentMode.toLowerCase()
      );
    }
    
    // Filter by amount range
    if (transactionFilters.minAmount) {
      const min = parseFloat(transactionFilters.minAmount);
      filtered = filtered.filter(txn => 
        (txn.withdrawalAmount && txn.withdrawalAmount >= min) || 
        (txn.depositAmount && txn.depositAmount >= min)
      );
    }
    
    if (transactionFilters.maxAmount) {
      const max = parseFloat(transactionFilters.maxAmount);
      filtered = filtered.filter(txn => 
        ((txn.withdrawalAmount && txn.withdrawalAmount <= max) || txn.withdrawalAmount === 0) && 
        ((txn.depositAmount && txn.depositAmount <= max) || txn.depositAmount === 0)
      );
    }
    
    // Filter by search
    if (transactionFilters.search) {
      const searchLower = transactionFilters.search.toLowerCase();
      filtered = filtered.filter(txn =>
        (txn.narration && txn.narration.toLowerCase().includes(searchLower)) ||
        (txn.chequeRefNumber && txn.chequeRefNumber.toLowerCase().includes(searchLower)) ||
        (txn.beneficiaryName && txn.beneficiaryName.toLowerCase().includes(searchLower)) ||
        (txn.remitterName && txn.remitterName.toLowerCase().includes(searchLower)) ||
        (txn.bankName && txn.bankName.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredTransactions(filtered);
    setCurrentTransactionPage(1);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = typeof dateString === 'object' && dateString.$date 
        ? new Date(dateString.$date)
        : new Date(dateString);
      
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return String(dateString);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const renderValue = (value) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        return value.length > 0 ? value.join(", ") : "None";
      }
      // Handle MongoDB ObjectId
      if (value.$oid) return value.$oid;
      // Handle MongoDB Date
      if (value.$date) return formatDate(value.$date);
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  // Get current page transactions
  const indexOfLastTransaction = currentTransactionPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);
  const totalTransactionPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">Loading statement details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="text-red-600 mb-4">No statement data found</div>
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  console.log("Statement data for rendering:", statement); // Debug log

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Bank Statement: {statement.originalFileName || "No File Name"}
            </h3>
            <p className="text-sm text-gray-600">
              {statement.bankName || "Unknown Bank"} • {statement.accountNumber || "No Account Number"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-1 px-4">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 text-sm font-medium ${activeTab === "overview" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-4 py-2 text-sm font-medium ${activeTab === "transactions" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            >
              💰 Transactions ({Array.isArray(statement.transactions) ? statement.transactions.length : 0})
            </button>
            <button
              onClick={() => setActiveTab("rawData")}
              className={`px-4 py-2 text-sm font-medium ${activeTab === "rawData" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            >
              📄 Raw Data
            </button>
            <button
              onClick={() => setActiveTab("metadata")}
              className={`px-4 py-2 text-sm font-medium ${activeTab === "metadata" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            >
              ⚙️ Complete Data
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Basic Information Section */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection("basicInfo")}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
                >
                  <h4 className="font-medium text-gray-900">📋 Basic Information</h4>
                  <span>{expandedSections.basicInfo ? "▲" : "▼"}</span>
                </button>
                {expandedSections.basicInfo && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">File Name</label>
                        <div className="text-sm font-medium text-gray-900">{statement.originalFileName || "N/A"}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Bank Name</label>
                        <div className="text-sm font-medium text-gray-900">{statement.bankName || "N/A"}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Account Number</label>
                        <div className="text-sm font-mono text-gray-900">{statement.accountNumber || "N/A"}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Account Holder</label>
                        <div className="text-sm text-gray-900">{statement.accountHolderName || "N/A"}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Statement Period</label>
                        <div className="text-sm text-gray-900">
                          {formatDate(statement.statementFromDate)} to {formatDate(statement.statementToDate)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Uploaded By</label>
                        <div className="text-sm text-gray-900">{statement.uploadedBy || "N/A"}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Upload Date</label>
                        <div className="text-sm text-gray-900">{formatDate(statement.uploadDate || statement.createdAt)}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">File Size</label>
                        <div className="text-sm text-gray-900">{formatFileSize(statement.fileSize)}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">File Type</label>
                        <div className="text-sm text-gray-900">{statement.fileType || "N/A"}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Total Transactions</label>
                        <div className="text-sm text-gray-900">{statement.totalTransactions || 0}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bank Details Section */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection("bankDetails")}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
                >
                  <h4 className="font-medium text-gray-900">🏦 Bank Details</h4>
                  <span>{expandedSections.bankDetails ? "▲" : "▼"}</span>
                </button>
                {expandedSections.bankDetails && statement.bankDetails && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(statement.bankDetails).map(([key, value]) => (
                        value !== null && value !== undefined && value !== "" && (
                          <div key={key}>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </label>
                            <div className="text-sm text-gray-900 break-words">
                              {renderValue(value)}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Section */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection("summary")}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
                >
                  <h4 className="font-medium text-gray-900">📈 Statement Summary</h4>
                  <span>{expandedSections.summary ? "▲" : "▼"}</span>
                </button>
                {expandedSections.summary && (
                  <div className="p-4">
                    {/* Financial Summary */}
                    <div className="mb-6">
                      <h5 className="font-medium text-gray-700 mb-3">Financial Summary</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-xs text-gray-500">Opening Balance</p>
                          <p className="text-lg font-bold text-blue-700">{formatCurrency(statement.openingBalance)}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-xs text-gray-500">Total Credits</p>
                          <p className="text-lg font-bold text-green-700">{formatCurrency(statement.totalCredits)}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <p className="text-xs text-gray-500">Total Debits</p>
                          <p className="text-lg font-bold text-red-700">{formatCurrency(statement.totalDebits)}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <p className="text-xs text-gray-500">Closing Balance</p>
                          <p className="text-lg font-bold text-purple-700">{formatCurrency(statement.closingBalance)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Summary */}
                    {statement.statementSummary && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-3">Transaction Summary</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-500">Total Transactions</p>
                            <p className="text-lg font-bold text-gray-900">{statement.totalTransactions || 0}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-500">Debit Count</p>
                            <p className="text-lg font-bold text-red-600">{statement.statementSummary.debitCount || 0}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-500">Credit Count</p>
                            <p className="text-lg font-bold text-green-600">{statement.statementSummary.creditCount || 0}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-500">Net Flow</p>
                            <p className={`text-lg font-bold ${statement.statementSummary.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(statement.statementSummary.netFlow)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Processing Information */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection("processingInfo")}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
                >
                  <h4 className="font-medium text-gray-900">⚙️ Processing Information</h4>
                  <span>{expandedSections.processingInfo ? "▲" : "▼"}</span>
                </button>
                {expandedSections.processingInfo && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Processing Status</label>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statement.processingStatus === "COMPLETED" ? "bg-green-100 text-green-800" :
                          statement.processingStatus === "FAILED" ? "bg-red-100 text-red-800" :
                          statement.processingStatus === "PROCESSING" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {statement.processingStatus || "UNKNOWN"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Processed At</label>
                        <div className="text-sm text-gray-900">{formatDate(statement.processedAt)}</div>
                      </div>
                      {statement.processingErrors && statement.processingErrors.length > 0 && (
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Processing Errors</label>
                          <div className="bg-red-50 border border-red-200 rounded p-3">
                            <ul className="text-sm text-red-800 list-disc list-inside">
                              {statement.processingErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {statement.tags && statement.tags.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">🏷️ Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {statement.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="space-y-4">
              {/* Transaction Filters */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">🔍 Filter Transactions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                    <select
                      value={transactionFilters.type}
                      onChange={(e) => setTransactionFilters(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                    >
                      <option value="all">All Types</option>
                      <option value="credit">Credit</option>
                      <option value="debit">Debit</option>
                      <option value="transfer">Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Payment Mode</label>
                    <select
                      value={transactionFilters.paymentMode}
                      onChange={(e) => setTransactionFilters(prev => ({ ...prev, paymentMode: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                    >
                      <option value="all">All Modes</option>
                      <option value="neft">NEFT</option>
                      <option value="rtgs">RTGS</option>
                      <option value="imps">IMPS</option>
                      <option value="cheque">Cheque</option>
                      <option value="upi">UPI</option>
                      <option value="cash">Cash</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Min Amount</label>
                    <input
                      type="number"
                      value={transactionFilters.minAmount}
                      onChange={(e) => setTransactionFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                      placeholder="Min amount"
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Max Amount</label>
                    <input
                      type="number"
                      value={transactionFilters.maxAmount}
                      onChange={(e) => setTransactionFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                      placeholder="Max amount"
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2 lg:col-span-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Search in Narration/Reference</label>
                    <input
                      type="text"
                      value={transactionFilters.search}
                      onChange={(e) => setTransactionFilters(prev => ({ ...prev, search: e.target.value }))}
                      placeholder="Search narration, ref no, beneficiary..."
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2 lg:col-span-4 flex justify-between">
                    <button
                      onClick={applyTransactionFilters}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                    >
                      Apply Filters
                    </button>
                    <button
                      onClick={() => {
                        setTransactionFilters({
                          type: "all",
                          minAmount: "",
                          maxAmount: "",
                          search: "",
                          paymentMode: "all"
                        });
                      }}
                      className="text-gray-600 text-sm hover:text-gray-800"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="border rounded-lg">
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-900">
                      💰 All Transactions ({filteredTransactions.length} filtered of {Array.isArray(statement.transactions) ? statement.transactions.length : 0} total)
                    </h4>
                    <div className="text-sm text-gray-500">
                      Showing {Math.min((currentTransactionPage - 1) * transactionsPerPage + 1, filteredTransactions.length)} to {Math.min(currentTransactionPage * transactionsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref No</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentTransactions.length > 0 ? (
                        currentTransactions.map((txn, index) => (
                          <tr key={txn._id?.$oid || index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(txn.date)}
                              {txn.valueDate && (
                                <div className="text-xs text-gray-500">Value: {formatDate(txn.valueDate)}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="max-w-md">
                                <div className="text-gray-900">{txn.narration || "N/A"}</div>
                                {txn.beneficiaryName && (
                                  <div className="text-xs text-gray-500">To: {txn.beneficiaryName}</div>
                                )}
                                {txn.remitterName && (
                                  <div className="text-xs text-gray-500">From: {txn.remitterName}</div>
                                )}
                                {txn.bankName && (
                                  <div className="text-xs text-gray-500">Bank: {txn.bankName}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                              {txn.chequeRefNumber || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                txn.transactionType === "CREDIT" ? "bg-green-100 text-green-800" :
                                txn.transactionType === "DEBIT" ? "bg-red-100 text-red-800" :
                                "bg-gray-100 text-gray-800"
                              }`}>
                                {txn.transactionType || "OTHER"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {txn.paymentMode || "OTHER"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 font-medium">
                              {txn.withdrawalAmount > 0 ? formatCurrency(txn.withdrawalAmount) : "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">
                              {txn.depositAmount > 0 ? formatCurrency(txn.depositAmount) : "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                              {formatCurrency(txn.balanceAfterTransaction)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <button
                                onClick={() => {
                                  const modal = document.createElement('div');
                                  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4';
                                  modal.innerHTML = `
                                    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                                      <div class="flex justify-between items-center p-4 border-b">
                                        <h3 class="text-lg font-bold text-gray-900">Transaction Details</h3>
                                        <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
                                      </div>
                                      <div class="flex-1 overflow-auto p-6">
                                        <div class="grid grid-cols-1 gap-4">
                                          ${Object.entries(txn).map(([key, value]) => `
                                            <div>
                                              <label class="block text-xs font-medium text-gray-500 mb-1">
                                                ${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                              </label>
                                              <div class="text-sm text-gray-900 bg-gray-50 p-3 rounded break-words">
                                                ${key === 'originalData' ? '<pre class="text-xs overflow-auto max-h-60">' + JSON.stringify(value, null, 2) + '</pre>' : 
                                                  typeof value === 'object' && value !== null ? '<pre class="text-xs overflow-auto max-h-60">' + JSON.stringify(value, null, 2) + '</pre>' :
                                                  String(value || 'N/A')}
                                              </div>
                                            </div>
                                          `).join('')}
                                        </div>
                                      </div>
                                    </div>
                                  `;
                                  document.body.appendChild(modal);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                View All Fields
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                            No transactions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalTransactionPages > 1 && (
                  <div className="p-4 border-t">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setCurrentTransactionPage(prev => Math.max(1, prev - 1))}
                        disabled={currentTransactionPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <div className="text-sm text-gray-600">
                        Page {currentTransactionPage} of {totalTransactionPages}
                      </div>
                      <button
                        onClick={() => setCurrentTransactionPage(prev => Math.min(totalTransactionPages, prev + 1))}
                        disabled={currentTransactionPage === totalTransactionPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "rawData" && (
            <div className="space-y-4">
              <div className="border rounded-lg">
                <div className="p-4 border-b bg-gray-50">
                  <h4 className="font-medium text-gray-900">📄 Raw Excel Data (Complete Dataset)</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    This is the complete raw data extracted from the Excel file
                  </p>
                </div>
                <div className="p-4">
                  <div className="bg-gray-900 text-gray-100 rounded-lg overflow-auto max-h-[60vh]">
                    <pre className="p-4 text-sm">
                      {JSON.stringify(statement.rawExcelData || [], null, 2)}
                    </pre>
                  </div>
                  <div className="mt-4 text-sm text-gray-500">
                    <p>Total rows in raw data: {(statement.rawExcelData || []).length}</p>
                    <p>This data is stored exactly as it appears in the original Excel file</p>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              {statement.metadata && (
                <div className="border rounded-lg">
                  <div className="p-4 border-b bg-gray-50">
                    <h4 className="font-medium text-gray-900">⚙️ Processing Metadata</h4>
                  </div>
                  <div className="p-4">
                    <div className="bg-gray-50 rounded-lg overflow-auto max-h-[40vh]">
                      <pre className="p-4 text-sm">
                        {JSON.stringify(statement.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "metadata" && (
            <div className="space-y-4">
              <div className="border rounded-lg">
                <div className="p-4 border-b bg-gray-50">
                  <h4 className="font-medium text-gray-900">📋 Complete Document Data (All Fields)</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    This shows all fields stored in the database for this bank statement
                  </p>
                </div>
                <div className="p-4">
                  <div className="bg-gray-50 rounded-lg overflow-auto max-h-[60vh]">
                    <pre className="p-4 text-sm">
                      {JSON.stringify(statement, null, 2)}
                    </pre>
                  </div>
                  <div className="mt-4 text-sm text-gray-500">
                    <p>This is the complete MongoDB document with all stored fields</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            ID: {statement._id?.$oid || statement.id} • Created: {formatDate(statement.createdAt)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Download as JSON
                const dataStr = JSON.stringify(statement, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const link = document.createElement('a');
                link.href = dataUri;
                link.download = `bank-statement-${statement._id?.$oid || statement.id}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
            >
              Export as JSON
            </button>
            <button
              onClick={onClose}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankStatementView;