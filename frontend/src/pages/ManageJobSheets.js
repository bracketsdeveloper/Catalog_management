"use client";

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import { format, parse, isValid, isWithinInterval } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { Dropdown } from "react-bootstrap";
import { FaEllipsisV } from "react-icons/fa";
import JobSheetView from "./JobSheetView";

export default function ManageJobSheets() {
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [jobSheets, setJobSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Single search query state
  const [searchQuery, setSearchQuery] = useState("");

  // Date filter states
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [orderFromDate, setOrderFromDate] = useState(null);
  const [orderToDate, setOrderToDate] = useState(null);
  const [deliveryFromDate, setDeliveryFromDate] = useState(null);
  const [deliveryToDate, setDeliveryToDate] = useState(null);

  // Sorting states
  const [sortField, setSortField] = useState("orderDate"); // Default sort by orderDate
  const [sortOrder, setSortOrder] = useState("asc"); // asc or desc

  // Modal for create
  const [modalOpen, setModalOpen] = useState(false);
  const [createOption, setCreateOption] = useState(null);

  // Local states for the "Draft Panel"
  const [draftPanelOpen, setDraftPanelOpen] = useState(false);
  const [draftSheets, setDraftSheets] = useState([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState(null);

  //writing sort
   const [isSorted, setIsSorted] = useState(false);

   const [showModal, setShowModal] = useState(false);
  const [jobSheet, setSelectedJobSheet] = useState(null);

 const handleOpenModal = (js) => {
  setSelectedJobSheet(js);
  setShowModal(true);
};

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedJobSheet(null);
  };

function Cell({ label, value }) {
  return (
    <div className="border border-black flex items-center">
      <span className="font-bold uppercase border-r border-black p-2 w-[50%]">
        {label}
      </span>
      <span className="p-1 w-[50%] font-semibold">{value || "N/A"}</span>
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div className="border-b border-black p-1">
      <span className="font-bold uppercase border-black border-r p-1 mr-2">
        {label}
      </span>
      <span className="font-semibold">{value || "N/A"}</span>
    </div>
  );
}

function Section({ rows }) {
  return (
    <div className="border border-black">
      {rows.map((row, i) => (
        <div
          key={i}
          className={`grid gap-0 border-b border-black ${
            row.length === 2 ? "grid-cols-2" : "grid-cols-3"
          }`}
        >
          {row.map((cell) => (
            <div
              key={cell.label}
              className={`p-1 ${row.length === 3 ? "border-r border-black" : ""}`}
            >
              <span className="font-bold uppercase">{cell.label}</span>
              <span className="ml-1 font-semibold">{cell.val || "N/A"}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )};



   // const displayJobSheet = useMemo(() => {
  //     if(isSorted){
  //       return [...filteredJobSheets].sort((a, b) => {
  //           const aVal = a.jobSheetNumber || "";
  //           const bVal = b.jobSheetNumber || "";
  //           return bVal.localeCompare(aVal);
  //       })
  //     }
  //     return filteredJobSheets;
  // }, [filteredJobSheets, isSorted])

  // const handleSortClick = () => {
  //     setIsSorted()
  // }

  const dateFilterRef = useRef(null);

  // Handle outside click to close date filter
  useEffect(() => {
    function handleClickOutside(event) {
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target)) {
        setShowDateFilter(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch job sheets on mount
  useEffect(() => {
    fetchJobSheets(false);
  }, []);

  async function fetchJobSheets(draftOnly = false) {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      let url = `${BACKEND_URL}/api/admin/jobsheets`;
      if (draftOnly) {
        url += "?draftOnly=true";
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

  async function deleteJobSheet(id, isDraft) {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/jobsheets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchJobSheets(false);
      if (draftPanelOpen) {
        fetchMyDrafts();
      }
    } catch (err) {
      console.error("Error deleting job sheet:", err);
      alert("Failed to delete job sheet.");
    }
  }

  // Filtering logic with date range
  const filteredJobSheets = jobSheets
    .filter((js) => {
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      return (
        (js.clientCompanyName?.toLowerCase().includes(query)) ||
        (js.eventName?.toLowerCase().includes(query)) ||
        (js.referenceQuotation?.toLowerCase().includes(query)) ||
        (js.clientName?.toLowerCase().includes(query)) ||
        (js.jobSheetNumber?.toLowerCase().includes(query))
      );
    })
    .filter((js) => {
      // Order Date filtering
      let orderDatePass = true;
      if (orderFromDate || orderToDate) {
        const orderDate = js.orderDate && isValid(new Date(js.orderDate)) ? new Date(js.orderDate) : null;
        if (orderDate) {
          const start = orderFromDate || new Date("1900-01-01");
          const end = orderToDate || new Date("9999-12-31");
          orderDatePass = isWithinInterval(orderDate, { start, end });
        } else {
          orderDatePass = false;
        }
      }

      // Delivery Date filtering
      let deliveryDatePass = true;
      if (deliveryFromDate || deliveryToDate) {
        const deliveryDate = js.deliveryDate && isValid(new Date(js.deliveryDate)) ? new Date(js.deliveryDate) : null;
        if (deliveryDate) {
          const start = deliveryFromDate || new Date("1900-01-01");
          const end = deliveryToDate || new Date("9999-12-31");
          deliveryDatePass = isWithinInterval(deliveryDate, { start, end });
        } else {
          deliveryDatePass = false;
        }
      }

      return orderDatePass && deliveryDatePass;
    })
    .sort((a, b) => {
      const fieldA = sortField === "orderDate" ? new Date(a.orderDate) : new Date(a.deliveryDate);
      const fieldB = sortField === "orderDate" ? new Date(b.orderDate) : new Date(b.deliveryDate);

      if (!isValid(fieldA) && !isValid(fieldB)) return 0;
      if (!isValid(fieldA)) return 1;
      if (!isValid(fieldB)) return -1;

      return sortOrder === "asc" ? fieldA - fieldB : fieldB - fieldA;
    });

  const exportToExcel = () => {
    const exportData = [];
    let serial = 1;

    filteredJobSheets.forEach((js) => {
      const createdAtFormatted =
        js.createdAt && isValidDate(new Date(js.createdAt))
          ? format(new Date(js.createdAt), "dd/MM/yyyy")
          : "Invalid date";

      const orderDateFormatted =
        js.orderDate && isValidDate(new Date(js.orderDate))
          ? format(new Date(js.orderDate), "dd/MM/yyyy")
          : "Invalid date";

      const deliveryDateFormatted =
        js.deliveryDate && isValidDate(new Date(js.deliveryDate))
          ? format(new Date(js.deliveryDate), "dd/MM/yyyy")
          : "Invalid date";

      if (js.items && js.items.length > 0) {
        js.items.forEach((item) => {
          exportData.push({
            "Sl. No": serial++,
            "Created At": createdAtFormatted,
            "Order Date": orderDateFormatted, // Added Order Date
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
        exportData.push({
          "Sl. No": serial++,
          "Created At": createdAtFormatted,
          "Order Date": orderDateFormatted, // Added Order Date
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
          <button
            onClick={() => {
              setDraftPanelOpen(true);
              fetchMyDrafts();
            }}
            className="bg-[#66C3D0] hover:bg-[#66C3D0]/90 text-white px-4 py-2 rounded"
          >
            View My Drafts
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white px-4 py-2 rounded"
          >
            Create Jobsheet
          </button>
          <button
            onClick={exportToExcel}
            className="bg-[#44b977] hover:bg-[#44b977]/90 text-white px-4 py-2 rounded"
          >
            Export to Excel
          </button>
        </div>
      </div>

      {/* Search and Date Filter Section */}
      <div className="mb-4 p-4 border rounded relative">
        <h2 className="font-bold mb-2">Search & Filter</h2>
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Company, Event, Quotation, etc."
            className="border p-2 rounded w-full md:w-1/2 mb-2 md:mb-0"
          />
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white px-4 py-2 rounded"
          >
            {showDateFilter ? "Hide Filters" : "Show Date Filters"}
          </button>
        </div>

        {/* Date Filter Panel */}
        {showDateFilter && (
          <div
            ref={dateFilterRef}
            className="absolute top-0 left-0 right-0 bg-white border rounded p-4 z-10 shadow-lg"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Date Filters & Sorting</h3>
              <button
                onClick={() => setShowDateFilter(false)}
                className="text-gray-500 hover:text-gray-800 font-bold text-xl"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order Date Filter */}
              <div>
                <h4 className="font-medium mb-2">Order Date Range</h4>
                <div className="flex space-x-2">
                  <DatePicker
                    selected={orderFromDate}
                    onChange={(date) => setOrderFromDate(date)}
                    selectsStart
                    startDate={orderFromDate}
                    endDate={orderToDate}
                    dateFormat="dd/MM/yyyy"
                    className="border p-2 rounded w-full"
                    placeholderText="From (DD/MM/YYYY)"
                  />
                  <DatePicker
                    selected={orderToDate}
                    onChange={(date) => setOrderToDate(date)}
                    selectsEnd
                    startDate={orderFromDate}
                    endDate={orderToDate}
                    minDate={orderFromDate}
                    dateFormat="dd/MM/yyyy"
                    className="border p-2 rounded w-full"
                    placeholderText="To (DD/MM/YYYY)"
                  />
                </div>
              </div>
              {/* Delivery Date Filter */}
              <div>
                <h4 className="font-medium mb-2">Delivery Date Range</h4>
                <div className="flex space-x-2">
                  <DatePicker
                    selected={deliveryFromDate}
                    onChange={(date) => setDeliveryFromDate(date)}
                    selectsStart
                    startDate={deliveryFromDate}
                    endDate={deliveryToDate}
                    dateFormat="dd/MM/yyyy"
                    className="border p-2 rounded w-full"
                    placeholderText="From (DD/MM/YYYY)"
                  />
                  <DatePicker
                    selected={deliveryToDate}
                    onChange={(date) => setDeliveryToDate(date)}
                    selectsEnd
                    startDate={deliveryFromDate}
                    endDate={deliveryToDate}
                    minDate={deliveryFromDate}
                    dateFormat="dd/MM/yyyy"
                    className="border p-2 rounded w-full"
                    placeholderText="To (DD/MM/YYYY)"
                  />
                </div>
              </div>
            </div>
            {/* Sorting Options */}
            <div className="mt-4">
              <h4 className="font-medium mb-2">Sort By</h4>
              <div className="flex space-x-4">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  className="border p-2 rounded"
                >
                  <option value="orderDate">Order Date</option>
                  <option value="deliveryDate">Delivery Date</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="border p-2 rounded"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>
        )}
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
            
              <th className="p-2 text-left" >
                JobSheet No.
              {/*   {isSorted && <span> 🔽 </span>} */}
                </th>
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
                <td className="p-2">
                   <button onClick={() => handleOpenModal(js)}>
                    {js.jobSheetNumber || "(No Number)"}
                  </button>
                  </td>
                  {/* Modal */}
              {showModal && (
                    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center px-4 overflow-auto">
                      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-4xl">
                        <h2 className="text-lg sm:text-xl font-semibold mb-4">Job Sheet Details</h2>
                        <p><strong>Job Sheet Number:</strong> {jobSheet?.jobSheetNumber || "(No Number)"}</p>
                        <p><strong>ID:</strong> {jobSheet?._id}</p>

                        {/* Header Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 mt-4 text-xs sm:text-sm border border-black">
                          <div className="border border-black p-1 flex flex-col sm:flex-row items-start sm:items-center">
                            <span className="font-bold uppercase">Event Name:</span>
                            <span className="ml-1 font-semibold">{jobSheet.eventName || "N/A"}</span>
                          </div>
                          <div className="border border-black flex items-center justify-center font-bold uppercase">
                            ORDER FORM
                          </div>
                          <div className="border border-black flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="h-12 sm:h-16" />
                          </div>
                        </div>

                        {/* 3x3 Grid Header */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 mt-2 text-xs sm:text-sm">
                          <Cell label="ORDER FORM #:" value={jobSheet.jobSheetNumber} />
                          <Cell label="CLIENT COMPANY:" value={jobSheet.clientCompanyName} />
                          <Cell label="REF QUOTATION:" value={jobSheet.referenceQuotation} />
                          <Cell label="DELIVERY TIME:" value={jobSheet.deliveryTime} />
                          <Cell label="CLIENT NAME:" value={jobSheet.clientName} />
                          <Cell label="CRM INCHARGE:" value={jobSheet.crmIncharge} />
                          <Cell label="CONTACT:" value={jobSheet.contactNumber} />
                        </div>

                        {/* Product Table */}
                        <div className="overflow-x-auto mt-4">
                          <table className="min-w-full border-collapse border border-black text-xs sm:text-sm">
                            <thead>
                              <tr className="bg-gray-100">
                                {[
                                  "SL NO.", "PRODUCTS", "COLOR", "SIZE/CAPACITY", "QTY", "SOURCING FROM",
                                  "BRANDING TYPE", "BRANDING VENDOR", "REMARKS"
                                ].map((h) => (
                                  <th key={h} className="p-1 border border-black whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {jobSheet.items.map((it, i) => (
                                <tr key={i} className="border border-black font-semibold">
                                  <td className="p-1 border border-black">{i + 1}</td>
                                  <td className="p-1 border border-black">{it.product}</td>
                                  <td className="p-1 border border-black">{it.color}</td>
                                  <td className="p-1 border border-black">{it.size}</td>
                                  <td className="p-1 border border-black">{it.quantity}</td>
                                  <td className="p-1 border border-black">{it.sourcingFrom || "N/A"}</td>
                                  <td className="p-1 border border-black">{it.brandingType || "N/A"}</td>
                                  <td className="p-1 border border-black">{it.brandingVendor || "N/A"}</td>
                                  <td className="p-1 border border-black">{it.remarks || "N/A"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Additional Details */}
                        <Section rows={[
                          [{ label: "PO NUMBER:", val: jobSheet.poNumber }, { label: "PO STATUS:", val: jobSheet.poStatus }],
                          [
                            { label: "DELIVERY TYPE:", val: jobSheet.deliveryType },
                            { label: "DELIVERY MODE:", val: jobSheet.deliveryMode },
                            { label: "DELIVERY CHARGES:", val: jobSheet.deliveryCharges },
                          ],
                        ]} />

                        <Line label="DELIVERY ADDRESS:" value={jobSheet.deliveryAddress} />
                        <Line label="GIFT BOX / BAGS DETAILS:" value={jobSheet.giftBoxBagsDetails} />
                        <Line label="PACKAGING INSTRUCTIONS:" value={jobSheet.packagingInstructions} />
                        <Line label="ANY OTHER DETAILS:" value={jobSheet.otherDetails} />

                        {/* Hand-written fields */}
                        <div className="mt-4">
                          <div className="flex flex-col sm:flex-row justify-between mb-8 gap-4">
                            {["QTY DISPATCHED:", "SENT ON:", "SEAL/SIGN:"].map((t) => (
                              <div key={t} className="w-full sm:w-1/3 text-center">
                                <span className="font-bold uppercase">{t}</span>
                                <span className="block border-b border-black mt-1 w-full h-6"></span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={handleCloseModal}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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
                <td className="p-2">
                  <Dropdown autoClose="outside">
                    <Dropdown.Toggle
                      variant="link"
                      id={`dropdown-actions-${js._id}`}
                      className="text-gray-500 hover:text-gray-800"
                    >
                      <FaEllipsisV />
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="bg-white shadow-lg rounded border border-gray-200">
                      <Dropdown.Item
                        onClick={() => navigate(`/admin-dashboard/jobsheet/${js._id}`)}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                      >
                        View
                      </Dropdown.Item>
                      <Dropdown.Item
                        onClick={() => navigate(`/admin-dashboard/create-jobsheet/${js._id}`)}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                      >
                        Edit
                      </Dropdown.Item>
                      {/* <Dropdown.Item
                        onClick={() => deleteJobSheet(js._id, false)}
                        className="block w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
                      >
                        Delete
                      </Dropdown.Item> */}
                    </Dropdown.Menu>
                  </Dropdown>
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
            fetchJobSheets(false);
          }}
          navigate={navigate}
          BACKEND_URL={BACKEND_URL}
        />
      )}

      {/* Draft Panel at bottom */}
      {draftPanelOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-50"
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
                    <td className="p-2">
                      <Dropdown autoClose="outside">
                        <Dropdown.Toggle
                          variant="link"
                          id={`dropdown-draft-actions-${draft._id}`}
                          className="text-gray-500 hover:text-gray-800"
                        >
                          <FaEllipsisV />
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="bg-white shadow-lg rounded border border-gray-200">
                          <Dropdown.Item
                            onClick={() => navigate(`/admin-dashboard/jobsheet/${draft._id}`)}
                            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                          >
                            View
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => navigate(`/admin-dashboard/create-jobsheet/${draft._id}`)}
                            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                          >
                            Edit
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => deleteJobSheet(draft._id, true)}
                            className="block w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
                          >
                            Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
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
 * CreateJobsheetModal
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
      const body = {
        ...formData,
        isDraft: createAsDraft,
      };
      await axios.post(`${BACKEND_URL}/api/admin/jobsheets`, body, {
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
            <div className="grid grid-cols-2 gap-4">
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
            </div>
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