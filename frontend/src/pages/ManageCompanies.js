"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CompanyModal from "../components/company/CompanyModal.js";
import * as XLSX from "xlsx";

// --- Utilities ---
const useOnClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
};

const FilterPopover = ({ title, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useOnClickOutside(wrapRef, () => setOpen(false));

  const filteredOptions = useMemo(() => {
    const q = (value.search || "").toLowerCase().trim();
    if (!q) return options;
    return options.filter((opt) => String(opt).toLowerCase().includes(q));
  }, [options, value.search]);

  const toggleOpt = (opt) => {
    const selected = value.selected || [];
    const next = selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt];
    onChange({ ...value, selected: next });
  };

  const selectAll = () => onChange({ ...value, selected: [...options] });
  const clear = () => onChange({ selected: [], search: "" });

  const hasActive = (value.selected || []).length > 0;

  return (
    <div ref={wrapRef} className="relative inline-block ml-1" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`text-xs px-1 py-0.5 border rounded hover:bg-gray-200 ${hasActive ? "bg-blue-100 border-blue-400" : "bg-gray-50 mb-0.5"
          }`}
        title={`Filter: ${title}`}
      >
        ▼
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-64 bg-white border shadow-xl rounded p-2 text-left top-full left-0">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-xs text-black">{title}</span>
            <button className="text-gray-500 hover:text-black" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>
          <input
            value={value.search || ""}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            placeholder="Search..."
            className="w-full border rounded px-2 py-1 text-xs mb-2 text-black"
            autoFocus
          />
          <div className="flex gap-2 mb-2">
            <button onClick={selectAll} className="text-xs px-2 py-1 border rounded hover:bg-gray-100 text-black">All</button>
            <button onClick={clear} className="text-xs px-2 py-1 border rounded hover:bg-gray-100 text-black">Clear</button>
          </div>
          <div className="max-h-48 overflow-auto border rounded bg-gray-50">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <label key={String(opt)} className="flex items-center gap-2 px-2 py-1 hover:bg-white cursor-pointer break-all">
                  <input
                    type="checkbox"
                    checked={(value.selected || []).includes(opt)}
                    onChange={() => toggleOpt(opt)}
                  />
                  <span className="text-xs text-black">{String(opt)}</span>
                </label>
              ))
            ) : (
              <div className="p-2 text-xs text-gray-400">No options</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


export default function ManageCompanies() {
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "companyName", direction: "asc" }); // sorting
  const [columnFilters, setColumnFilters] = useState({}); // excel-like filtering: { key: { selected: [], search: '' } }

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' | 'edit'
  const [selectedCompany, setSelectedCompany] = useState(null);

  const [commonLogs, setCommonLogs] = useState([]);
  const [showLogsModal, setShowLogsModal] = useState(false); // ✅ click open/close
  const [logsLoading, setLogsLoading] = useState(false);

  const [showActionsDropdown, setShowActionsDropdown] = useState(null);

  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  const canExportCRM = permissions.includes("export-crm");

  const logsModalRef = useRef(null);

  // Close logs modal on outside click / Esc
  useEffect(() => {
    if (!showLogsModal) return;

    const onMouseDown = (e) => {
      if (logsModalRef.current && !logsModalRef.current.contains(e.target)) {
        setShowLogsModal(false);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowLogsModal(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showLogsModal]);

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCompanies() {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(res.data);
      setError(null);
    } catch {
      setError("Failed to fetch companies");
    } finally {
      setLoading(false);
    }
  }

  const openAddModal = () => {
    setModalMode("add");
    setSelectedCompany(null);
    setModalOpen(true);
  };
  const openEditModal = (company) => {
    setModalMode("edit");
    setSelectedCompany(company);
    setModalOpen(true);
  };

  // ✅ Restrict delete to Super Admin
  const handleDelete = async (id) => {
    if (!isSuperAdmin) {
      return alert("Only Super Admins can delete companies.");
    }
    if (!window.confirm("Delete this company?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/companies/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCompanies();
    } catch {
      alert("Failed to delete");
    }
  };

  // --- Logic for Filtering & Sorting ---

  // Helper to extract unique values for a field
  const getUniqueValues = (field, nestedField) => {
    const values = new Set();
    companies.forEach((c) => {
      let v = c[field];
      if (nestedField && Array.isArray(v)) {
        // e.g. clients (array of objs) or crmIncharge
        v.forEach((item) => {
          const sub = item[nestedField];
          if (sub) values.add(sub);
        });
      } else if (v) {
        values.add(v);
      }
    });
    return Array.from(values).sort();
  };

  const filterOptions = useMemo(() => ({
    companyName: getUniqueValues("companyName"),
    brandName: getUniqueValues("brandName"),
    segment: getUniqueValues("segment"),
    GSTIN: getUniqueValues("GSTIN"),
    paymentTerms: getUniqueValues("paymentTerms"),
    portalUpload: getUniqueValues("portalUpload"),
    remarks: getUniqueValues("remarks"),
    crmIncharge: getUniqueValues("crmIncharge", "name")
  }), [companies]);

  // Main filtered list (search + column filters)
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      // 1. Global Search
      const s = searchTerm.toLowerCase();
      const crmNamesStr = (c.crmIncharge || []).map((u) => u?.name || "").join(" ").toLowerCase();
      const matchSearch =
        !s ||
        c.companyName?.toLowerCase().includes(s) ||
        c.brandName?.toLowerCase().includes(s) ||
        c.GSTIN?.toLowerCase().includes(s) ||
        c.companyAddress?.toLowerCase().includes(s) ||
        c.remarks?.toLowerCase().includes(s) ||
        crmNamesStr.includes(s) ||
        c.clients?.some((cl) =>
          cl.name?.toLowerCase().includes(s) ||
          cl.email?.toLowerCase().includes(s) ||
          cl.contactNumber?.includes(s)
        );

      if (!matchSearch) return false;

      // 2. Column Filters
      // Helper to check if a row matches the selected filter for a key
      const matchFilter = (field, isArray = false) => {
        const filter = columnFilters[field];
        if (!filter || !filter.selected || filter.selected.length === 0) return true;

        if (isArray) {
          // e.g. crmIncharge is array of objects { name: ... }
          // If ANY of the items in the row matches ANY in the selected list, it's a match? 
          // OR usually "contains at least one of selected".
          // Let's assume mapped values:
          const rowVals = (c[field] || []).map(x => x.name || x.email || x);
          return rowVals.some(v => filter.selected.includes(v));
        }

        return filter.selected.includes(c[field]);
      };

      if (!matchFilter("companyName")) return false;
      if (!matchFilter("brandName")) return false;
      if (!matchFilter("segment")) return false;
      if (!matchFilter("GSTIN")) return false;
      if (!matchFilter("paymentTerms")) return false;
      if (!matchFilter("portalUpload")) return false;
      if (!matchFilter("remarks")) return false;
      if (!matchFilter("crmIncharge", true)) return false;

      return true;
    });
  }, [companies, searchTerm, columnFilters]);

  // Sorted list
  const sortedCompanies = useMemo(() => {
    const sorted = [...filteredCompanies];
    if (!sortConfig.key) return sorted;

    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle nested or array fields if needed for sorting
      if (sortConfig.key === "crmIncharge") {
        aVal = (aVal || []).map((x) => x.name).join(", ");
        bVal = (bVal || []).map((x) => x.name).join(", ");
      } else if (sortConfig.key === "clients") {
        aVal = (aVal || []).length; // sort by count? or just name of first? let's do count or skip
        bVal = (bVal || []).length;
      }

      // Default string compare
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toString().toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredCompanies, sortConfig]);

  const getDotColor = (action) =>
    action === "create"
      ? "bg-green-400"
      : action === "update"
        ? "bg-orange-500"
        : "bg-red-600";

  // ✅ Fetch logs when modal opens
  useEffect(() => {
    if (!showLogsModal) return;
    (async () => {
      setLogsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/logs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCommonLogs(res.data.logs || []);
      } catch {
        setCommonLogs([]);
      } finally {
        setLogsLoading(false);
      }
    })();
  }, [showLogsModal, BACKEND_URL]);

  /* ===== Export: Companies sheet (existing) ===== */
  const exportCompaniesToExcel = () => {
    const mergedData = [];

    filteredCompanies.forEach((company) => {
      const crmNames = (company.crmIncharge || [])
        .map((u) => u?.name || "")
        .filter(Boolean)
        .join(", ");

      if (company.clients && company.clients.length > 0) {
        company.clients.forEach((cl, idx) => {
          mergedData.push({
            "Company Name": company.companyName || "-",
            "Brand Name": company.brandName || "-",
            Segment: company.segment || "-",
            Address: company.companyAddress || "-",
            GSTIN: company.GSTIN || "-",
            Pincode: company.pincode || "-",
            "Vendor Code": company.vendorCode || "-",
            "Payment Terms": company.paymentTerms || "-",
            "Portal Upload": company.portalUpload || "-",
            Remarks: company.remarks || "-",
            "CRM Incharge": crmNames || "-",
            "Client #": idx + 1,
            "Client Name": cl?.name ?? "-",
            Department: cl?.department ?? "-",
            Email: cl?.email ?? "-",
            "Contact Number": cl?.contactNumber ?? "-",
          });
        });
      } else {
        mergedData.push({
          "Company Name": company.companyName || "-",
          "Brand Name": company.brandName || "-",
          Segment: company.segment || "-",
          Address: company.companyAddress || "-",
          GSTIN: company.GSTIN || "-",
          Pincode: company.pincode || "-",
          "Vendor Code": company.vendorCode || "-",
          "Payment Terms": company.paymentTerms || "-",
          "Portal Upload": company.portalUpload || "-",
          Remarks: company.remarks || "-",
          "CRM Incharge": crmNames || "-",
          "Client #": "-",
          "Client Name": "-",
          Department: "-",
          Email: "-",
          "Contact Number": "-",
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(mergedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Companies");
    XLSX.writeFile(workbook, "Companies.xlsx");
  };

  /* ===== ✅ Export: Logs to Excel (NEW) ===== */
  const exportLogsToExcel = () => {
    const rows = (commonLogs || []).map((l) => ({
      Action: l.action || "-",
      Field: l.field || "-",
      "Company Name": l.companyName || "-",
      "Performed By Name": l.performedBy?.name || "-",
      "Performed By Email": l.performedBy?.email || "-",
      "Performed At": l.performedAt ? new Date(l.performedAt).toLocaleString() : "-",
      "Old Value": l.oldValue !== undefined && l.oldValue !== null ? JSON.stringify(l.oldValue) : "-",
      "New Value": l.newValue !== undefined && l.newValue !== null ? JSON.stringify(l.newValue) : "-",
      "Log ID": l._id || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logs");
    XLSX.writeFile(wb, `Company_Logs_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Optional: show latest logs first
  const sortedLogs = useMemo(() => {
    return [...(commonLogs || [])].sort((a, b) => new Date(b.performedAt || 0) - new Date(a.performedAt || 0));
  }, [commonLogs]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Companies</h1>

        <div className="flex gap-2">
          {/* ✅ Logs button opens/closes modal on click */}
          <button
            onClick={() => setShowLogsModal((v) => !v)}
            className="bg-cyan-600 text-white px-4 py-2 rounded"
          >
            Logs
          </button>

          {(isSuperAdmin || canExportCRM) && (
            <button onClick={exportCompaniesToExcel} className="bg-green-600 text-white px-4 py-2 rounded">
              Export to Excel
            </button>
          )}

          <button onClick={openAddModal} className="bg-orange-500 text-white px-4 py-2 rounded">
            Add Company
          </button>
        </div>
      </div>

      {/* ✅ Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div ref={logsModalRef} className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-lg font-semibold">Company Logs</h2>
              <button
                onClick={() => setShowLogsModal(false)}
                className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
              <div className="text-sm text-gray-600">
                {logsLoading ? "Loading logs..." : `Total: ${sortedLogs.length}`}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // refresh logs
                    setShowLogsModal(false);
                    setTimeout(() => setShowLogsModal(true), 0);
                  }}
                  className="bg-gray-200 text-gray-800 px-3 py-2 rounded text-sm hover:bg-gray-300"
                >
                  Refresh
                </button>

                <button
                  onClick={exportLogsToExcel}
                  disabled={logsLoading || sortedLogs.length === 0}
                  className={`px-3 py-2 rounded text-sm text-white ${logsLoading || sortedLogs.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                    }`}
                  title={sortedLogs.length === 0 ? "No logs to export" : "Export logs to Excel"}
                >
                  Export Logs
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto">
              {logsLoading ? (
                <div className="text-center py-10">Loading…</div>
              ) : sortedLogs.length ? (
                sortedLogs.map((l, i) => (
                  <div key={l._id || i} className="border-b py-3 text-xs">
                    <div className="flex items-start gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full mt-1 ${getDotColor(l.action)}`} />
                      <div className="flex-1">
                        <div>
                          <b className="capitalize">{l.action}</b>
                          {l.field && ` on ${l.field}`}
                        </div>
                        <div className="text-gray-600 text-xs mt-1">
                          {l.performedBy ? (
                            <span>
                              By: <b>{l.performedBy.name}</b> ({l.performedBy.email})
                            </span>
                          ) : (
                            <span>By: Unknown user</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Company: <b>{l.companyName}</b>
                        </div>

                        {l.oldValue !== null && l.oldValue !== undefined && l.newValue !== null && l.newValue !== undefined && (
                          <div className="mt-2 ml-0">
                            <div className="text-gray-500">Changed from:</div>
                            <div className="text-red-600 break-all">{JSON.stringify(l.oldValue)}</div>
                            <div className="text-gray-500 mt-1">To:</div>
                            <div className="text-green-600 break-all">{JSON.stringify(l.newValue)}</div>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {l.performedAt ? new Date(l.performedAt).toLocaleString() : "-"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-600">No logs</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search companies..."
        className="w-full mb-4 p-2 border rounded focus:ring-2 focus:ring-blue-500"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Table */}
      {loading ? (
        <div className="text-center py-20">Loading…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto h-[70vh] border rounded">
          <table className="min-w-full border-collapse text-xs relative">
            <thead className="sticky top-0 z-10 bg-gray-100 shadow">
              <tr className="text-left font-semibold text-gray-700">
                {[
                  { id: "companyName", label: "Company" },
                  { id: "brandName", label: "Brand" },
                  { id: "segment", label: "Segment" },
                  { id: "crmIncharge", label: "CRM Incharge", isArray: true },
                  { id: "clients", label: "Clients", noFilter: true },
                  { id: "companyAddress", label: "Address", noFilter: true },
                  { id: "GSTIN", label: "GSTIN" },
                  { id: "pincode", label: "Pincode", noFilter: true },
                  { id: "vendorCode", label: "Vendor Code", noFilter: true },
                  { id: "paymentTerms", label: "Payment Terms" },
                  { id: "portalUpload", label: "Portal Upload" },
                  { id: "remarks", label: "Remarks" },
                ].map((col) => (
                  <th key={col.id} className="p-3 bg-gray-100 border-b whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span
                        className="cursor-pointer hover:text-blue-600"
                        onClick={() => handleSort(col.id)}
                      >
                        {col.label} {sortConfig.key === col.id ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </span>
                      {!col.noFilter && (
                        <FilterPopover
                          title={col.label}
                          options={filterOptions[col.id] || []}
                          value={columnFilters[col.id] || {}}
                          onChange={(val) => setColumnFilters((prev) => ({ ...prev, [col.id]: val }))}
                        />
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-3 bg-gray-100 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCompanies.map((c) => (
                <tr key={c._id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{c.companyName}</td>
                  <td className="p-3">{c.brandName || "-"}</td>
                  <td className="p-3">{c.segment || "-"}</td>
                  <td className="p-3">
                    {(c.crmIncharge || []).length ? c.crmIncharge.map((u) => u?.name || u?.email).join(", ") : "-"}
                  </td>
                  <td className="p-3">
                    {c.clients?.length
                      ? c.clients.map((cl, i) => (
                        <div key={i} className="text-xs">
                          {cl.name} | {cl.department || "-"} | {cl.email || "-"} | {cl.contactNumber}
                        </div>
                      ))
                      : "-"}
                  </td>
                  <td className="p-3">{c.companyAddress || "-"}</td>
                  <td className="p-3">{c.GSTIN || "-"}</td>
                  <td className="p-3">{c.pincode || "-"}</td>
                  <td className="p-3">{c.vendorCode || "-"}</td>
                  <td className="p-3">{c.paymentTerms || "-"}</td>
                  <td className="p-3">{c.portalUpload || "-"}</td>
                  <td className="p-3">{c.remarks || "-"}</td>
                  <td className="p-3">
                    <div className="relative">
                      <button
                        onClick={() => setShowActionsDropdown((prev) => (prev === c._id ? null : c._id))}
                        className="text-gray-600 hover:text-gray-900 focus:outline-none"
                      >
                        &#8942;
                      </button>
                      {showActionsDropdown === c._id && (
                        <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-40 text-xs">
                          <button
                            onClick={() => {
                              openEditModal(c);
                              setShowActionsDropdown(null);
                            }}
                            className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                          >
                            Edit
                          </button>
                          {/* ✅ Only show delete for Super Admin */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => {
                                handleDelete(c._id);
                                setShowActionsDropdown(null);
                              }}
                              className="block w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Company Modal */}
      {modalOpen && (
        <CompanyModal
          mode={modalMode}
          company={selectedCompany}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            fetchCompanies();
          }}
          BACKEND_URL={BACKEND_URL}
        />
      )}
    </div>
  );
}
