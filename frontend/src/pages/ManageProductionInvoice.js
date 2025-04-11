// src/pages/ManageProductionInvoice.js
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Helper: Format schedule pickup date/time in 12-hr format with AM/PM.
function formatSchedulePickup(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

// Helper: Count invoice items.
function getItemCount(items) {
  return items ? items.length : 0;
}

export default function ManageProductionInvoice() {
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting state variables
  const [sortJobSheet, setSortJobSheet] = useState("");
  const [sortClient, setSortClient] = useState("");
  const [sortEvent, setSortEvent] = useState("");
  const [sortSchedulePickup, setSortSchedulePickup] = useState("");

  const navigate = useNavigate();

  // Fetch all production invoices on mount.
  useEffect(() => {
    async function fetchInvoices() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/productioninvoices`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInvoices(res.data);
      } catch (error) {
        console.error("Error fetching production invoices:", error);
      }
    }
    fetchInvoices();
  }, []);

  // Filter invoices based on common search query.
  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
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

  if (sortClient === "asc") {
    sortedInvoices.sort((a, b) => a.clientName.localeCompare(b.clientName));
  } else if (sortClient === "desc") {
    sortedInvoices.sort((a, b) => b.clientName.localeCompare(a.clientName));
  }

  if (sortEvent === "asc") {
    sortedInvoices.sort((a, b) => a.eventName.localeCompare(b.eventName));
  } else if (sortEvent === "desc") {
    sortedInvoices.sort((a, b) => b.eventName.localeCompare(a.eventName));
  }

  if (sortSchedulePickup === "asc") {
    sortedInvoices.sort((a, b) => {
      const dateA =
        a.items && a.items[0] && a.items[0].schedulePickup
          ? new Date(a.items[0].schedulePickup)
          : new Date(0);
      const dateB =
        b.items && b.items[0] && b.items[0].schedulePickup
          ? new Date(b.items[0].schedulePickup)
          : new Date(0);
      return dateA - dateB;
    });
  } else if (sortSchedulePickup === "desc") {
    sortedInvoices.sort((a, b) => {
      const dateA =
        a.items && a.items[0] && a.items[0].schedulePickup
          ? new Date(a.items[0].schedulePickup)
          : new Date(0);
      const dateB =
        b.items && b.items[0] && b.items[0].schedulePickup
          ? new Date(b.items[0].schedulePickup)
          : new Date(0);
      return dateB - dateA;
    });
  }

  return (
    <div className="min-h-screen p-6 bg-white text-gray-800 relative">
      {/* Top right create button */}
      <button
        onClick={() => navigate("/admin-dashboard/production-invoice")}
        className="absolute top-6 right-6 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        + Create Production Invoice
      </button>

      <h1 className="text-2xl font-bold text-purple-700 mb-4">Production Invoice List</h1>

      {/* Common Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by Job Sheet, Client, or Event..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-40 border border-purple-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Table with filters */}
      <div className="bg-white shadow rounded overflow-x-auto">
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
                Client Name
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
              <th className="px-4 py-2 text-left">
                Event Name
                <select
                  value={sortEvent}
                  onChange={(e) => setSortEvent(e.target.value)}
                  className="ml-2 text-sm border border-gray-300 rounded p-1"
                >
                  <option value="">--</option>
                  <option value="asc">A–Z</option>
                  <option value="desc">Z–A</option>
                </select>
              </th>
              <th className="px-4 py-2 text-left">Number of Items</th>
              {/* <th className="px-4 py-2 text-left">
                Schedule Pickup
                <select
                  value={sortSchedulePickup}
                  onChange={(e) => setSortSchedulePickup(e.target.value)}
                  className="ml-2 text-sm border border-gray-300 rounded p-1"
                >
                  <option value="">--</option>
                  <option value="asc">Least Closest</option>
                  <option value="desc">Closest</option>
                </select>
              </th>
              <th className="px-4 py-2 text-left">Action</th> */}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedInvoices.map((invoice) => (
              <tr key={invoice._id}>
                <td className="px-4 py-2">{invoice.jobSheet}</td>
                <td className="px-4 py-2">{invoice.clientName}</td>
                <td className="px-4 py-2">{invoice.eventName}</td>
                <td className="px-4 py-2">{getItemCount(invoice.items)}</td>
                
                <td className="px-4 py-2">
                  <button
                    onClick={() =>
                      navigate(`/admin-dashboard/production-invoice/${invoice._id}`)
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
                <td className="px-4 py-2 text-center" colSpan="6">
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
