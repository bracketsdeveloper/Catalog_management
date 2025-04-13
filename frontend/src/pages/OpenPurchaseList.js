import React, { useState, useEffect } from "react";
import axios from "axios";

const statusOptions = ["pending", "received", "alert"];

/* HeaderFilters component: renders input fields for each column. 
   It receives the current headerFilters and an onFilterChange callback. */
function HeaderFilters({ headerFilters, onFilterChange }) {
  // Define keys for our columns (adjust as needed)
  const columns = [
    { key: "jobSheetCreatedDate", label: "Job Sheet Created Date" },
    { key: "jobSheetNumber", label: "Job Sheet Number" },
    { key: "clientCompanyName", label: "Client Company Name" },
    { key: "eventName", label: "Event Name" },
    { key: "product", label: "Product" },
    { key: "sourcingFrom", label: "Sourced From" },
    { key: "vendorContactNumber", label: "Vendor Contact Number" },
    { key: "orderConfirmedDate", label: "Order Confirmed Date" },
    { key: "expectedReceiveDate", label: "Expected Receive Date" },
    { key: "schedulePickUp", label: "Schedule Pick Up" },
    { key: "remarks", label: "Remarks" },
    { key: "status", label: "Status" }
  ];
  
  return (
    <tr className="bg-gray-100">
      {columns.map(col => (
        <th key={col.key} className="p-1 border border-gray-300">
          <input
            type="text"
            placeholder={`Filter ${col.label}`}
            value={headerFilters[col.key] || ""}
            onChange={(e) => onFilterChange(col.key, e.target.value)}
            className="w-full p-1 text-xs border rounded"
          />
        </th>
      ))}
      <th className="p-1 border border-gray-300">Actions</th>
    </tr>
  );
}

/**
 * FollowUpModal Component
 * Displays current follow ups and lets the user add or remove entries.
 */
function FollowUpModal({ followUps, onUpdate, onClose }) {
  const [localFollowUps, setLocalFollowUps] = useState(followUps || []);
  const [newFollowUpName, setNewFollowUpName] = useState("");

  const handleAdd = () => {
    if (!newFollowUpName.trim()) return;
    const newEntry = { updatedAt: new Date(), updatedBy: newFollowUpName };
    setLocalFollowUps(prev => [...prev, newEntry]);
    setNewFollowUpName("");
  };

  const handleRemove = (index) => {
    setLocalFollowUps(prev => {
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
          <button onClick={handleClose} className="text-gray-600 hover:text-gray-900 text-2xl">×</button>
        </div>
        <div className="max-h-64 overflow-y-auto border p-2 mb-4">
          {localFollowUps.length === 0 && <p className="text-gray-600 text-sm">No follow ups yet.</p>}
          {localFollowUps.map((fu, index) => (
            <div key={index} className="flex items-center justify-between text-xs border-b py-1">
              <span>{new Date(fu.updatedAt).toLocaleString()} – {fu.updatedBy}</span>
              <button onClick={() => handleRemove(index)} className="text-red-500 text-xs">Remove</button>
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
          <button onClick={handleAdd} className="bg-blue-500 text-white px-2 py-1 text-xs rounded">
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

/**
 * EditPurchaseModal Component
 * Displays a modal form for editing an Open Purchase record.
 * Includes a "View Follow Ups" button to open the FollowUpModal.
 */
function EditPurchaseModal({ purchase, onClose, onSave }) {
  const [editedData, setEditedData] = useState({ ...purchase });
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);

  const handleFieldChange = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFollowUpUpdate = (newFollowUps) => {
    setEditedData(prev => ({
      ...prev,
      followUp: newFollowUps,
    }));
  };

  const handleSave = () => {
    if (editedData.status === "received") {
      const confirmMsg = "You have marked this record as RECEIVED. Once saved, it cannot be edited further.";
      if (!window.confirm(confirmMsg)) return;
    }
    onSave(editedData);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white p-6 rounded w-full max-w-3xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-purple-700">Edit Open Purchase</h2>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-2xl">×</button>
          </div>
          <form className="space-y-4">
            {/* Read-only JobSheet Details */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-purple-700 font-bold mb-1">Job Sheet Number:</label>
                <span>{editedData.jobSheetNumber}</span>
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">Job Sheet Date:</label>
                <span>{new Date(editedData.jobSheetCreatedDate).toLocaleDateString()}</span>
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">Client Company Name:</label>
                <span>{editedData.clientCompanyName}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-purple-700 font-bold mb-1">Event Name:</label>
                <span>{editedData.eventName}</span>
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">Product:</label>
                <span>{editedData.product}</span>
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">Sourced From:</label>
                <span>{editedData.sourcingFrom}</span>
              </div>
            </div>
            {/* Editable Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-700 font-bold mb-1">Vendor Contact Number:</label>
                <input
                  type="text"
                  value={editedData.vendorContactNumber || ""}
                  onChange={(e) => handleFieldChange("vendorContactNumber", e.target.value)}
                  className="w-full border p-1"
                />
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">Remarks:</label>
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
                <label className="block text-purple-700 font-bold mb-1">Order Confirmed Date:</label>
                <input
                  type="date"
                  value={editedData.orderConfirmedDate ? editedData.orderConfirmedDate.substring(0, 10) : ""}
                  onChange={(e) => handleFieldChange("orderConfirmedDate", e.target.value)}
                  className="w-full border p-1"
                />
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">Expected Receive Date:</label>
                <input
                  type="date"
                  value={editedData.expectedReceiveDate ? editedData.expectedReceiveDate.substring(0, 10) : ""}
                  onChange={(e) => handleFieldChange("expectedReceiveDate", e.target.value)}
                  className="w-full border p-1"
                />
              </div>
              <div>
                <label className="block text-purple-700 font-bold mb-1">Schedule Pick Up:</label>
                <input
                  type="datetime-local"
                  value={editedData.schedulePickUp ? editedData.schedulePickUp.substring(0, 16) : ""}
                  onChange={(e) => handleFieldChange("schedulePickUp", e.target.value)}
                  className="w-full border p-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-700 font-bold mb-1">Status:</label>
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
            <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100">
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

/**
 * OpenPurchases Component
 * Fetches aggregated open purchase data from the backend and applies group filtering:
 * Only those job sheet groups where not all items are received are shown.
 * Additionally, per-column header filters are available.
 */
export default function OpenPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentEditPurchase, setCurrentEditPurchase] = useState(null);
  const [viewFollowUpModalOpen, setViewFollowUpModalOpen] = useState(false);
  const [currentViewFollowId, setCurrentViewFollowId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [headerFilters, setHeaderFilters] = useState({}); // header filters state
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "" });

  useEffect(() => {
    async function fetchPurchases() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Fetched open purchases:", res.data.map(p => ({
          _id: p._id,
          jobSheetNumber: p.jobSheetNumber,
          product: p.product,
          status: p.status,
          isTemporary: p.isTemporary
        })));
        setPurchases(res.data);
      } catch (error) {
        console.error("Error fetching open purchases:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPurchases();
  }, []);

  // Global search filtering.
  const globalFiltered = purchases.filter((purchase) => {
    const searchLower = searchText.toLowerCase();
    return (
      (purchase.jobSheetNumber || "").toLowerCase().includes(searchLower) ||
      (purchase.clientCompanyName || "").toLowerCase().includes(searchLower) ||
      (purchase.eventName || "").toLowerCase().includes(searchLower) ||
      (purchase.product || "").toLowerCase().includes(searchLower) ||
      (purchase.sourcingFrom || "").toLowerCase().includes(searchLower) ||
      ((purchase.vendorContactNumber || "").toLowerCase().includes(searchLower))
    );
  });

  // Apply header filters to each record.
  const headerFiltered = globalFiltered.filter((record) => {
    // Define the columns that should be filtered—adjust keys as necessary.
    const filterKeys = [
      "jobSheetCreatedDate",
      "jobSheetNumber",
      "clientCompanyName",
      "eventName",
      "product",
      "sourcingFrom",
      "vendorContactNumber",
      "orderConfirmedDate",
      "expectedReceiveDate",
      "schedulePickUp",
      "remarks",
      "status"
    ];
    // For each key, if a filter exists, check that record value includes the filter string.
    return filterKeys.every((key) => {
      if (!headerFilters[key]) return true;
      // For dates, we can simply convert to a localized string.
      const value = record[key]
        ? key.includes("Date") || key === "schedulePickUp"
          ? new Date(record[key]).toLocaleString()
          : String(record[key])
        : "";
      return value.toLowerCase().includes(headerFilters[key].toLowerCase());
    });
  });

  // Group the headerFiltered records by jobSheetNumber and exclude groups where every record is "received".
  const groupAndFilter = (records) => {
    const groups = {};
    records.forEach((record) => {
      const key = record.jobSheetNumber;
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
    });
    const finalList = [];
    Object.keys(groups).forEach((key) => {
      const group = groups[key];
      if (!group.every(item => item.status === "received")) {
        finalList.push(...group);
      }
    });
    return finalList;
  };

  const openPurchasesToShow = groupAndFilter(headerFiltered);

  const handleHeaderFilterChange = (key, value) => {
    setHeaderFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleOpenEditModal = (purchase) => {
    console.log("Opening edit modal for open purchase:", {
      _id: purchase._id,
      jobSheetNumber: purchase.jobSheetNumber,
      product: purchase.product,
      status: purchase.status,
      isTemporary: purchase.isTemporary
    });
    setCurrentEditPurchase(purchase);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setCurrentEditPurchase(null);
  };

  // Modified save handler.
  const handleSaveEdit = async (updatedData) => {
    if (updatedData.status === "received") {
      const confirmMsg =
        "You have marked this record as RECEIVED. Once saved, it cannot be edited further and the entire job sheet group will be removed if all items are received. Do you wish to proceed?";
      if (!window.confirm(confirmMsg)) return;
    }
    try {
      const token = localStorage.getItem("token");
      let returnedData;
      const isTempId = updatedData._id && updatedData._id.startsWith("temp_");
      const dataToSend = { ...updatedData };
      if (isTempId || updatedData.isTemporary) {
        delete dataToSend._id;
      }

      if (updatedData._id && !isTempId && !updatedData.isTemporary) {
        console.log("Sending PUT request for:", {
          _id: updatedData._id,
          jobSheetNumber: updatedData.jobSheetNumber,
          status: updatedData.status
        });
        const res = await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${updatedData._id}`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        returnedData = res.data.purchase;
      } else {
        console.log("Sending POST request for:", {
          jobSheetNumber: updatedData.jobSheetNumber,
          status: updatedData.status
        });
        const res = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        returnedData = res.data.purchase;
      }

      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Refreshed open purchases:", res.data.map(p => ({
        _id: p._id,
        jobSheetNumber: p.jobSheetNumber,
        product: p.product,
        status: p.status,
        isTemporary: p.isTemporary
      })));
      setPurchases(res.data);
      setEditModalOpen(false);
      setCurrentEditPurchase(null);
      alert("Record saved successfully!");
    } catch (error) {
      console.error("Error saving open purchase edit:", error);
      alert("Error saving open purchase edit; check console.");
    }
  };

  const handleSort = (key, type = "string") => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setPurchases(prev => {
      const sorted = [...prev].sort((a, b) => {
        let aVal = a[key] || "";
        let bVal = b[key] || "";
        if (type === "date") {
          aVal = aVal ? new Date(aVal) : new Date(0);
          bVal = bVal ? new Date(bVal) : new Date(0);
        }
        if (aVal < bVal) return direction === "asc" ? -1 : 1;
        if (aVal > bVal) return direction === "asc" ? 1 : -1;
        return 0;
      });
      return sorted;
    });
  };

  const handleOpenViewFollowModal = (purchase) => {
    console.log("Opening follow-up modal for purchase:", purchase._id);
    setCurrentViewFollowId(purchase._id);
    setViewFollowUpModalOpen(true);
  };

  if (loading) return <div>Loading open purchases...</div>;

  console.log("Rendering filtered open purchases:", openPurchasesToShow.map((p) => ({
    _id: p._id,
    jobSheetNumber: p.jobSheetNumber,
    product: p.product,
    status: p.status,
    isTemporary: p.isTemporary
  })));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">Open Purchases</h1>
      {/* Global Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search open purchases..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <table className="min-w-full border-collapse border border-gray-300">
        <thead className="bg-gray-50">
          <tr className="text-xs">
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("jobSheetCreatedDate", "date")}
            >
              Job Sheet Created Date {sortConfig.key === "jobSheetCreatedDate" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("jobSheetNumber", "string")}
            >
              Job Sheet Number {sortConfig.key === "jobSheetNumber" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("clientCompanyName", "string")}
            >
              Client Company Name {sortConfig.key === "clientCompanyName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("eventName", "string")}
            >
              Event Name {sortConfig.key === "eventName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("product", "string")}
            >
              Product {sortConfig.key === "product" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("sourcingFrom", "string")}
            >
              Sourced From {sortConfig.key === "sourcingFrom" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("vendorContactNumber", "string")}
            >
              Vendor Contact Number {sortConfig.key === "vendorContactNumber" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("orderConfirmedDate", "date")}
            >
              Order Confirmed Date {sortConfig.key === "orderConfirmedDate" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("expectedReceiveDate", "date")}
            >
              Expected Receive Date {sortConfig.key === "expectedReceiveDate" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("schedulePickUp", "date")}
            >
              Schedule Pick Up {sortConfig.key === "schedulePickUp" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300">Follow Up</th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("remarks", "string")}
            >
              Remarks {sortConfig.key === "remarks" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("status", "string")}
            >
              Status {sortConfig.key === "status" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300">Actions</th>
          </tr>
          <HeaderFilters headerFilters={headerFilters} onFilterChange={handleHeaderFilterChange} />
        </thead>
        <tbody>
          {openPurchasesToShow.map((purchase) => (
            <tr
              key={purchase._id || (purchase.jobSheetNumber + purchase.product)}
              className={`text-xs ${
                purchase.status === "alert"
                  ? "bg-red-500"
                  : purchase.status === "pending"
                  ? "bg-orange-500"
                  : purchase.status === "received"
                  ? "bg-green-300"
                  : ""
              }`}
            >
              <td className="p-2 border border-gray-300">
                {new Date(purchase.jobSheetCreatedDate).toLocaleDateString()}
              </td>
              <td className="p-2 border border-gray-300">{purchase.jobSheetNumber}</td>
              <td className="p-2 border border-gray-300">{purchase.clientCompanyName}</td>
              <td className="p-2 border border-gray-300">{purchase.eventName}</td>
              <td className="p-2 border border-gray-300">{purchase.product}</td>
              <td className="p-2 border border-gray-300">{purchase.sourcingFrom}</td>
              <td className="p-2 border border-gray-300">{purchase.vendorContactNumber}</td>
              <td className="p-2 border border-gray-300">
                {purchase.orderConfirmedDate ? purchase.orderConfirmedDate.substring(0, 10) : ""}
              </td>
              <td className="p-2 border border-gray-300">
                {purchase.expectedReceiveDate ? purchase.expectedReceiveDate.substring(0, 10) : ""}
              </td>
              <td className="p-2 border border-gray-300">
                {purchase.schedulePickUp ? purchase.schedulePickUp.substring(0, 16) : ""}
              </td>
              <td className="p-2 border border-gray-300">
                <button
                  onClick={() => handleOpenViewFollowModal(purchase)}
                  className="bg-blue-500 text-white px-2 py-1 rounded text-[10px] w-full"
                >
                  View {purchase.followUp ? `(${purchase.followUp.length})` : ""}
                </button>
              </td>
              <td className="p-2 border border-gray-300">{purchase.remarks}</td>
              <td className="p-2 border border-gray-300">{purchase.status}</td>
              <td className="p-2 border border-gray-300">
                <button
                  onClick={() => handleOpenEditModal(purchase)}
                  className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] w-full"
                  disabled={purchase.status === "received"}
                  title={purchase.status === "received" ? "Record marked as received cannot be edited." : ""}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editModalOpen && currentEditPurchase && (
        <EditPurchaseModal
          purchase={currentEditPurchase}
          onClose={handleCloseEditModal}
          onSave={handleSaveEdit}
        />
      )}
      {viewFollowUpModalOpen && currentViewFollowId !== null && (
        <FollowUpModal
          followUps={purchases.find((p) => p._id === currentViewFollowId)?.followUp || []}
          onUpdate={(newFUs) => {
            setPurchases(prev =>
              prev.map(p => p._id === currentViewFollowId ? { ...p, followUp: newFUs } : p)
            );
          }}
          onClose={() => {
            setViewFollowUpModalOpen(false);
            setCurrentViewFollowId(null);
          }}
        />
      )}
    </div>
  );
}
