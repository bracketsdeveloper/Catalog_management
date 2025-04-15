// src/pages/ManageProductionJobsheet.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import ProductionJobSheetTable from "../components/productionjobsheet/ProductionJobSheetTable";
import ProductionJobSheetModal from "../components/productionjobsheet/ProductionJobSheetModal";

const ManageProductionJobsheet = () => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token = localStorage.getItem("token");

  const [data, setData] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAggregatedData = async () => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/productionjobsheets/aggregated`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(res.data);
    } catch (error) {
      console.error("Error fetching production job sheets", error);
    }
  };

  useEffect(() => {
    fetchAggregatedData();
  }, []);

  const handleActionClick = (record) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedRecord(null);
    fetchAggregatedData();
  };

  const handleSortChange = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Group records by jobSheetNumber.
  const groups = data.reduce((acc, curr) => {
    const key = curr.jobSheetNumber;
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {});

  // Filter out groups where all rows (records with the same jobSheetNumber) are "received".
  // We include the group if there is at least one record that is not "received".
  const nonFullyReceivedGroups = Object.values(groups).filter((group) => {
    return group.some(
      (record) => !record.status || record.status.toLowerCase() !== "received"
    );
  });

  // Flatten the filtered groups back into a single array.
  let filteredData = nonFullyReceivedGroups.flat();

  // Apply search filtering on the flattened data.
  filteredData = filteredData.filter((record) => {
    const recordString = JSON.stringify(record).toLowerCase();
    return recordString.includes(searchTerm.toLowerCase());
  });

  // Sort the filtered data by the selected sortField.
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    let aVal = a[sortField];
    let bVal = b[sortField];

    // Define date fields.
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

  return (
    <div className="p-4 bg-white min-h-screen">
      <h1 className="text-2xl text-purple-700 font-bold mb-4">
        Manage Production Job Sheet
      </h1>
      {/* Common search bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          className="p-2 border rounded w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <ProductionJobSheetTable
        data={sortedData}
        onActionClick={handleActionClick}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />
      {modalOpen && (
        <ProductionJobSheetModal record={selectedRecord} onClose={handleModalClose} />
      )}
    </div>
  );
};

export default ManageProductionJobsheet;
