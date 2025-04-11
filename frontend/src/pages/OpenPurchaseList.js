// src/pages/OpenPurchaseList.js
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to count status values across all items in a purchase
const getStatusCounts = (items) => {
  let pending = 0,
    received = 0,
    alertCount = 0;
  const total = items ? items.length : 0;
  if (items && items.length) {
    items.forEach((item) => {
      if (item.status === "Pending") pending++;
      else if (item.status === "Received") received++;
      else if (item.status === "Alert") alertCount++;
    });
  }
  return { total, pending, received, alert: alertCount };
};

export default function OpenPurchaseList() {
  const [openPurchases, setOpenPurchases] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sorting state variables
  const [sortOpenPurchase, setSortOpenPurchase] = useState(""); // "asc" | "desc"
  const [sortClientCompany, setSortClientCompany] = useState(""); // "asc" | "desc"
  const [sortExpectedDate, setSortExpectedDate] = useState(""); // "asc" | "desc"

  // View switch: "open" or "closed"
  const [viewType, setViewType] = useState("open");

  const navigate = useNavigate();

  // Fetch open purchases on component mount
  useEffect(() => {
    async function fetchPurchases() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/openPurchases`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOpenPurchases(res.data);
      } catch (error) {
        console.error("Error fetching open purchases:", error);
      }
    }
    fetchPurchases();
  }, []);

  // Filter records based on the search query using key header fields
  const filteredPurchases = openPurchases.filter((purchase) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (purchase.openPurchaseNumber &&
        purchase.openPurchaseNumber.toLowerCase().includes(query)) ||
      (purchase.jobSheetNumber &&
        purchase.jobSheetNumber.toLowerCase().includes(query)) ||
      (purchase.clientCompanyName &&
        purchase.clientCompanyName.toLowerCase().includes(query))
    );
  });

  // Apply sorting to the filtered records
  let sortedPurchases = [...filteredPurchases];

  if (sortOpenPurchase === "asc") {
    sortedPurchases.sort((a, b) =>
      a.openPurchaseNumber.localeCompare(b.openPurchaseNumber)
    );
  } else if (sortOpenPurchase === "desc") {
    sortedPurchases.sort((a, b) =>
      b.openPurchaseNumber.localeCompare(a.openPurchaseNumber)
    );
  }

  if (sortClientCompany === "asc") {
    sortedPurchases.sort((a, b) =>
      a.clientCompanyName.localeCompare(b.clientCompanyName)
    );
  } else if (sortClientCompany === "desc") {
    sortedPurchases.sort((a, b) =>
      b.clientCompanyName.localeCompare(a.clientCompanyName)
    );
  }

  if (sortExpectedDate === "asc") {
    sortedPurchases.sort((a, b) => {
      const dateA =
        a.items && a.items.length > 0 && a.items[0].expectedReceiveDate
          ? new Date(a.items[0].expectedReceiveDate)
          : new Date(0);
      const dateB =
        b.items && b.items.length > 0 && b.items[0].expectedReceiveDate
          ? new Date(b.items[0].expectedReceiveDate)
          : new Date(0);
      return dateA - dateB;
    });
  } else if (sortExpectedDate === "desc") {
    sortedPurchases.sort((a, b) => {
      const dateA =
        a.items && a.items.length > 0 && a.items[0].expectedReceiveDate
          ? new Date(a.items[0].expectedReceiveDate)
          : new Date(0);
      const dateB =
        b.items && b.items.length > 0 && b.items[0].expectedReceiveDate
          ? new Date(b.items[0].expectedReceiveDate)
          : new Date(0);
      return dateB - dateA;
    });
  }

  // Split into open and closed purchases based on items count.
  const openPurchasesData = sortedPurchases.filter((purchase) => {
    const counts = getStatusCounts(purchase.items);
    return counts.total !== counts.received;
  });
  const closedPurchasesData = sortedPurchases.filter((purchase) => {
    const counts = getStatusCounts(purchase.items);
    return counts.total > 0 && counts.total === counts.received;
  });

  // Common table header to be used for both views
  const renderTableHeader = () => (
    <thead className="bg-purple-100">
      <tr>
        <th className="px-4 py-2 text-left">
          Open Purchase / Job Sheet #
          <select
            value={sortOpenPurchase}
            onChange={(e) => setSortOpenPurchase(e.target.value)}
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
            value={sortClientCompany}
            onChange={(e) => setSortClientCompany(e.target.value)}
            className="ml-2 text-sm border border-gray-300 rounded p-1"
          >
            <option value="">--</option>
            <option value="asc">A–Z</option>
            <option value="desc">Z–A</option>
          </select>
        </th>
        <th className="px-4 py-2 text-left">
          Expected Receive Date
          <select
            value={sortExpectedDate}
            onChange={(e) => setSortExpectedDate(e.target.value)}
            className="ml-2 text-sm border border-gray-300 rounded p-1"
          >
            <option value="">--</option>
            <option value="asc">Earliest</option>
            <option value="desc">Latest</option>
          </select>
        </th>
        <th className="px-4 py-2 text-left">Status</th>
        <th className="px-4 py-2 text-left">Action</th>
      </tr>
    </thead>
  );

  // Table row render function
  const renderTableRows = (data) => (
    <tbody className="divide-y divide-gray-200">
      {data.map((purchase) => {
        const counts = getStatusCounts(purchase.items);
        return (
          <tr key={purchase._id}>
            <td className="px-4 py-2">{purchase.openPurchaseNumber}</td>
            <td className="px-4 py-2">{purchase.clientCompanyName}</td>
            <td className="px-4 py-2">
              {purchase.items && purchase.items.length > 0 && purchase.items[0].expectedReceiveDate
                ? new Date(purchase.items[0].expectedReceiveDate).toLocaleDateString()
                : "-"}
            </td>
            <td className="px-4 py-2">
              <span className="inline-block w-3 h-3 rounded-full bg-gray-500 mr-1"></span>
              Total ({counts.total}) |{" "}
              <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-1"></span>
              Pending ({counts.pending}) |{" "}
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mx-1"></span>
              Received ({counts.received}) |{" "}
              <span
                className={`inline-block w-3 h-3 rounded-full bg-red-500 mx-1 ${
                  counts.alert > 0 ? "animate-pulse" : ""
                }`}
              ></span>
              Alert ({counts.alert})
            </td>
            <td className="px-4 py-2">
              <button
                onClick={() =>
                  navigate(`/admin-dashboard/open-purchase/${purchase._id}`)
                }
                className="text-purple-600 hover:text-purple-900 text-2xl"
              >
                &#8230;
              </button>
            </td>
          </tr>
        );
      })}
      {data.length === 0 && (
        <tr>
          <td className="px-4 py-2 text-center" colSpan="5">
            No records found.
          </td>
        </tr>
      )}
    </tbody>
  );

  return (
    <div className="min-h-screen p-6 bg-white text-gray-800 relative">
      {/* Top right Create Purchase Button */}
      <button
        onClick={() => navigate("/admin-dashboard/open-purchase/")}
        className="absolute top-6 right-6 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        + Create Purchase
      </button>

      <h1 className="text-2xl font-bold text-purple-700 mb-4">Open Purchase List</h1>

      {/* Common Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by any fields"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-40 border border-purple-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Toggle Buttons for Open/Closed View */}
      <div className="mb-4 flex space-x-4">
        <button
          onClick={() => setViewType("open")}
          className={`px-4 py-2 rounded ${viewType === "open" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          Open
        </button>
        <button
          onClick={() => setViewType("closed")}
          className={`px-4 py-2 rounded ${viewType === "closed" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          Closed
        </button>
      </div>

      {/* Render table based on selected view */}
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full">
          {renderTableHeader()}
          {viewType === "open"
            ? renderTableRows(openPurchasesData)
            : renderTableRows(closedPurchasesData)}
        </table>
      </div>
    </div>
  );
}
