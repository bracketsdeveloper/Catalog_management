"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { utils, write } from "xlsx";
import { format } from "date-fns";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const defaultMaterialTerms = [
  "Material received in good condition and correct quantity.",
  // Changed Material Terms to correct typo in default values
  "No physical damage or shortage observed at the time of delivery.",
  "Accepted after preliminary inspection and validation with delivery documents.",
  "optional term edit or remove this",
  "optional term edit or remove this",
];

const defaultFieldsToDisplay = [];

export default function DeliveryChallanManagementPage() {
  const navigate = useNavigate();
  const [deliveryChallans, setDeliveryChallans] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [latestActions, setLatestActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState("dcNumber");
  const [sortOrder, setSortOrder] = useState("desc");
  const [headerFilters, setHeaderFilters] = useState({});
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [openEditModal, setOpenEditModal] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  const canExportCRM = permissions.includes("crm-export");

  // Define table columns
  const columns = [
    { label: "DC Number", field: "dcNumber" },
    { label: "Quotation Number", field: "quotationNumber" },
    { label: "Opportunity Number", field: "opportunityNumber" },
    { label: "Opportunity Owner", field: "opportunityOwner" },
    { label: "Company Name", field: "customerCompany" },
    { label: "Customer Name", field: "customerName" },
    { label: "Event Name", field: "catalogName" },
    { label: "Items", field: "items.length" },
    { label: "DC Date", field: "dcDate", isDate: true },
    { label: "Latest Action", field: "latestAction" },
    { label: "Action", field: null },
  ];

  useEffect(() => {
    fetchData();
    fetchOpportunities();
  }, []);

  async function fetchOpportunities() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/opportunities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOpportunities(res.data);
    } catch (err) {
      console.error("Error fetching opportunities:", err);
    }
  }

  async function fetchLatestActions(challanIds) {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BACKEND_URL}/api/admin/logs/latest`,
        { quotationIds: challanIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLatestActions(res.data);
    } catch (err) {
      console.error("Error fetching latest actions:", err);
      setLatestActions({});
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/delivery-challans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeliveryChallans(res.data);
      const challanIds = res.data.map((q) => q._id);
      if (challanIds.length > 0) {
        await fetchLatestActions(challanIds);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching delivery challans:", err);
      setError("Failed to fetch delivery challans");
    } finally {
      setLoading(false);
    }
  }

  // Prepare base rows with computed fields
  const baseRows = useMemo(() => {
    return deliveryChallans.map((challan) => {
      const opp = opportunities.find((o) => o.opportunityCode === challan.opportunityNumber);
      const latestAction = latestActions[challan._id] || {};
      return {
        ...challan,
        opportunityOwner: opp?.opportunityOwner || "N/A",
        "items.length": (challan.items || []).length,
        latestAction: latestAction.action
          ? `${latestAction.action} by ${latestAction.performedBy?.email || "N/A"} at ${
              latestAction.performedAt
                ? new Date(latestAction.performedAt).toLocaleString()
                : "Unknown date"
            }`
          : "No action recorded",
      };
    });
  }, [deliveryChallans, opportunities, latestActions]);

  // Apply header filters
  const filteredRows = useMemo(() => {
    return baseRows.filter((row) =>
      Object.entries(headerFilters).every(([field, value]) => {
        if (!value) return true;
        let cell;
        if (field === "dcDate") {
          cell = format(new Date(row[field]), "dd/MM/yyyy");
        } else {
          cell = (row[field] ?? "").toString();
        }
        return cell.toLowerCase().includes(value.toLowerCase());
      })
    );
  }, [baseRows, headerFilters]);

  // Apply sorting
  const sortedRows = useMemo(() => {
    if (!sortField) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      let av, bv;
      if (sortField === "dcDate") {
        av = new Date(a[sortField]).getTime();
        bv = new Date(b[sortField]).getTime();
      } else if (sortField === "items.length") {
        av = a.items?.length || 0;
        bv = b.items?.length || 0;
      } else {
        av = a[sortField] ?? "";
        bv = b[sortField] ?? "";
      }
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [filteredRows, sortField, sortOrder]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleFilterChange = (field, value) => {
    setHeaderFilters((prev) => ({ ...prev, [field]: value }));
  };

  async function handleDeleteChallan(challan) {
    if (!window.confirm(`Are you sure you want to delete Delivery Challan ${challan.dcNumber}?`))
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/delivery-challans/${challan._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Delivery Challan deleted successfully!");
      fetchData();
    } catch (error) {
      console.error("Error deleting delivery challan:", error);
      alert("Failed to delete delivery challan.");
    }
  }

  async function handleExportAllToExcel() {
    try {
      const wb = utils.book_new();
      const header = columns
        .filter((col) => col.field)
        .map((col) => col.label);
      const data = [header];
      sortedRows.forEach((q) => {
        const row = [
          q.dcNumber,
          q.quotationNumber || "N/A",
          q.opportunityNumber || "N/A",
          q.opportunityOwner || "N/A",
          q.customerCompany || "N/A",
          q.customerName || "N/A",
          q.catalogName || "N/A",
          q.items?.length || 0,
          format(new Date(q.dcDate), "dd/MM/yyyy"),
          q.latestAction || "No action recorded",
        ];
        data.push(row);
      });
      const ws = utils.aoa_to_sheet(data);
      utils.book_append_sheet(wb, ws, "All Delivery Challans");
      const wbOut = write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbOut], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `All_Delivery_Challans.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Excel export failed");
    }
  }

  const openEditModalHandler = (challan) => {
    setEditFormData({
      _id: challan._id,
      quotationNumber: challan.quotationNumber || "",
      opportunityNumber: challan.opportunityNumber || "",
      catalogName: challan.catalogName || "",
      fieldsToDisplay: challan.fieldsToDisplay || [],
      priceRange: challan.priceRange || { from: 0, to: 0 },
      salutation: challan.salutation || "Mr.",
      customerName: challan.customerName || "",
      customerEmail: challan.customerEmail || "",
      customerCompany: challan.customerCompany || "",
      customerAddress: challan.customerAddress || "",
      margin: challan.margin || 0,
      gst: challan.gst || 18,
      displayTotals: challan.displayTotals || false,
      displayHSNCodes: challan.displayHSNCodes || true,
      terms: challan.terms || [],
      poNumber: challan.poNumber || "",
      poDate: challan.poDate ? format(new Date(challan.poDate), "yyyy-MM-dd") : "",
      otherReferences: challan.otherReferences || "", // Add new field
      materialTerms: challan.materialTerms || [
        "Material received in good condition and correct quantity.",
        "No physical damage or shortage noticed at the time of delivery.",
        "Accepted after preliminary inspection and verification with delivery documents.",
      ],
      dcDate: format(new Date(challan.dcDate), "yyyy-MM-dd"),
      items: challan.items || [],
    });
    setOpenEditModal(challan._id);
  };

  const handleEditInputChange = (e, field, index = null) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setEditFormData((prev) => {
      if (field === "priceRange") {
        return { ...prev, priceRange: { ...prev.priceRange, [e.target.name]: Number(value) } };
      } else if (field === "terms" && index !== null) {
        const newTerms = [...prev.terms];
        newTerms[index] = { ...newTerms[index], [e.target.name]: value };
        return { ...prev, terms: newTerms };
      } else if (field === "materialTerms" && index !== null) {
        const newMaterialTerms = [...prev.materialTerms];
        newMaterialTerms[index] = value;
        return { ...prev, materialTerms: newMaterialTerms };
      }
      return { ...prev, [field]: value };
    });
  };

  const addTerm = () => {
    setEditFormData((prev) => ({
      ...prev,
      terms: [...prev.terms, { heading: "", content: "" }],
    }));
  };

  const removeTerm = (index) => {
    setEditFormData((prev) => ({
      ...prev,
      terms: prev.terms.filter((_, i) => i !== index),
    }));
  };

  async function handleSaveEdit() {
    try {
      const token = localStorage.getItem("token");
      const updatedData = {
        ...editFormData,
        poDate: editFormData.poDate ? new Date(editFormData.poDate) : null,
        dcDate: new Date(editFormData.dcDate),
      };
      const res = await axios.put(
        `${BACKEND_URL}/api/admin/delivery-challans/${editFormData._id}`,
        updatedData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Delivery Challan updated successfully!");
      setOpenEditModal(null);
      fetchData();
    } catch (error) {
      console.error("Error updating delivery challan:", error);
      alert("Failed to update delivery challan.");
    }
  }

  const renderEditModal = () => {
    if (!openEditModal) return null;
    return createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Edit Delivery Challan</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">DC Number</label>
              <input
                type="text"
                value={editFormData.dcNumber || ""}
                disabled
                className="w-full p-2 border rounded text-sm bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Quotation Number</label>
              <input
                type="text"
                value={editFormData.quotationNumber}
                onChange={(e) => handleEditInputChange(e, "quotationNumber")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Opportunity Number</label>
              <input
                type="text"
                value={editFormData.opportunityNumber}
                onChange={(e) => handleEditInputChange(e, "opportunityNumber")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Event Name</label>
              <input
                type="text"
                value={editFormData.catalogName}
                onChange={(e) => handleEditInputChange(e, "catalogName")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Salutation</label>
              <input
                type="text"
                value={editFormData.salutation}
                onChange={(e) => handleEditInputChange(e, "salutation")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Customer Name</label>
              <input
                type="text"
                value={editFormData.customerName}
                onChange={(e) => handleEditInputChange(e, "customerName")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Customer Email</label>
              <input
                type="email"
                value={editFormData.customerEmail}
                onChange={(e) => handleEditInputChange(e, "customerEmail")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Customer Company</label>
              <input
                type="text"
                value={editFormData.customerCompany}
                onChange={(e) => handleEditInputChange(e, "customerCompany")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">Customer Address</label>
              <textarea
                value={editFormData.customerAddress}
                onChange={(e) => handleEditInputChange(e, "customerAddress")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">PO Number</label>
              <input
                type="text"
                value={editFormData.poNumber}
                onChange={(e) => handleEditInputChange(e, "poNumber")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">PO Date</label>
              <input
                type="date"
                value={editFormData.poDate}
                onChange={(e) => handleEditInputChange(e, "poDate")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Other References</label>
              <input
                type="text"
                value={editFormData.otherReferences}
                onChange={(e) => handleEditInputChange(e, "otherReferences")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">DC Date</label>
              <input
                type="date"
                value={editFormData.dcDate}
                onChange={(e) => handleEditInputChange(e, "dcDate")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={editFormData.displayHSNCodes}
                onChange={(e) => handleEditInputChange(e, "displayHSNCodes")}
                className="mr-2"
              />
              <label className="text-sm font-medium">Display HSN Codes</label>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">Material Terms</label>
              {editFormData.materialTerms.map((term, index) => (
                <div key={index} className="mb-2">
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => handleEditInputChange(e, "materialTerms", index)}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">Products (Read-only)</label>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">Sl No</th>
                    <th className="border border-gray-300 p-2 text-left">Product</th>
                    <th className="border border-gray-300 p-2 text-left">HSN Code</th>
                    <th className="border border-gray-300 p-2 text-left">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {(editFormData.items || []).map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-2">{item.slNo}</td>
                      <td className="border border-gray-300 p-2">{item.product}</td>
                      <td className="border border-gray-300 p-2">{item.hsnCode}</td>
                      <td className="border border-gray-300 p-2">{item.quantity}</td>
                    </tr>
                  ))}
                  {!editFormData.items?.length && (
                    <tr>
                      <td colSpan={4} className="border border-gray-300 p-2 text-center">
                        No items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setOpenEditModal(null)}
              className="px-4 py-2 border rounded text-sm hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-[#Ff8045] text-white rounded text-sm hover:bg-[#Ff8045]/90"
            >
              Save
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative">
            <button
              className="absolute top-2 right-2 text-white text-2xl"
              onClick={() => setLightboxSrc(null)}
            >
              ×
            </button>
            <img
              src={lightboxSrc}
              alt="Preview"
              className="max-h-[80vh] max-w-[90vw] object-contain rounded"
            />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Delivery Challans</h1>
        {canExportCRM && (
          <button
            onClick={handleExportAllToExcel}
            className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 px-4 py-2 rounded text-white"
          >
            Export All to Excel
          </button>
        )}
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.label}
                  onClick={() => col.field && toggleSort(col.field)}
                  className={`px-2 py-1 text-left font-medium text-gray-500 uppercase select-none ${
                    col.field ? "cursor-pointer hover:bg-gray-100" : ""
                  }`}
                >
                  {col.label}
                  {col.field && sortField === col.field && (
                    <span>{sortOrder === "asc" ? " ▲" : " ▼"}</span>
                  )}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-100">
              {columns.map((col) => (
                <td key={col.label} className="px-2 py-1">
                  {col.field ? (
                    <input
                      type="text"
                      placeholder="Filter…"
                      value={headerFilters[col.field] || ""}
                      onChange={(e) => handleFilterChange(col.field, e.target.value)}
                      className="w-full p-1 border rounded text-xs"
                    />
                  ) : (
                    <div />
                  )}
                </td>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRows.map((row) => (
              <tr key={row._id} className="hover:bg-gray-50">
                {columns.map((col) => {
                  if (col.field === "dcDate") {
                    return (
                      <td key="dcDate" className="px-2 py-1">
                        {format(new Date(row.dcDate), "dd/MM/yyyy")}
                      </td>
                    );
                  }
                  if (col.field === "items.length") {
                    return (
                      <td key="items.length" className="px-2 py-1 whitespace-nowrap">
                        {row.items?.length || 0}
                      </td>
                    );
                  }
                  if (!col.field && col.label === "Action") {
                    return (
                      <td key="action" className="px-2 py-1 flex gap-2">
                        <button
                          onClick={() => openEditModalHandler(row)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => navigate(`/admin-dashboard/dc/${row._id}`)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          View
                        </button>
                      </td>
                    );
                  }
                  return (
                    <td key={col.field} className="px-2 py-1 whitespace-nowrap">
                      {row[col.field] || "N/A"}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!sortedRows.length && (
              <tr>
                <td colSpan={columns.length} className="px-2 py-6 text-center text-gray-500">
                  No records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {renderEditModal()}
    </div>
  );
}