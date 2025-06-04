"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { utils, write } from "xlsx";
import RemarksModal from "../components/CatalogManagement/RemarksModal";
import { groupItemsByDate } from "../components/CatalogManagement/dateUtils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function QuotationManagementPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState([]);
  const [originalQuotations, setOriginalQuotations] = useState([]);
  const [quotation, setQuotation] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [latestActions, setLatestActions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [fromDateFilter, setFromDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState([]);
  const [opportunityOwnerFilter, setOpportunityOwnerFilter] = useState([]);
  const [showFilterWindow, setShowFilterWindow] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "quotationNumber", direction: "desc" });
  const [openDropdownForQuotation, setOpenDropdownForQuotation] = useState(null);
  const [selectedQuotationForDropdown, setSelectedQuotationForDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownButtonRef = useRef(null);
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [selectedItemForRemarks, setSelectedItemForRemarks] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchValues, setSearchValues] = useState({}); // New state for header search
  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  const canExportCRM = permissions.includes("export-crm");

  useEffect(() => {
    function handleDocumentClick() {
      setOpenDropdownForQuotation(null);
      setSelectedQuotationForDropdown(null);
      dropdownButtonRef.current = null;
    }
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  useLayoutEffect(() => {
    function updatePosition() {
      if (!dropdownButtonRef.current) return;
      const rect = dropdownButtonRef.current.getBoundingClientRect();
      const dropdownHeight = 200;
      let top = window.innerHeight - rect.bottom < dropdownHeight
        ? rect.top + window.pageYOffset - dropdownHeight
        : rect.bottom + window.pageYOffset;
      setDropdownPosition({ top, left: rect.left + window.pageXOffset });
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  useEffect(() => {
    fetchData();
    fetchUserEmail();
    fetchOpportunities();
    if (id) fetchQuotation();
  }, [id, approvalFilter, fromDateFilter, toDateFilter, companyFilter, opportunityOwnerFilter]);

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
      const res = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch quotation");
      const data = await res.json();
      setQuotation(data);
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
      setOpportunities(res.data);
    } catch (err) {
      console.error("Error fetching opportunities:", err);
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
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/quotations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let data = approvalFilter === "all"
        ? res.data
        : res.data.filter(q => approvalFilter === "approved" ? q.approveStatus : !q.approveStatus);
      if (fromDateFilter) {
        const from = new Date(fromDateFilter);
        data = data.filter(item => new Date(item.createdAt) >= from);
      }
      if (toDateFilter) {
        const to = new Date(toDateFilter);
        data = data.filter(item => new Date(item.createdAt) <= to);
      }
      if (companyFilter.length > 0) {
        data = data.filter(item => companyFilter.includes(item.customerCompany));
      }
      if (opportunityOwnerFilter.length > 0) {
        const filteredOpportunities = opportunities.filter(opp =>
          opportunityOwnerFilter.includes(opp.opportunityOwner)
        );
        const opportunityCodes = filteredOpportunities.map(opp => opp.opportunityCode);
        data = data.filter(q => opportunityCodes.includes(q.opportunityNumber));
      }
      setQuotations(data);
      setOriginalQuotations(data);
      const quotationIds = data.map(q => q._id);
      if (quotationIds.length > 0) {
        await fetchLatestActions(quotationIds);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching quotations:", err);
      setError("Failed to fetch quotations");
    } finally {
      setLoading(false);
    }
  }

  const handleSort = (key, isDate = false) => {
    let direction = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });

    const sortedQuotations = [...quotations].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];

      if (key === "opportunityOwner") {
        const oppA = opportunities.find(o => o.opportunityCode === a.opportunityNumber);
        const oppB = opportunities.find(o => o.opportunityCode === b.opportunityNumber);
        valA = oppA?.opportunityOwner || "";
        valB = oppB?.opportunityOwner || "";
      } else if (key === "items.length") {
        valA = (a.items || []).length;
        valB = (b.items || []).length;
      }

      if (isDate) {
        valA = new Date(valA || 0);
        valB = new Date(valB || 0);
      } else {
        valA = (valA || "").toString().toLowerCase();
        valB = (valB || "").toString().toLowerCase();
      }

      return (valA < valB ? -1 : 1) * (direction === "asc" ? 1 : -1);
    });

    setQuotations(sortedQuotations);
  };

  const handleSearchChange = (field, value) => {
    setSearchValues((prev) => ({ ...prev, [field]: value }));
  };

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

  function handleEditQuotation(quotation) {
    navigate(`/admin-dashboard/quotation/manual/${quotation._id}`);
  }

  function handleEditQuotationOld(quotation) {
    navigate(`/admin-dashboard/oldquotation/manual/${quotation._id}`);
  }

  const openRemarksModal = (item) => {
    setSelectedItemForRemarks(item);
    setRemarksModalOpen(true);
  };

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
  };

  const handleSearch = () => {
    if (!searchTerm && Object.keys(searchValues).length === 0) {
      setQuotations(originalQuotations);
      return;
    }

    const filtered = originalQuotations.filter(q => {
      const opp = opportunities.find(o => o.opportunityCode === q.opportunityNumber);
      const matchesGlobalSearch = searchTerm
        ? (q.quotationNumber?.toString() || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (q.customerCompany || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (q.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (q.catalogName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (q.opportunityNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (opp?.opportunityOwner || "").toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      const matchesHeaderSearch = Object.entries(searchValues).every(([field, value]) => {
        if (!value) return true;
        let rowValue;
        if (field === "opportunityOwner") {
          const opp = opportunities.find(o => o.opportunityCode === q.opportunityNumber);
          rowValue = opp?.opportunityOwner || "";
        } else if (field === "items.length") {
          rowValue = (q.items || []).length.toString();
        } else if (field === "createdAt") {
          rowValue = new Date(q[field]).toLocaleDateString();
        } else if (field === "latestAction") {
          const latestAction = latestActions[q._id] || {};
          rowValue = latestAction.action
            ? `${latestAction.action} by ${latestAction.performedBy?.email || "N/A"} at ${latestAction.performedAt ? new Date(latestAction.performedAt).toLocaleString() : "Unknown date"}`
            : "No action recorded";
        } else {
          rowValue = q[field] || "";
        }
        return rowValue.toString().toLowerCase().includes(value.toLowerCase());
      });

      return matchesGlobalSearch && matchesHeaderSearch;
    });

    setQuotations(filtered);
  };

  useEffect(() => {
    handleSearch();
  }, [searchValues, searchTerm]);

  const renderFilterButtons = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
      <div className="flex space-x-2">
        <button
          onClick={() => setApprovalFilter("all")}
          className={`px-3 py-1 rounded ${approvalFilter === "all" ? "bg-[#66C3D0] text-white" : "bg-[#66C3D0] text-white"}`}
        >
          All
        </button>
        <button
          onClick={() => setApprovalFilter("approved")}
          className={`px-3 py-1 rounded ${approvalFilter === "approved" ? "bg-[#44b977] text-white" : "bg-[#44b977] text-white"}`}
        >
          Approved
        </button>
        <button
          onClick={() => setApprovalFilter("notApproved")}
          className={`px-3 py-1 rounded ${approvalFilter === "notApproved" ? "bg-[#e73d3e] text-white" : "bg-[#e73d3e] text-white"}`}
        >
          Not Approved
        </button>
        <button
          onClick={() => setShowFilterWindow(true)}
          className="px-3 py-1 rounded bg-[#Ff8045] text-white hover:bg-[#Ff8045]/90"
        >
          Filters
        </button>
      </div>
      <button
        onClick={() => navigate('/admin-dashboard/catalogs/manual')}
        className="px-3 py-1 rounded bg-[#44b977] text-white hover:bg-[#44b977]/90"
      >
        Create Quotation
      </button>
    </div>
  );

  const renderFilterWindow = () => {
    const uniqueOpportunityOwners = [...new Set(opportunities.map(opp => opp.opportunityOwner))];
    const uniqueCompanyNames = [...new Set(quotations.map(q => q.customerCompany))];

    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
        <div className="flex items-center justify-center min-h-full py-8 px-4">
          <div className="bg-white p-6 rounded w-full max-w-md relative border border-gray-200 shadow-lg">
            <button
              onClick={() => setShowFilterWindow(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
            >
              <span className="text-xl font-bold">×</span>
            </button>
            <h2 className="text-xl font-bold mb-4 text-[#Ff8045]">Filters</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Owner</label>
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
                            : opportunityOwnerFilter.filter(item => item !== owner);
                          setOpportunityOwnerFilter(selected);
                        }}
                        className="mr-2"
                      />
                      <label htmlFor={`owner-${index}`} className="text-sm text-gray-700">{owner}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
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
                            : companyFilter.filter(item => item !== company);
                          setCompanyFilter(selected);
                        }}
                        className="mr-2"
                      />
                      <label htmlFor={`company-${index}`} className="text-sm text-gray-700">{company}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDateFilter}
                  onChange={e => setFromDateFilter(e.target.value)}
                  className="border border-gray-300 rounded p-2 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDateFilter}
                  onChange={e => setToDateFilter(e.target.value)}
                  className="border border-gray-300 rounded p-2 w-full"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setOpportunityOwnerFilter([]);
                  setFromDateFilter("");
                  setToDateFilter("");
                  setCompanyFilter([]);
                  setShowFilterWindow(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  fetchData();
                  setShowFilterWindow(false);
                }}
                className="px-4 py-2 bg-[#Ff8045] text-white rounded hover:bg-[#Ff8045]/90"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFilterControls = () => (
    <div className="flex flex-wrap gap-4 items-center mb-4">
      <div className="flex flex-col">
        <label htmlFor="search" className="mb-1 text-gray-700">Search</label>
        <div className="flex items-center">
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              handleSearch();
            }}
            className="border p-2"
            placeholder="Search all fields"
          />
        </div>
      </div>
    </div>
  );

  const renderQuotationList = () => {
    const filteredQuotations = quotations;
    if (filteredQuotations.length === 0) {
      return <div className="text-gray-600">Nothing to display.</div>;
    }
    const grouped = groupItemsByDate(filteredQuotations);
    return (
      <div>
        {Object.entries(grouped).map(([groupName, items]) => items.length > 0 ? (
          <div key={groupName} className="mb-6">
            <h3 className="text-lg font-bold mb-2">{groupName}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-orange-200 text-black">
                  <tr>
                    <th
                      className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                      onClick={() => handleSort("quotationNumber")}
                    >
                      Quotation Number {sortConfig.key === "quotationNumber" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th
                      className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                      onClick={() => handleSort("opportunityNumber")}
                    >
                      Opportunity Number {sortConfig.key === "opportunityNumber" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th
                      className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                      onClick={() => handleSort("opportunityOwner")}
                    >
                      Opportunity Owner {sortConfig.key === "opportunityOwner" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th
                      className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                      onClick={() => handleSort("customerCompany")}
                    >
                      Company Name {sortConfig.key === "customerCompany" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th
                      className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                      onClick={() => handleSort("customerName")}
                    >
                      Customer Name {sortConfig.key === "customerName" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th
                      className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                      onClick={() => handleSort("catalogName")}
                    >
                      Event Name {sortConfig.key === "catalogName" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th
                      className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                      onClick={() => handleSort("items.length")}
                    >
                      Items {sortConfig.key === "items.length" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th
                      className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                      onClick={() => handleSort("createdAt", true)}
                    >
                      Created At {sortConfig.key === "createdAt" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th
                      className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                      onClick={() => handleSort("latestAction")}
                    >
                      Latest Action {sortConfig.key === "latestAction" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">
                      Actions
                    </th>
                  </tr>
                  <tr>
                    {[
                      "quotationNumber",
                      "opportunityNumber",
                      "opportunityOwner",
                      "customerCompany",
                      "customerName",
                      "catalogName",
                      "items.length",
                      "createdAt",
                      "latestAction",
                    ].map((field) => (
                      <td key={field} className="px-4 py-1 border border-gray-300">
                        <input
                          type="text"
                          placeholder={`Search ${field}`}
                          className="w-full p-1 border border-gray-300 rounded text-xs"
                          value={searchValues[field] || ""}
                          onChange={(e) => handleSearchChange(field, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-1 border border-gray-300"></td>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...items].sort((a, b) => {
                    let valA = a[sortConfig.key];
                    let valB = b[sortConfig.key];

                    if (sortConfig.key === "opportunityOwner") {
                      const oppA = opportunities.find(o => o.opportunityCode === a.opportunityNumber);
                      const oppB = opportunities.find(o => o.opportunityCode === b.opportunityNumber);
                      valA = oppA?.opportunityOwner || "";
                      valB = oppB?.opportunityOwner || "";
                    } else if (sortConfig.key === "items.length") {
                      valA = (a.items || []).length;
                      valB = (b.items || []).length;
                    } else if (sortConfig.key === "latestAction") {
                      const actionA = latestActions[a._id] || {};
                      const actionB = latestActions[b._id] || {};
                      valA = actionA.action
                        ? `${actionA.action} by ${actionA.performedBy?.email || "N/A"} at ${actionA.performedAt ? new Date(actionA.performedAt).toLocaleString() : "Unknown date"}`
                        : "No action recorded";
                      valB = actionB.action
                        ? `${actionB.action} by ${actionB.performedBy?.email || "N/A"} at ${actionB.performedAt ? new Date(actionB.performedAt).toLocaleString() : "Unknown date"}`
                        : "No action recorded";
                    }

                    if (sortConfig.key === "createdAt") {
                      valA = new Date(valA || 0);
                      valB = new Date(valB || 0);
                    } else {
                      valA = (valA || "").toString().toLowerCase();
                      valB = (valB || "").toString().toLowerCase();
                    }

                    return (valA < valB ? -1 : 1) * (sortConfig.direction === "asc" ? 1 : -1);
                  }).map(quotation => {
                    const opp = opportunities.find(o => o.opportunityCode === quotation.opportunityNumber);
                    const latestAction = latestActions[quotation._id] || {};
                    return (
                      <tr key={quotation._id}>
                        <td className="px-4 py-2">{quotation.quotationNumber}</td>
                        <td className="px-4 py-2">{quotation.opportunityNumber || "N/A"}</td>
                        <td className="px-4 py-2">{opp?.opportunityOwner || "N/A"}</td>
                        <td className="px-4 py-2">
                          {quotation.customerCompany || "N/A"}
                          {quotation.quotationNumber < 10496 && <>(old quotation)</>}
                        </td>
                        <td className="px-4 py-2">{quotation.customerName}</td>
                        <td className="px-4 py-2">{quotation.catalogName || "N/A"}</td>
                        <td className="px-4 py-2">{quotation.items?.length || 0}</td>
                        <td className="px-4 py-2">{new Date(quotation.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-2">
                          {latestAction.action
                            ? `${latestAction.action} by ${latestAction.performedBy?.email || "N/A"} at ${latestAction.performedAt ? new Date(latestAction.performedAt).toLocaleString() : "Unknown date"}`
                            : "No action recorded"}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedQuotationForDropdown(quotation);
                              toggleQuotationDropdown(quotation._id, e);
                            }}
                            className="px-2 py-1 hover:bg-gray-200 rounded"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-6 w-6"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6v.01M12 12v.01M12 18v.01"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null)}
      </div>
    );
  };

  function toggleQuotationDropdown(id, e) {
    e.stopPropagation();
    dropdownButtonRef.current = e.currentTarget;
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 200;
    let top = window.innerHeight - rect.bottom < dropdownHeight
      ? rect.top + window.pageYOffset - dropdownHeight
      : rect.bottom + window.pageYOffset;
    setDropdownPosition({ top, left: rect.left + window.pageXOffset });
    setSelectedQuotationForDropdown(quotations.find(q => q._id === id));
    setOpenDropdownForQuotation(id === openDropdownForQuotation ? null : id);
  }

  async function handleExportAllToExcel() {
    try {
      const wb = utils.book_new();
      const header = [
        "Quotation Number",
        "Opportunity Number",
        "Opportunity Owner",
        "Company Name",
        "Customer Name",
        "Event Name",
        "Items",
        "Created At",
        "Remarks",
        "Approve Status",
        "Latest Action",
      ];
      const data = [header];
      quotations.forEach(q => {
        const opp = opportunities.find(o => o.opportunityCode === q.opportunityNumber);
        const latestAction = latestActions[q._id] || {};
        const row = [
          q.quotationNumber,
          q.opportunityNumber || "N/A",
          opp?.opportunityOwner || "N/A",
          q.customerCompany,
          q.customerName,
          q.catalogName,
          q.items?.length || 0,
          new Date(q.createdAt).toLocaleDateString(),
          q.remarks || "",
          q.approveStatus ? "Approved" : "Not Approved",
          latestAction.action
            ? `${latestAction.action} by ${latestAction.performedBy?.email || "N/A"} at ${latestAction.performedAt ? new Date(latestAction.performedAt).toLocaleString() : "Unknown date"}`
            : "No action recorded",
        ];
        data.push(row);
      });
      const ws = utils.aoa_to_sheet(data);
      utils.book_append_sheet(wb, ws, "All Quotations");
      const wbOut = write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbOut], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `All_Quotations.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Excel export failed");
    }
  }

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      {renderFilterButtons()}
      {renderFilterControls()}
      {showFilterWindow && renderFilterWindow()}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Quotations</h1>
        <div className="flex space-x-2">
          {(isSuperAdmin || canExportCRM) && (
            <button
              onClick={handleExportAllToExcel}
              className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 px-4 py-2 rounded text-white"
            >
              Export All to Excel
            </button>
          )}
        </div>
      </div>
      {renderQuotationList()}
      {remarksModalOpen && selectedItemForRemarks && (
        <RemarksModal
          item={selectedItemForRemarks}
          type="quotation"
          onClose={() => setRemarksModalOpen(false)}
          onSave={handleSaveRemarks}
          userEmail={userEmail}
        />
      )}
      {openDropdownForQuotation && selectedQuotationForDropdown && createPortal(
        <div
          style={{ top: dropdownPosition.top, left: dropdownPosition.left, position: "absolute", zIndex: 9999 }}
          className="w-48 bg-white border border-gray-200 rounded shadow-md p-2"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={e => {
              e.stopPropagation();
              navigate(`/admin-dashboard/quotations/${selectedQuotationForDropdown._id}`);
              setOpenDropdownForQuotation(null);
              setSelectedQuotationForDropdown(null);
              dropdownButtonRef.current = null;
            }}
            className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
          >
            View
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              if (selectedQuotationForDropdown.quotationNumber >= 10496) {
                handleEditQuotation(selectedQuotationForDropdown);
              } else {
                handleEditQuotationOld(selectedQuotationForDropdown);
              }
              setOpenDropdownForQuotation(null);
              setSelectedQuotationForDropdown(null);
              dropdownButtonRef.current = null;
            }}
            className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
          >
            Edit
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              openRemarksModal(selectedQuotationForDropdown);
              setOpenDropdownForQuotation(null);
              setSelectedQuotationForDropdown(null);
              dropdownButtonRef.current = null;
            }}
            className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
          >
            Remarks
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              handleDeleteQuotation(selectedQuotationForDropdown);
              setOpenDropdownForQuotation(null);
              setSelectedQuotationForDropdown(null);
              dropdownButtonRef.current = null;
            }}
            className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
          >
            Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}