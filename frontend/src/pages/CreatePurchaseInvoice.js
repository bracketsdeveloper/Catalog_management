// src/pages/CreatePurchaseInvoice.js
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function CreatePurchaseInvoice() {
  // Get id from URL; if present, we are updating an existing invoice.
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  // Form states
  const [refJobSheetNo, setRefJobSheetNo] = useState("");
  const [jobSheetSuggestions, setJobSheetSuggestions] = useState([]);
  const [selectedOpenPurchase, setSelectedOpenPurchase] = useState(null);

  // Auto-filled fields from the selected open purchase (or fetched invoice)
  const [orderConfirmationDate, setOrderConfirmationDate] = useState("");
  const [jobSheet, setJobSheet] = useState("");
  const [clientName, setClientName] = useState("");
  const [eventName, setEventName] = useState("");

  // Invoice items array
  const [invoiceItems, setInvoiceItems] = useState([]);

  // --- Fetch suggestions only in create mode ---
  useEffect(() => {
    if (isEditMode) return; // Skip suggestions when updating

    async function fetchJobSheetSuggestions() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${BACKEND_URL}/api/admin/openPurchases?suggestion=true&search=${refJobSheetNo}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setJobSheetSuggestions(res.data || []);
      } catch (error) {
        console.error("Error fetching job sheet suggestions:", error);
      }
    }
    if (refJobSheetNo.length > 0) {
      fetchJobSheetSuggestions();
    } else {
      setJobSheetSuggestions([]);
    }
  }, [refJobSheetNo, isEditMode]);

  // --- In update mode, fetch the existing Purchase Invoice by id ---
  useEffect(() => {
    if (!isEditMode) return;

    async function fetchInvoice() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/purchaseinvoices/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const invoice = res.data;
        // Set form states with fetched invoice data
        setRefJobSheetNo(invoice.referenceJobSheetNo);
        setOrderConfirmationDate(
          invoice.orderConfirmationDate
            ? new Date(invoice.orderConfirmationDate).toISOString().split("T")[0]
            : ""
        );
        setJobSheet(invoice.jobSheet);
        setClientName(invoice.clientName);
        setEventName(invoice.eventName);
        setInvoiceItems(invoice.items || []);
      } catch (error) {
        console.error("Error fetching purchase invoice:", error);
      }
    }
    fetchInvoice();
  }, [isEditMode, id]);

  // When a suggestion is selected (only in create mode), autofill the fields
  const handleSuggestionSelect = (purchase) => {
    setRefJobSheetNo(purchase.jobSheetNumber); // Use jobSheetNumber as Reference Jobsheet No
    setSelectedOpenPurchase(purchase);
    setOrderConfirmationDate(
      purchase.jobSheetCreatedDate
        ? new Date(purchase.jobSheetCreatedDate).toISOString().split("T")[0]
        : ""
    );
    setJobSheet(purchase.jobSheetNumber);
    // Prefer clientName from purchase if available; otherwise fallback to clientCompanyName
    setClientName(purchase.clientName || purchase.clientCompanyName);
    setEventName(purchase.eventName);
    // Map products from the open purchase to invoice items.
    if (purchase.items && purchase.items.length > 0) {
      const items = purchase.items.map((item) => ({
        product: item.product,
        sourcingFrom: item.sourcingFrom,
        cost: "",
        negotiatedCost: "",
        paymentMode: "",
        paymentRef: "",
        vendorInvoiceNumber: "",
        vendorInvoiceReceived: false,
      }));
      setInvoiceItems(items);
    }
    setJobSheetSuggestions([]);
  };

  // Handler to update an invoice item field
  const handleInvoiceItemChange = (index, field, value) => {
    setInvoiceItems((prevItems) => {
      const updatedItems = [...prevItems];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      return updatedItems;
    });
  };

  // Save (create or update) Purchase Invoice
  const handleSaveInvoice = async () => {
    const body = {
      referenceJobSheetNo: refJobSheetNo,
      orderConfirmationDate,
      jobSheet,
      clientName,
      eventName,
      items: invoiceItems,
    };

    try {
      const token = localStorage.getItem("token");
      if (isEditMode) {
        // Update existing invoice
        await axios.put(`${BACKEND_URL}/api/admin/purchaseinvoices/${id}`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Purchase Invoice updated successfully!");
      } else {
        // Create new invoice
        await axios.post(`${BACKEND_URL}/api/admin/purchaseinvoices`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Purchase Invoice created successfully!");
      }
      navigate("/admin-dashboard/manage-purchaseinvoice");
    } catch (error) {
      console.error("Error saving purchase invoice:", error);
      alert("Error saving purchase invoice. Check console.");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-white text-gray-800">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">
        {isEditMode ? "Update Purchase Invoice" : "Create Purchase Invoice"}
      </h1>

      <div className="bg-white p-6 shadow rounded mb-6">
        {/* Reference Jobsheet No Field with Suggestions (only when creating) */}
        {!isEditMode && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-purple-700 mb-1">
              Reference Jobsheet No
            </label>
            <input
              type="text"
              value={refJobSheetNo}
              onChange={(e) => setRefJobSheetNo(e.target.value)}
              placeholder="Type Reference Jobsheet No..."
              className="border border-purple-300 rounded w-full p-2"
            />
            {jobSheetSuggestions.length > 0 && (
              <div className="border border-gray-300 mt-1 rounded shadow bg-white max-h-60 overflow-y-auto">
                {jobSheetSuggestions.map((purchase) => (
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
              Order Confirmation Date
            </label>
            <input
              type="text"
              value={orderConfirmationDate}
              readOnly
              className="border border-purple-300 rounded w-full p-2 bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-1">
              Job Sheet
            </label>
            <input
              type="text"
              value={jobSheet}
              readOnly
              className="border border-purple-300 rounded w-full p-2 bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-1">
              Client Name
            </label>
            <input
              type="text"
              value={clientName}
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

        {/* Invoice Items Table */}
        {invoiceItems.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-purple-100">
                <tr>
                  <th className="px-3 py-2 text-left">Product Name</th>
                  <th className="px-3 py-2 text-left">Source From</th>
                  <th className="px-3 py-2 text-left">Cost</th>
                  <th className="px-3 py-2 text-left">Negotiated Cost</th>
                  <th className="px-3 py-2 text-left">Payment Mode</th>
                  <th className="px-3 py-2 text-left">Payment Ref.</th>
                  <th className="px-3 py-2 text-left">Vendor Invoice Number</th>
                  <th className="px-3 py-2 text-left">Vendor Invoice Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoiceItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.product}
                        readOnly
                        className="border border-gray-300 rounded p-1 w-full bg-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.sourcingFrom}
                        readOnly
                        className="border border-gray-300 rounded p-1 w-full bg-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.cost}
                        onChange={(e) =>
                          handleInvoiceItemChange(idx, "cost", e.target.value)
                        }
                        className="border border-gray-300 rounded p-1 w-full"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.negotiatedCost}
                        onChange={(e) =>
                          handleInvoiceItemChange(idx, "negotiatedCost", e.target.value)
                        }
                        className="border border-gray-300 rounded p-1 w-full"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.paymentMode}
                        onChange={(e) =>
                          handleInvoiceItemChange(idx, "paymentMode", e.target.value)
                        }
                        className="border border-gray-300 rounded p-1 w-full"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.paymentRef}
                        onChange={(e) =>
                          handleInvoiceItemChange(idx, "paymentRef", e.target.value)
                        }
                        className="border border-gray-300 rounded p-1 w-full"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.vendorInvoiceNumber}
                        onChange={(e) =>
                          handleInvoiceItemChange(idx, "vendorInvoiceNumber", e.target.value)
                        }
                        className="border border-gray-300 rounded p-1 w-full"
                        placeholder="Invoice No."
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={item.vendorInvoiceReceived ? "Yes" : "No"}
                        onChange={(e) =>
                          handleInvoiceItemChange(idx, "vendorInvoiceReceived", e.target.value === "Yes")
                        }
                        className="border border-gray-300 rounded p-1 w-full text-sm"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={handleSaveInvoice}
          className="mt-6 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          {isEditMode ? "Update Purchase Invoice" : "Save Purchase Invoice"}
        </button>
      </div>
    </div>
  );
}