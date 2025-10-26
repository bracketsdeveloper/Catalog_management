import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { utils, write } from "xlsx";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaEllipsisV } from "react-icons/fa";
import { Dropdown } from "react-bootstrap";
import RemarksModal from "../components/CatalogManagement/RemarksModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function QuotationManagementPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [quotation, setQuotation] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [latestActions, setLatestActions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [headerSearch, setHeaderSearch] = useState({
    quotationNumber: "",
    opportunityNumber: "",
    opportunityOwner: "",
    customerCompany: "",
    customerName: "",
    catalogName: "",
    items: "",
    createdAt: "",
  });
  const [showFilterWindow, setShowFilterWindow] = useState(false);
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [fromDateFilter, setFromDateFilter] = useState(null);
  const [toDateFilter, setToDateFilter] = useState(null);
  const [companyFilter, setCompanyFilter] = useState([]);
  const [opportunityOwnerFilter, setOpportunityOwnerFilter] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "quotationNumber", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuotations, setTotalQuotations] = useState(0);
  const [userEmail, setUserEmail] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [selectedItemForRemarks, setSelectedItemForRemarks] = useState(null);
  const filterRef = useRef(null);
  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  const canExportCRM = permissions.includes("crm-export");

  // DRAFT drawer state
  const [showDraftWindow, setShowDraftWindow] = useState(false);
  const [draftQuotations, setDraftQuotations] = useState([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterWindow(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchData();
    fetchUserEmail();
    fetchOpportunities();
    if (id) fetchQuotation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentPage, approvalFilter, fromDateFilter, toDateFilter, companyFilter, opportunityOwnerFilter, searchQuery, headerSearch]);

  useEffect(() => {
    if (quotations.length > 0) {
      fetchLatestActions(quotations.map((q) => q._id));
    } else {
      setLatestActions({});
    }
  }, [quotations]);

  // Auto-fetch drafts whenever the window opens
  useEffect(() => {
    if (showDraftWindow) {
      fetchDrafts();
    }
  }, [showDraftWindow]);

  async function fetchUserEmail() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserEmail(res.data.email);
      setIsSuperAdmin(localStorage.getItem("isSuperAdmin") === "true");
    } catch (err) {
      console.error("Error fetching user email:", err);
    }
  }

  async function fetchQuotation() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuotation(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching quotation:", err);
      setError("Failed to load quotation");
    } finally {
      setLoading(false);
    }
  }

  async function fetchOpportunities() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/opportunities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOpportunities(Array.isArray(res.data) ? res.data : res.data.opportunities || []);
    } catch (err) {
      console.error("Error fetching opportunities:", err);
      setOpportunities([]);
    }
  }

  async function fetchLatestActions(quotationIds) {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BACKEND_URL}/api/admin/logs/latest`,
        { quotationIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLatestActions(res.data);
    } catch (err) {
      console.error("Error fetching latest actions:", err);
      setLatestActions({});
    }
  }

  async function fetchData() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = {
        page: currentPage,
        limit: 100,
        search: searchQuery || undefined,
        approvalFilter: approvalFilter === "all" ? undefined : approvalFilter,
        fromDate: fromDateFilter ? format(fromDateFilter, "yyyy-MM-dd") : undefined,
        toDate: toDateFilter ? format(toDateFilter, "yyyy-MM-dd") : undefined,
        company: companyFilter.length > 0 ? companyFilter : undefined,
        opportunityOwner: opportunityOwnerFilter.length > 0 ? opportunityOwnerFilter : undefined,
        quotationNumber: headerSearch.quotationNumber || undefined,
        opportunityNumber: headerSearch.opportunityNumber || undefined,
        customerCompany: headerSearch.customerCompany || undefined,
        customerName: headerSearch.customerName || undefined,
        catalogName: headerSearch.catalogName || undefined,
        items: headerSearch.items || undefined,
        createdAt: headerSearch.createdAt || undefined,
      };
      const res = await axios.get(`${BACKEND_URL}/api/admin/quotationspages`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        timeout: 30000,
      });
      let filteredQuotations = res.data.quotations;

      // Client-side filtering for opportunityOwner since it requires opportunities data
      if (headerSearch.opportunityOwner) {
        filteredQuotations = filteredQuotations.filter((q) => {
          const opp = opportunities.find((o) => o.opportunityCode === q.opportunityNumber);
          return opp?.opportunityOwner?.toLowerCase().includes(headerSearch.opportunityOwner.toLowerCase());
        });
      }

      // Client-side sorting
      filteredQuotations = [...filteredQuotations].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === "opportunityOwner") {
          const oppA = opportunities.find((o) => o.opportunityCode === a.opportunityNumber);
          const oppB = opportunities.find((o) => o.opportunityCode === b.opportunityNumber);
          valA = oppA?.opportunityOwner || "";
          valB = oppB?.opportunityOwner || "";
        } else if (sortConfig.key === "items.length") {
          valA = (a.items || []).length;
          valB = (b.items || []).length;
        }

        if (sortConfig.key === "createdAt") {
          valA = new Date(valA || 0);
          valB = new Date(valB || 0);
        } else {
          valA = (valA || "").toString().toLowerCase();
          valB = (valB || "").toString().toLowerCase();
        }

        return (valA < valB ? -1 : 1) * (sortConfig.direction === "asc" ? 1 : -1);
      });

      setQuotations(filteredQuotations);
      setTotalPages(res.data.totalPages || 1);
      setTotalQuotations(res.data.totalQuotations || 0);
      setError(null);
    } catch (err) {
      console.error("Error fetching quotations:", err);
      setError("Failed to fetch quotations");
    } finally {
      setLoading(false);
    }
  }

  // -------------- Drafts --------------
  async function fetchDrafts() {
    try {
      setDraftLoading(true);
      setDraftError(null);
      const token = localStorage.getItem("token");
      // Pull only drafts. Use pages or plain list; plain list is fine for <=100.
      const res = await axios.get(`${BACKEND_URL}/api/admin/quotations`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { draft: true, page: 1, limit: 100 },
        timeout: 30000,
      });
      const drafts = Array.isArray(res.data?.quotations) ? res.data.quotations : [];
      setDraftQuotations(drafts);
    } catch (err) {
      console.error("Error fetching draft quotations:", err);
      setDraftError("Failed to load draft quotations");
      setDraftQuotations([]);
    } finally {
      setDraftLoading(false);
    }
  }

  async function handlePublishDraft(draft) {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BACKEND_URL}/api/admin/quotations/${draft._id}/publish`,
        {},
        { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 }
      );
      // Refresh both lists
      fetchDrafts();
      fetchData();
      alert("Draft published successfully!");
    } catch (err) {
      console.error("Error publishing draft:", err);
      alert("Failed to publish draft.");
    }
  }

  async function handleDeleteDraft(draft) {
    if (!window.confirm(`Delete draft ${draft.quotationNumber}? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/quotations/${draft._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchDrafts();
      fetchData();
      alert("Draft deleted.");
    } catch (err) {
      console.error("Error deleting draft:", err);
      alert("Failed to delete draft.");
    }
  }

  function toggleDraftWindow() {
    setShowDraftWindow((s) => !s);
  }

  // -------------- Existing Handlers --------------
  async function handleGenerateDeliveryChallan(quotation) {
    try {
      const token = localStorage.getItem("token");
      const items = quotation.items.map((item) => ({
        slNo: item.slNo || null,
        productId: item.productId || null,
        product: item.product || "",
        quantity: item.quantity || 1,
        rate: item.rate || 0,
        productprice: item.productprice || item.rate || 0,
        amount: item.amount || 0,
        productGST: item.productGST || quotation.gst || 18,
        total: item.total || 0,
        baseCost: item.baseCost || 0,
        material: item.material || "",
        weight: item.weight || "",
        brandingTypes: item.brandingTypes || [],
        suggestedBreakdown: item.suggestedBreakdown || {},
        imageIndex: item.imageIndex || 0,
      }));
      const payload = {
        items,
        poNumber: "",
        poDate: null,
        otherReferences: "",
      };
      const res = await axios.post(
        `${BACKEND_URL}/api/admin/delivery-challans/${quotation._id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Delivery Challan created successfully!");
      navigate(`/admin-dashboard/dc/${res.data.deliveryChallan._id}`);
    } catch (error) {
      console.error("Error generating delivery challan:", error);
      alert("Failed to generate delivery challan.");
    }
  }

  async function handleDeleteQuotation(quotation) {
    if (!window.confirm(`Are you sure you want to delete Quotation ${quotation.quotationNumber}?`)) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/quotations/${quotation._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Quotation deleted successfully!");
      fetchData();
    } catch (error) {
      console.error("Error deleting quotation:", error);
      alert("Failed to delete quotation.");
    }
  }

  async function handleSaveRemarks(remarks, _, id) {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BACKEND_URL}/api/admin/quotations/${id}/remarks`,
        { remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Remarks updated!");
      setRemarksModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving remarks:", error);
      alert("Failed to save remarks");
    }
  }

  async function handleExportAllToExcel() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/quotations-export`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          search: searchQuery || undefined,
          approvalFilter: approvalFilter === "all" ? undefined : approvalFilter,
          fromDate: fromDateFilter ? format(fromDateFilter, "yyyy-MM-dd") : undefined,
          toDate: toDateFilter ? format(toDateFilter, "yyyy-MM-dd") : undefined,
          company: companyFilter.length > 0 ? companyFilter : undefined,
          opportunityOwner: opportunityOwnerFilter.length > 0 ? opportunityOwnerFilter : undefined,
        },
        timeout: 60000,
      });
      const allQuotations = Array.isArray(res.data) ? res.data : res.data.quotations || [];
      const exportData = allQuotations.map((q, index) => {
        const opp = opportunities.find((o) => o.opportunityCode === q.opportunityNumber);
        const latestAction = latestActions[q._id] || {};
        return {
          "Sl. No": index + 1,
          "Quotation Number": q.quotationNumber,
          "Opportunity Number": q.opportunityNumber || "N/A",
          "Opportunity Owner": opp?.opportunityOwner || "N/A",
          "Company Name": q.customerCompany,
          "Customer Name": q.customerName,
          "Event Name": q.catalogName,
          "Items": q.items?.length || 0,
          "Created At": format(new Date(q.createdAt), "dd/MM/yyyy"),
          "Remarks": q.remarks || "",
          "Approve Status": q.approveStatus ? "Approved" : "Not Approved",
          "Latest Action": latestAction.action
            ? `${latestAction.action} by ${latestAction.performedBy?.email || "N/A"} at ${latestAction.performedAt ? format(new Date(latestAction.performedAt), "dd/MM/yyyy HH:mm") : "Unknown date"}`
            : "No action recorded",
        };
      });
      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Quotations");
      const wbOut = write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbOut], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Quotations.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Excel export failed");
    }
  }

  async function handleDuplicateQuotation(q) {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${BACKEND_URL}/api/admin/quotations/${q._id}`,
        {}, // no overrides -> pure clone
        { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
      );

      const newQ = res.data?.quotation;
      if (!newQ?._id) {
        alert("Duplicate created, but response was unexpected.");
        fetchData();
        return;
      }

      alert(`Quotation duplicated as ${newQ.quotationNumber}`);
      navigate(`/admin-dashboard/quotations/${newQ._id}`);
      fetchData();
    } catch (error) {
      console.error("Error duplicating quotation:", error);
      alert("Failed to create duplicate quotation.");
    }
  }

  const handleSort = (key, isDate = false) => {
    const direction = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
    fetchData();
  };

  const handleHeaderSearch = (key, value) => {
    setHeaderSearch((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const SkeletonLoader = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-gray-700 border-b border-gray-200">
        <thead className="bg-gray-50 border-b text-gray-500 uppercase sticky top-0 z-10">
          <tr>
            {[
              "Quotation No.",
              "Opportunity No.",
              "Opportunity Owner",
              "Company",
              "Customer Name",
              "Event Name",
              "Items",
              "Created At",
              "Latest Action",
              "Actions",
            ].map((header) => (
              <th key={header} className="py-2 px-3 text-left">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="border-b">
              {[...Array(10)].map((_, cellIndex) => (
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
      <span>Page {currentPage} of {totalPages} (Total: {totalQuotations})</span>
      <button
        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages || loading}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );

  const uniqueOpportunityOwners = [...new Set(opportunities.map((opp) => opp.opportunityOwner))];
  const uniqueCompanyNames = [...new Set(quotations.map((q) => q.customerCompany))];

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 space-y-4 md:space-y-0">
        <h1 className="text-2xl font-bold">Manage Quotations</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate("/admin-dashboard/catalogs/manual")}
            className="bg-[#44b977] hover:bg-[#44b977]/90 text-white px-4 py-2 rounded"
          >
            Create Quotation
          </button>
          {(isSuperAdmin || canExportCRM) && (
            <button
              onClick={handleExportAllToExcel}
              className="bg-[#44b977] hover:bg-[#44b977]/90 text-white px-4 py-2 rounded"
            >
              Export to Excel
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 p-4 border rounded">
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
            onClick={() => setShowFilterWindow((s) => !s)}
            className="border px-3 py-2 rounded text-sm"
          >
            {showFilterWindow ? "Hide Filters" : "Show Filters"}
          </button>
          <button
            onClick={toggleDraftWindow}
            className="border px-3 py-2 rounded text-sm"
          >
            {showDraftWindow ? "Hide Drafts" : "Show Drafts"}
          </button>
        </div>

        {showFilterWindow && (
          <div
            ref={filterRef}
            className="mt-4 bg-white border rounded p-4 shadow-lg z-20"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Filters & Sorting</h3>
              <button
                onClick={() => setShowFilterWindow(false)}
                className="text-gray-500 hover:text-gray-800 font-bold text-xl"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Date Range</h4>
                <div className="flex space-x-2">
                  <DatePicker
                    selected={fromDateFilter}
                    onChange={(date) => {
                      setFromDateFilter(date);
                      setCurrentPage(1);
                    }}
                    selectsStart
                    startDate={fromDateFilter}
                    endDate={toDateFilter}
                    dateFormat="dd/MM/yyyy"
                    className="border p-2 rounded w-full"
                    placeholderText="From (DD/MM/YYYY)"
                  />
                  <DatePicker
                    selected={toDateFilter}
                    onChange={(date) => {
                      setToDateFilter(date);
                      setCurrentPage(1);
                    }}
                    selectsEnd
                    startDate={fromDateFilter}
                    endDate={toDateFilter}
                    minDate={fromDateFilter}
                    dateFormat="dd/MM/yyyy"
                    className="border p-2 rounded w-full"
                    placeholderText="To (DD/MM/YYYY)"
                  />
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Company Name</h4>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2">
                  {uniqueCompanyNames.map((company, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`company-${index}`}
                        value={company}
                        checked={companyFilter.includes(company)}
                        onChange={(e) => {
                          const selected = e.target.checked
                            ? [...companyFilter, company]
                            : companyFilter.filter((item) => item !== company);
                          setCompanyFilter(selected);
                          setCurrentPage(1);
                        }}
                        className="mr-2"
                      />
                      <label htmlFor={`company-${index}`} className="text-sm">{company}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Opportunity Owner</h4>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2">
                  {uniqueOpportunityOwners.map((owner, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`owner-${index}`}
                        value={owner}
                        checked={opportunityOwnerFilter.includes(owner)}
                        onChange={(e) => {
                          const selected = e.target.checked
                            ? [...opportunityOwnerFilter, owner]
                            : opportunityOwnerFilter.filter((item) => item !== owner);
                          setOpportunityOwnerFilter(selected);
                          setCurrentPage(1);
                        }}
                        className="mr-2"
                      />
                      <label htmlFor={`owner-${index}`} className="text-sm">{owner}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-medium mb-2">Sort By</h4>
              <div className="flex space-x-4">
                <select
                  value={sortConfig.key}
                  onChange={(e) => handleSort(e.target.value, e.target.value === "createdAt")}
                  className="border p-2 rounded"
                >
                  <option value="quotationNumber">Quotation No.</option>
                  <option value="opportunityNumber">Opportunity No.</option>
                  <option value="opportunityOwner">Opportunity Owner</option>
                  <option value="customerCompany">Company</option>
                  <option value="customerName">Customer Name</option>
                  <option value="catalogName">Event Name</option>
                  <option value="items.length">Items</option>
                  <option value="createdAt">Created At</option>
                </select>
                <select
                  value={sortConfig.direction}
                  onChange={(e) => setSortConfig({ ...sortConfig, direction: e.target.value })}
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

      {loading ? (
        <SkeletonLoader />
      ) : error ? (
        <div className="p-4 text-red-600 bg-red-100 border border-red-400 rounded">
          {error}
          <button onClick={() => fetchData()} className="ml-4 text-blue-600 underline">
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gray-50 border-b text-gray-500 uppercase sticky top-0 z-10">
                <tr>
                  <th className="p-2 text-left cursor-pointer" onClick={() => handleSort("quotationNumber")}>
                    Quotation No. {sortConfig.key === "quotationNumber" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="p-2 text-left cursor-pointer" onClick={() => handleSort("opportunityNumber")}>
                    Opportunity No. {sortConfig.key === "opportunityNumber" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="p-2 text-left cursor-pointer" onClick={() => handleSort("opportunityOwner")}>
                    Opportunity Owner {sortConfig.key === "opportunityOwner" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="p-2 text-left cursor-pointer" onClick={() => handleSort("customerCompany")}>
                    Company {sortConfig.key === "customerCompany" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="p-2 text-left cursor-pointer" onClick={() => handleSort("customerName")}>
                    Customer Name {sortConfig.key === "customerName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="p-2 text-left cursor-pointer" onClick={() => handleSort("catalogName")}>
                    Event Name {sortConfig.key === "catalogName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="p-2 text-left cursor-pointer" onClick={() => handleSort("items.length")}>
                    Items {sortConfig.key === "items.length" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="p-2 text-left cursor-pointer" onClick={() => handleSort("createdAt", true)}>
                    Created At {sortConfig.key === "createdAt" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="p-2 text-left">
                    Latest Action
                  </th>
                  <th className="p-2 text-left">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => {
                  const opp = opportunities.find((o) => o.opportunityCode === q.opportunityNumber);
                  const latestAction = latestActions[q._id] || {};
                  return (
                    <tr key={q._id} className="border-b">
                      <td className="p-2 border">
                        <button
                          className="text-blue-500 hover:text-blue-700"
                          onClick={() => navigate(`/admin-dashboard/quotations/${q._id}`)}
                        >
                          {q.quotationNumber}
                          {q.quotationNumber < 10496 && <span> (old)</span>}
                          {q.isDraft && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">DRAFT</span>}
                        </button>
                      </td>
                      <td className="p-2">{q.opportunityNumber || "N/A"}</td>
                      <td className="p-2">{opp?.opportunityOwner || "N/A"}</td>
                      <td className="p-2">{q.customerCompany || "N/A"}</td>
                      <td className="p-2">{q.customerName || "N/A"}</td>
                      <td className="p-2">{q.catalogName || "N/A"}</td>
                      <td className="p-2">{q.items?.length || 0}</td>
                      <td className="p-2">{format(new Date(q.createdAt), "dd/MM/yyyy")}</td>
                      <td className="p-2">
                        {latestAction.action
                          ? `${latestAction.action} by ${latestAction.performedBy?.email || "N/A"} at ${latestAction.performedAt ? format(new Date(latestAction.performedAt), "dd/MM/yyyy HH:mm") : "Unknown"}`
                          : "No action recorded"}
                      </td>
                      <td className="p-2">
                        <Dropdown autoClose="outside">
                          <Dropdown.Toggle
                            variant="link"
                            id={`dropdown-actions-${q._id}`}
                            className="text-gray-500 hover:text-gray-800"
                          >
                            <FaEllipsisV />
                          </Dropdown.Toggle>
                          <Dropdown.Menu className="bg-white shadow-lg rounded border border-gray-200">
                            <Dropdown.Item
                              onClick={() => navigate(`/admin-dashboard/quotations/${q._id}`)}
                              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                            >
                              View
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() =>
                                q.quotationNumber >= 10496
                                  ? navigate(`/admin-dashboard/quotation/manual/${q._id}`)
                                  : navigate(`/admin-dashboard/oldquotation/manual/${q._id}`)
                              }
                              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                            >
                              Edit
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() => {
                                setSelectedItemForRemarks(q);
                                setRemarksModalOpen(true);
                              }}
                              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                            >
                              Remarks
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() => handleGenerateDeliveryChallan(q)}
                              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                            >
                              Generate Delivery Challan
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() => handleDuplicateQuotation(q)}
                              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                            >
                              Create Duplicate
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() => handleDeleteQuotation(q)}
                              className="block w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
                            >
                              Delete
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </>
      )}

      {/* Floating Drafts button with count (bottom-right) */}
      <button
        onClick={toggleDraftWindow}
        className="fixed right-4 bottom-4 px-4 py-2 rounded-full shadow-md border bg-white hover:bg-gray-50"
        title="Show Draft Quotations"
      >
        Drafts
        {draftQuotations.length > 0 && (
          <span className="ml-2 inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-900">
            {draftQuotations.length}
          </span>
        )}
      </button>

      {/* Bottom slide-up Drafts window */}
      {showDraftWindow && (
        <div className="fixed left-0 right-0 bottom-0 z-30">
          <div className="mx-auto max-w-7xl border-t border-gray-300 shadow-2xl bg-white rounded-t-lg">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold">Draft Quotations</h3>
                <span className="text-sm text-gray-500">({draftQuotations.length})</span>
              </div>
              <div className="space-x-2">
                <button
                  onClick={fetchDrafts}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setShowDraftWindow(false)}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto">
              {draftLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading drafts…</div>
              ) : draftError ? (
                <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                  {draftError}
                </div>
              ) : draftQuotations.length === 0 ? (
                <div className="p-6 text-sm text-gray-600">No drafts found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-yellow-50 border-b text-gray-700 uppercase">
                      <tr>
                        <th className="p-2 text-left">Quotation No.</th>
                        <th className="p-2 text-left">Company</th>
                        <th className="p-2 text-left">Event</th>
                        <th className="p-2 text-left">Items</th>
                        <th className="p-2 text-left">Created</th>
                        <th className="p-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftQuotations.map((d) => (
                        <tr key={d._id} className="border-b">
                          <td className="p-2">
                            <span className="font-medium">{d.quotationNumber}</span>
                            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">DRAFT</span>
                          </td>
                          <td className="p-2">{d.customerCompany || "—"}</td>
                          <td className="p-2">{d.catalogName || "—"}</td>
                          <td className="p-2">{d.items?.length || 0}</td>
                          <td className="p-2">{d.createdAt ? format(new Date(d.createdAt), "dd/MM/yyyy") : "—"}</td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => navigate(`/admin-dashboard/quotations/${d._id}`)}
                                className="px-2 py-1 border rounded hover:bg-gray-50"
                              >
                                View
                              </button>
                              <button
                                onClick={() =>
                                  d.quotationNumber >= 10496
                                    ? navigate(`/admin-dashboard/quotation/manual/${d._id}`)
                                    : navigate(`/admin-dashboard/oldquotation/manual/${d._id}`)
                                }
                                className="px-2 py-1 border rounded hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handlePublishDraft(d)}
                                className="px-2 py-1 border rounded bg-green-600 text-white hover:bg-green-700"
                              >
                                Publish
                              </button>
                              <button
                                onClick={() => handleDeleteDraft(d)}
                                className="px-2 py-1 border rounded text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {remarksModalOpen && selectedItemForRemarks && (
        <RemarksModal
          item={selectedItemForRemarks}
          type="quotation"
          onClose={() => setRemarksModalOpen(false)}
          onSave={handleSaveRemarks}
          userEmail={userEmail}
        />
      )}
    </div>
  );
}
