// src/pages/CreateProductionJobsheet.js
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Helper function: returns a Tailwind CSS class based on the status value.
const getStatusRowClass = (status) => {
  if (status === "Pending") return "bg-orange-300";
  if (status === "Received") return "bg-green-300";
  if (status === "Alert") return "bg-red-300";
  return "";
};

export default function CreateProductionJobsheet() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  // Read permissions from localStorage
  const storedPermissions = localStorage.getItem("permissions")
    ? JSON.parse(localStorage.getItem("permissions"))
    : [];
  const canEditProduction = storedPermissions.includes("edit-production");
  const canEdit = isEditMode ? canEditProduction : true;

  // State for reference jobsheet & suggestions (create mode only)
  const [refJobSheet, setRefJobSheet] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedClosedPurchase, setSelectedClosedPurchase] = useState(null);

  // Auto-filled fields from the selected closed purchase
  const [orderDate, setOrderDate] = useState("");
  const [jobSheetNumber, setJobSheetNumber] = useState("");
  const [clientCompanyName, setClientCompanyName] = useState("");
  const [eventName, setEventName] = useState("");

  // Production jobsheet items (the products table)
  const [invoiceItems, setInvoiceItems] = useState([]);

  // Follow Up Modal state (for adding/updating follow ups for an item)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [currentFollowUpItemIndex, setCurrentFollowUpItemIndex] = useState(null);

  // --- Fetch existing production jobsheet if in update mode ---
  useEffect(() => {
    if (!isEditMode) return;
    async function fetchProductionJobsheet() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/productionjobsheets/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const jobsheet = res.data;
        setRefJobSheet(jobsheet.referenceJobsheet);
        setOrderDate(
          jobsheet.orderDate ? new Date(jobsheet.orderDate).toISOString().split("T")[0] : ""
        );
        setJobSheetNumber(jobsheet.jobSheetNumber);
        setClientCompanyName(jobsheet.clientCompanyName);
        setEventName(jobsheet.eventName);
        setInvoiceItems(jobsheet.items || []);
      } catch (error) {
        console.error("Error fetching production jobsheet:", error);
      }
    }
    fetchProductionJobsheet();
  }, [isEditMode, id]);

  // --- Fetch suggestions (only in create mode) ---
  useEffect(() => {
    if (isEditMode) return; // Skip in update mode
    async function fetchSuggestions() {
      try {
        const token = localStorage.getItem("token");
        // Using the open purchase API with a suggestion flag.
        const res = await axios.get(
          `${BACKEND_URL}/api/admin/openPurchases?suggestion=true&search=${refJobSheet}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Filter: only include purchases where all items are received (i.e., closed)
        const closedSuggestions = res.data.filter(
          (purchase) =>
            purchase.items &&
            purchase.items.length > 0 &&
            purchase.items.every((item) => item.status === "Received")
        );
        setSuggestions(closedSuggestions);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    }
    if (refJobSheet.length > 0) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [refJobSheet, isEditMode]);

  // When a suggestion is selected, fill in fields and prepare the production items array
  const handleSuggestionSelect = (purchase) => {
    setRefJobSheet(purchase.jobSheetNumber);
    setSelectedClosedPurchase(purchase);
    setOrderDate(
      purchase.jobSheetCreatedDate
        ? new Date(purchase.jobSheetCreatedDate).toISOString().split("T")[0]
        : ""
    );
    setJobSheetNumber(purchase.jobSheetNumber);
    setClientCompanyName(purchase.clientCompanyName);
    setEventName(purchase.eventName);
    if (purchase.items && purchase.items.length > 0) {
      const mappedItems = purchase.items.map((item) => ({
        productName: item.product,
        // Expected In Hand is taken from open purchase's expectedReceiveDate field.
        expectedInHand: item.expectedReceiveDate || "",
        brandingType: item.brandingType || "",
        brandingVendor: item.brandingVendor || "",
        // Manual fields to be filled in production form:
        expectedPostBrandingInAce: "",
        schedulePickup: "",
        followUps: [],
        remarks: "",
        status: "Pending", // Default initial status
      }));
      setInvoiceItems(mappedItems);
    }
    setSuggestions([]);
  };

  // Handler to update an item field in the table
  const handleItemChange = (index, field, value) => {
    setInvoiceItems((prevItems) => {
      const updatedItems = [...prevItems];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      return updatedItems;
    });
  };

  // Handler to open the Follow Up Modal for an item
  const openFollowUpModal = (index) => {
    setCurrentFollowUpItemIndex(index);
    setShowFollowUpModal(true);
  };

  // Handler to close the Follow Up Modal
  const closeFollowUpModal = () => {
    setShowFollowUpModal(false);
    setCurrentFollowUpItemIndex(null);
  };

  // Handler to add a follow up entry for an item.
  // Now using 'createdBy' field to satisfy the Mongoose validation.
  const handleAddFollowUp = (itemIndex, note) => {
    if (!note) return;
    const username = localStorage.getItem("username") || "Unknown User";
    const followUpEntry = {
      note,
      enteredAt: new Date().toISOString(),
      createdBy: username,
    };
    setInvoiceItems((prevItems) => {
      const updatedItems = [...prevItems];
      const currentFollowUps = updatedItems[itemIndex].followUps || [];
      updatedItems[itemIndex].followUps = [...currentFollowUps, followUpEntry];
      return updatedItems;
    });
  };

  // Before saving, if any item's status is marked as Received or Alert, ask for confirmation.
  const handleSaveProductionJobsheet = async () => {
    const needConfirm = invoiceItems.some(
      (item) => item.status === "Received" || item.status === "Alert"
    );
    if (needConfirm) {
      const confirmSave = window.confirm(
        "One or more items have status 'Received' or 'Alert'. Are you sure you want to proceed?"
      );
      if (!confirmSave) return;
    }

    const body = {
      referenceJobsheet: refJobSheet,
      orderDate,
      jobSheetNumber,
      clientCompanyName,
      eventName,
      items: invoiceItems,
    };

    try {
      const token = localStorage.getItem("token");
      if (isEditMode) {
        await axios.put(`${BACKEND_URL}/api/admin/productionjobsheets/${id}`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Production Jobsheet updated successfully!");
      } else {
        await axios.post(`${BACKEND_URL}/api/admin/productionjobsheets`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Production Jobsheet created successfully!");
      }
      navigate("/admin-dashboard/manage-productionjobsheet");
    } catch (error) {
      console.error("Error saving production jobsheet:", error);
      alert("Error saving production jobsheet. Check console.");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-white text-gray-800">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">
        {isEditMode ? "Update Production Jobsheet" : "Create Production Jobsheet"}
      </h1>

      {isEditMode && !canEdit && (
        <div className="p-4 mb-4 bg-red-100 border border-red-300 text-red-800">
          You do not have permission to edit production jobsheets.
        </div>
      )}

      <div className="bg-white p-6 shadow rounded mb-6">
        {/* Reference Jobsheet with Suggestions (create mode only) */}
        {!isEditMode && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-purple-700 mb-1">
              Reference Jobsheet
            </label>
            <input
              type="text"
              value={refJobSheet}
              onChange={(e) => setRefJobSheet(e.target.value)}
              placeholder="Type Reference Jobsheet No..."
              className="border border-purple-300 rounded w-full p-2"
            />
            {suggestions.length > 0 && (
              <div className="border border-gray-300 mt-1 rounded shadow bg-white max-h-60 overflow-y-auto">
                {suggestions.map((purchase) => (
                  <div
                    key={purchase._id}
                    className="p-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                    onClick={() => handleSuggestionSelect(purchase)}
                  >
                    <div className="font-medium text-purple-700">
                      {purchase.jobSheetNumber} - {purchase.clientCompanyName}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Auto-filled Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-1">
              Order Date
            </label>
            <input
              type="text"
              value={orderDate}
              readOnly
              className="border border-purple-300 rounded w-full p-2 bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-1">
              Job Sheet #
            </label>
            <input
              type="text"
              value={jobSheetNumber}
              readOnly
              className="border border-purple-300 rounded w-full p-2 bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-1">
              Client Company Name
            </label>
            <input
              type="text"
              value={clientCompanyName}
              readOnly
              className="border border-purple-300 rounded w-full p-2 bg-gray-100"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-purple-700 mb-1">
              Event Name
            </label>
            <input
              type="text"
              value={eventName}
              readOnly
              className="border border-purple-300 rounded w-full p-2 bg-gray-100"
            />
          </div>
        </div>

        {/* Production Jobsheet Items Table */}
        {invoiceItems.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-purple-100">
                <tr>
                  <th className="px-3 py-2 text-left">Product Name</th>
                  <th className="px-3 py-2 text-left">Expected In Hand</th>
                  <th className="px-3 py-2 text-left">Branding Type</th>
                  <th className="px-3 py-2 text-left">Branding Vendor</th>
                  <th className="px-3 py-2 text-left">Expected Post Branding in Ace</th>
                  <th className="px-3 py-2 text-left">Schedule Pickup</th>
                  <th className="px-3 py-2 text-left">Follow Up</th>
                  <th className="px-3 py-2 text-left">Remarks</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoiceItems.map((item, idx) => (
                  <tr key={idx} className={getStatusRowClass(item.status)}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.productName}
                        readOnly
                        className="border border-gray-300 rounded p-1 w-full bg-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={
                          item.expectedInHand
                            ? new Date(item.expectedInHand).toISOString().split("T")[0]
                            : ""
                        }
                        readOnly
                        className="border border-gray-300 rounded p-1 w-full bg-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.brandingType}
                        readOnly
                        className="border border-gray-300 rounded p-1 w-full bg-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.brandingVendor}
                        readOnly
                        className="border border-gray-300 rounded p-1 w-full bg-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={
                          item.expectedPostBrandingInAce
                            ? new Date(item.expectedPostBrandingInAce).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          handleItemChange(idx, "expectedPostBrandingInAce", e.target.value)
                        }
                        className="border border-gray-300 rounded p-1 w-full"
                        disabled={!canEdit}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="datetime-local"
                        value={
                          item.schedulePickup
                            ? new Date(item.schedulePickup).toISOString().slice(0, 16)
                            : ""
                        }
                        onChange={(e) =>
                          handleItemChange(idx, "schedulePickup", e.target.value)
                        }
                        className="border border-gray-300 rounded p-1 w-full"
                        disabled={!canEdit}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => openFollowUpModal(idx)}
                        className="text-blue-600 hover:text-blue-800"
                        disabled={!canEdit}
                      >
                        + Follow Up
                      </button>
                      {item.followUps && item.followUps.length > 0 && (
                        <ul className="mt-1 text-xs">
                          {item.followUps
                            .slice()
                            .sort((a, b) => new Date(b.enteredAt) - new Date(a.enteredAt))
                            .map((fu, index) => (
                              <li key={index} className="text-gray-700">
                                <span className="font-bold">{fu.createdBy}</span> on{" "}
                                {new Date(fu.enteredAt).toLocaleString()}: {fu.note}
                              </li>
                            ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.remarks}
                        onChange={(e) =>
                          handleItemChange(idx, "remarks", e.target.value)
                        }
                        className="border border-gray-300 rounded p-1 w-full"
                        disabled={!canEdit}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleItemChange(idx, "status", e.target.value)
                        }
                        className="border border-gray-300 rounded p-1 w-full text-sm"
                        disabled={!canEdit}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Received">Received</option>
                        <option value="Alert">Alert</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={handleSaveProductionJobsheet}
          className="mt-6 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          disabled={isEditMode && !canEdit}
        >
          {selectedClosedPurchase ? "Update Production Jobsheet" : "Save Production Jobsheet"}
        </button>
      </div>

      {/* Follow Up Modal */}
      {showFollowUpModal && currentFollowUpItemIndex !== null && (
        <FollowUpModal
          followUps={invoiceItems[currentFollowUpItemIndex].followUps || []}
          onClose={closeFollowUpModal}
          onAdd={(note) => handleAddFollowUp(currentFollowUpItemIndex, note)}
        />
      )}
    </div>
  );
}

// FollowUpModal Component
function FollowUpModal({ followUps, onClose, onAdd }) {
  const [newNote, setNewNote] = useState("");

  const handleAdd = () => {
    if (newNote.trim() === "") return;
    onAdd(newNote);
    setNewNote("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded p-4 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Follow Ups</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 text-2xl">
            &times;
          </button>
        </div>
        <div className="max-h-60 overflow-y-auto mb-4">
          {followUps && followUps.length > 0 ? (
            <ul className="space-y-2">
              {followUps
                .slice()
                .sort((a, b) => new Date(b.enteredAt) - new Date(a.enteredAt))
                .map((fu, index) => (
                  <li key={index} className="text-sm text-gray-700">
                    <span className="font-bold">{fu.createdBy}</span> on {new Date(fu.enteredAt).toLocaleString()}: {fu.note}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No follow ups yet.</p>
          )}
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add new follow up"
            className="w-full border border-gray-300 rounded p-1"
          />
          <button onClick={handleAdd} className="px-3 py-1 bg-blue-500 text-white rounded">
            +
          </button>
        </div>
      </div>
    </div>
  );
}
