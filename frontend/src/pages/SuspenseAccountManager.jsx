// components/SuspenseAccountManager.jsx - Updated
"use client";

import { useState, useEffect } from "react";
import axios from "axios";

const SuspenseAccountManager = () => {
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

    const [view, setView] = useState("suspenseEntries"); // "suspenseEntries" or "bankStatements"
    const [entries, setEntries] = useState([]);
    const [bankStatements, setBankStatements] = useState([]);
    const [selectedBankStatement, setSelectedBankStatement] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [totals, setTotals] = useState({
        totalBalance: 0,
        totalEntries: 0,
        totalCleared: 0
    });

    // Filters for suspense entries
    const [filters, setFilters] = useState({
        client: "",
        startDate: "",
        endDate: "",
        minAmount: "",
        maxAmount: "",
        search: "",
        showCleared: false
    });

    // Filters for bank statements
    const [bankFilters, setBankFilters] = useState({
        search: "",
        bankName: "",
        hasSuspense: "all"
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalEntries, setTotalEntries] = useState(0);

    // View state
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showAddFromTransaction, setShowAddFromTransaction] = useState(false);

    // New entry from transaction
    const [newEntry, setNewEntry] = useState({
        balanceAmount: "",
        client: "",
        description: "",
        notes: ""
    });

    useEffect(() => {
        if (view === "suspenseEntries") {
            fetchSuspenseEntries();
        } else {
            fetchBankStatements();
        }
    }, [view, currentPage, filters, bankFilters]);

    const fetchSuspenseEntries = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams({
                page: currentPage,
                limit: 50,
                ...(filters.client && { client: filters.client }),
                ...(filters.startDate && { startDate: filters.startDate }),
                ...(filters.endDate && { endDate: filters.endDate }),
                ...(filters.minAmount && { minAmount: filters.minAmount }),
                ...(filters.maxAmount && { maxAmount: filters.maxAmount }),
                ...(filters.search && { search: filters.search }),
                ...(filters.showCleared && { showCleared: true })
            }).toString();

            const response = await axios.get(
                `${BACKEND_URL}/api/suspense-accounts?${params}`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                }
            );

            setEntries(response.data.entries);
            setTotals(response.data.totals);
            setTotalPages(response.data.pagination.totalPages);
            setTotalEntries(response.data.pagination.total);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching suspense entries:", error);
            setLoading(false);
        }
    };

    const fetchBankStatements = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams({
                page: currentPage,
                limit: 20,
                ...(bankFilters.search && { search: bankFilters.search }),
                ...(bankFilters.bankName && { bankName: bankFilters.bankName }),
                ...(bankFilters.hasSuspense !== "all" && { hasSuspense: bankFilters.hasSuspense })
            }).toString();

            const response = await axios.get(
                `${BACKEND_URL}/api/suspense-accounts/bank-statements?${params}`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                }
            );

            setBankStatements(response.data.bankStatements);
            setTotalPages(response.data.pagination.totalPages);
            setTotalEntries(response.data.pagination.total);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching bank statements:", error);
            setLoading(false);
        }
    };

    const fetchBankStatementTransactions = async (bankStatementId) => {
        try {
            setLoadingTransactions(true);
            setSelectedBankStatement(bankStatementId);

            const response = await axios.get(
                `${BACKEND_URL}/api/suspense-accounts/bank-statements/${bankStatementId}/transactions`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                }
            );

            setTransactions(response.data.transactions);
            setLoadingTransactions(false);
        } catch (error) {
            console.error("Error fetching transactions:", error);
            setLoadingTransactions(false);
        }
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

    const getStatusColor = (balance, status) => {
        if (balance === 0 || status === "CLEARED") {
            return "bg-green-100 text-green-800 border-green-200";
        } else if (balance > 0) {
            return "bg-yellow-100 text-yellow-800 border-yellow-200";
        }
        return "bg-gray-100 text-gray-800 border-gray-200";
    };

    const handleAddFromTransaction = async (transaction) => {
        try {
            const response = await axios.post(
                `${BACKEND_URL}/api/suspense-accounts/from-transaction`,
                {
                    bankStatementId: selectedBankStatement,
                    transactionId: transaction.transactionId,
                    balanceAmount: newEntry.balanceAmount || transaction.amount,
                    client: newEntry.client || transaction.clientName,
                    description: newEntry.description || transaction.narration,
                    notes: newEntry.notes
                },
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                }
            );

            // Refresh transactions list
            fetchBankStatementTransactions(selectedBankStatement);
            setShowAddFromTransaction(false);
            setNewEntry({
                balanceAmount: "",
                client: "",
                description: "",
                notes: ""
            });

            alert("Suspense entry created successfully!");

            // Switch to suspense entries view
            setView("suspenseEntries");
            fetchSuspenseEntries();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to create suspense entry");
        }
    };

    const handleUpdateBalance = async (entryId, newBalance, notes = "") => {
        try {
            const response = await axios.put(
                `${BACKEND_URL}/api/suspense-accounts/${entryId}/balance`,
                {
                    balanceAmount: newBalance,
                    notes
                },
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                }
            );

            // Update the entry in the list
            setEntries(prev =>
                prev.map(entry =>
                    entry.id === entryId
                        ? {
                            ...entry,
                            balanceAmount: newBalance,
                            status: newBalance === 0 ? "CLEARED" : entry.status,
                            updatedAt: new Date().toISOString()
                        }
                        : entry
                )
            );

            // Refresh totals
            fetchSuspenseEntries();

            alert("Balance updated successfully!");
        } catch (error) {
            alert(error.response?.data?.message || "Failed to update balance");
        }
    };

    const handleClearEntry = async (entryId) => {
        if (!window.confirm("Are you sure you want to clear this entry? This will set balance to zero.")) {
            return;
        }

        try {
            await axios.post(
                `${BACKEND_URL}/api/suspense-accounts/${entryId}/clear`,
                {},
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                }
            );

            // Update the entry in the list
            setEntries(prev =>
                prev.map(entry =>
                    entry.id === entryId
                        ? { ...entry, balanceAmount: 0, status: "CLEARED", isCleared: true }
                        : entry
                )
            );

            // Refresh totals
            fetchSuspenseEntries();

            alert("Entry cleared successfully!");
        } catch (error) {
            alert(error.response?.data?.message || "Failed to clear entry");
        }
    };

    const viewEntryDetails = async (entryId) => {
        try {
            const response = await axios.get(
                `${BACKEND_URL}/api/suspense-accounts/${entryId}`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                }
            );

            setSelectedEntry(response.data.entry);
            setShowDetails(true);
        } catch (error) {
            console.error("Error fetching entry details:", error);
        }
    };

    if (loading && view === "suspenseEntries") {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-900">Loading suspense account entries...</div>
            </div>
        );
    }

    if (loading && view === "bankStatements") {
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
                <div>
                    <h1 className="text-2xl font-bold text-[#Ff8045]">Suspense Account</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Note - All entries to be shown that have + Balance Amount
                    </p>
                    <p className="text-sm text-gray-500 italic">
                        Data fetched from Bank Statements • Rows turn green when balance reaches zero
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => {
                                setView("suspenseEntries");
                                setCurrentPage(1);
                            }}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${view === "suspenseEntries"
                                    ? "bg-white text-gray-900 shadow"
                                    : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Suspense Entries
                        </button>
                        <button
                            onClick={() => {
                                setView("bankStatements");
                                setCurrentPage(1);
                            }}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${view === "bankStatements"
                                    ? "bg-white text-gray-900 shadow"
                                    : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Bank Statements
                        </button>
                    </div>

                    {/* Total Balance Summary */}
                    {view === "suspenseEntries" && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <div className="text-xs text-blue-600 font-medium">Total Suspense Balance</div>
                            <div className="text-xl font-bold text-blue-700">
                                {formatCurrency(totals.totalBalance)}
                            </div>
                            <div className="text-xs text-blue-500">
                                {totals.totalEntries} entries ({totals.totalCleared} cleared)
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Suspense Entries View */}
            {view === "suspenseEntries" && (
                <>
                    {/* Filters Section */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium mb-1">Client</label>
                            <input
                                type="text"
                                value={filters.client}
                                onChange={(e) => setFilters(prev => ({ ...prev, client: e.target.value }))}
                                placeholder="Filter by client"
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">From Date</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">To Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                            />
                        </div>
                        <div className="flex flex-col justify-end gap-2">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={filters.showCleared}
                                    onChange={(e) => setFilters(prev => ({ ...prev, showCleared: e.target.checked }))}
                                    className="rounded"
                                />
                                <span className="text-sm">Show Cleared Entries</span>
                            </label>
                            <button
                                onClick={() => {
                                    setFilters({
                                        client: "",
                                        startDate: "",
                                        endDate: "",
                                        minAmount: "",
                                        maxAmount: "",
                                        search: "",
                                        showCleared: false
                                    });
                                    setCurrentPage(1);
                                }}
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm"
                            >
                                Clear Filters
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Min Amount</label>
                            <input
                                type="number"
                                value={filters.minAmount}
                                onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                                placeholder="Min amount"
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Max Amount</label>
                            <input
                                type="number"
                                value={filters.maxAmount}
                                onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                                placeholder="Max amount"
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Search</label>
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                placeholder="Search by client, ref #, description..."
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                            />
                        </div>
                    </div>

                    {/* Entries Table */}
                    <div className="overflow-x-auto mb-6">
                        <table className="min-w-full bg-white border border-purple-200 rounded-lg">
                            <thead>
                                <tr className="bg-purple-100 text-purple-900">
                                    <th className="px-6 py-3 text-left text-sm font-medium uppercase">SL No</th>
                                    <th className="px-6 py-3 text-left text-sm font-medium uppercase">Balance Amount</th>
                                    <th className="px-6 py-3 text-left text-sm font-medium uppercase">Client</th>
                                    <th className="px-6 py-3 text-left text-sm font-medium uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-sm font-medium uppercase">Reference #</th>
                                    <th className="px6 py-3 text-left text-sm font-medium uppercase">Description</th>
                                    <th className="px6 py-3 text-left text-sm font-medium uppercase">Bank Statement</th>
                                    <th className="px6 py-3 text-left text-sm font-medium uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry, index) => (
                                    <tr
                                        key={entry.id}
                                        className={`
                      border-b transition-all duration-200
                      ${entry.balanceAmount === 0
                                                ? "bg-green-50 hover:bg-green-100 border-green-200"
                                                : "hover:bg-gray-50 border-purple-200"
                                            }
                    `}
                                    >
                                        <td className="px-6 py-4 text-sm">
                                            {(currentPage - 1) * 50 + index + 1}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className={`font-bold ${entry.balanceAmount === 0 ? "text-green-700" : "text-gray-900"}`}>
                                                {formatCurrency(entry.balanceAmount)}
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                <input
                                                    type="number"
                                                    defaultValue={entry.balanceAmount}
                                                    className="w-24 text-sm border rounded px-2 py-1"
                                                    placeholder="New balance"
                                                />
                                                <button
                                                    onClick={(e) => {
                                                        const input = e.target.previousElementSibling;
                                                        const newBalance = parseFloat(input.value);
                                                        if (!isNaN(newBalance) && newBalance >= 0) {
                                                            handleUpdateBalance(entry.id, newBalance, "Balance updated manually");
                                                        }
                                                    }}
                                                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                                >
                                                    Update
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium">
                                            {entry.client}
                                            <div className="text-xs text-gray-500">
                                                {entry.daysPending} days pending
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {formatDate(entry.date)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono">
                                            {entry.referenceNumber}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="max-w-xs truncate" title={entry.description}>
                                                {entry.description || "No description"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {entry.bankStatement ? (
                                                <div className="max-w-xs">
                                                    <div className="font-medium">{entry.bankStatement.bankName}</div>
                                                    <div className="text-xs text-gray-500 truncate">
                                                        {entry.bankStatement.fileName}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setView("bankStatements");
                                                            fetchBankStatementTransactions(entry.bankStatement.id);
                                                        }}
                                                        className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                                                    >
                                                        View Statement →
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex flex-wrap gap-1">
                                                <button
                                                    onClick={() => viewEntryDetails(entry.id)}
                                                    className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 bg-blue-50 rounded hover:bg-blue-100"
                                                    title="View Details"
                                                >
                                                    👁️
                                                </button>
                                                {entry.balanceAmount > 0 && (
                                                    <button
                                                        onClick={() => handleClearEntry(entry.id)}
                                                        className="text-green-600 hover:text-green-800 text-sm px-2 py-1 bg-green-50 rounded hover:bg-green-100"
                                                        title="Clear Entry"
                                                    >
                                                        ✓ Clear
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {entries.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No suspense account entries found.
                                {!filters.showCleared ? " All entries are cleared." : " Go to Bank Statements tab to add entries from transactions."}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Bank Statements View */}
            {view === "bankStatements" && (
                <>
                    {/* Bank Statements Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium mb-1">Search</label>
                            <input
                                type="text"
                                value={bankFilters.search}
                                onChange={(e) => setBankFilters(prev => ({ ...prev, search: e.target.value }))}
                                placeholder="Search by file name, bank, account..."
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Bank Name</label>
                            <input
                                type="text"
                                value={bankFilters.bankName}
                                onChange={(e) => setBankFilters(prev => ({ ...prev, bankName: e.target.value }))}
                                placeholder="Filter by bank"
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Has Suspense</label>
                            <select
                                value={bankFilters.hasSuspense}
                                onChange={(e) => setBankFilters(prev => ({ ...prev, hasSuspense: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                            >
                                <option value="all">All Statements</option>
                                <option value="with">With Suspense Entries</option>
                                <option value="without">Without Suspense Entries</option>
                            </select>
                        </div>
                    </div>

                    {/* Bank Statements List */}
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Bank Statements</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {bankStatements.map((statement) => (
                                <div
                                    key={statement.id}
                                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => fetchBankStatementTransactions(statement.id)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-medium text-gray-900">{statement.bankName}</h4>
                                            <p className="text-sm text-gray-600">{statement.accountNumber}</p>
                                        </div>
                                        {statement.suspenseInfo.hasSuspense && (
                                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                                {statement.suspenseInfo.activeEntries} active suspense
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-700 truncate mb-2">{statement.fileName}</p>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>{formatDate(statement.statementFromDate)} - {formatDate(statement.statementToDate)}</span>
                                        <span>{formatDate(statement.uploadDate)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {bankStatements.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No bank statements found. Upload bank statements first.
                            </div>
                        )}
                    </div>

                    {/* Transactions for Selected Bank Statement */}
                    {selectedBankStatement && (
                        <div className="mt-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Transactions</h3>
                                <button
                                    onClick={() => setSelectedBankStatement(null)}
                                    className="text-gray-500 hover:text-gray-700 text-sm"
                                >
                                    Close
                                </button>
                            </div>

                            {loadingTransactions ? (
                                <div className="text-center py-8">Loading transactions...</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full bg-white border rounded-lg">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="px-4 py-2 text-left text-sm font-medium">Date</th>
                                                <th className="px-4 py-2 text-left text-sm font-medium">Narration</th>
                                                <th className="px-4 py-2 text-left text-sm font-medium">Client</th>
                                                <th className="px-4 py-2 text-left text-sm font-medium">Amount</th>
                                                <th className="px-4 py-2 text-left text-sm font-medium">Type</th>
                                                <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                                                <th className="px-4 py-2 text-left text-sm font-medium">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map((txn, index) => (
                                                <tr key={index} className="border-b hover:bg-gray-50">
                                                    <td className="px-4 py-2 text-sm">{formatDate(txn.date)}</td>
                                                    <td className="px-4 py-2 text-sm max-w-xs truncate" title={txn.narration}>
                                                        {txn.narration}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm">{txn.clientName}</td>
                                                    <td className="px-4 py-2 text-sm font-medium">
                                                        {formatCurrency(txn.amount)}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm">
                                                        <span className={`px-2 py-1 rounded text-xs ${txn.transactionType === "CREDIT"
                                                                ? "bg-green-100 text-green-800"
                                                                : "bg-red-100 text-red-800"
                                                            }`}>
                                                            {txn.transactionType}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-sm">
                                                        {txn.hasSuspenseEntry ? (
                                                            <span className="text-green-600 font-medium">In Suspense</span>
                                                        ) : (
                                                            <span className="text-gray-500">Not in Suspense</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm">
                                                        {!txn.hasSuspenseEntry ? (
                                                            <button
                                                                onClick={() => {
                                                                    setNewEntry({
                                                                        balanceAmount: txn.amount,
                                                                        client: txn.clientName,
                                                                        description: txn.narration,
                                                                        notes: ""
                                                                    });
                                                                    setShowAddFromTransaction(true);
                                                                }}
                                                                className="text-blue-600 hover:text-blue-800 text-sm"
                                                            >
                                                                Add to Suspense
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400">Already added</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {transactions.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            No transactions found or all transactions already in suspense.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-600">
                        Showing {(currentPage - 1) * (view === "suspenseEntries" ? 50 : 20) + 1} to {Math.min(
                            currentPage * (view === "suspenseEntries" ? 50 : 20),
                            totalEntries
                        )} of {totalEntries} {view === "suspenseEntries" ? "entries" : "statements"}
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
                                    className={`px-4 py-2 border rounded-lg text-sm ${currentPage === pageNum
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

            {/* Add from Transaction Modal */}
            {showAddFromTransaction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Add to Suspense Account</h3>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">Balance Amount *</label>
                                <input
                                    type="number"
                                    value={newEntry.balanceAmount}
                                    onChange={(e) => setNewEntry(prev => ({ ...prev, balanceAmount: e.target.value }))}
                                    className="w-full border rounded-lg p-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Client Name</label>
                                <input
                                    type="text"
                                    value={newEntry.client}
                                    onChange={(e) => setNewEntry(prev => ({ ...prev, client: e.target.value }))}
                                    className="w-full border rounded-lg p-2"
                                    placeholder="Client name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={newEntry.description}
                                    onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full border rounded-lg p-2"
                                    rows="3"
                                    placeholder="Description"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Notes</label>
                                <textarea
                                    value={newEntry.notes}
                                    onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full border rounded-lg p-2"
                                    rows="2"
                                    placeholder="Additional notes"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddFromTransaction(false)}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAddFromTransaction(transactions.find(t => !t.hasSuspenseEntry))}
                                className="bg-pink-600 text-white px-4 py-2 rounded hover:bg-pink-700"
                            >
                                Add to Suspense
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Entry Details Modal (same as before) */}
            {showDetails && selectedEntry && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-bold text-gray-900">Entry Details</h3>
                            <button
                                onClick={() => {
                                    setShowDetails(false);
                                    setSelectedEntry(null);
                                }}
                                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Reference Number</h4>
                                        <p className="text-gray-900 font-mono text-lg">{selectedEntry.referenceNumber}</p>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Client</h4>
                                        <p className="text-gray-900 text-lg font-medium">{selectedEntry.client}</p>
                                        {selectedEntry.manualClient && selectedEntry.manualClient !== selectedEntry.client && (
                                            <p className="text-sm text-gray-500 mt-1">Original: {selectedEntry.manualClient}</p>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Current Balance</h4>
                                        <p className={`text-2xl font-bold ${selectedEntry.balanceAmount === 0 ? "text-green-700" : "text-gray-900"}`}>
                                            {formatCurrency(selectedEntry.balanceAmount)}
                                        </p>
                                        {selectedEntry.metadata?.sourceTransaction?.amount && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                Original Amount: {formatCurrency(selectedEntry.metadata.sourceTransaction.amount)}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Date</h4>
                                        <p className="text-gray-900">{formatDate(selectedEntry.date)}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Created: {formatDate(selectedEntry.createdAt)}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedEntry.balanceAmount, selectedEntry.status)}`}>
                                                {selectedEntry.balanceAmount === 0 ? "CLEARED" : selectedEntry.status}
                                            </span>
                                            {selectedEntry.clearedAt && (
                                                <span className="text-sm text-gray-500">
                                                    Cleared on {formatDate(selectedEntry.clearedAt)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Days Pending</h4>
                                        <p className="text-gray-900 text-lg">{selectedEntry.daysPending || 0} days</p>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Last Updated</h4>
                                        <p className="text-gray-900">{formatDate(selectedEntry.updatedAt)}</p>
                                        {selectedEntry.updatedBy && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                By: {selectedEntry.updatedBy.name || selectedEntry.updatedBy.email}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Created By</h4>
                                        <p className="text-gray-900">
                                            {selectedEntry.createdBy?.name || selectedEntry.createdBy?.email || "System"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Description Section */}
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-900 whitespace-pre-wrap">
                                        {selectedEntry.description || "No description provided"}
                                    </p>
                                    {selectedEntry.manualDescription && selectedEntry.manualDescription !== selectedEntry.description && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                            <p className="text-xs text-gray-500 mb-1">Original Description:</p>
                                            <p className="text-sm text-gray-700">{selectedEntry.manualDescription}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bank Statement Information */}
                            {selectedEntry.bankStatementId && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-medium text-gray-500 mb-3">Source Bank Statement</h4>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-blue-600 font-medium mb-1">Bank Name</p>
                                                <p className="text-gray-900">{selectedEntry.bankStatementId.bankName}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-blue-600 font-medium mb-1">Account Number</p>
                                                <p className="text-gray-900 font-mono">{selectedEntry.bankStatementId.accountNumber}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-blue-600 font-medium mb-1">File Name</p>
                                                <p className="text-gray-900 truncate">{selectedEntry.bankStatementId.originalFileName}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-blue-600 font-medium mb-1">Statement Period</p>
                                                <p className="text-gray-900">
                                                    {formatDate(selectedEntry.bankStatementId.statementFromDate)} - {formatDate(selectedEntry.bankStatementId.statementToDate)}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                // Navigate to bank statement view
                                                window.location.href = `/bank-statements/${selectedEntry.bankStatementId._id}`;
                                            }}
                                            className="mt-3 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                                        >
                                            <span>View Full Bank Statement</span>
                                            <span>→</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Source Transaction Details */}
                            {selectedEntry.metadata?.sourceTransaction && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-medium text-gray-500 mb-3">Source Transaction Details</h4>
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium mb-1">Transaction Date</p>
                                                <p className="text-gray-900">{formatDate(selectedEntry.metadata.sourceTransaction.date)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium mb-1">Transaction Type</p>
                                                <p className="text-gray-900">{selectedEntry.metadata.sourceTransaction.type || "N/A"}</p>
                                            </div>
                                            <div className="md:col-span-2">
                                                <p className="text-xs text-gray-600 font-medium mb-1">Narration</p>
                                                <p className="text-gray-900">{selectedEntry.metadata.sourceTransaction.narration || "N/A"}</p>
                                            </div>
                                            {selectedEntry.metadata.sourceTransaction.withdrawalAmount > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-600 font-medium mb-1">Withdrawal Amount</p>
                                                    <p className="text-gray-900">{formatCurrency(selectedEntry.metadata.sourceTransaction.withdrawalAmount)}</p>
                                                </div>
                                            )}
                                            {selectedEntry.metadata.sourceTransaction.depositAmount > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-600 font-medium mb-1">Deposit Amount</p>
                                                    <p className="text-gray-900">{formatCurrency(selectedEntry.metadata.sourceTransaction.depositAmount)}</p>
                                                </div>
                                            )}
                                            {selectedEntry.metadata.sourceTransaction.balanceAfterTransaction && (
                                                <div>
                                                    <p className="text-xs text-gray-600 font-medium mb-1">Balance After Transaction</p>
                                                    <p className="text-gray-900">{formatCurrency(selectedEntry.metadata.sourceTransaction.balanceAfterTransaction)}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notes Section */}
                            {selectedEntry.notes && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <p className="text-gray-900 whitespace-pre-wrap">{selectedEntry.notes}</p>
                                    </div>
                                </div>
                            )}

                            {/* Comments Section */}
                            {selectedEntry.comments && selectedEntry.comments.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-sm font-medium text-gray-500">Comments ({selectedEntry.comments.length})</h4>
                                        <button
                                            onClick={() => {
                                                // Add comment functionality
                                                const comment = prompt("Add a comment:");
                                                if (comment && comment.trim()) {
                                                    // Implement add comment API call
                                                    console.log("Adding comment:", comment);
                                                    // Refresh entry details
                                                    viewEntryDetails(selectedEntry._id);
                                                }
                                            }}
                                            className="text-blue-600 hover:text-blue-800 text-sm"
                                        >
                                            + Add Comment
                                        </button>
                                    </div>
                                    <div className="space-y-3 max-h-60 overflow-y-auto">
                                        {selectedEntry.comments.map((comment, index) => (
                                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {comment.commentedBy?.name || comment.commentedBy?.email || "Unknown User"}
                                                        </span>
                                                        <span className="text-xs text-gray-500 ml-2">
                                                            {formatDate(comment.commentedAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-gray-700 text-sm">{comment.comment}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Balance Update Form */}
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-500 mb-3">Update Balance</h4>
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">New Balance</label>
                                        <input
                                            type="number"
                                            id="updateBalance"
                                            defaultValue={selectedEntry.balanceAmount}
                                            step="0.01"
                                            min="0"
                                            className="w-full border border-gray-300 rounded-lg p-2"
                                            placeholder="Enter new balance"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Notes (Optional)</label>
                                        <input
                                            type="text"
                                            id="updateNotes"
                                            className="w-full border border-gray-300 rounded-lg p-2"
                                            placeholder="Reason for update"
                                        />
                                    </div>
                                    <div>
                                        <button
                                            onClick={() => {
                                                const newBalance = parseFloat(document.getElementById('updateBalance').value);
                                                const notes = document.getElementById('updateNotes').value;

                                                if (!isNaN(newBalance) && newBalance >= 0) {
                                                    handleUpdateBalance(selectedEntry._id, newBalance, notes);
                                                    setShowDetails(false);
                                                } else {
                                                    alert("Please enter a valid balance amount");
                                                }
                                            }}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                        >
                                            Update Balance
                                        </button>
                                    </div>
                                </div>
                                {selectedEntry.balanceAmount > 0 && (
                                    <div className="mt-3">
                                        <button
                                            onClick={() => {
                                                if (window.confirm("Are you sure you want to clear this entry? This will set balance to zero.")) {
                                                    handleClearEntry(selectedEntry._id);
                                                    setShowDetails(false);
                                                }
                                            }}
                                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                                        >
                                            Clear Entry (Set to Zero)
                                        </button>
                                        <p className="text-xs text-gray-500 mt-1">
                                            This will mark the entry as cleared and set balance to 0
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        // Export entry as JSON
                                        const dataStr = JSON.stringify(selectedEntry, null, 2);
                                        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
                                        const link = document.createElement('a');
                                        link.href = dataUri;
                                        link.download = `suspense-entry-${selectedEntry.referenceNumber}.json`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                                >
                                    Export as JSON
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDetails(false);
                                        setSelectedEntry(null);
                                    }}
                                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 text-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuspenseAccountManager;