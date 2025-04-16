import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const statusOptions = ["pending", "received", "alert"];

function FollowUpModal({ followUps, onUpdate, onClose }) {
  const [localFollowUps, setLocalFollowUps] = useState(followUps || []);
  const [newFollowUpName, setNewFollowUpName] = useState("");

  const handleAdd = () => {
    if (!newFollowUpName.trim()) return;
    const newEntry = { updatedAt: new Date(), updatedBy: newFollowUpName };
    setLocalFollowUps((prev) => [...prev, newEntry]);
    setNewFollowUpName("");
  };

  const handleRemove = (index) => {
    setLocalFollowUps((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleClose = () => {
    onUpdate(localFollowUps);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-purple-700">Manage Follow Ups</h3>
          <button
            onClick={handleClose}
            className="text-gray-600 hover:text-gray-900 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto border p-2 mb-4">
          {localFollowUps.length === 0 && (
            <p className="text-gray-600 text-sm">No follow ups yet.</p>
          )}
          {localFollowUps.map((fu, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs border-b py-1"
            >
              <span>
                {new Date(fu.updatedAt).toLocaleString()} – {fu.updatedBy}
              </span>
              <button
                onClick={() => handleRemove(index)}
                className="text-red-500 text-xs"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Enter your name"
            value={newFollowUpName}
            onChange={(e) => setNewFollowUpName(e.target.value)}
            className="w-full p-1 border text-xs"
          />
          <button
            onClick={handleAdd}
            className="bg-blue-500 text-white px-2 py-1 text-xs rounded"
          >
            Add
          </button>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleClose}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EditPurchaseModal({ purchase, onClose, onSave }) {
  const [editedData, setEditedData] = useState({ ...purchase });
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);

  const handleFieldChange = (field, value) => {
    setEditedData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFollowUpUpdate = (newFollowUps) => {
    setEditedData((prev) => ({
      ...prev,
      followUp: newFollowUps,
    }));
  };

  const handleSave = () => {
    onSave(editedData);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white p-6 rounded w-full max-w-3xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-purple-700">
              Edit Closed Purchase
            </h2>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 text-2xl"
            >
              ×
            </button>
          </div>
          <form className="space-y-4">
            {/* Read-only JobSheet Details */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-purple-700 font-bold mb-1">
                  Job Sheet Number:
                </label>
                <span>{editedData.jobSheetNumber}</span>
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">
                  Job Sheet Date:
                </label>
                <span>
                  {new Date(editedData.jobSheetCreatedDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">
                  Client Company Name:
                </label>
                <span>{editedData.clientCompanyName}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-purple-700 font-bold mb-1">
                  Event Name:
                </label>
                <span>{editedData.eventName}</span>
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">
                  Product:
                </label>
                <span>{editedData.product}</span>
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">
                  Sourced From:
                </label>
                <span>{editedData.sourcingFrom}</span>
              </div>
            </div>
            {/* New Quantity Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-700 font-bold mb-1">
                  Qty Required:
                </label>
                <span>{editedData.qtyRequired}</span>
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">
                  Qty Ordered:
                </label>
                <input
                  type="number"
                  value={editedData.qtyOrdered || ""}
                  onChange={(e) =>
                    handleFieldChange("qtyOrdered", parseInt(e.target.value) || 0)
                  }
                  className="w-full border p-1"
                />
              </div>
            </div>
            {/* Editable Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-700 font-bold mb-1">
                  Vendor Contact Number:
                </label>
                <input
                  type="text"
                  value={editedData.vendorContactNumber || ""}
                  onChange={(e) =>
                    handleFieldChange("vendorContactNumber", e.target.value)
                  }
                  className="w-full border p-1"
                />
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">
                  Remarks:
                </label>
                <input
                  type="text"
                  value={editedData.remarks || ""}
                  onChange={(e) => handleFieldChange("remarks", e.target.value)}
                  className="w-full border p-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-purple-700 font-bold mb-1">
                  Order Confirmed Date:
                </label>
                <input
                  type="date"
                  value={
                    editedData.orderConfirmedDate
                      ? editedData.orderConfirmedDate.substring(0, 10)
                      : ""
                  }
                  onChange={(e) =>
                    handleFieldChange("orderConfirmedDate", e.target.value)
                  }
                  className="w-full border p-1"
                />
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">
                  Expected Receive Date:
                </label>
                <input
                  type="date"
                  value={
                    editedData.expectedReceiveDate
                      ? editedData.expectedReceiveDate.substring(0, 10)
                      : ""
                  }
                  onChange={(e) =>
                    handleFieldChange("expectedReceiveDate", e.target.value)
                  }
                  className="w-full border p-1"
                />
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">
                  Schedule Pick Up:
                </label>
                <input
                  type="datetime-local"
                  value={
                    editedData.schedulePickUp
                      ? editedData.schedulePickUp.substring(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    handleFieldChange("schedulePickUp", e.target.value)
                  }
                  className="w-full border p-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-700 font-bold mb-1">
                  Status:
                </label>
                <select
                  value={editedData.status}
                  onChange={(e) => handleFieldChange("status", e.target.value)}
                  className="w-full border p-1"
                >
                  {statusOptions.map((option, i) => (
                    <option key={i} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={() => setFollowUpModalOpen(true)}
                  className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                >
                  View Follow Ups
                </button>
              </div>
            </div>
          </form>
          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
      {followUpModalOpen && (
        <FollowUpModal
          followUps={editedData.followUp}
          onUpdate={handleFollowUpUpdate}
          onClose={() => setFollowUpModalOpen(false)}
        />
      )}
    </>
  );
}

export default function ClosedPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [sortConfig, setSortConfig] = useState({ 
    key: "schedulePickUp", 
    direction: "asc", 
    type: "date" 
  });

  useEffect(() => {
    async function fetchPurchases() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPurchases(res.data);
      } catch (error) {
        console.error("Error fetching open purchases for closed view:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPurchases();
  }, []);

  // Group records by jobSheetNumber and return only groups where every record is "received"
  const getClosedPurchases = (records) => {
    const groups = {};
    records.forEach((record) => {
      const key = record.jobSheetNumber;
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
    });
    const closed = [];
    Object.values(groups).forEach((group) => {
      if (group.length > 0 && group.every((r) => r.status === "received")) {
        closed.push(...group);
      }
    });
    return closed;
  };

  const closedPurchases = getClosedPurchases(purchases);

  const filteredPurchases = closedPurchases.filter((purchase) => {
    const searchLower = searchText.toLowerCase();
    return (
      (purchase.jobSheetNumber || "").toLowerCase().includes(searchLower) ||
      (purchase.clientCompanyName || "").toLowerCase().includes(searchLower) ||
      (purchase.eventName || "").toLowerCase().includes(searchLower) ||
      (purchase.product || "").toLowerCase().includes(searchLower) ||
      (purchase.sourcingFrom || "").toLowerCase().includes(searchLower) ||
      (purchase.vendorContactNumber || "").toLowerCase().includes(searchLower)
    );
  });

  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    let aVal = a[sortConfig.key] || "";
    let bVal = b[sortConfig.key] || "";

    if (sortConfig.type === "date") {
      aVal = aVal ? new Date(aVal) : new Date(0);
      bVal = bVal ? new Date(bVal) : new Date(0);
    }

    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (key, type = "string") => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction, type });
  };

  // Export to Excel function (excludes the Follow Up column)
  const exportToExcel = () => {
    const exportData = sortedPurchases.map((purchase) => ({
      "Job Sheet Created Date": purchase.jobSheetCreatedDate
        ? new Date(purchase.jobSheetCreatedDate).toLocaleDateString()
        : "",
      "Delivery Date": purchase.deliveryDateTime
        ? new Date(purchase.deliveryDateTime).toLocaleDateString()
        : "",
      "Job Sheet Number": purchase.jobSheetNumber || "",
      "Client Company Name": purchase.clientCompanyName || "",
      "Event Name": purchase.eventName || "",
      Product: purchase.product || "",
      "Qty Required": purchase.qtyRequired,
      "Qty Ordered": purchase.qtyOrdered,
      "Sourced From": purchase.sourcingFrom || "",
      "Vendor Contact Number": purchase.vendorContactNumber || "",
      "Order Confirmed Date": purchase.orderConfirmedDate
        ? purchase.orderConfirmedDate.substring(0, 10)
        : "",
      "Expected Receive Date": purchase.expectedReceiveDate
        ? purchase.expectedReceiveDate.substring(0, 10)
        : "",
      "Schedule Pick Up": purchase.schedulePickUp
        ? purchase.schedulePickUp.substring(0, 16)
        : "",
      Remarks: purchase.remarks || "",
      Status: purchase.status || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Closed Purchases");
    XLSX.writeFile(workbook, "Closed_Purchases.xlsx");
  };

  // Skeleton Loader Component
  const SkeletonLoader = () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">Closed Purchases</h1>
      <div className="animate-pulse">
        <div className="mb-4 h-8 bg-gray-300 rounded"></div>
        <table className="min-w-full border-collapse border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {Array(17)
                .fill(0)
                .map((_, i) => (
                  <th
                    key={i}
                    className="p-2 border border-gray-300 h-4 bg-gray-300"
                  ></th>
                ))}
            </tr>
          </thead>
          <tbody>
            {Array(5)
              .fill(0)
              .map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {Array(17)
                    .fill(0)
                    .map((_, colIdx) => (
                      <td
                        key={colIdx}
                        className="p-2 border border-gray-300 h-4 bg-gray-300"
                      ></td>
                    ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) return <SkeletonLoader />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">
        Closed Purchases
      </h1>
      <div className="mb-4 flex gap-4 items-center">
        <input
          type="text"
          placeholder="Search closed purchases..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button
          onClick={exportToExcel}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Export to Excel
        </button>
      </div>
      <table className="min-w-full border-collapse border border-gray-300">
        <thead className="bg-gray-50">
          <tr className="text-xs">
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("jobSheetCreatedDate", "date")}
            >
              Job Sheet Created Date{" "}
              {sortConfig.key === "jobSheetCreatedDate" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("deliveryDateTime", "date")}
            >
              Delivery Date{" "}
              {sortConfig.key === "deliveryDateTime" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("jobSheetNumber", "string")}
            >
              Job Sheet Number{" "}
              {sortConfig.key === "jobSheetNumber" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("clientCompanyName", "string")}
            >
              Client Company Name{" "}
              {sortConfig.key === "clientCompanyName" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("eventName", "string")}
            >
              Event Name{" "}
              {sortConfig.key === "eventName" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("product", "string")}
            >
              Product{" "}
              {sortConfig.key === "product" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            {/* New Qty Required and Qty Ordered Columns */}
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("qtyRequired", "number")}
            >
              Qty Required{" "}
              {sortConfig.key === "qtyRequired" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("qtyOrdered", "number")}
            >
              Qty Ordered{" "}
              {sortConfig.key === "qtyOrdered" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("sourcingFrom", "string")}
            >
              Sourced From{" "}
              {sortConfig.key === "sourcingFrom" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("vendorContactNumber", "string")}
            >
              Vendor Contact Number{" "}
              {sortConfig.key === "vendorContactNumber" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("orderConfirmedDate", "date")}
            >
              Order Confirmed Date{" "}
              {sortConfig.key === "orderConfirmedDate" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("expectedReceiveDate", "date")}
            >
              Expected Receive Date{" "}
              {sortConfig.key === "expectedReceiveDate" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("schedulePickUp", "date")}
            >
              Schedule Pick Up{" "}
              {sortConfig.key === "schedulePickUp" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("remarks", "string")}
            >
              Remarks{" "}
              {sortConfig.key === "remarks" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("status", "string")}
            >
              Status{" "}
              {sortConfig.key === "status" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedPurchases.map((purchase) => {
            const latestFollowUp =
              purchase.followUp && purchase.followUp.length > 0
                ? purchase.followUp[purchase.followUp.length - 1]
                : null;

            return (
              <tr
                key={purchase._id || purchase.jobSheetNumber + purchase.product}
                className={`text-xs ${
                  purchase.status === "alert"
                    ? "bg-red-300"
                    : purchase.status === "pending"
                    ? "bg-orange-300"
                    : purchase.status === "received"
                    ? "bg-green-300"
                    : ""
                }`}
              >
                <td className="p-2 border border-gray-300">
                  {new Date(purchase.jobSheetCreatedDate).toLocaleDateString()}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.deliveryDateTime
                    ? new Date(purchase.deliveryDateTime).toLocaleDateString()
                    : ""}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.jobSheetNumber}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.clientCompanyName}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.eventName}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.product}
                </td>
                {/* New Qty Required and Qty Ordered cells */}
                <td className="p-2 border border-gray-300">
                  {purchase.qtyRequired}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.qtyOrdered}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.sourcingFrom}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.vendorContactNumber}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.orderConfirmedDate
                    ? purchase.orderConfirmedDate.substring(0, 10)
                    : ""}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.expectedReceiveDate
                    ? purchase.expectedReceiveDate.substring(0, 10)
                    : ""}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.schedulePickUp
                    ? purchase.schedulePickUp.substring(0, 16)
                    : ""}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.remarks}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.status}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
