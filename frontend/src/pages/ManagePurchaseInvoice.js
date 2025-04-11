// src/pages/ManagePurchaseInvoice.js
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ManagePurchaseInvoice() {
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting state variables for columns.
  const [sortJobSheet, setSortJobSheet] = useState("");
  const [sortEventName, setSortEventName] = useState("");
  const [sortClient, setSortClient] = useState("");

  const navigate = useNavigate();

  // Fetch all purchase invoices when component mounts.
  useEffect(() => {
    async function fetchInvoices() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/purchaseinvoices`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInvoices(res.data);
      } catch (error) {
        console.error("Error fetching purchase invoices:", error);
      }
    }
    fetchInvoices();
  }, []);

  // Filter invoices by search query. We search in:
  // referenceJobSheetNo, jobSheet, clientName, eventName.
  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (invoice.referenceJobSheetNo && invoice.referenceJobSheetNo.toLowerCase().includes(query)) ||
      (invoice.jobSheet && invoice.jobSheet.toLowerCase().includes(query)) ||
      (invoice.clientName && invoice.clientName.toLowerCase().includes(query)) ||
      (invoice.eventName && invoice.eventName.toLowerCase().includes(query))
    );
  });

  // Apply sorting.
  let sortedInvoices = [...filteredInvoices];

  if (sortJobSheet === "asc") {
    sortedInvoices.sort((a, b) => a.jobSheet.localeCompare(b.jobSheet));
  } else if (sortJobSheet === "desc") {
    sortedInvoices.sort((a, b) => b.jobSheet.localeCompare(a.jobSheet));
  }

  if (sortEventName === "asc") {
    sortedInvoices.sort((a, b) => a.eventName.localeCompare(b.eventName));
  } else if (sortEventName === "desc") {
    sortedInvoices.sort((a, b) => b.eventName.localeCompare(a.eventName));
  }

  if (sortClient === "asc") {
    sortedInvoices.sort((a, b) => a.clientName.localeCompare(b.clientName));
  } else if (sortClient === "desc") {
    sortedInvoices.sort((a, b) => b.clientName.localeCompare(a.clientName));
  }

  return (
    <div className="min-h-screen p-6 bg-white text-gray-800 relative">
      {/* Top right Create PI button */}
      <button
        onClick={() => navigate("/admin-dashboard/create-purchaseinvoice")}
        className="absolute top-6 right-6 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        + Create PI
      </button>

      <h1 className="text-2xl font-bold text-purple-700 mb-4">
        Manage Purchase Invoice
      </h1>

      {/* Common Search Filter */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by any fields"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-40 border border-purple-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="bg-white shadow rounded">
        <table className="min-w-full">
          <thead className="bg-purple-100">
            <tr>
              <th className="px-4 py-2 text-left">
                Job Sheet #
                <select
                  value={sortJobSheet}
                  onChange={(e) => setSortJobSheet(e.target.value)}
                  className="ml-2 text-sm border border-gray-300 rounded p-1"
                >
                  <option value="">--</option>
                  <option value="asc">↑ Ascending</option>
                  <option value="desc">↓ Descending</option>
                </select>
              </th>
              <th className="px-4 py-2 text-left">
                Event Name
                <select
                  value={sortEventName}
                  onChange={(e) => setSortEventName(e.target.value)}
                  className="ml-2 text-sm border border-gray-300 rounded p-1"
                >
                  <option value="">--</option>
                  <option value="asc">A–Z</option>
                  <option value="desc">Z–A</option>
                </select>
              </th>
              <th className="px-4 py-2 text-left">
                Client Company
                <select
                  value={sortClient}
                  onChange={(e) => setSortClient(e.target.value)}
                  className="ml-2 text-sm border border-gray-300 rounded p-1"
                >
                  <option value="">--</option>
                  <option value="asc">A–Z</option>
                  <option value="desc">Z–A</option>
                </select>
              </th>
              <th className="px-4 py-2 text-left">Number of Items</th>
              <th className="px-4 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedInvoices.map((invoice) => (
              <tr key={invoice._id}>
                <td className="px-4 py-2">{invoice.jobSheet}</td>
                <td className="px-4 py-2">{invoice.eventName}</td>
                <td className="px-4 py-2">{invoice.clientName}</td>
                <td className="px-4 py-2">{invoice.items ? invoice.items.length : 0}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() =>
                      navigate(`/admin-dashboard/create-purchaseinvoice/${invoice._id}`)
                    }
                    className="text-purple-600 hover:text-purple-900 text-2xl"
                  >
                    &#8230;
                  </button>
                </td>
              </tr>
            ))}
            {sortedInvoices.length === 0 && (
              <tr>
                <td className="px-4 py-2 text-center" colSpan="5">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
