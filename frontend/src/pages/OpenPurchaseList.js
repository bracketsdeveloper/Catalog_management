import React, { useState, useEffect } from "react";
import axios from "axios";

const statusOptions = ["", "pending", "received", "alert"];

function HeaderFilters({ headerFilters, onFilterChange }) {
  const columns = [
    { key: "jobSheetCreatedDate", label: "Job Sheet Created Date" },
    { key: "jobSheetNumber", label: "Job Sheet Number" },
    { key: "clientCompanyName", label: "Client Company Name" },
    { key: "eventName", label: "Event Name" },
    { key: "product", label: "Product" },
    { key: "sourcingFrom", label: "Sourced From" },
    { key: "deliveryDateTime", label: "Delivery Date" },
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

function FollowUpModal({ followUps, onUpdate, onClose }) {
  const [localFollowUps, setLocalFollowUps] = useState(followUps || []);
  const [newFollowUpDate, setNewFollowUpDate] = useState("");
  const [newFollowUpNote, setNewFollowUpNote] = useState("");

  const handleAdd = () => {
    if (!newFollowUpDate.trim() || !newFollowUpNote.trim()) return;
    const newEntry = {
      updatedAt: new Date(),
      followUpDate: newFollowUpDate,
      note: newFollowUpNote,
      done: false,
      updatedBy: "admin" // Adjust based on your auth system
    };
    setLocalFollowUps(prev => [...prev, newEntry]);
    setNewFollowUpDate("");
    setNewFollowUpNote("");
  };

  const handleRemove = (index) => {
    setLocalFollowUps(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleMarkDone = (index) => {
    setLocalFollowUps(prev => {
      const updated = [...prev];
      updated[index].done = true;
      return updated;
    });
  };

  const handleClose = () => {
    onUpdate(localFollowUps);
    onClose();
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-purple-700">Manage Follow Ups</h3>
          <button onClick={handleClose} className="text-gray-600 hover:text-gray-900 text-2xl">
            ×
          </button>
        </div>
        <div className="mb-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold">Add New Follow Up:</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={newFollowUpDate}
                onChange={(e) => setNewFollowUpDate(e.target.value)}
                className="p-1 border rounded text-sm"
              />
              <input
                type="text"
                placeholder="Enter follow up note"
                value={newFollowUpNote}
                onChange={(e) => setNewFollowUpNote(e.target.value)}
                className="p-1 border rounded text-sm flex-grow"
              />
              <button onClick={handleAdd} className="bg-blue-500 text-white px-2 py-1 rounded text-sm">
                Add
              </button>
            </div>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto border p-2 mb-4">
          {localFollowUps.length === 0 && <p className="text-gray-600 text-sm">No follow ups yet.</p>}
          {localFollowUps.map((fu, index) => {
            const isOverdue = !fu.done && fu.followUpDate < todayStr;
            return (
              <div
                key={index}
                className={`flex items-center justify-between text-xs border-b py-1 ${isOverdue ? "bg-red-200" : ""}`}
              >
                <span>
                  {fu.followUpDate} – {fu.note} {fu.done && "(Done)"}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => handleRemove(index)} className="text-red-500 text-xs">
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
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
            <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-2xl">
              ×
            </button>
          </div>
          <form className="space-y-4">
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
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-purple-700 font-bold mb-1">Delivery Date:</label>
                <span>
                  {editedData.deliveryDateTime
                    ? new Date(editedData.deliveryDateTime).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
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
                      {option === "" ? "Empty" : option}
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

export default function OpenPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentEditPurchase, setCurrentEditPurchase] = useState(null);
  const [viewFollowUpModalOpen, setViewFollowUpModalOpen] = useState(false);
  const [currentViewFollowId, setCurrentViewFollowId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [headerFilters, setHeaderFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: "deliveryDateTime", direction: "asc" });
  const [permissions, setPermissions] = useState([]);

  // Load user permissions from localStorage
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

  // Determine if the user has write permission
  const canEdit = permissions.includes("write-purchase");

  useEffect(() => {
    async function fetchPurchases() {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const url = `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases?sortKey=${sortConfig.key}&sortDirection=${sortConfig.direction}`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        setPurchases(res.data);
      } catch (error) {
        console.error("Error fetching open purchases:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPurchases();
  }, [sortConfig]);

  const globalFiltered = purchases.filter((purchase) => {
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

  const headerFiltered = globalFiltered.filter((record) => {
    const filterKeys = [
      "jobSheetCreatedDate",
      "jobSheetNumber",
      "clientCompanyName",
      "eventName",
      "product",
      "sourcingFrom",
      "deliveryDateTime",
      "vendorContactNumber",
      "orderConfirmedDate",
      "expectedReceiveDate",
      "schedulePickUp",
      "remarks",
      "status"
    ];
    return filterKeys.every((key) => {
      if (!headerFilters[key]) return true;
      let value = "";
      if (record[key]) {
        if (key.includes("Date") || key === "schedulePickUp" || key === "deliveryDateTime") {
          value = new Date(record[key]).toLocaleDateString();
        } else {
          value = String(record[key]);
        }
      }
      return value.toLowerCase().includes(headerFilters[key].toLowerCase());
    });
  });

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

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handleOpenEditModal = (purchase) => {
    if (!canEdit) {
      alert("You don't have permission to edit purchases.");
      return;
    }
    setCurrentEditPurchase(purchase);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setCurrentEditPurchase(null);
  };

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
        const res = await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${updatedData._id}`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        returnedData = res.data.purchase;
      } else {
        const res = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        returnedData = res.data.purchase;
      }
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases?sortKey=${sortConfig.key}&sortDirection=${sortConfig.direction}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPurchases(res.data);
      setEditModalOpen(false);
      setCurrentEditPurchase(null);
      alert("Record saved successfully!");
    } catch (error) {
      console.error("Error saving open purchase edit:", error);
      alert("Error saving open purchase edit; check console.");
    }
  };

  const handleOpenViewFollowModal = (purchase) => {
    setCurrentViewFollowId(purchase._id);
    setViewFollowUpModalOpen(true);
  };

  // Skeleton loader while loading data
  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-purple-700 mb-4">Open Purchases</h1>
        <div className="animate-pulse">
          <div className="mb-4 h-8 bg-gray-300 rounded"></div>
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                {Array(15).fill(0).map((_, i) => (
                  <th key={i} className="p-2 border border-gray-300 h-4 bg-gray-300"></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array(5).fill(0).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {Array(15).fill(0).map((_, colIdx) => (
                    <td key={colIdx} className="p-2 border border-gray-300 h-4 bg-gray-300"></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Red warning box if user does not have permission to edit */}
      {!canEdit && (
        <div className="mb-4 p-2 text-red-700 bg-red-200 border border-red-400 rounded">
          You don't have permission to edit purchase records.
        </div>
      )}
      <h1 className="text-2xl font-bold text-purple-700 mb-4">Open Purchases</h1>
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
            <th className="p-2 border border-gray-300 cursor-pointer" onClick={() => handleSort("jobSheetCreatedDate")}>
              Job Sheet Created Date {sortConfig.key === "jobSheetCreatedDate" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300 cursor-pointer" onClick={() => handleSort("jobSheetNumber")}>
              Job Sheet Number {sortConfig.key === "jobSheetNumber" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300 cursor-pointer" onClick={() => handleSort("clientCompanyName")}>
              Client Company Name {sortConfig.key === "clientCompanyName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300 cursor-pointer" onClick={() => handleSort("eventName")}>
              Event Name {sortConfig.key === "eventName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300 cursor-pointer" onClick={() => handleSort("product")}>
              Product {sortConfig.key === "product" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300 cursor-pointer" onClick={() => handleSort("sourcingFrom")}>
              Sourced From {sortConfig.key === "sourcingFrom" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300 cursor-pointer" onClick={() => handleSort("deliveryDateTime")}>
              Delivery Date {sortConfig.key === "deliveryDateTime" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300 cursor-pointer" onClick={() => handleSort("vendorContactNumber")}>
              Vendor Contact Number {sortConfig.key === "vendorContactNumber" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300 cursor-pointer" onClick={() => handleSort("orderConfirmedDate")}>
              Order Confirmed Date {sortConfig.key === "orderConfirmedDate" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300 cursor-pointer" onClick={() => handleSort("expectedReceiveDate")}>
              Expected Receive Date {sortConfig.key === "expectedReceiveDate" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300 cursor-pointer" onClick={() => handleSort("schedulePickUp")}>
              Schedule Pick Up {sortConfig.key === "schedulePickUp" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300">Follow Up</th>
            <th className="p-2 border border-gray-300 cursor-pointer" onClick={() => handleSort("remarks")}>
              Remarks {sortConfig.key === "remarks" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300 cursor-pointer" onClick={() => handleSort("status")}>
              Status {sortConfig.key === "status" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300">Actions</th>
          </tr>
          <HeaderFilters headerFilters={headerFilters} onFilterChange={handleHeaderFilterChange} />
        </thead>
        <tbody>
          {openPurchasesToShow.map((purchase) => {
            const latestFollowUp = purchase.followUp && purchase.followUp.length > 0
              ? purchase.followUp.reduce((latest, fu) =>
                  new Date(fu.updatedAt) > new Date(latest.updatedAt) ? fu : latest
                )
              : null;

            return (
              <tr
                key={purchase._id || (purchase.jobSheetNumber + purchase.product)}
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
                <td className="p-2 border border-gray-300">{purchase.jobSheetNumber}</td>
                <td className="p-2 border border-gray-300">{purchase.clientCompanyName}</td>
                <td className="p-2 border border-gray-300">{purchase.eventName}</td>
                <td className="p-2 border border-gray-300">{purchase.product}</td>
                <td className="p-2 border border-gray-300">{purchase.sourcingFrom}</td>
                <td className="p-2 border border-gray-300">
                  {purchase.deliveryDateTime ? new Date(purchase.deliveryDateTime).toLocaleDateString() : ""}
                </td>
                <td className="p-2 border border-gray-300">{purchase.vendorContactNumber}</td>
                <td className="p-2 border border-gray-300">
                  {purchase.orderConfirmedDate ? new Date(purchase.orderConfirmedDate).toLocaleDateString() : ""}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.expectedReceiveDate ? new Date(purchase.expectedReceiveDate).toLocaleDateString() : ""}
                </td>
                <td className="p-2 border border-gray-300">
                  {purchase.schedulePickUp ? new Date(purchase.schedulePickUp).toLocaleString() : ""}
                </td>
                <td className="p-2 border border-gray-300">
                  {latestFollowUp ? (
                    <button
                      onClick={() => handleOpenViewFollowModal(purchase)}
                      className="text-blue-600 hover:underline"
                      title="View all follow-ups"
                    >
                      {latestFollowUp.note} ({latestFollowUp.followUpDate}
                      {latestFollowUp.done ? ", Done" : ""})
                    </button>
                  ) : (
                    <span>No follow-ups</span>
                  )}
                </td>
                <td className="p-2 border border-gray-300">{purchase.remarks}</td>
                <td className="p-2 border border-gray-300">{purchase.status}</td>
                <td className="p-2 border border-gray-300">
                  <button
                    onClick={() => handleOpenEditModal(purchase)}
                    className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] w-full"
                    disabled={!canEdit || purchase.status === "received"}
                    title={
                      !canEdit
                        ? "You do not have permission to edit."
                        : purchase.status === "received"
                        ? "Record marked as received cannot be edited."
                        : ""
                    }
                  >
                    Edit
                  </button>
                </td>
              </tr>
            );
          })}
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
