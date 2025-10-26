"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CompanyModal from "../components/company/CompanyModal.js";
import { TrashIcon } from "@heroicons/react/24/solid";
import * as XLSX from "xlsx";

export default function ManageCompanies() {
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  /* ------------ state ------------ */
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  /* modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' | 'edit'
  const [selectedCompany, setSelectedCompany] = useState(null);

  /* logs dropdown */
  const [commonLogs, setCommonLogs] = useState([]);
  const [showLogsDropdown, setShowLogsDropdown] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  /* actions dropdown */
  const [showActionsDropdown, setShowActionsDropdown] = useState(null);

  // Check if the user is a superadmin (from localStorage)
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";

  // Add permissions check
  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  const canExportCRM = permissions.includes("export-crm");

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

  const handleDelete = async (id) => {
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

  const filteredCompanies = companies.filter((c) => {
    const s = searchTerm.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(s) ||
      (c.brandName && c.brandName.toLowerCase().includes(s)) ||
      (c.GSTIN && c.GSTIN.toLowerCase().includes(s)) ||
      (c.companyAddress && c.companyAddress.toLowerCase().includes(s)) ||
      (c.remarks && c.remarks.toLowerCase().includes(s)) ||
      c.clients?.some(
        (cl) =>
          cl.name.toLowerCase().includes(s) ||
          (cl.email && cl.email.toLowerCase().includes(s)) ||
          cl.contactNumber.includes(searchTerm)
      )
    );
  });

  const getDotColor = (action) =>
    action === "create"
      ? "bg-green-400"
      : action === "update"
      ? "bg-orange-500"
      : "bg-red-600";

  // Load all logs when the dropdown is opened
  useEffect(() => {
    if (!showLogsDropdown) return;
    (async () => {
      setLogsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/logs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCommonLogs(res.data.logs);
      } catch {
        setCommonLogs([]);
      } finally {
        setLogsLoading(false);
      }
    })();
  }, [showLogsDropdown, BACKEND_URL]);

  /* =============================
     ✅ ONE-SHEET MERGED EXPORT
     ============================= */
  const exportCompaniesToExcel = () => {
    const mergedData = [];

    filteredCompanies.forEach((company) => {
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
            "Client #": idx + 1,
            "Client Name": cl?.name ?? "-",
            Department: cl?.department ?? "-",
            Email: cl?.email ?? "-",
            "Contact Number": cl?.contactNumber ?? "-",
          });
        });
      } else {
        // still export companies with no clients
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Companies</h1>
        <div className="flex gap-2">
          <div
            className="relative"
            onMouseEnter={() => setShowLogsDropdown(true)}
            onMouseLeave={() => setShowLogsDropdown(false)}
          >
            <button className="bg-cyan-600 text-white px-4 py-2 rounded">
              Logs
            </button>
            {showLogsDropdown && (
              <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto bg-white border rounded shadow z-50 p-2">
                {logsLoading ? (
                  <div className="text-center py-4">Loading…</div>
                ) : commonLogs.length ? (
                  commonLogs.map((l, i) => (
                    <div key={i} className="border-b py-1 text-sm">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-2 ${getDotColor(
                          l.action
                        )}`}
                      />
                      <b className="capitalize">{l.action}</b> on{" "}
                      {l.field || "record"}{" "}
                      <span className="text-xs text-gray-500">
                        ({new Date(l.performedAt).toLocaleString()})
                      </span>
                      <div className="text-xs text-gray-600">
                        Company: {l.companyName}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">No logs</div>
                )}
              </div>
            )}
          </div>
          {(isSuperAdmin || canExportCRM) && (
            <button
              onClick={exportCompaniesToExcel} // merged export
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Export to Excel
            </button>
          )}
          <button
            onClick={openAddModal}
            className="bg-orange-500 text-white px-4 py-2 rounded"
          >
            Add Company
          </button>
        </div>
      </div>

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
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b bg-gray-50 text-left font-semibold text-gray-700">
                <th className="p-3">Company</th>
                <th className="p-3">Brand</th>
                <th className="p-3">Segment</th>
                <th className="p-3">Clients</th>
                <th className="p-3">Address</th>
                <th className="p-3">GSTIN</th>
                <th className="p-3">Pincode</th>
                <th className="p-3">Vendor Code</th>
                <th className="p-3">Payment Terms</th>
                <th className="p-3">Portal Upload</th>
                <th className="p-3">Remarks</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((c) => (
                <tr key={c._id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{c.companyName}</td>
                  <td className="p-3">{c.brandName || "-"}</td>
                  <td className="p-3">{c.segment || "-"}</td>
                  <td className="p-3">
                    {c.clients?.length
                      ? c.clients.map((cl, i) => (
                          <div key={i} className="text-xs">
                            {cl.name} | {cl.department || "-"} | {cl.email || "-"} |{" "}
                            {cl.contactNumber}
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
                        onClick={() => setShowActionsDropdown(c._id)}
                        className="text-gray-600 hover:text-gray-900 focus:outline-none"
                      >
                        &#8942;
                      </button>
                      {showActionsDropdown === c._id && (
                        <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-50 text-xs">
                          <button
                            onClick={() => {
                              openEditModal(c);
                              setShowActionsDropdown(null);
                            }}
                            className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              handleDelete(c._id);
                              setShowActionsDropdown(null);
                            }}
                            className="block w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
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
