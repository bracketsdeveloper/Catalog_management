// src/pages/ClosedProductionJobsheetList.js
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to format the schedule pickup date/time in 12-hour format with AM/PM
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

// Helper to get counts for each status in items (for display in Status column)
const getStatusCounts = (items) => {
  const total = items ? items.length : 0;
  const received = items ? items.filter((item) => item.status === "Received").length : 0;
  const pending = items ? items.filter((item) => item.status === "Pending").length : 0;
  const alert = items ? items.filter((item) => item.status === "Alert").length : 0;
  return { total, received, pending, alert };
};

export default function ClosedProductionJobsheetList() {
  const [jobsheets, setJobsheets] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting state variables
  const [sortJobSheet, setSortJobSheet] = useState("");
  const [sortClient, setSortClient] = useState("");
  const [sortSchedulePickup, setSortSchedulePickup] = useState("");

  const navigate = useNavigate();

  // Fetch all production jobsheets on mount
  useEffect(() => {
    async function fetchJobsheets() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/productionjobsheets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setJobsheets(res.data);
      } catch (error) {
        console.error("Error fetching production jobsheets:", error);
      }
    }
    fetchJobsheets();
  }, []);

  // Filter jobsheets: only include those where every item's status is "Received"
  const closedJobsheets = jobsheets.filter(
    (jobsheet) =>
      jobsheet.items &&
      jobsheet.items.length > 0 &&
      jobsheet.items.every((item) => item.status === "Received")
  );

  // Apply common search filter (searches jobSheetNumber, clientCompanyName, eventName)
  const filteredJobsheets = closedJobsheets.filter((j) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (j.jobSheetNumber && j.jobSheetNumber.toLowerCase().includes(query)) ||
      (j.clientCompanyName && j.clientCompanyName.toLowerCase().includes(query)) ||
      (j.eventName && j.eventName.toLowerCase().includes(query))
    );
  });

  // Sorting logic for filtered jobsheets
  let sortedJobsheets = [...filteredJobsheets];

  if (sortJobSheet === "asc") {
    sortedJobsheets.sort((a, b) => a.jobSheetNumber.localeCompare(b.jobSheetNumber));
  } else if (sortJobSheet === "desc") {
    sortedJobsheets.sort((a, b) => b.jobSheetNumber.localeCompare(a.jobSheetNumber));
  }
  if (sortClient === "asc") {
    sortedJobsheets.sort((a, b) => a.clientCompanyName.localeCompare(b.clientCompanyName));
  } else if (sortClient === "desc") {
    sortedJobsheets.sort((a, b) => b.clientCompanyName.localeCompare(a.clientCompanyName));
  }
  if (sortSchedulePickup === "asc") {
    sortedJobsheets.sort((a, b) => {
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
    sortedJobsheets.sort((a, b) => {
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
    <div className="min-h-screen p-6 bg-white text-gray-800">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">Closed Production Jobsheets</h1>

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

      {/* Table Header with Sorting Dropdowns */}
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
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedJobsheets.map((jobsheet) => {
              const statusCounts = getStatusCounts(jobsheet.items);
              return (
                <tr key={jobsheet._id}>
                  <td className="px-4 py-2">{jobsheet.jobSheetNumber}</td>
                  <td className="px-4 py-2">{jobsheet.clientCompanyName}</td>
                  <td className="px-4 py-2">
                    {(jobsheet.items &&
                      jobsheet.items[0] &&
                      formatSchedulePickup(jobsheet.items[0].schedulePickup)) || "-"}
                  </td>
                  <td className="px-4 py-2">
                    Pending ({statusCounts.pending}) | Received ({statusCounts.received}) | Alert ({statusCounts.alert})
                  </td>
                </tr>
              );
            })}
            {sortedJobsheets.length === 0 && (
              <tr>
                <td className="px-4 py-2 text-center" colSpan="4">
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

