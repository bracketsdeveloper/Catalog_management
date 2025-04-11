// src/pages/ClosedPurchaseList.js
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ClosedPurchaseList() {
  const [openPurchases, setOpenPurchases] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting state variables
  const [sortOpenPurchase, setSortOpenPurchase] = useState("");
  const [sortClientCompany, setSortClientCompany] = useState("");
  const [sortSchedulePickup, setSortSchedulePickup] = useState("");

  const navigate = useNavigate();

  // Fetch open purchases from the open purchase API
  useEffect(() => {
    async function fetchOpenPurchases() {
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
    fetchOpenPurchases();
  }, []);

  // Filter open purchases to include only those where every product is "Received"
  const closedPurchases = openPurchases.filter(
    (purchase) =>
      purchase.items &&
      purchase.items.length > 0 &&
      purchase.items.every((item) => item.status === "Received")
  );

  // Apply search filter (for openPurchaseNumber, jobSheetNumber, or clientCompanyName)
  const filteredPurchases = closedPurchases.filter((purchase) => {
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

  // Sorting logic: make a copy of the filtered array to sort
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

  if (sortSchedulePickup === "asc") {
    sortedPurchases.sort((a, b) => {
      const dateA =
        a.items && a.items[0] && a.items[0].scheduledPickup
          ? new Date(a.items[0].scheduledPickup)
          : new Date(0);
      const dateB =
        b.items && b.items[0] && b.items[0].scheduledPickup
          ? new Date(b.items[0].scheduledPickup)
          : new Date(0);
      return dateA - dateB;
    });
  } else if (sortSchedulePickup === "desc") {
    sortedPurchases.sort((a, b) => {
      const dateA =
        a.items && a.items[0] && a.items[0].scheduledPickup
          ? new Date(a.items[0].scheduledPickup)
          : new Date(0);
      const dateB =
        b.items && b.items[0] && b.items[0].scheduledPickup
          ? new Date(b.items[0].scheduledPickup)
          : new Date(0);
      return dateB - dateA;
    });
  }

  // For the status column, only show total items and received items count.
  const getStatusCounts = (items) => {
    const total = items ? items.length : 0;
    const received = items ? items.filter((item) => item.status === "Received").length : 0;
    return { total, received };
  };

  // Helper: format date in 12-hour format with AM/PM
  const formatSchedulePickup = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen p-6 bg-white text-gray-800">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">Closed Purchases List</h1>

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
            {sortedPurchases.map((purchase) => {
              const statusCounts = getStatusCounts(purchase.items);
              return (
                <tr key={purchase._id}>
                  <td className="px-4 py-2">
                    {purchase.openPurchaseNumber} / {purchase.jobSheetNumber}
                  </td>
                  <td className="px-4 py-2">{purchase.clientCompanyName}</td>
                  <td className="px-4 py-2">
                    {purchase.items &&
                    purchase.items[0] &&
                    purchase.items[0].scheduledPickup
                      ? formatSchedulePickup(purchase.items[0].scheduledPickup)
                      : "-"}
                  </td>
                  <td className="px-4 py-2">
                    Total ({statusCounts.total}) | Received ({statusCounts.received})
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() =>
                        navigate(`/admin-dashboard/closed-purchase/${purchase._id}`)
                      }
                      className="text-purple-600 hover:text-purple-900 text-2xl"
                    >
                      &#8230;
                    </button>
                  </td>
                </tr>
              );
            })}
            {sortedPurchases.length === 0 && (
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
