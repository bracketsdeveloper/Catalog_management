// src/pages/ManageProductionJobsheet.js
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to format the schedule pickup date/time in 12hr format with AM/PM
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

// Helper to count status values across all items in a production jobsheet
const getStatusCounts = (items) => {
  let pending = 0,
    received = 0,
    alert = 0;
  if (items && Array.isArray(items)) {
    items.forEach((item) => {
      if (item.status === "Pending") pending++;
      else if (item.status === "Received") received++;
      else if (item.status === "Alert") alert++;
    });
  }
  return { total: items ? items.length : 0, pending, received, alert };
};

export default function ManageProductionJobsheet() {
  const [jobsheets, setJobsheets] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortJobSheet, setSortJobSheet] = useState("");
  const [sortClient, setSortClient] = useState("");
  const [sortSchedulePickup, setSortSchedulePickup] = useState("");
  const [viewMode, setViewMode] = useState("open"); // "open" or "closed"
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

  // Apply common search filter (searching jobSheetNumber, clientCompanyName, eventName)
  const filteredJobsheets = jobsheets.filter((j) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (j.jobSheetNumber && j.jobSheetNumber.toLowerCase().includes(query)) ||
      (j.clientCompanyName && j.clientCompanyName.toLowerCase().includes(query)) ||
      (j.eventName && j.eventName.toLowerCase().includes(query))
    );
  });

  // Apply sorting on filtered jobsheets
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

  // Divide jobsheets into Open and Closed based on item status counts.
  const openJobsheets = sortedJobsheets.filter((j) => {
    const counts = getStatusCounts(j.items);
    return counts.total !== counts.received;
  });
  const closedJobsheets = sortedJobsheets.filter((j) => {
    const counts = getStatusCounts(j.items);
    return counts.total > 0 && counts.total === counts.received;
  });

  // Choose which list to display based on viewMode
  const displayedJobsheets = viewMode === "open" ? openJobsheets : closedJobsheets;

  return (
    <div className="min-h-screen p-6 bg-white text-gray-800 relative">
      {/* Top Right Create Button */}
      <button
        onClick={() => navigate("/admin-dashboard/create-productionjobsheet")}
        className="absolute top-6 right-6 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        + Create Job Sheet
      </button>

      <h1 className="text-2xl font-bold text-purple-700 mb-4">Production Jobsheet List</h1>

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

      {/* Switch Buttons for View Mode */}
      <div className="mb-4">
        <button
          onClick={() => setViewMode("open")}
          className={`px-4 py-2 mr-2 rounded ${viewMode === "open" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          Open
        </button>
        <button
          onClick={() => setViewMode("closed")}
          className={`px-4 py-2 rounded ${viewMode === "closed" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          Closed
        </button>
      </div>

      {/* Table Section */}
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
              <th className="px-4 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayedJobsheets.map((jobsheet) => {
              const counts = getStatusCounts(jobsheet.items);
              const schedulePickup =
                (jobsheet.items &&
                  jobsheet.items[0] &&
                  formatSchedulePickup(jobsheet.items[0].schedulePickup)) ||
                "-";
              return (
                <tr key={jobsheet._id}>
                  <td className="px-4 py-2">{jobsheet.jobSheetNumber}</td>
                  <td className="px-4 py-2">{jobsheet.clientCompanyName}</td>
                  <td className="px-4 py-2">{schedulePickup}</td>
                  <td className="px-4 py-2">
                    {viewMode === "open"
                      ? `Pending (${counts.pending}) | Received (${counts.received}) | Alert (${counts.alert})`
                      : `Total (${counts.total}) | Received (${counts.received})`}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() =>
                        navigate(`/admin-dashboard/create-productionjobsheet/${jobsheet._id}`)
                      }
                      className="text-purple-600 hover:text-purple-900 text-2xl"
                    >
                      &#8230;
                    </button>
                  </td>
                </tr>
              );
            })}
            {displayedJobsheets.length === 0 && (
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
