// client/src/pages/ManageCompanies.js
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CompanyModal from "../components/company/CompanyModal.js";

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

  /* ------------ fetch companies ------------ */
  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCompanies() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(res.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch companies");
    } finally {
      setLoading(false);
    }
  }

  /* ------------ helpers ------------ */
  const filteredCompanies = companies.filter((c) => {
    const s = searchTerm.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(s) ||
      (c.brandName && c.brandName.toLowerCase().includes(s)) ||
      (c.GSTIN && c.GSTIN.toLowerCase().includes(s)) ||
      (c.companyAddress && c.companyAddress.toLowerCase().includes(s)) ||
      c.clients?.some(
        (cl) =>
          cl.name.toLowerCase().includes(s) ||
          (cl.email && cl.email.toLowerCase().includes(s)) ||
          cl.contactNumber.includes(searchTerm)
      )
    );
  });

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
    } catch (_) {
      alert("Failed to delete");
    }
  };

  const getDotColor = (a) =>
    a === "create" ? "bg-green-400" : a === "update" ? "bg-orange-500" : "bg-red-600";

  /* ------------ UI ------------ */
  return (
    <div className="p-6">
      {/* header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Companies</h1>
        <div className="flex gap-2">
          {/* logs */}
          <div
            className="relative"
            onMouseEnter={() => {
              setShowLogsDropdown(true);
              fetchAllLogs();
            }}
            onMouseLeave={() => setShowLogsDropdown(false)}
          >
            <button className="bg-cyan-600 text-white px-4 py-2 rounded">Logs</button>
            {showLogsDropdown && (
              <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto bg-white border rounded shadow z-50 p-2">
                {logsLoading ? (
                  <div className="text-center py-4">Loading…</div>
                ) : commonLogs.length ? (
                  commonLogs.map((l, i) => (
                    <div key={i} className="border-b last:border-b-0 py-1 text-sm">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getDotColor(l.action)}`} />
                      <b className="capitalize">{l.action}</b> on {l.field || "record"}{" "}
                      <span className="text-xs text-gray-500">
                        ({new Date(l.performedAt).toLocaleString()})
                      </span>
                      <div className="text-xs text-gray-600">Company: {l.companyName}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">No logs</div>
                )}
              </div>
            )}
          </div>
          {/* add */}
          <button onClick={openAddModal} className="bg-orange-500 text-white px-4 py-2 rounded">
            Add Company
          </button>
        </div>
      </div>

      {/* search */}
      <input
        type="text"
        placeholder="Search companies..."
        className="w-full mb-4 p-2 border rounded focus:ring-2 focus:ring-blue-500"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* table */}
      {loading ? (
        <div className="text-center py-20">Loading…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-sm font-semibold text-gray-700">
                <th className="p-3">Company</th>
                <th className="p-3">Brand</th>
                <th className="p-3">GSTIN</th>
                <th className="p-3">Clients</th>
                <th className="p-3">Address</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((c) => (
                <tr key={c._id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{c.companyName}</td>
                  <td className="p-3">{c.brandName || "-"}</td>
                  <td className="p-3">{c.GSTIN || "-"}</td>
                  <td className="p-3">
                    {c.clients?.length ? (
                      <ul>
                        {c.clients.map((cl, i) => (
                          <li key={i} className="text-xs">
                            {cl.name} | {cl.department || "-"} | {cl.email || "-"} | {cl.contactNumber}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3">{c.companyAddress || "-"}</td>
                  <td className="p-3 space-x-1">
                    <button
                      onClick={() => openEditModal(c)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="bg-red-600 text-white px-2 py-1 rounded text-sm"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* modal */}
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

  /* ------------ logs helper ------------ */
  async function fetchAllLogs() {
    try {
      setLogsLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCommonLogs(res.data.logs);
    } finally {
      setLogsLoading(false);
    }
  }
}
