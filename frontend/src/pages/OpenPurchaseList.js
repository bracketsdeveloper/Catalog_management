// src/pages/OpenPurchaseList.js
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function OpenPurchaseList() {
  const [openPurchases, setOpenPurchases] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // State variables for sorting
  const [sortOpenPurchase, setSortOpenPurchase] = useState(""); // "asc" | "desc"
  const [sortClientCompany, setSortClientCompany] = useState(""); // "asc" | "desc"
  const [sortExpectedDate, setSortExpectedDate] = useState(""); // "asc" | "desc"

  const navigate = useNavigate();

  // Fetch open purchases on component mount
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

  // Calculate counts for statuses from the items array
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
      // Here we assume expected receive date is taken from the first item of the open purchase
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

  return (
    <div className="min-h-screen p-6 bg-white text-gray-800 relative">
      {/* Create Purchase Button on Top Right */}
      <button
        onClick={() => navigate("/admin-dashboard/open-purchase/")}
        className="absolute top-6 right-6 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        + Create Purchase
      </button>

      <h1 className="text-2xl font-bold text-purple-700 mb-4">
        Open Purchases List
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
                    {purchase.openPurchaseNumber}
                  </td>
                  <td className="px-4 py-2">{purchase.clientCompanyName}</td>
                  <td className="px-4 py-2">
                    {purchase.items &&
                    purchase.items.length > 0 &&
                    purchase.items[0].expectedReceiveDate
                      ? new Date(
                          purchase.items[0].expectedReceiveDate
                        ).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-gray-500 mr-1"></span>
                    Total ({statusCounts.total}) |{" "}
                    <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-1"></span>
                    Pending ({statusCounts.pending}) |{" "}
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500 mx-1"></span>
                    Received ({statusCounts.received}) |{" "}
                    <span className={`inline-block w-3 h-3 rounded-full bg-red-500 mx-1 ${
                      statusCounts.alert > 0 ? 'animate-[pulse_1s_ease-in-out_infinite] scale-150' : ''
                    }`}></span>
                    Alert ({statusCounts.alert})
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
      <style>{`
        @keyframes pulse-scale {
          0% { transform: scale(1); }
          50% { transform: scale(1.5); }
          100% { transform: scale(1); }
        }
        .animate-pulse-scale {
          animation: pulse-scale 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
