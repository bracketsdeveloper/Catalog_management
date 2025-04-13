// src/pages/CreateOpenPurchase.js
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import OpenPurchaseItemModal from "../components/openPurchase/OpenPurchaseItemModal.js";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function CreateOpenPurchase() {
  // Detect update mode if an id is present in the URL.
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  // State variables for job sheet lookup (used only in create mode)
  const [jobSheetNumber, setJobSheetNumber] = useState("");
  const [jobSheetSuggestions, setJobSheetSuggestions] = useState([]);
  const [selectedJobSheet, setSelectedJobSheet] = useState(null);

  // Auto-filled fields from the job sheet
  const [jobSheetCreatedDate, setJobSheetCreatedDate] = useState("");
  const [clientCompanyName, setClientCompanyName] = useState("");
  const [eventName, setEventName] = useState("");

  // Items from the job sheet (extended with extra purchase details)
  const [items, setItems] = useState([]);

  // Modal state for editing product details
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItemIndex, setModalItemIndex] = useState(null);

  // Helper function: returns a tailwind class based on item status
  const getStatusRowClass = (status) => {
    if (status === "Pending") return "bg-orange-300";
    if (status === "Received") return "bg-green-300";
    if (status === "Alert") return "bg-red-300";
    return "";
  };

  // In create mode, fetch job sheet suggestions as user types
  useEffect(() => {
    if (isEditMode) return; // skip suggestions in update mode

    const fetchJobSheetSuggestions = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${BACKEND_URL}/api/admin/jobsheets?suggestion=true&search=${jobSheetNumber}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setJobSheetSuggestions(res.data || []);
      } catch (error) {
        console.error("Error fetching job sheet suggestions:", error);
      }
    };

    if (jobSheetNumber.length > 0) {
      fetchJobSheetSuggestions();
    } else {
      setJobSheetSuggestions([]);
    }
  }, [jobSheetNumber, isEditMode]);

  // In update mode, fetch open purchase details by id
  useEffect(() => {
    if (!isEditMode) return;

    const fetchOpenPurchase = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/openPurchases/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const purchase = res.data;
        setJobSheetNumber(purchase.jobSheetNumber);
        setJobSheetCreatedDate(
          purchase.jobSheetCreatedDate
            ? new Date(purchase.jobSheetCreatedDate).toISOString().split("T")[0]
            : ""
        );
        setClientCompanyName(purchase.clientCompanyName);
        setEventName(purchase.eventName);
        setItems(purchase.items || []);
        setJobSheetSuggestions([]);
      } catch (error) {
        console.error("Error fetching open purchase:", error);
      }
    };

    fetchOpenPurchase();
  }, [isEditMode, id]);

  // When a job sheet is selected (in create mode), auto-fill fields and items list
  const handleJobSheetSelect = (jobSheet) => {
    setJobSheetNumber(jobSheet.jobSheetNumber);
    setSelectedJobSheet(jobSheet);
    setJobSheetCreatedDate(jobSheet.createdAt ? jobSheet.createdAt.split("T")[0] : "");
    setClientCompanyName(jobSheet.clientCompanyName);
    setEventName(jobSheet.eventName);
    const mappedItems = jobSheet.items.map((item) => ({
      ...item,
      vendorContactNumber: "",
      orderConfirmedDate: "",
      expectedReceiveDate: "",
      scheduledPickup: "",
      followUp: "",
      remarks: "",
      status: "Pending",
    }));
    setItems(mappedItems);
    setJobSheetSuggestions([]);
  };

  // Open modal for a specific product item
  const openModalForItem = (index) => {
    setModalItemIndex(index);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalItemIndex(null);
  };

  const handleModalSave = (updatedItem) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[modalItemIndex] = { ...newItems[modalItemIndex], ...updatedItem };
      return newItems;
    });
    closeModal();
  };

  // Save (POST) or update (PUT) the open purchase record.
  // Before saving, if any item's status is "Alert", confirm with the user.
  const handleSaveOpenPurchase = async () => {
    // Check if any product is marked as Alert.
    const hasAlert = items.some((item) => item.status === "Alert");
    if (hasAlert) {
      const confirmSave = window.confirm(
        "Some items are marked as Alert. Do you really want to save with these statuses?"
      );
      if (!confirmSave) return;
    }

    const body = {
      jobSheetNumber,
      jobSheetCreatedDate,
      clientCompanyName,
      eventName,
      items,
    };

    try {
      const token = localStorage.getItem("token");
      if (isEditMode) {
        await axios.put(`${BACKEND_URL}/api/admin/openPurchases/${id}`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Open Purchase updated successfully!");
      } else {
        await axios.post(`${BACKEND_URL}/api/admin/openPurchases`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Open Purchase created successfully!");
      }
      navigate("/admin-dashboard/manage-openpurchase");
    } catch (error) {
      console.error("Error saving open purchase:", error);
      alert("Error saving open purchase. Check console.");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-white text-gray-800">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">
        {isEditMode ? "Update Open Purchase" : "Create Open Purchase"}
      </h1>

      <div className="bg-white p-4 shadow rounded mb-6">
        {/* Job Sheet and Auto-filled Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block mb-1 font-medium text-purple-700">Job Sheet #</label>
            <input
              type="text"
              value={jobSheetNumber}
              onChange={(e) => setJobSheetNumber(e.target.value)}
              className="border border-purple-300 rounded w-full p-2"
              placeholder="Type Job Sheet Number..."
              readOnly={isEditMode}
            />
            {!isEditMode && jobSheetSuggestions.length > 0 && (
              <div className="border border-gray-300 mt-1 rounded shadow bg-white max-h-60 overflow-y-auto">
                {jobSheetSuggestions.map((js) => (
                  <div
                    key={js._id}
                    className="p-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                    onClick={() => handleJobSheetSelect(js)}
                  >
                    <div className="font-medium text-purple-700">{js.jobSheetNumber}</div>
                    <p className="text-sm text-gray-600 truncate">{js.eventName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block mb-1 font-medium text-purple-700">Job Sheet Created Date</label>
            <input
              type="text"
              value={jobSheetCreatedDate}
              readOnly
              className="border border-purple-300 rounded w-full p-2 bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-purple-700">Client Company Name</label>
            <input
              type="text"
              value={clientCompanyName}
              readOnly
              className="border border-purple-300 rounded w-full p-2 bg-gray-100"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block mb-1 font-medium text-purple-700">Event Name</label>
            <input
              type="text"
              value={eventName}
              readOnly
              className="border border-purple-300 rounded w-full p-2 bg-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Products Table: Render if there is at least one item */}
      {items.length > 0 && (
        <div className="bg-white p-4 shadow rounded mb-6">
          <h2 className="text-xl font-bold text-purple-700 mb-4">Products</h2>
          <table className="min-w-full">
            <thead className="bg-purple-100">
              <tr>
                <th className="px-4 py-2 text-left">Sl No</th>
                <th className="px-4 py-2 text-left">Product</th>
                <th className="px-4 py-2 text-left">Color</th>
                <th className="px-4 py-2 text-left">Size</th>
                <th className="px-4 py-2 text-left">Quantity</th>
                <th className="px-4 py-2 text-left">Sourcing From</th>
                <th className="px-4 py-2 text-left">Branding Type</th>
                <th className="px-4 py-2 text-left">Branding Vendor</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, idx) => (
                <tr key={idx} className={getStatusRowClass(item.status)}>
                  <td className="px-4 py-2">{item.slNo}</td>
                  <td className="px-4 py-2">{item.product}</td>
                  <td className="px-4 py-2">{item.color}</td>
                  <td className="px-4 py-2">{item.size}</td>
                  <td className="px-4 py-2">{item.quantity}</td>
                  <td className="px-4 py-2">{item.sourcingFrom}</td>
                  <td className="px-4 py-2">{item.brandingType}</td>
                  <td className="px-4 py-2">{item.brandingVendor}</td>
                  <td className="px-4 py-2">
                    <select
                      value={item.status}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        setItems((prevItems) =>
                          prevItems.map((itm, i) =>
                            i === idx ? { ...itm, status: newStatus } : itm
                          )
                        );
                      }}
                      className="border border-gray-300 rounded p-1 text-sm"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Received">Received</option>
                      <option value="Alert">Alert</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => openModalForItem(idx)}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      &#8942;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={handleSaveOpenPurchase}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
      >
        {isEditMode ? "Update Open Purchase" : "Save Open Purchase"}
      </button>

      {modalOpen && modalItemIndex !== null && (
        <OpenPurchaseItemModal
          item={items[modalItemIndex]}
          onClose={closeModal}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
