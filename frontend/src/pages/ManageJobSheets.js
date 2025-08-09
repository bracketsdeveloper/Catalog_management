"use client";

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import { format, parse, isValid } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { Dropdown } from "react-bootstrap";
import { FaEllipsisV } from "react-icons/fa";
import JobSheetGlobal from "../components/jobsheet/globalJobsheet";

export default function ManageJobSheets() {
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [jobSheets, setJobSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [orderFromDate, setOrderFromDate] = useState(null);
  const [orderToDate, setOrderToDate] = useState(null);
  const [deliveryFromDate, setDeliveryFromDate] = useState(null);
  const [deliveryToDate, setDeliveryToDate] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    field: "jobSheetNumber",
    order: "desc",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [draftPanelOpen, setDraftPanelOpen] = useState(false);
  const [draftSheets, setDraftSheets] = useState([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState(null);
  const [selectedJobSheetNumber, setSelectedJobSheetNumber] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [latestActions, setLatestActions] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobSheets, setTotalJobSheets] = useState(0);

  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  const canExportCRM = permissions.includes("crm-export");

  const dateFilterRef = useRef(null);

  // Close date filter when clicking outside
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

  // Initial fetch & refetch on filters/page change
  useEffect(() => {
    fetchJobSheets(false);
    fetchUserEmail();
  }, [currentPage, searchQuery, orderFromDate, orderToDate, deliveryFromDate, deliveryToDate]);

  // Fetch latest actions whenever the list updates
  useEffect(() => {
    if (jobSheets.length > 0) {
      fetchLatestActions(jobSheets.map((js) => js._id));
    } else {
      setLatestActions({});
    }
  }, [jobSheets]);

  async function fetchUserEmail() {
    try {
      const token = localStorage.getItem("token");
      await axios.get(`${BACKEND_URL}/api/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsSuperAdmin(localStorage.getItem("isSuperAdmin") === "true");
    } catch (err) {
      console.error("Error fetching user email:", err);
    }
  }

  // Fetch job sheets with retry logic
  async function fetchJobSheets(draftOnly = false, retries = 3) {
    setLoading(true);
    setError(null);
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const token = localStorage.getItem("token");
        const params = {
          draftOnly: draftOnly ? "true" : undefined,
          searchQuery: searchQuery || undefined,
          orderFromDate: orderFromDate ? format(orderFromDate, "yyyy-MM-dd") : undefined,
          orderToDate: orderToDate ? format(orderToDate, "yyyy-MM-dd") : undefined,
          deliveryFromDate: deliveryFromDate ? format(deliveryFromDate, "yyyy-MM-dd") : undefined,
          deliveryToDate: deliveryToDate ? format(deliveryToDate, "yyyy-MM-dd") : undefined,
          page: currentPage,
          limit: 100,
        };
        const res = await axios.get(`${BACKEND_URL}/api/admin/jobsheets`, {
          headers: { Authorization: `Bearer ${token}` },
          params,
          timeout: 30000,
        });
        if (!res.data.jobSheets) {
          throw new Error("No job sheets data received");
        }
        setJobSheets(res.data.jobSheets);
        setTotalPages(res.data.totalPages || 1);
        setTotalJobSheets(res.data.totalJobSheets || 0);
        setLoading(false);
        return;
      } catch (err) {
        console.error(`Attempt ${attempt} failed:`, err);
        if (attempt === retries) {
          const status = err.response?.status;
          setError(
            status === 401
              ? "Unauthorized: Please log in again"
              : status === 404
              ? "No job sheets found"
              : status === 400
              ? err.response.data.message
              : "Failed to fetch job sheets. Please try again."
          );
          setLoading(false);
        } else {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  }

  // Fetch current user's drafts
  async function fetchMyDrafts() {
    setDraftLoading(true);
    setDraftError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/jobsheets`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { draftOnly: "true" },
      });
      setDraftSheets(res.data.jobSheets || []);
    } catch (err) {
      console.error("Error fetching user drafts:", err);
      setDraftError("Failed to fetch your draft job sheets");
    } finally {
      setDraftLoading(false);
    }
  }

  // Fetch latest action logs
  async function fetchLatestActions(jobSheetIds) {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BACKEND_URL}/api/admin/jobsheets/logs/latest`,
        { jobSheetIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLatestActions(res.data);
    } catch (err) {
      console.error("Error fetching latest actions:", err);
      setLatestActions({});
    }
  }

  // Delete a jobsheet
  async function deleteJobSheet(id, isDraft) {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/jobsheets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchJobSheets(false);
      if (draftPanelOpen) fetchMyDrafts();
    } catch (err) {
      console.error("Error deleting job sheet:", err);
      alert("Failed to delete job sheet.");
    }
  }

  // Sorting helper
  const handleSort = (field, isDate = false) => {
    let order = "asc";
    if (sortConfig.field === field && sortConfig.order === "asc") {
      order = "desc";
    }
    setSortConfig({ field, order });
  };

  // EXPORT: Fetch exactly the filtered set, then build the workbook
  const exportToExcel = async () => {
    try {
      const token = localStorage.getItem("token");

      // Fetch all filtered job sheets in one go
      const params = {
        draftOnly: false,
        searchQuery: searchQuery || undefined,
        orderFromDate: orderFromDate ? format(orderFromDate, "yyyy-MM-dd") : undefined,
        orderToDate: orderToDate ? format(orderToDate, "yyyy-MM-dd") : undefined,
        deliveryFromDate: deliveryFromDate ? format(deliveryFromDate, "yyyy-MM-dd") : undefined,
        deliveryToDate: deliveryToDate ? format(deliveryToDate, "yyyy-MM-dd") : undefined,
        page: 1,
        limit: totalJobSheets > 0 ? totalJobSheets : 1000,
      };

      const res = await axios.get(`${BACKEND_URL}/api/admin/jobsheets`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        timeout: 60000,
      });

      const allJobSheets = Array.isArray(res.data.jobSheets)
        ? res.data.jobSheets
        : [];

      // Build export data rows
      const exportData = [];
      let serial = 1;

      allJobSheets.forEach((js) => {
        const createdAtFormatted = js.createdAt && isValid(new Date(js.createdAt))
          ? format(new Date(js.createdAt), "dd/MM/yyyy")
          : "Invalid date";
        const orderDateFormatted = js.orderDate && isValid(new Date(js.orderDate))
          ? format(new Date(js.orderDate), "dd/MM/yyyy")
          : "Invalid date";
        const deliveryDateFormatted = js.deliveryDate && isValid(new Date(js.deliveryDate))
          ? format(new Date(js.deliveryDate), "dd/MM/yyyy")
          : "Invalid date";
        const latestAction = latestActions[js._id] || {};

        if (js.items && js.items.length > 0) {
          js.items.forEach((item) => {
            const brandingType = Array.isArray(item.brandingType)
              ? item.brandingType.join(", ")
              : item.brandingType || "";

            exportData.push({
              "Sl. No": serial++,
              "Created At": createdAtFormatted,
              "Order Date": orderDateFormatted,
              "Quotation Number": js.referenceQuotation || "",
              "Job Sheet Number": js.jobSheetNumber || "",
              "Opportunity Name": js.eventName || "",
              "Client Company Name": js.clientCompanyName || "",
              "Client Name": js.clientName || "",
              "Client Delivery Date": deliveryDateFormatted,
              CRM: js.crmIncharge || "",
              "Material Particulars": item.product || "",
              Quantity: item.quantity || "",
              "Sourcing Vendor": item.sourcingFrom || "",
              "Branding Vendor": item.brandingVendor || "",
              "Branding Type": brandingType,
              "PO Status": js.poStatus || "",
              "Latest Action": latestAction.action
                ? `${latestAction.action} by ${latestAction.performedBy?.email || "N/A"} at ${latestAction.performedAt ? new Date(latestAction.performedAt).toLocaleString() : "Unknown date"}`
                : "No action recorded",
            });
          });
        } else {
          exportData.push({
            "Sl. No": serial++,
            "Created At": createdAtFormatted,
            "Order Date": orderDateFormatted,
            "Quotation Number": js.referenceQuotation || "",
            "Job Sheet Number": js.jobSheetNumber || "",
            "Opportunity Name": js.eventName || "",
            "Client Company Name": js.clientCompanyName || "",
            "Client Name": js.clientName || "",
            "Client Delivery Date": deliveryDateFormatted,
            CRM: js.crmIncharge || "",
            "Material Particulars": "",
            Quantity: "",
            "Sourcing Vendor": "",
            "Branding Vendor": "",
            "Branding Type": "",
            "PO Status": js.poStatus || "",
            "Latest Action": latestAction.action
              ? `${latestAction.action} by ${latestAction.performedBy?.email || "N/A"} at ${latestAction.performedAt ? new Date(latestAction.performedAt).toLocaleString() : "Unknown date"}`
              : "No action recorded",
          });
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "JobSheets");
      XLSX.writeFile(workbook, "JobSheets.xlsx");
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Excel export failed");
    }
  };

  const isValidDate = (date) => date instanceof Date && !isNaN(date);

  // Skeleton loader
  const SkeletonLoader = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-gray-700 border-b border-gray-200">
        <thead className="bg-gray-50 border-b text-gray-500 uppercase sticky top-0 z-10">
          <tr>
            {[
              "JobSheet No.",
              "Event Name",
              "Client Name",
              "Company",
              "Order Date",
              "Delivery Date",
              "Latest Action",
              "Actions",
            ].map((header) => (
              <th key={header} className="py-2 px-3 text-left">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="border-b">
              {[...Array(8)].map((_, cellIndex) => (
                <td key={cellIndex} className="py-2 px-3">
                  <div className="animate-pulse bg-gray-200 h-4 w-full rounded"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPagination = () => (
    <div className="flex justify-center items-center mt-4 space-x-2">
      <button
        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        disabled={currentPage === 1 || loading}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Previous
      </button>
      <span>
        Page {currentPage} of {totalPages} (Total: {totalJobSheets})
      </span>
      <button
        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages || loading}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );

  const handleOpenModal = (jobSheetNumber) => {
    setSelectedJobSheetNumber(jobSheetNumber);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJobSheetNumber(null);
  };

  return (
    <div className="p-6">
      {/* Header and Controls */}
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
            onClick={() => navigate("/admin-dashboard/create-jobsheet")}
            className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white px-4 py-2 rounded"
          >
            Create Jobsheet
          </button>
          {(isSuperAdmin || canExportCRM) && (
            <button
              onClick={exportToExcel}
              className="bg-[#44b977] hover:bg-[#44b977]/90 text-white px-4 py-2 rounded"
            >
              Export to Excel
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-4 p-4 border rounded relative">
        <h2 className="font-bold mb-2">Search & Filter</h2>
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
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
              {/* Order Date Range */}
              <div>
                <h4 className="font-medium mb-2">Order Date Range</h4>
                <div className="flex space-x-2">
                  <DatePicker
                    selected={orderFromDate}
                    onChange={(date) => {
                      setOrderFromDate(date);
                      setCurrentPage(1);
                    }}
                    selectsStart
                    startDate={orderFromDate}
                    endDate={orderToDate}
                    dateFormat="dd/MM/yyyy"
                    className="border p-2 rounded w-full"
                    placeholderText="From (DD/MM/YYYY)"
                  />
                  <DatePicker
                    selected={orderToDate}
                    onChange={(date) => {
                      setOrderToDate(date);
                      setCurrentPage(1);
                    }}
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

              {/* Delivery Date Range */}
              <div>
                <h4 className="font-medium mb-2">Delivery Date Range</h4>
                <div className="flex space-x-2">
                  <DatePicker
                    selected={deliveryFromDate}
                    onChange={(date) => {
                      setDeliveryFromDate(date);
                      setCurrentPage(1);
                    }}
                    selectsStart
                    startDate={deliveryFromDate}
                    endDate={deliveryToDate}
                    dateFormat="dd/MM/yyyy"
                    className="border p-2 rounded w-full"
                    placeholderText="From (DD/MM/YYYY)"
                  />
                  <DatePicker
                    selected={deliveryToDate}
                    onChange={(date) => {
                      setDeliveryToDate(date);
                      setCurrentPage(1);
                    }}
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
                  value={sortConfig.field}
                  onChange={(e) =>
                    handleSort(
                      e.target.value,
                      ["orderDate", "deliveryDate"].includes(e.target.value)
                    )
                  }
                  className="border p-2 rounded"
                >
                  <option value="jobSheetNumber">JobSheet No.</option>
                  <option value="eventName">Event Name</option>
                  <option value="clientName">Client Name</option>
                  <option value="clientCompanyName">Company</option>
                  <option value="orderDate">Order Date</option>
                  <option value="deliveryDate">Delivery Date</option>
                </select>
                <select
                  value={sortConfig.order}
                  onChange={(e) => setSortConfig({ ...sortConfig, order: e.target.value })}
                  className="border p-2 rounded"
                >
                  <option value="asc">Ascending (A-Z / Oldest)</option>
                  <option value="desc">Descending (Z-A / Latest)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table or Loader / Error */}
      {loading ? (
        <SkeletonLoader />
      ) : error ? (
        <div className="p-4 text-red-600 bg-red-100 border border-red-400 rounded">
          {error}
          <button onClick={() => fetchJobSheets(false)} className="ml-4 text-blue-600 underline">
            Retry
          </button>
        </div>
      ) : (
        <>
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b">
                {[
                  { label: "JobSheet No.", field: "jobSheetNumber", isDate: false },
                  { label: "Event Name", field: "eventName", isDate: false },
                  { label: "Client Name", field: "clientName", isDate: false },
                  { label: "Company", field: "clientCompanyName", isDate: false },
                  { label: "Order Date", field: "orderDate", isDate: true },
                  { label: "Delivery Date", field: "deliveryDate", isDate: true },
                  { label: "Latest Action", field: null },
                  { label: "Actions", field: null },
                ].map((col) => (
                  <th
                    key={col.label}
                    className={`p-2 text-left ${col.field ? "cursor-pointer" : ""}`}
                    onClick={() => col.field && handleSort(col.field, col.isDate)}
                  >
                    {col.label}
                    {col.field && sortConfig.field === col.field && (
                      <span>{sortConfig.order === "asc" ? " ↑" : " ↓"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobSheets.map((js) => {
                const latestAction = latestActions[js._id] || {};
                return (
                  <tr key={js._id} className="border-b">
                    <td className="p-2 border">
                      <button
                        className="border-b text-blue-500 hover:text-blue-700"
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenModal(js.jobSheetNumber);
                        }}
                      >
                        {js.jobSheetNumber || "(No Number)"}
                      </button>
                    </td>
                    <td className="p-2">{js.eventName || "N/A"}</td>
                    <td className="p-2">{js.clientName || "N/A"}</td>
                    <td className="p-2">{js.clientCompanyName || "N/A"}</td>
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
                      {latestAction.action
                        ? `${latestAction.action} by ${latestAction.performedBy?.email || "N/A"} at ${latestAction.performedAt ? new Date(latestAction.performedAt).toLocaleString() : "Unknown date"}`
                        : "No action recorded"}
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
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {renderPagination()}
        </>
      )}

      {/* Global Jobsheet Modal */}
      <JobSheetGlobal
        jobSheetNumber={selectedJobSheetNumber}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Create Jobsheet Modal */}
      {modalOpen && (
        <CreateJobsheetModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            fetchJobSheets(false);
          }}
          navigate={navigate}
          BACKEND_URL={BACKEND_URL}
        />
      )}

      {/* Drafts Panel */}
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
                    <td className="p-2">{draft.clientName || "N/A"}</td>
                    <td className="p-2">{draft.clientCompanyName || "N/A"}</td>
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

// Create Jobsheet Modal Component
function CreateJobsheetModal({ onClose, onCreated, navigate, BACKEND_URL }) {
  const [formData, setFormData] = useState({
    orderDate: "",
    clientCompanyName: "",
    clientName: "",
    deliveryDate: "",
  });
  const [createAsDraft, setCreateAsDraft] = useState(false);
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
      await axios.post(
        `${BACKEND_URL}/api/admin/jobsheets`,
        { ...formData, isDraft: createAsDraft },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onCreated();
    } catch (err) {
      console.error("Error creating jobsheet:", err);
      setError("Error creating jobsheet.");
    } finally {
      setSaving(false);
    }
  };

  function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded w-4/5 max-w-2xl overflow-auto max-h-full">
        <h2 className="text-2xl font-bold mb-4">Create Jobsheet</h2>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Order Date *</label>
            <DatePicker
              selected={formData.orderDate ? parse(formData.orderDate, "yyyy-MM-dd", new Date()) : null}
              onChange={(date) =>
                setFormData({ ...formData, orderDate: date ? format(date, "yyyy-MM-dd") : "" })
              }
              dateFormat="dd/MM/yyyy"
              className="border p-2 rounded w-full"
              placeholderText="DD/MM/YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Delivery Date *</label>
            <DatePicker
              selected={formData.deliveryDate ? parse(formData.deliveryDate, "yyyy-MM-dd", new Date()) : null}
              onChange={(date) =>
                setFormData({ ...formData, deliveryDate: date ? format(date, "yyyy-MM-dd") : "" })
              }
              dateFormat="dd/MM/yyyy"
              className="border p-2 rounded w-full"
              placeholderText="DD/MM/YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Client Company Name *</label>
            <input
              type="text"
              value={formData.clientCompanyName}
              onChange={(e) => setFormData({ ...formData, clientCompanyName: e.target.value })}
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Client Name *</label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
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
            className={`px-4 py-2 rounded text-white ${saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Jobsheet"}
          </button>
        </div>
      </div>
    </div>
  );
}
