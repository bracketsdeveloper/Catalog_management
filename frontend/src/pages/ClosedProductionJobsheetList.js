// src/pages/ClosedProductionJobsheetList.js
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// helpers
const formatSchedulePickup = (dateStr) => {
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
};

const getStatusCounts = (items) => {
  const total = items?.length || 0;
  const received = items?.filter((i) => i.status === "Received").length || 0;
  const pending = items?.filter((i) => i.status === "Pending").length || 0;
  const alert = items?.filter((i) => i.status === "Alert").length || 0;
  return { total, received, pending, alert };
};

// NEW: qty totals (from items or top‑level fallback)
const getQtyTotals = (jobsheet) => {
  if (jobsheet.items && jobsheet.items.length > 0) {
    return jobsheet.items.reduce(
      (acc, item) => {
        acc.qtyRequired += item.qtyRequired || 0;
        acc.qtyOrdered += item.qtyOrdered || 0;
        return acc;
      },
      { qtyRequired: 0, qtyOrdered: 0 }
    );
  }
  return {
    qtyRequired: jobsheet.qtyRequired || 0,
    qtyOrdered: jobsheet.qtyOrdered || 0,
  };
};

export default function ClosedProductionJobsheetList() {
  const [jobsheets, setJobsheets] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [sortJobSheet, setSortJobSheet] = useState("");
  const [sortClient, setSortClient] = useState("");
  const [sortSchedulePickup, setSortSchedulePickup] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/productionjobsheets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setJobsheets(res.data);
      } catch (err) {
        console.error("Error fetching production jobsheets:", err);
      }
    })();
  }, []);

  const closedJobsheets = jobsheets.filter(
    (js) => js.items?.length && js.items.every((it) => it.status === "Received")
  );

  const filteredJobsheets = closedJobsheets.filter((j) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      j.jobSheetNumber?.toLowerCase().includes(q) ||
      j.clientCompanyName?.toLowerCase().includes(q) ||
      j.eventName?.toLowerCase().includes(q)
    );
  });

  let sortedJobsheets = [...filteredJobsheets];

  if (sortJobSheet)
    sortedJobsheets.sort((a, b) =>
      sortJobSheet === "asc"
        ? a.jobSheetNumber.localeCompare(b.jobSheetNumber)
        : b.jobSheetNumber.localeCompare(a.jobSheetNumber)
    );

  if (sortClient)
    sortedJobsheets.sort((a, b) =>
      sortClient === "asc"
        ? a.clientCompanyName.localeCompare(b.clientCompanyName)
        : b.clientCompanyName.localeCompare(a.clientCompanyName)
    );

  if (sortSchedulePickup)
    sortedJobsheets.sort((a, b) => {
      const dA = a.items?.[0]?.schedulePickup ? new Date(a.items[0].schedulePickup) : new Date(0);
      const dB = b.items?.[0]?.schedulePickup ? new Date(b.items[0].schedulePickup) : new Date(0);
      return sortSchedulePickup === "asc" ? dA - dB : dB - dA;
    });

  return (
    <div className="min-h-screen p-6 bg-white text-gray-800">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">Closed Production Jobsheets</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by Job Sheet, Client, or Event..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-40 border border-purple-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

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
              <th className="px-4 py-2 text-left">
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
              <th className="px-4 py-2 text-left">Qty Required</th>
              <th className="px-4 py-2 text-left">Qty Ordered</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedJobsheets.map((js) => {
              const statusCounts = getStatusCounts(js.items);
              const { qtyRequired, qtyOrdered } = getQtyTotals(js);
              return (
                <tr key={js._id}>
                  <td className="px-4 py-2">{js.jobSheetNumber}</td>
                  <td className="px-4 py-2">{js.clientCompanyName}</td>
                  <td className="px-4 py-2">
                    {js.items?.[0] ? formatSchedulePickup(js.items[0].schedulePickup) : "-"}
                  </td>
                  <td className="px-4 py-2">{qtyRequired}</td>
                  <td className="px-4 py-2">{qtyOrdered}</td>
                  <td className="px-4 py-2">
                    Pending ({statusCounts.pending}) | Received ({statusCounts.received}) | Alert (
                    {statusCounts.alert})
                  </td>
                </tr>
              );
            })}
            {sortedJobsheets.length === 0 && (
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
