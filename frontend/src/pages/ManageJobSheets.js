"use client";

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import { format, parse } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { Dropdown } from "react-bootstrap";
import { FaEllipsisV } from "react-icons/fa";

export default function ManageJobSheets() {
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [jobSheets, setJobSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Single search query state
  const [searchQuery, setSearchQuery] = useState("");

  // Modal for create
  const [modalOpen, setModalOpen] = useState(false);
  const [createOption, setCreateOption] = useState(null);

  // Local states for the "Draft Panel"
  const [draftPanelOpen, setDraftPanelOpen] = useState(false);
  const [draftSheets, setDraftSheets] = useState([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState(null);

  // Inside the component:
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 1) On mount, fetch normal job sheets (production)
  useEffect(() => {
    fetchJobSheets(false);
  }, []);

  // 2) The function to fetch job sheets (production or drafts)
  async function fetchJobSheets(draftOnly = false) {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      let url = `${BACKEND_URL}/api/admin/jobsheets`;
      if (draftOnly) {
        url += "?draftOnly=true"; // triggers route logic for user's drafts
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobSheets(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching job sheets:", err);
      setError("Failed to fetch job sheets");
    } finally {
      setLoading(false);
    }
  }

  // 3) A separate function to fetch only the user's drafts
  async function fetchMyDrafts() {
    try {
      setDraftLoading(true);
      setDraftError(null);
      const token = localStorage.getItem("token");
      const url = `${BACKEND_URL}/api/admin/jobsheets?draftOnly=true`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDraftSheets(res.data);
    } catch (err) {
      console.error("Error fetching user drafts:", err);
      setDraftError("Failed to fetch your draft job sheets");
    } finally {
      setDraftLoading(false);
    }
  }

  // Delete job sheet
  async function deleteJobSheet(id, isDraft) {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/jobsheets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Refresh the main list (production)
      fetchJobSheets(false);

      // Also refresh the draft list if open
      if (draftPanelOpen) {
        fetchMyDrafts();
      }
    } catch (err) {
      console.error("Error deleting job sheet:", err);
      alert("Failed to delete job sheet.");
    }
  }

  // Filtering logic for main table
  const filteredJobSheets = jobSheets.filter((js) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      (js.clientCompanyName?.toLowerCase().includes(query)) ||
      (js.eventName?.toLowerCase().includes(query)) ||
      (js.referenceQuotation?.toLowerCase().includes(query)) ||
      (js.clientName?.toLowerCase().includes(query)) ||
      (js.jobSheetNumber?.toLowerCase().includes(query))
    );
  });

  // Export to Excel
  const exportToExcel = () => {
    const exportData = [];
    let serial = 1;

    filteredJobSheets.forEach((js) => {
      // Format the 'Created At' date
      const createdAtFormatted =
        js.createdAt && isValidDate(new Date(js.createdAt))
          ? format(new Date(js.createdAt), "dd/MM/yyyy")
          : "Invalid date";

      // Format the delivery date
      const deliveryDateFormatted =
        js.deliveryDate && isValidDate(new Date(js.deliveryDate))
          ? format(new Date(js.deliveryDate), "dd/MM/yyyy")
          : "Invalid date";

      // If the job sheet has items, create one row per item
      if (js.items && js.items.length > 0) {
        js.items.forEach((item) => {
          exportData.push({
            "Sl. No": serial++,
            "Created At": createdAtFormatted,
            "Quotation Number": js.referenceQuotation || "",
            "Job Sheet Number": js.jobSheetNumber || "",
            "Opportunity Name": js.eventName || "",
            "Client Company Name": js.clientCompanyName || "",
            "Client Name": js.clientName || "",
            "Client Delivery Date": deliveryDateFormatted,
            "CRM": js.crmIncharge || "",
            "Material Particulars": item.product || "",
            "Quantity": item.quantity || "",
            "Sourcing Vendor": item.sourcingFrom || "",
            "Sourcing Vendor Contact": "",
            "Product Follow Up": "",
            "Product Expected @ Ace": "",
            "Product Procured By": "",
            "Branding Target Date": "",
            "Branding Vendor": item.brandingVendor || "",
            "Branding Type": item.brandingType || "",
            "Branding Vendor Contact": "",
            "Delivery Status": "",
            "QC Done By": "",
            "Delivered By": "",
            "Delivered On": "",
            "PO Status": js.poStatus || "",
            "Invoice Submission": "",
          });
        });
      } else {
        // If no items, push a single row
        exportData.push({
          "Sl. No": serial++,
          "Created At": createdAtFormatted,
          "Quotation Number": js.referenceQuotation || "",
          "Job Sheet Number": js.jobSheetNumber || "",
          "Opportunity Name": js.eventName || "",
          "Client Company Name": js.clientCompanyName || "",
          "Client Name": js.clientName || "",
          "Client Delivery Date": deliveryDateFormatted,
          "CRM": js.crmIncharge || "",
          "Material Particulars": "",
          "Quantity": "",
          "Sourcing Vendor": "",
          "Sourcing Vendor Contact": "",
          "Product Follow Up": "",
          "Product Expected @ Ace": "",
          "Product Procured By": "",
          "Branding Target Date": "",
          "Branding Vendor": "",
          "Branding Type": "",
          "Branding Vendor Contact": "",
          "Delivery Status": "",
          "QC Done By": "",
          "Delivered By": "",
          "Delivered On": "",
          "PO Status": js.poStatus || "",
          "Invoice Submission": "",
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "JobSheets");
    XLSX.writeFile(workbook, "JobSheets.xlsx");
  };

  const isValidDate = (date) => {
    return date instanceof Date && !isNaN(date);
  };

  return (
    <div className="p-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 space-y-4 md:space-y-0">
        <h1 className="text-2xl font-bold">Manage Job Sheets</h1>
        <div className="flex space-x-2">
          {/* "View My Drafts" */}
          <button
            onClick={() => {
              setDraftPanelOpen(true);
              fetchMyDrafts();
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
          >
            View My Drafts
          </button>

          {/* "Create JobSheet" */}
          <button
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Create Jobsheet
          </button>

          {/* Export */}
          <button
            onClick={exportToExcel}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Export to Excel
          </button>
        </div>
      </div>

      {/* Single Search Field */}
      <div className="mb-4 p-4 border rounded">
        <h2 className="font-bold mb-2">Search</h2>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Company, Event, Quotation, etc."
          className="border p-2 rounded w-full"
        />
      </div>

      {/* Main Content: Table of Production Sheets */}
      {loading ? (
        <div>Loading job sheets...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">JobSheet No.</th>
              <th className="p-2 text-left">Client Name</th>
              <th className="p-2 text-left">Company</th>
              <th className="p-2 text-left">Order Date</th>
              <th className="p-2 text-left">Delivery Date</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobSheets.map((js) => (
              <tr key={js._id} className="border-b">
                <td className="p-2">{js.jobSheetNumber || "(No Number)"}</td>
                <td className="p-2">{js.clientName}</td>
                <td className="p-2">{js.clientCompanyName}</td>
                <td className="p-2">
                  {js.orderDate && isValidDate(new Date(js.orderDate))
                    ? format(new Date(js.orderDate), "dd/MM/yyyy")
                    : "Invalid date"}
                </td>
                <td className="p-2">
                  {js.deliveryDate && isValidDate(new Date(js.deliveryDate))
                    ? format(new Date(js.deliveryDate), "dd/MM/yyyy")
                    : "Invalid date"}
                </td>
                <td className="p-2" ref={dropdownRef}>
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === js._id ? null : js._id)}
                      className="text-gray-500 hover:text-gray-800"
                    >
                      <FaEllipsisV />
                    </button>
                    {openDropdownId === js._id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded border border-gray-200 z-50">
                        <button
                          onClick={() => {
                            navigate(`/admin-dashboard/jobsheet/${js._id}`);
                            setOpenDropdownId(null);
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            navigate(`/admin-dashboard/create-jobsheet/${js._id}`);
                            setOpenDropdownId(null);
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            deleteJobSheet(js._id, false);
                            setOpenDropdownId(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* The Modal for "Create Jobsheet" */}
      {modalOpen && (
        <CreateJobsheetModal
          onClose={() => {
            setModalOpen(false);
            setCreateOption(null);
          }}
          onSelectOption={(option) => setCreateOption(option)}
          onCreated={() => {
            setModalOpen(false);
            // Refresh normal jobSheets
            fetchJobSheets(false);
          }}
          navigate={navigate}
          BACKEND_URL={BACKEND_URL}
        />
      )}

      {/* Draft Panel at bottom (like a small window) */}
      {draftPanelOpen && (
        <div
          className="
            fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200
            shadow-lg p-4 z-50
          "
          style={{ maxHeight: "40vh", overflowY: "auto" }}
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">My Draft Job Sheets</h2>
            <button
              onClick={() => setDraftPanelOpen(false)}
              className="text-gray-500 hover:text-gray-800 font-bold text-xl"
            >
              ×
            </button>
          </div>
          {draftLoading ? (
            <div>Loading drafts...</div>
          ) : draftError ? (
            <div className="text-red-500">{draftError}</div>
          ) : draftSheets.length === 0 ? (
            <div>No draft job sheets found.</div>
          ) : (
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Draft #</th>
                  <th className="p-2 text-left">Client Name</th>
                  <th className="p-2 text-left">Company</th>
                  <th className="p-2 text-left">Order Date</th>
                  <th className="p-2 text-left">Delivery Date</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {draftSheets.map((draft) => (
                  <tr key={draft._id} className="border-b">
                    <td className="p-2">{draft.jobSheetNumber || "(Draft)"}</td>
                    <td className="p-2">{draft.clientName}</td>
                    <td className="p-2">{draft.clientCompanyName}</td>
                    <td className="p-2">
                      {draft.orderDate && isValidDate(new Date(draft.orderDate))
                        ? format(new Date(draft.orderDate), "dd/MM/yyyy")
                        : "Invalid date"}
                    </td>
                    <td className="p-2">
                      {draft.deliveryDate && isValidDate(new Date(draft.deliveryDate))
                        ? format(new Date(draft.deliveryDate), "dd/MM/yyyy")
                        : "Invalid date"}
                    </td>
                    <td className="p-2" ref={dropdownRef}>
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === draft._id ? null : draft._id)}
                          className="text-gray-500 hover:text-gray-800"
                        >
                          <FaEllipsisV />
                        </button>
                        {openDropdownId === draft._id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded border border-gray-200 z-50">
                            <button
                              onClick={() => {
                                navigate(`/admin-dashboard/jobsheet/${draft._id}`);
                                setOpenDropdownId(null);
                              }}
                              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                            >
                              View
                            </button>
                            <button
                              onClick={() => {
                                navigate(`/admin-dashboard/create-jobsheet/${draft._id}`);
                                setOpenDropdownId(null);
                              }}
                              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                deleteJobSheet(draft._id, true);
                                setOpenDropdownId(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Updated "CreateJobsheetModal" with "Save as Draft" checkbox
 */
function CreateJobsheetModal({
  onClose,
  onSelectOption,
  onCreated,
  navigate,
  BACKEND_URL,
}) {
  const [option, setOption] = useState(null);
  const [formData, setFormData] = useState({
    orderDate: "",
    clientCompanyName: "",
    clientName: "",
    contactNumber: "",
    deliveryDate: "",
    deliveryTime: "",
    crmIncharge: "",
    items: [],
    poNumber: "",
    deliveryType: "",
    deliveryMode: "",
    deliveryCharges: "",
    deliveryAddress: "",
    giftBoxBagsDetails: "",
    packagingInstructions: "",
    otherDetails: "",
    referenceQuotation: "",
  });

  // New: "Save as Draft" local state
  const [createAsDraft, setCreateAsDraft] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (
      !formData.orderDate ||
      !formData.clientCompanyName ||
      !formData.clientName ||
      !formData.deliveryDate
    ) {
      setError("Please fill in all required fields.");
      return;
    }
    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      // Merged form data with isDraft
      const body = {
        ...formData,
        isDraft: createAsDraft,
      };

      await axios.post(`${BACKEND_URL}/api/admin/jobsheets`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onCreated(); // Tells parent to close + refresh
    } catch (err) {
      console.error("Error creating jobsheet:", err);
      setError("Error creating jobsheet.");
    } finally {
      setSaving(false);
    }
  };

  function isValidDate(date) {
    return date instanceof Date && !isNaN(date);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded w-4/5 max-w-4xl overflow-auto max-h-full">

        {!option && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Create Jobsheet</h2>
            <div className="flex flex-col space-y-4">
              <Link
                to={"/admin-dashboard/create-jobsheet"}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Create a New Jobsheet
              </Link>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={onClose} className="px-4 py-2 border rounded">
                Cancel
              </button>
            </div>
          </div>
        )}

        {option === "new" && (
          <div>
            <h2 className="text-2xl font-bold mb-4">New Jobsheet</h2>
            {error && <div className="text-red-500 mb-2">{error}</div>}

            {/* Minimal inline form: you can replace with your own form */}
            <div className="grid grid-cols-2 gap-4">
              {/* Example fields */}
              <div>
                <label className="block text-sm font-medium">Order Date *</label>
                <DatePicker
                  selected={
                    formData.orderDate
                      ? parse(formData.orderDate, "yyyy-MM-dd", new Date())
                      : null
                  }
                  onChange={(date) =>
                    setFormData({
                      ...formData,
                      orderDate: date ? format(date, "yyyy-MM-dd") : "",
                    })
                  }
                  dateFormat="dd/MM/yyyy"
                  className="border p-2 rounded w-full"
                  placeholderText="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Delivery Date *</label>
                <DatePicker
                  selected={
                    formData.deliveryDate
                      ? parse(formData.deliveryDate, "yyyy-MM-dd", new Date())
                      : null
                  }
                  onChange={(date) =>
                    setFormData({
                      ...formData,
                      deliveryDate: date ? format(date, "yyyy-MM-dd") : "",
                    })
                  }
                  dateFormat="dd/MM/yyyy"
                  className="border p-2 rounded w-full"
                  placeholderText="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Client's Company Name *
                </label>
                <input
                  type="text"
                  value={formData.clientCompanyName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientCompanyName: e.target.value })
                  }
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Client's Name *</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                  className="border p-2 rounded w-full"
                />
              </div>
              {/* ... Add more fields as needed */}
            </div>

            {/* The "Save as Draft" checkbox */}
            <div className="mt-4">
              <label className="inline-flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={createAsDraft}
                  onChange={() => setCreateAsDraft(!createAsDraft)}
                />
                <span>Save as Draft (only visible to me)</span>
              </label>
            </div>

            <div className="mt-4 flex justify-end space-x-4">
              <button onClick={onClose} className="px-4 py-2 border rounded">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className={`px-4 py-2 rounded text-white ${
                  saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Jobsheet"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
