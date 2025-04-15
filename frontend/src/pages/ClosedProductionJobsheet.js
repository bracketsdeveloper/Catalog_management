// src/pages/ClosedProductionJobsheet.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import ClosedProductionJobSheetTable from "../components/productionjobsheet/ClosedProductionJobSheetTable.js";

const ClosedProductionJobsheet = () => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token = localStorage.getItem("token");

  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const fetchData = async () => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/productionjobsheets/aggregated`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Filter only records with status "received" (closed)
      const closedRecords = res.data.filter(
        (record) => record.status === "received"
      );
      setData(closedRecords);
    } catch (error) {
      console.error("Error fetching closed production job sheets", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Global search filtering
  const filteredData = data.filter((record) => {
    const recordString = JSON.stringify(record).toLowerCase();
    return recordString.includes(searchTerm.toLowerCase());
  });

  // Sorting the data based on the sortField
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    let aVal = a[sortField];
    let bVal = b[sortField];

    const dateFields = [
      "jobSheetCreatedDate",
      "deliveryDateTime",
      "expectedReceiveDate",
      "schedulePickUp",
    ];

    if (dateFields.includes(sortField)) {
      aVal = aVal ? new Date(aVal) : new Date(0);
      bVal = bVal ? new Date(bVal) : new Date(0);
    } else {
      aVal = aVal ? aVal.toString().toLowerCase() : "";
      bVal = bVal ? bVal.toString().toLowerCase() : "";
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Handle header click to change sorting.
  const handleSortChange = (field) => {
    if (sortField === field) {
      // Toggle sort order if the same field is clicked.
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="p-4 bg-white min-h-screen">
      <h1 className="text-2xl text-purple-700 font-bold mb-4">
        Closed Production Job Sheet
      </h1>
      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search closed production jobsheets..."
          className="p-2 border rounded w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <ClosedProductionJobSheetTable
        data={sortedData}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />
    </div>
  );
};

export default ClosedProductionJobsheet;
