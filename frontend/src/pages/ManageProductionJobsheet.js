// src/pages/ManageProductionJobsheet.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import ProductionJobSheetTable from "../components/productionjobsheet/ProductionJobSheetTable";
import ProductionJobSheetModal from "../components/productionjobsheet/ProductionJobSheetModal";

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[...Array(17)].map((_, i) => (
      <td key={i} className="border px-2 py-1">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </td>
    ))}
  </tr>
);

const ManageProductionJobsheet = () => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token = localStorage.getItem("token");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    const permsStr = localStorage.getItem("permissions");
    if (permsStr) {
      try {
        setPermissions(JSON.parse(permsStr));
      } catch (err) {
        console.error("Error parsing permissions:", err);
      }
    }
  }, []);

  const canEdit = permissions.includes("write-production");

  const fetchAggregatedData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/admin/productionjobsheets/aggregated`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (error) {
      console.error("Error fetching production job sheets", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAggregatedData();
    // eslint-disable-next-line
  }, []);

  const handleActionClick = (record) => {
    if (!canEdit) {
      alert("You don't have permission to edit production job sheets.");
      return;
    }
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

  const groups = data.reduce((acc, curr) => {
    const key = curr.jobSheetNumber;
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {});

  const nonFullyReceivedGroups = Object.values(groups).filter((group) =>
    group.some((r) => !r.status || r.status.toLowerCase() !== "received")
  );

  let filteredData = nonFullyReceivedGroups.flat().filter((record) =>
    JSON.stringify(record).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    let [aVal, bVal] = [a[sortField], b[sortField]];
    const dateFields = ["jobSheetCreatedDate", "deliveryDateTime", "expectedReceiveDate", "schedulePickUp"];
    if (dateFields.includes(sortField)) {
      aVal = aVal ? new Date(aVal) : new Date(0);
      bVal = bVal ? new Date(bVal) : new Date(0);
    } else {
      aVal = aVal?.toString().toLowerCase() || "";
      bVal = bVal?.toString().toLowerCase() || "";
    }
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="p-4 bg-white min-h-screen">
      <h1 className="text-2xl text-purple-700 font-bold mb-4">Manage Production Job Sheet</h1>

      {!canEdit && (
        <div className="mb-4 p-2 text-red-700 bg-red-200 border border-red-400 rounded">
          You don't have permission to edit production job sheets.
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          className="p-2 border rounded w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <table className="min-w-full table-auto border-collapse text-xs">
          <tbody>
            {[...Array(8)].map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      ) : (
        <ProductionJobSheetTable
          data={sortedData}
          onActionClick={handleActionClick}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />
      )}

      {modalOpen && <ProductionJobSheetModal record={selectedRecord} onClose={handleModalClose} />}
    </div>
  );
};

export default ManageProductionJobsheet;
