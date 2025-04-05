"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import { format, parse } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";

export default function ManageJobSheets() {
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [jobSheets, setJobSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state values
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [company, setCompany] = useState("");
  const [eventName, setEventName] = useState("");
  const [referenceQuotation, setReferenceQuotation] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [createOption, setCreateOption] = useState(null);

  useEffect(() => {
    fetchJobSheets();
  }, []);

  async function fetchJobSheets() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/jobsheets`, {
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

  async function deleteJobSheet(id) {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/jobsheets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchJobSheets();
    } catch (err) {
      console.error("Error deleting job sheet:", err);
      alert("Failed to delete job sheet.");
    }
  }

  const filteredJobSheets = jobSheets.filter((js) => {
    const createdAt = new Date(js.createdAt);
    const from = fromDate ? parse(fromDate, "yyyy-MM-dd", new Date()) : null;
    const to = toDate ? parse(toDate, "yyyy-MM-dd", new Date()) : null;
    const companyMatch = company
      ? js.clientCompanyName?.toLowerCase().includes(company.toLowerCase())
      : true;
    const eventMatch = eventName
      ? js.eventName?.toLowerCase().includes(eventName.toLowerCase())
      : true;
    const refMatch = referenceQuotation
      ? js.referenceQuotation?.toLowerCase().includes(referenceQuotation.toLowerCase())
      : true;

    const dateMatch = (!from || createdAt >= from) && (!to || createdAt <= to);

    return companyMatch && eventMatch && refMatch && dateMatch;
  });

  const exportToExcel = () => {
    const exportData = [];
    let serial = 1;

    filteredJobSheets.forEach((js) => {
      const deliveryDateFormatted =
        js.deliveryDate && isValidDate(new Date(js.deliveryDate))
          ? format(new Date(js.deliveryDate), "dd/MM/yyyy")
          : "Invalid date";

      if (js.items && js.items.length > 0) {
        js.items.forEach((item) => {
          exportData.push({
            "Sl. No": serial++,
            "Job Sheet Number": js.jobSheetNumber || "",
            "Opportunity Name": js.eventName || "",
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
            "Invoice Submission": ""
          });
        });
      } else {
        exportData.push({
          "Sl. No": serial++,
          "Job Sheet Number": js.jobSheetNumber || "",
          "Opportunity Name": js.eventName || "",
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
          "Invoice Submission": ""
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
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 space-y-4 md:space-y-0">
        <h1 className="text-2xl font-bold">Manage Job Sheets</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Create Jobsheet
          </button>
          <button
            onClick={exportToExcel}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Export to Excel
          </button>
        </div>
      </div>

      <div className="mb-4 p-4 border rounded">
        <h2 className="font-bold mb-2">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">From Date (Created At)</label>
            <DatePicker
              selected={fromDate ? parse(fromDate, "yyyy-MM-dd", new Date()) : null}
              onChange={(date) => setFromDate(date ? format(date, "yyyy-MM-dd") : "")}
              dateFormat="dd/MM/yyyy"
              className="border p-2 rounded w-full"
              placeholderText="DD/MM/YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">To Date (Created At)</label>
            <DatePicker
              selected={toDate ? parse(toDate, "yyyy-MM-dd", new Date()) : null}
              onChange={(date) => setToDate(date ? format(date, "yyyy-MM-dd") : "")}
              dateFormat="dd/MM/yyyy"
              className="border p-2 rounded w-full"
              placeholderText="DD/MM/YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Search by Company"
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Event Name</label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Search by Event Name"
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Reference Quotation</label>
            <input
              type="text"
              value={referenceQuotation}
              onChange={(e) => setReferenceQuotation(e.target.value)}
              placeholder="Search by Reference Quotation"
              className="border p-2 rounded w-full"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
                setCompany("");
                setEventName("");
                setReferenceQuotation("");
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

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
                <td className="p-2">{js.jobSheetNumber}</td>
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
                <td className="p-2 space-x-2">
                  <button 
                    onClick={() => navigate(`/admin-dashboard/jobsheet/${js._id}`)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => navigate(`/admin-dashboard/create-jobsheet/${js._id}`)}
                    className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {modalOpen && (
        <CreateJobsheetModal
          onClose={() => {
            setModalOpen(false);
            setCreateOption(null);
          }}
          onSelectOption={(option) => setCreateOption(option)}
          onCreated={() => {
            setModalOpen(false);
            fetchJobSheets();
          }}
          navigate={navigate}
          BACKEND_URL={BACKEND_URL}
        />
      )}
    </div>
  );
}

function CreateJobsheetModal({ onClose, onSelectOption, onCreated, navigate, BACKEND_URL }) {
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!formData.orderDate || !formData.clientCompanyName || !formData.clientName || !formData.deliveryDate) {
      setError("Please fill in all required fields.");
      return;
    }
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      await axios.post(`${BACKEND_URL}/api/admin/jobsheets`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onCreated();
    } catch (err) {
      console.error("Error creating jobsheet:", err);
      setError("Error creating jobsheet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded w-4/5 max-w-4xl overflow-auto max-h-full">
        {!option && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Create Jobsheet</h2>
            <div className="flex flex-col space-y-4">
              <button
                onClick={() => {
                  setOption("new");
                  navigate("/admin-dashboard/create-jobsheet");
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Create a New Jobsheet
              </button>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Order Date *</label>
                <DatePicker
                  selected={formData.orderDate ? parse(formData.orderDate, "yyyy-MM-dd", new Date()) : null}
                  onChange={(date) => setFormData({ ...formData, orderDate: date ? format(date, "yyyy-MM-dd") : "" })}
                  dateFormat="dd/MM/yyyy"
                  className="border p-2 rounded w-full"
                  placeholderText="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Delivery Date *</label>
                <DatePicker
                  selected={formData.deliveryDate ? parse(formData.deliveryDate, "yyyy-MM-dd", new Date()) : null}
                  onChange={(date) => setFormData({ ...formData, deliveryDate: date ? format(date, "yyyy-MM-dd") : "" })}
                  dateFormat="dd/MM/yyyy"
                  className="border p-2 rounded w-full"
                  placeholderText="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Client's Company Name *</label>
                <input
                  type="text"
                  value={formData.clientCompanyName}
                  onChange={(e) => setFormData({ ...formData, clientCompanyName: e.target.value })}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Client's Name *</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Contact Number</label>
                <input
                  type="text"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Delivery Time</label>
                <input
                  type="text"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">CRM Incharge</label>
                <input
                  type="text"
                  value={formData.crmIncharge}
                  onChange={(e) => setFormData({ ...formData, crmIncharge: e.target.value })}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">PO Number</label>
                <input
                  type="text"
                  value={formData.poNumber}
                  onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                  className="border p-2 rounded w-full"
                />
              </div>
              {/* Additional fields can be added similarly */}
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

function isValidDate(date) {
  return date instanceof Date && !isNaN(date);
}
