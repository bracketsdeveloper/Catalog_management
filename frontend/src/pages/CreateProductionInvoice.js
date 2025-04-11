// src/pages/CreateProductionInvoice.js
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function CreateProductionInvoice() {
  // Get id from URL; if exists, we're in update mode.
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  // State for Reference Jobsheet & suggestions
  const [refJobSheet, setRefJobSheet] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedProductionJobsheet, setSelectedProductionJobsheet] = useState(null);

  // Auto-filled fields from the selected production jobsheet
  const [orderConfirmationDate, setOrderConfirmationDate] = useState("");
  const [jobSheet, setJobSheet] = useState("");
  const [clientName, setClientName] = useState("");
  const [eventName, setEventName] = useState("");

  // Invoice Items (the products table)
  const [invoiceItems, setInvoiceItems] = useState([]);

  // --- Fetch existing Production Invoice if in update mode ---
  useEffect(() => {
    if (!isEditMode) return;
    async function fetchInvoice() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/productioninvoices/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const invoice = res.data;
        setRefJobSheet(invoice.referenceJobsheetNo);
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
        console.error("Error fetching production invoice:", error);
      }
    }
    fetchInvoice();
  }, [isEditMode, id]);

  // --- Fetch suggestions (only in create mode) ---
  useEffect(() => {
    if (isEditMode) return;
    async function fetchSuggestions() {
      try {
        const token = localStorage.getItem("token");
        // Using the production jobsheet API with suggestion flag.
        const res = await axios.get(
          `${BACKEND_URL}/api/admin/productionjobsheets?suggestion=true&search=${refJobSheet}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Assume backend returns production jobsheets that are available for referencing.
        setSuggestions(res.data || []);
      } catch (error) {
        console.error("Error fetching production jobsheet suggestions:", error);
      }
    }
    if (refJobSheet.length > 0) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [refJobSheet, isEditMode]);

  // When a suggestion is selected, fill in the fields and prepare the invoice items array.
  const handleSuggestionSelect = (purchase) => {
    setRefJobSheet(purchase.jobSheetNumber);
    setSelectedProductionJobsheet(purchase);
    setOrderConfirmationDate(
      purchase.orderDate
        ? new Date(purchase.orderDate).toISOString().split("T")[0]
        : ""
    );
    setJobSheet(purchase.jobSheetNumber);
    // Assume production jobsheet has clientCompanyName and eventName.
    setClientName(purchase.clientCompanyName || "");
    setEventName(purchase.eventName || "");
    // Map production jobsheet items to invoice items. (sourcingFrom removed)
    const mappedItems = (purchase.items || []).map((item) => ({
      product: item.productName,
      cost: "",
      negotiatedCost: "",
      paymentMode: "",
      paymentRef: "",
      vendorInvoiceNumber: "",
      vendorInvoiceReceived: false,
    }));
    setInvoiceItems(mappedItems);
    setSuggestions([]);
  };

  // Handler to update an invoice item field
  const handleInvoiceItemChange = (index, field, value) => {
    setInvoiceItems((prevItems) => {
      const updatedItems = [...prevItems];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      return updatedItems;
    });
  };

  // Save Production Invoice
  const handleSaveInvoice = async () => {
    const body = {
      referenceJobsheetNo: refJobSheet,
      orderConfirmationDate,
      jobSheet,
      clientName,
      eventName,
      items: invoiceItems,
    };

    try {
      const token = localStorage.getItem("token");
      if (isEditMode) {
        await axios.put(`${BACKEND_URL}/api/admin/productioninvoices/${id}`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Production Invoice updated successfully!");
      } else {
        await axios.post(`${BACKEND_URL}/api/admin/productioninvoices`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Production Invoice created successfully!");
      }
      navigate("/admin-dashboard/manage-production-invoice");
    } catch (error) {
      console.error("Error saving production invoice:", error);
      alert("Error saving production invoice. Check console.");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-white text-gray-800">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">
        {isEditMode ? "Update Production Invoice" : "Create Production Invoice"}
      </h1>

      <div className="bg-white p-6 shadow rounded mb-6">
        {/* Reference Jobsheet with Suggestions (create mode only) */}
        {!isEditMode && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-purple-700 mb-1">
              Reference Jobsheet No
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
                {suggestions.map((jobsheet) => (
                  <div
                    key={jobsheet._id}
                    className="p-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                    onClick={() => handleSuggestionSelect(jobsheet)}
                  >
                    <div className="font-medium text-purple-700">
                      {jobsheet.jobSheetNumber} - {jobsheet.clientCompanyName}
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
                  <th className="px-3 py-2 text-left">Cost</th>
                  <th className="px-3 py-2 text-left">Negotiated Cost</th>
                  <th className="px-3 py-2 text-left">Payment Mode</th>
                  <th className="px-3 py-2 text-left">Payment Ref</th>
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
                        type="number"
                        value={item.cost}
                        onChange={(e) => handleInvoiceItemChange(idx, "cost", e.target.value)}
                        className="border border-gray-300 rounded p-1 w-full"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.negotiatedCost}
                        onChange={(e) => handleInvoiceItemChange(idx, "negotiatedCost", e.target.value)}
                        className="border border-gray-300 rounded p-1 w-full"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.paymentMode}
                        onChange={(e) => handleInvoiceItemChange(idx, "paymentMode", e.target.value)}
                        className="border border-gray-300 rounded p-1 w-full"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.paymentRef}
                        onChange={(e) => handleInvoiceItemChange(idx, "paymentRef", e.target.value)}
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
                          handleInvoiceItemChange(
                            idx,
                            "vendorInvoiceReceived",
                            e.target.value === "Yes"
                          )
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
          {isEditMode ? "Update Production Invoice" : "Save Production Invoice"}
        </button>
      </div>
    </div>
  );
}
