"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function QuotationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [editableQuotation, setEditableQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTerm, setNewTerm] = useState({ heading: "", content: "" });
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingTermIdx, setEditingTermIdx] = useState(null);
  const [products, setProducts] = useState([]);
  const [operationModalOpen, setOperationModalOpen] = useState(false);
  const [newOperation, setNewOperation] = useState({
    ourCost: "",
    branding: "",
    delivery: "",
    markup: "",
    total: "",
    vendor: "",
    remarks: "",
    reference: "",
  });
  const [editingOperationId, setEditingOperationId] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [vendorSuggestions, setVendorSuggestions] = useState([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const token = localStorage.getItem("token");

  const defaultTerms = [
    {
      heading: "Delivery",
      content:
        "10 – 12 Working days upon order confirmation\nSingle delivery to Hyderabad office included in the cost",
    },
    { heading: "Branding", content: "As mentioned above" },
    { heading: "Payment Terms", content: "Within 30 days upon delivery" },
    {
      heading: "Quote Validity",
      content: "The quote is valid only for 6 days from the date of quotation",
    },
  ];

  useEffect(() => {
    fetchQuotation();
    fetchProducts();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (editableQuotation && (!editableQuotation.terms || editableQuotation.terms.length === 0)) {
      setEditableQuotation((prev) => ({ ...prev, terms: defaultTerms }));
    }
    // eslint-disable-next-line
  }, [editableQuotation?.terms]);

  useEffect(() => {
    if (operationModalOpen) {
      fetchVendors();
    }
    // eslint-disable-next-line
  }, [operationModalOpen]);

  useEffect(() => {
    const ourCost = parseFloat(newOperation.ourCost) || 0;
    const branding = parseFloat(newOperation.branding) || 0;
    const delivery = parseFloat(newOperation.delivery) || 0;
    const markup = parseFloat(newOperation.markup) || 0;
    const total = (ourCost + branding + delivery + markup).toFixed(2);
    setNewOperation((prev) => ({ ...prev, total }));
  }, [newOperation.ourCost, newOperation.branding, newOperation.delivery, newOperation.markup]);

  async function fetchProducts() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error.response?.data || error.message);
    }
  }

  async function fetchVendors() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendors(res.data || []);
    } catch (error) {
      console.error("Error fetching vendors:", error.response?.data || error.message);
    }
  }

  async function fetchQuotation() {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch quotation");
      }
      const data = await res.json();
      const sanitizedItems = (data.items || []).map((item, idx) => ({
        ...item,
        quantity: parseFloat(item.quantity) || 1,
        slNo: item.slNo || idx + 1,
        productGST: item.productGST != null ? parseFloat(item.productGST) : 18,
        rate: parseFloat(item.rate) || 0,
        product: item.product || "Unknown Product",
      }));
      setQuotation({ ...data, items: sanitizedItems });
      setEditableQuotation({ ...data, items: sanitizedItems });
      setError(null);
    } catch (err) {
      console.error("Error fetching quotation:", err);
      setError("Failed to load quotation");
    } finally {
      setLoading(false);
    }
  }

  function handleVendorInputChange(value) {
    setNewOperation((prev) => ({ ...prev, vendor: value }));
    if (value.trim() === "") {
      setVendorSuggestions([]);
      setShowVendorDropdown(false);
      return;
    }
    const lowerValue = value.toLowerCase();
    const suggestions = vendors.filter(
      (vendor) =>
        vendor.vendorName?.toLowerCase().includes(lowerValue) ||
        vendor.vendorCompany?.toLowerCase().includes(lowerValue)
    );
    setVendorSuggestions(suggestions);
    setShowVendorDropdown(suggestions.length > 0);
  }

  function handleVendorSelect(vendor) {
    setNewOperation((prev) => ({ ...prev, vendor: vendor.vendorName }));
    setShowVendorDropdown(false);
  }

  async function handleSaveQuotation() {
    if (!editableQuotation) return;
    try {
      const updatedMargin = parseFloat(editableQuotation.margin) || 0;
      const {
        opportunityNumber,
        catalogName,
        salutation,
        customerName,
        customerEmail,
        customerCompany,
        customerAddress,
        gst,
        items,
        terms,
        fieldsToDisplay,
        displayTotals,
        displayHSNCodes,
        operations,
      } = editableQuotation;

      const updatedItems = items.map((item) => {
        const baseRate = parseFloat(item.rate) || 0;
        const quantity = parseFloat(item.quantity) || 1;
        const marginFactor = 1 + updatedMargin / 100;
        const effRate = baseRate * marginFactor;
        const amount = effRate * quantity;
        const gstRate = item.productGST != null ? parseFloat(item.productGST) : 18;
        const gstAmount = parseFloat((amount * (gstRate / 100)).toFixed(2));
        const total = parseFloat((amount + gstAmount).toFixed(2));
        return {
          ...item,
          rate: baseRate,
          amount,
          total,
          productprice: baseRate,
          productGST: gstRate,
          quantity,
          productId: item.productId?._id || item.productId,
        };
      });

      const body = {
        opportunityNumber,
        catalogName,
        salutation,
        customerName,
        customerEmail,
        customerCompany,
        customerAddress,
        margin: updatedMargin,
        gst,
        items: updatedItems,
        terms,
        fieldsToDisplay,
        displayTotals,
        displayHSNCodes,
        operations,
      };

      const updateRes = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!updateRes.ok) {
        throw new Error("Failed to update quotation");
      }

      const createRes = await fetch(`${BACKEND_URL}/api/admin/quotations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!createRes.ok) {
        throw new Error("Failed to create new quotation");
      }

      const data = await createRes.json();
      if (!data || !data.quotation || !data.quotation._id) {
        throw new Error("Invalid response from server: Missing quotation data");
      }

      alert("New Quotation created!");
      setQuotation(data.quotation);
      setEditableQuotation(data.quotation);
      navigate(`/admin-dashboard/quotations/${data.quotation._id}`);
    } catch (error) {
      console.error("Save error:", error);
      alert(`Failed to save quotation: ${error.message}`);
    }
  }

  function handleHeaderBlur(field, e) {
    setEditableQuotation((prev) => ({
      ...prev,
      [field]: e.target.innerText,
    }));
  }

  function updateItemField(index, field, newValue) {
    setEditableQuotation((prev) => {
      const newItems = [...prev.items];
      if (field === "quantity" || field === "productGST" || field === "rate") {
        const parsedValue = parseFloat(newValue);
        newItems[index] = {
          ...newItems[index],
          [field]: isNaN(parsedValue) ? (field === "productGST" ? 18 : 1) : parsedValue,
        };
      } else {
        newItems[index] = { ...newItems[index], [field]: newValue };
      }
      return { ...prev, items: newItems };
    });
  }

  function removeItem(index) {
    setEditableQuotation((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((item, idx) => ({ ...item, slNo: idx + 1 })),
    }));
  }

  function handleAddEmail() {
    const email = window.prompt("Enter customer email:");
    if (email) {
      setEditableQuotation((prev) => ({
        ...prev,
        customerEmail: email,
      }));
    }
  }

  function handleAddTerm() {
    if (newTerm.heading && newTerm.content) {
      setEditableQuotation((prev) => ({
        ...prev,
        terms: [...prev.terms, newTerm],
      }));
      setNewTerm({ heading: "", content: "" });
      setTermModalOpen(false);
    }
  }

  function handleEditTerm(idx) {
    const term = editableQuotation.terms[idx];
    setNewTerm({ heading: term.heading, content: term.content });
    setEditingTermIdx(idx);
    setTermModalOpen(true);
  }

  function handleUpdateTerm() {
    const updatedTerms = [...editableQuotation.terms];
    updatedTerms[editingTermIdx] = { heading: newTerm.heading, content: newTerm.content };
    setEditableQuotation((prev) => ({
      ...prev,
      terms: updatedTerms,
    }));
    setTermModalOpen(false);
    setEditingTermIdx(null);
  }

  async function handleAddOperation() {
    try {
      const body = { ...newOperation };

      const res = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}/operations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to add operation cost");

      const data = await res.json();
      setEditableQuotation(data.quotation);
      setQuotation(data.quotation);
      setNewOperation({
        ourCost: "",
        branding: "",
        delivery: "",
        markup: "",
        total: "",
        vendor: "",
        remarks: "",
        reference: "",
      });
      setShowVendorDropdown(false);
      setOperationModalOpen(false);
    } catch (error) {
      console.error("Error adding operation:", error);
      alert("Failed to add operation cost");
    }
  }

  async function handleUpdateOperation() {
    try {
      const body = { ...newOperation };

      const res = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}/operations/${editingOperationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to update operation cost");

      const data = await res.json();
      setEditableQuotation(data.quotation);
      setQuotation(data.quotation);
      setNewOperation({
        ourCost: "",
        branding: "",
        delivery: "",
        markup: "",
        total: "",
        vendor: "",
        remarks: "",
        reference: "",
      });
      setShowVendorDropdown(false);
      setOperationModalOpen(false);
      setEditingOperationId(null);
    } catch (error) {
      console.error("Error updating operation:", error);
      alert("Failed to update operation cost");
    }
  }

  function handleViewOperation(op) {
    console.log("Operation data (raw):", op);
    console.log("Operation data (JSON):", JSON.stringify(op, null, 2));

    const operationData = {
      ourCost: String(op?.ourCost ?? ""),
      branding: String(op?.branding ?? ""),
      delivery: String(op?.delivery ?? ""),
      markup: String(op?.markup ?? ""),
      total: String(op?.total ?? ""),
      vendor: String(op?.vendor ?? ""),
      remarks: String(op?.remarks ?? ""),
      reference: String(op?.reference ?? ""),
    };

    setNewOperation(operationData);
    setEditingOperationId(op?._id?.toString() || null);
    setOperationModalOpen(true);

    console.log("Set newOperation:", JSON.stringify(operationData, null, 2));
  }

  const handleExportPDF = () => {
    navigate(`/admin-dashboard/print-quotation/${id}`);
  };

  if (loading) return <div className="p-6 text-gray-400">Loading quotation...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!editableQuotation || !editableQuotation.items) return <div className="p-6 text-gray-400">Quotation not found.</div>;

  const marginFactor = 1 + (parseFloat(editableQuotation.margin) || 0) / 100;

  return (
    <div className="p-6 bg-white text-black min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleExportPDF}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs"
        >
          Export to PDF
        </button>
        <div className="flex space-x-4">
          <button
            onClick={async () => {
              try {
                const res = await axios.post(
                  `${BACKEND_URL}/api/admin/dc/${id}`,
                  {},
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                alert("Delivery Challan created successfully!");
                navigate(`/admin-delivery-challan/${res.data.deliveryChallan._id}`);
              } catch (error) {
                console.error("Error generating delivery challan:", error);
                alert("Failed to generate delivery challan.");
              }
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-xs"
          >
            Generate Delivery Challan
          </button>
          <button
            onClick={handleSaveQuotation}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs"
          >
            Save Changes
          </button>
          <button
            onClick={() => setEditableQuotation((prev) => ({ ...prev, displayTotals: !prev.displayTotals }))}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs"
          >
            {editableQuotation.displayTotals ? "Hide Totals" : "Show Totals"}
          </button>
          <button
            onClick={() => setEditableQuotation((prev) => ({ ...prev, displayHSNCodes: !prev.displayHSNCodes }))}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-xs"
          >
            {editableQuotation.displayHSNCodes ? "Hide HSN Codes" : "Show HSN Codes"}
          </button>
          <button
            onClick={() => setOperationModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-xs"
          >
            {editableQuotation.operations?.length > 0 ? "View Operations Cost" : "Add Operations Cost"}
          </button>
        </div>
      </div>

      <div className="mb-4 space-y-2 text-xs">
        {editableQuotation.customerName && (
          <div>
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleHeaderBlur("salutation", e)}
            >
              {editableQuotation.salutation || "Mr."}
            </span>{" "}
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleHeaderBlur("customerName", e)}
            >
              {editableQuotation.customerName}
            </span>
          </div>
        )}
        <div>
          <span
            type="text"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleHeaderBlur("customerCompany", e)}
          >
            {editableQuotation.customerCompany}
          </span>
        </div>
        {editableQuotation.customerAddress && (
          <div>
            <span className="font-bold uppercase">Address:</span>{" "}
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleHeaderBlur("customerAddress", e)}
            >
              {editableQuotation.customerAddress}
            </span>
          </div>
        )}
      </div>

      <div className="mb-6">
        <button
          onClick={() => setTermModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mb-4 text-xs"
        >
          + Add Terms
        </button>
        {editableQuotation.terms.map((term, idx) => (
          <div key={idx} className="mb-4 text-xs">
            <div className="font-semibold">{term.heading}</div>
            <div>{term.content}</div>
            <button
              onClick={() => handleEditTerm(idx)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded mt-2 text-xs"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {termModalOpen && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50">
          <div className="bg-white p-6 rounded w-1/3">
            <h2 className="text-xl font-semibold mb-4">
              {editingTermIdx !== null ? "Edit Term" : "Add Term"}
            </h2>
            <div className="mb-4">
              <input
                type="text"
                value={newTerm.heading}
                placeholder="Term Heading"
                onChange={(e) => setNewTerm((prev) => ({ ...prev, heading: e.target.value }))}
                className="border p-2 w-full text-xs"
                readOnly={editingTermIdx !== null}
              />
            </div>
            <div className="mb-4">
              <textarea
                value={newTerm.content}
                placeholder="Term Content"
                onChange={(e) => setNewTerm((prev) => ({ ...prev, content: e.target.value }))}
                className="border p-2 w-full text-xs"
                rows="4"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setTermModalOpen(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={editingTermIdx !== null ? handleUpdateTerm : handleAddTerm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs"
              >
                {editingTermIdx !== null ? "Update Term" : "Add Term"}
              </button>
            </div>
          </div>
        </div>
      )}

      {operationModalOpen && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50">
          <div className="bg-white p-6 rounded w-1/2">
            <h2 className="text-xl font-semibold mb-4">
              {editingOperationId ? "View/Edit Operation Cost" : "Add Operation Cost"}
            </h2>
            {/* <div className="mb-4 text-xs text-red-500">
              Debug: {JSON.stringify(newOperation)}
            </div> */}
            <div className="grid grid-cols-2 gap-4">
              <div className="mb-4">
                <label className="block text-xs">Our Cost</label>
                <input
                  type="text"
                  value={newOperation.ourCost || ""}
                  onChange={(e) => setNewOperation((prev) => ({ ...prev, ourCost: e.target.value }))}
                  className="border p-2 w-full text-xs"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs">Branding</label>
                <input
                  type="text"
                  value={newOperation.branding || ""}
                  onChange={(e) => setNewOperation((prev) => ({ ...prev, branding: e.target.value }))}
                  className="border p-2 w-full text-xs"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs">Delivery</label>
                <input
                  type="text"
                  value={newOperation.delivery || ""}
                  onChange={(e) => setNewOperation((prev) => ({ ...prev, delivery: e.target.value }))}
                  className="border p-2 w-full text-xs"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs">Markup</label>
                <input
                  type="text"
                  value={newOperation.markup || ""}
                  onChange={(e) => setNewOperation((prev) => ({ ...prev, markup: e.target.value }))}
                  className="border p-2 w-full text-xs"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs">Total</label>
                <input
                  type="text"
                  value={newOperation.total || ""}
                  readOnly
                  className="border p-2 w-full text-xs bg-gray-100"
                />
              </div>
              <div className="mb-4 relative">
                <label className="block text-xs">Vendor</label>
                <input
                  type="text"
                  value={newOperation.vendor || ""}
                  onChange={(e) => handleVendorInputChange(e.target.value)}
                  onFocus={() => handleVendorInputChange(newOperation.vendor)}
                  className="border p-2 w-full text-xs"
                />
                {showVendorDropdown && (
                  <ul className="absolute z-10 bg-white border rounded w-full max-h-40 overflow-y-auto text-xs">
                    {vendorSuggestions.map((vendor) => (
                      <li
                        key={vendor._id}
                        onClick={() => handleVendorSelect(vendor)}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                      >
                        {vendor.vendorName} ({vendor.vendorCompany})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-xs">Remarks</label>
                <textarea
                  value={newOperation.remarks || ""}
                  onChange={(e) => setNewOperation((prev) => ({ ...prev, remarks: e.target.value }))}
                  className="border p-2 w-full text-xs"
                  rows="3"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs">Reference</label>
                <input
                  type="text"
                  value={newOperation.reference || ""}
                  onChange={(e) => setNewOperation((prev) => ({ ...prev, reference: e.target.value }))}
                  className="border p-2 w-full text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setOperationModalOpen(false);
                  setEditingOperationId(null);
                  setNewOperation({
                    ourCost: "",
                    branding: "",
                    delivery: "",
                    markup: "",
                    total: "",
                    vendor: "",
                    remarks: "",
                    reference: "",
                  });
                  setShowVendorDropdown(false);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded text-xs"
              >
                Cancel
              </button>
              {editingOperationId ? (
                <button
                  onClick={handleUpdateOperation}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs"
                >
                  Update Operation
                </button>
              ) : (
                <button
                  onClick={handleAddOperation}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs"
                >
                  Add Operation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {editableQuotation.operations?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-xs">Operations Costs</h3>
          <table className="w-full border-collapse mb-6 text-xs">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Our Cost</th>
                <th className="p-2 text-left">Branding</th>
                <th className="p-2 text-left">Delivery</th>
                <th className="p-2 text-left">Markup</th>
                <th className="p-2 text-left">Total</th>
                <th className="p-2 text-left">Vendor</th>
                <th className="p-2 text-left">Remarks</th>
                <th className="p-2 text-left">Reference</th>
                <th className="p-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {editableQuotation.operations.map((op, idx) => (
                <tr key={op._id || idx} className="border-b">
                  <td className="p-2">{op.ourCost || ""}</td>
                  <td className="p-2">{op.branding || ""}</td>
                  <td className="p-2">{op.delivery || ""}</td>
                  <td className="p-2">{op.markup || ""}</td>
                  <td className="p-2">{op.total || ""}</td>
                  <td className="p-2">{op.vendor || ""}</td>
                  <td className="p-2">{op.remarks || ""}</td>
                  <td className="p-2">{op.reference || ""}</td>
                  <td className="p-2">
                    <button
                      onClick={() => handleViewOperation(op)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <table className="w-full border-collapse mb-6 text-xs">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Sl. No.</th>
            <th className="p-2 text-left">Image</th>
            <th className="p-2 text-left">Product</th>
            {editableQuotation.displayHSNCodes && <th className="p-2 text-left">HSN</th>}
            <th className="p-2 text-left">Quantity</th>
            <th className="p-2 text-left">Rate (with margin)</th>
            <th className="p-2 text-left">Price Breakdown</th>
            <th className="p-2 text-left">Amount</th>
            <th className="p-2 text-left">GST (%)</th>
            <th className="p-2 text-left">Total</th>
            <th className="p-2 text-left">Remove</th>
          </tr>
        </thead>
        <tbody>
          {editableQuotation.items.map((item, index) => {
            const baseRate = parseFloat(item.rate) || 0;
            const quantity = parseFloat(item.quantity) || 1;
            const effRate = baseRate * marginFactor;
            const amount = effRate * quantity;
            const gstRate = item.productGST != null ? parseFloat(item.productGST) : 18;
            const gstVal = parseFloat((amount * (gstRate / 100)).toFixed(2));
            const total = parseFloat((amount + gstVal).toFixed(2));
            const imageUrl =
              item.image ||
              item.productId?.images?.[0] ||
              item.productId?.name ||
              "https://via.placeholder.com/150";
            const hsnCode = item.hsnCode || item.productId?.hsnCode || "N/A";

            return (
              <tr key={index} className="border-b">
                <td className="p-2">{item.slNo}</td>
                <td className="p-2">
                  {imageUrl !== "https://via.placeholder.com/150" ? (
                    <img src={imageUrl} alt={item.product} className="w-16 h-16 object-cover" />
                  ) : (
                    "No Image"
                  )}
                </td>
                <td className="p-2">
                  <EditableField
                    value={item.product || ""}
                    onSave={(newVal) => updateItemField(index, "product", newVal)}
                  />
                </td>
                {editableQuotation.displayHSNCodes && (
                  <td className="p-2">
                    <EditableField
                      value={hsnCode}
                      onSave={(newVal) => updateItemField(index, "hsnCode", newVal)}
                    />
                  </td>
                )}
                <td className="p-2">
                  <EditableField
                    value={quantity.toString()}
                    type="number"
                    onSave={(newVal) => {
                      const newQuantity = parseFloat(newVal);
                      updateItemField(index, "quantity", isNaN(newQuantity) || newQuantity < 0 ? 1 : newQuantity);
                    }}
                  />
                </td>
                <td className="p-2">
                  <EditableField
                    value={effRate.toFixed(2)}
                    type="number"
                    onSave={(newVal) => {
                      const newEffRate = parseFloat(newVal);
                      if (!isNaN(newEffRate)) {
                        const newBaseRate = newEffRate / marginFactor;
                        updateItemField(index, "rate", parseFloat(newBaseRate.toFixed(2)));
                        updateItemField(index, "productprice", parseFloat(newBaseRate.toFixed(2)));
                      }
                    }}
                  />
                </td>
                <td className="p-2">
                  <PriceBreakdownTooltip breakdown={item.suggestedBreakdown} />
                </td>
                <td className="p-2">{amount.toFixed(2)}</td>
                <td className="p-2">
                  <EditableField
                    value={gstRate.toString()}
                    type="number"
                    onSave={(newVal) => {
                      const newGST = parseFloat(newVal);
                      updateItemField(index, "productGST", isNaN(newGST) ? 18 : newGST);
                    }}
                  />
                  %
                </td>
                <td className="p-2">{total.toFixed(2)}</td>
                <td className="p-2">
                  <button
                    onClick={() => removeItem(index)}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editableQuotation.displayTotals && (
        <div className="mb-6 text-lg font-bold text-xs">
          <p>Total Amount: ₹{computedAmount(editableQuotation).toFixed(2)}</p>
          <p>Grand Total (with GST): ₹{computedTotal(editableQuotation).toFixed(2)}</p>
        </div>
      )}

      <div className="p-2 italic font-bold text-blue-600 border text-center text-xs">
        Rates may vary in case there is a change in specifications / quantity / timelines
      </div>
    </div>
  );
}

function EditableField({ value, onSave, type = "text" }) {
  const [editing, setEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleIconClick = () => setEditing(true);

  const handleBlur = () => {
    setEditing(false);
    onSave(currentValue);
  };

  if (editing) {
    return (
      <input
        type={type}
        className="border p-1 rounded text-xs"
        autoFocus
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        min={type === "number" ? 0 : undefined}
      />
    );
  }

  return (
    <div className="flex items-center">
      <span>{currentValue}</span>
      <button onClick={handleIconClick} className="ml-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      </button>
    </div>
  );
}

function PriceBreakdownTooltip({ breakdown }) {
  const [isHovered, setIsHovered] = useState(false);

  const {
    baseCost = 0,
    marginPct = 0,
    marginAmount = 0,
    logisticsCost = 0,
    brandingCost = 0,
    finalPrice = 0,
  } = breakdown || {};

  return (
    <div className="relative inline-block">
      <button
        className="text-blue-600 hover:text-blue-800 text-xs font-bold"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        i
      </button>
      {isHovered && (
        <div className="absolute z-10 bg-gray-800 text-white text-xs rounded p-2 w-64 shadow-lg -left-20 top-6">
          <h4 className="font-bold mb-1">Price Breakdown</h4>
          <p>Cost: ₹{(baseCost + marginAmount).toFixed(2)}</p>
          <p>Logistics Cost: ₹{logisticsCost.toFixed(2)}</p>
          <p>Branding Cost: ₹{brandingCost.toFixed(2)}</p>
          <p>Final Price: ₹{finalPrice.toFixed(2)}</p>
          <p>Profit: ₹{marginAmount.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}

function computedAmount(quotation) {
  let sum = 0;
  (quotation.items || []).forEach((item) => {
    const quantity = parseFloat(item.quantity) || 1;
    const baseRate = parseFloat(item.rate) || 0;
    const margin = parseFloat(quotation.margin) || 0;
    const marginFactor = 1 + margin / 100;
    sum += baseRate * marginFactor * quantity;
  });
  return sum;
}

function computedTotal(quotation) {
  let sum = 0;
  (quotation.items || []).forEach((item) => {
    const quantity = parseFloat(item.quantity) || 1;
    const baseRate = parseFloat(item.rate) || 0;
    const margin = parseFloat(quotation.margin) || 0;
    const marginFactor = 1 + margin / 100;
    const amount = baseRate * marginFactor * quantity;
    const gst = item.productGST != null ? parseFloat(item.productGST) : 18;
    const gstVal = parseFloat((amount * (gst / 100)).toFixed(2));
    sum += amount + gstVal;
  });
  return sum;
}