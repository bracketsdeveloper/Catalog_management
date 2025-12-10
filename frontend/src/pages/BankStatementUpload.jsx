// components/BankStatementManager.jsx
"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import BankStatementView from "../components/BankStatementView"; // Import the enhanced view component

const BankStatementManager = () => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // View state
  const [viewStatementId, setViewStatementId] = useState(null);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Upload form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [bankName, setBankName] = useState("");
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBank, setFilterBank] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStatements, setTotalStatements] = useState(0);
  
  // Transactions view
  const [transactions, setTransactions] = useState([]);
  const [showTransactions, setShowTransactions] = useState(false);
  
  const isAdmin = localStorage.getItem("role") === "ADMIN" || 
                  localStorage.getItem("isSuperAdmin") === "true";

  useEffect(() => {
    fetchStatements();
  }, [currentPage, searchTerm, filterBank, startDate, endDate]);

  const fetchStatements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(filterBank && { bankName: filterBank }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      }).toString();

      const response = await axios.get(
        `${BACKEND_URL}/api/bank-statements?${params}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      setStatements(response.data.statements);
      setTotalPages(response.data.pagination.totalPages);
      setTotalStatements(response.data.pagination.total);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching statements:", error);
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert("Please select a bank statement file");
      return;
    }

    const formData = new FormData();
    formData.append("statementFile", selectedFile);
    if (bankName.trim()) {
      formData.append("bankName", bankName.trim());
    }

    try {
      setUploading(true);
      const response = await axios.post(
        `${BACKEND_URL}/api/bank-statements/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setStatements(prev => [response.data.data, ...prev]);
      setShowUploadModal(false);
      resetUploadForm();
      alert("Bank statement uploaded and processed successfully!");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to upload bank statement");
    } finally {
      setUploading(false);
    }
  };

  const viewStatementDetails = async (statementId) => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/bank-statements/${statementId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      
      setSelectedStatement(response.data.statement);
      setShowDetails(true);
    } catch (error) {
      console.error("Error fetching statement details:", error);
    }
  };

  const viewTransactions = async (statementId) => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/bank-statements/${statementId}/transactions`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      
      setTransactions(response.data.transactions);
      setSelectedStatement(statementId);
      setShowTransactions(true);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const downloadStatement = async (statementId) => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/bank-statements/${statementId}/download`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bank-statement-${statementId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Error downloading statement: " + error.message);
    }
  };

  const deleteStatement = async (statementId) => {
    if (!isAdmin) {
      alert("Only Admins can delete bank statements");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this bank statement?");
    if (!confirmed) return;

    try {
      await axios.delete(
        `${BACKEND_URL}/api/bank-statements/${statementId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      setStatements(prev => prev.filter(stmt => stmt.id !== statementId));
      alert("Bank statement deleted successfully!");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete bank statement");
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setBankName("");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-900">Loading bank statements...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white text-gray-900 rounded-md shadow-md">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#Ff8045]">Bank Statement Manager</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search statements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              🔍
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-[#44b977] text-white px-4 py-2 rounded-lg hover:bg-[#44b977]/90 flex items-center gap-2"
          >
            <span>📊</span>
            Upload Statement
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium mb-1">Bank Name</label>
          <input
            type="text"
            value={filterBank}
            onChange={(e) => setFilterBank(e.target.value)}
            placeholder="Filter by bank"
            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => {
              setSearchTerm("");
              setFilterBank("");
              setStartDate("");
              setEndDate("");
              setCurrentPage(1);
            }}
            className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Statements Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-purple-200 rounded-lg">
          <thead>
            <tr className="bg-purple-100 text-purple-900">
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">SL No</th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">File Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Bank Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Account Number</th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Date Range</th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Uploaded By</th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Upload Date</th>
              <th className="px6 py-3 text-left text-sm font-medium uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {statements.map((statement, index) => (
              <tr key={statement.id} className="border-b border-purple-200 hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">{(currentPage - 1) * 10 + index + 1}</td>
                <td className="px-6 py-4 text-sm font-medium">
                  <div className="max-w-xs truncate" title={statement.fileName}>
                    📄 {statement.fileName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(statement.fileSize || 0)}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{statement.bankName}</td>
                <td className="px-6 py-4 text-sm font-mono">{statement.accountNumber || "N/A"}</td>
                <td className="px-6 py-4 text-sm">
                  {formatDate(statement.dateRange?.from)} - {formatDate(statement.dateRange?.to)}
                </td>
                <td className="px-6 py-4 text-sm">{statement.uploadedBy}</td>
                <td className="px-6 py-4 text-sm">{formatDate(statement.uploadDate)}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setViewStatementId(statement.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 bg-blue-50 rounded hover:bg-blue-100"
                      title="View Complete Details"
                    >
                      👁️ View All
                    </button>
                    <button
                      onClick={() => viewTransactions(statement.id)}
                      className="text-green-600 hover:text-green-800 text-sm px-2 py-1 bg-green-50 rounded hover:bg-green-100"
                      title="View Transactions"
                    >
                      💰
                    </button>
                    <button
                      onClick={() => downloadStatement(statement.id)}
                      className="text-purple-600 hover:text-purple-800 text-sm px-2 py-1 bg-purple-50 rounded hover:bg-purple-100"
                      title="Download"
                    >
                      ⬇️
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => deleteStatement(statement.id)}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 bg-red-50 rounded hover:bg-red-100"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {statements.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No bank statements found. Upload your first bank statement to get started!
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, totalStatements)} of {totalStatements} statements
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 border rounded-lg text-sm ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-300 text-gray-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Statement View Modal */}
      {viewStatementId && (
        <BankStatementView
          statementId={viewStatementId}
          onClose={() => setViewStatementId(null)}
        />
      )}

      {/* Old Details Modal (Keep for backward compatibility) */}
      {showDetails && selectedStatement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Statement Details</h3>
              <button
                onClick={() => {
                  setShowDetails(false);
                  setSelectedStatement(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">File Name</h4>
                  <p className="text-gray-900">{selectedStatement.fileName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Bank Name</h4>
                  <p className="text-gray-900">{selectedStatement.bankName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Account Number</h4>
                  <p className="text-gray-900 font-mono">{selectedStatement.accountNumber || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Account Holder</h4>
                  <p className="text-gray-900">{selectedStatement.accountHolderName || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Statement Period</h4>
                  <p className="text-gray-900">
                    {formatDate(selectedStatement.statementFromDate)} to {formatDate(selectedStatement.statementToDate)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Uploaded By</h4>
                  <p className="text-gray-900">{selectedStatement.uploadedBy}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Upload Date</h4>
                  <p className="text-gray-900">{formatDate(selectedStatement.uploadDate)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Total Transactions</h4>
                  <p className="text-gray-900">{selectedStatement.transactionsCount}</p>
                </div>
              </div>
              
              {/* Summary */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Opening Balance</p>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(selectedStatement.openingBalance)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Total Credits</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(selectedStatement.totalCredits)}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Total Debits</p>
                    <p className="text-xl font-bold text-red-700">{formatCurrency(selectedStatement.totalDebits)}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Closing Balance</p>
                    <p className="text-xl font-bold text-purple-700">{formatCurrency(selectedStatement.closingBalance)}</p>
                  </div>
                </div>
              </div>
              
              {/* Bank Details */}
              {selectedStatement.bankDetails && (
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Bank Details</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedStatement.bankDetails.branchName && (
                        <div>
                          <span className="text-sm text-gray-500">Branch: </span>
                          <span className="text-gray-900">{selectedStatement.bankDetails.branchName}</span>
                        </div>
                      )}
                      {selectedStatement.bankDetails.ifscCode && (
                        <div>
                          <span className="text-sm text-gray-500">IFSC: </span>
                          <span className="text-gray-900 font-mono">{selectedStatement.bankDetails.ifscCode}</span>
                        </div>
                      )}
                      {selectedStatement.bankDetails.micrCode && (
                        <div>
                          <span className="text-sm text-gray-500">MICR: </span>
                          <span className="text-gray-900 font-mono">{selectedStatement.bankDetails.micrCode}</span>
                        </div>
                      )}
                      {selectedStatement.bankDetails.gstin && (
                        <div>
                          <span className="text-sm text-gray-500">GSTIN: </span>
                          <span className="text-gray-900">{selectedStatement.bankDetails.gstin}</span>
                        </div>
                      )}
                      {selectedStatement.bankDetails.address && (
                        <div className="md:col-span-2">
                          <span className="text-sm text-gray-500">Address: </span>
                          <span className="text-gray-900">{selectedStatement.bankDetails.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setViewStatementId(selectedStatement.id);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  View Complete Details
                </button>
                <button
                  onClick={() => viewTransactions(selectedStatement.id)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  View Transactions
                </button>
                <button
                  onClick={() => downloadStatement(selectedStatement.id)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Download Excel
                </button>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedStatement(null);
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Modal */}
      {showTransactions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Transactions</h3>
              <button
                onClick={() => {
                  setShowTransactions(false);
                  setTransactions([]);
                  setSelectedStatement(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <table className="min-w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Narration</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Ref No</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Type</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Debit</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Credit</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{formatDate(txn.date)}</td>
                      <td className="px-4 py-2 text-sm">
                        <div className="max-w-md truncate" title={txn.narration}>
                          {txn.narration}
                        </div>
                        {txn.beneficiaryName && (
                          <div className="text-xs text-gray-500">To: {txn.beneficiaryName}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm font-mono">{txn.chequeRefNumber || "-"}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          txn.transactionType === "CREDIT" 
                            ? "bg-green-100 text-green-800"
                            : txn.transactionType === "DEBIT"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {txn.transactionType}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-red-600">
                        {txn.withdrawalAmount > 0 ? formatCurrency(txn.withdrawalAmount) : "-"}
                      </td>
                      <td className="px-4 py-2 text-sm text-green-600">
                        {txn.depositAmount > 0 ? formatCurrency(txn.depositAmount) : "-"}
                      </td>
                      <td className="px-4 py-2 text-sm">{formatCurrency(txn.balanceAfterTransaction)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {transactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No transactions found
                </div>
              )}
            </div>
            
            <div className="p-4 border-t">
              <button
                onClick={() => {
                  if (selectedStatement) {
                    setShowTransactions(false);
                    setViewStatementId(selectedStatement);
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mb-2"
              >
                View Complete Statement with All Fields
              </button>
              <button
                onClick={() => downloadStatement(selectedStatement)}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                Download All Transactions as Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-[#Ff8045]">Upload Bank Statement</h2>
            
            <form onSubmit={handleUpload}>
              {/* Bank Name (Optional) */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Bank Name (Optional)
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full border border-purple-300 rounded-lg p-2"
                  placeholder="e.g., HDFC Bank, ICICI Bank (Auto-detected if blank)"
                />
              </div>

              {/* File Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Select Bank Statement File *
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full border border-purple-300 rounded-lg p-2"
                  accept=".xlsx,.xls,.csv"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported: Excel (.xlsx, .xls), CSV (.csv)
                </p>
                <p className="text-xs text-gray-500">
                  All data will be automatically extracted and stored
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="bg-gray-300 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-400"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 flex items-center gap-2"
                  disabled={uploading}
                >
                  {uploading ? "Processing..." : "Upload Statement"}
                  {uploading && "⏳"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankStatementManager;