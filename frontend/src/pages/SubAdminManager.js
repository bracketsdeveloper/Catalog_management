"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

/* ─────────────────────────────────────────────────────────────── */
/* 1. COMPLETE, GROUPED PERMISSIONS                                */
/* ─────────────────────────────────────────────────────────────── */
const groupedPermissions = {
  /* ↓ General platform administration */
  General: [
    "manage-users",
    "sub-admins",
    "review-catalog",
    "viewers-manager",
  ],
  // "Calculations" : [
  //   "segment-manager",
  //   "calculation-manager",
  //   "manage-branding-charges"
  // ]
  

  /* ↓ CRM & sales pipeline */
  CRM: [
    "manage-companies",
    "opportunities",
    "viewallopp",
    "manage-products",
    "manage-catalog",
    "manage-quotation",
    "manage-jobsheets",
    "crm-export"
  ],

  /* ↓ Purchasing flow */
  Purchase: [
    "open-purchase",
    "closed-purchases",
    "manage-purchaseinvoice",
    "write-purchase",
    "export-purchase"
  ],

  /* ↓ Production flow */
  Production: [
    "manage-productionjobsheet",
    "closed-productionjobsheet",
    "production-invoice",
    "write-production",
    "export-production"
  ],

  /* ↓ Packing & QC */
  "Packing & QC": ["pending-packing", "closed-packing-completed", "packing-delivery-export"],

  /* ↓ Delivery & logistics */
  Delivery: ["dispatch-scheduled", "delivery-reports", "delivery-completed","packing-delivery-export"],

  /* ↓ Invoices follow up & summary */
  "Invoices Follow up & Summary": [
    "invoices-followup",
    "invoices-summary",
    "payment-followup",
    "invoice-followup-export"
  ],
  "Samples":[
    "manage-samples",
    "sample-out",
    "sample-status",
    "export-samples"
  ],
  "Expenses Records" :[
    "manage-expenses",
    "expenses-export"
  ],
  
    "FollowUp Tracker" :[
      "manage-potential-clients",
      "manage-events",
      "filter-potential-clients",
      "events-calender"
    ],
    "Task Manager" :[
      "manage-task"
    ],
    "Sales" : [
      "manage-dc",
      "manage-einvoice"
    ],
    "HRMS" : [
      "hrms-employees",
      "hrms-attendance",
      "hrms-wfh",
      "hrms-leaves",
      "hrms-salary",
      "hrms-leaves-export",
      "holidays",
      "leaves"
    ]
  
};

/* flat list (if needed elsewhere) */
const allPermissions = Object.values(groupedPermissions).flat();

/* ─────────────────────────────────────────────────────────────── */
/* 2. MAIN COMPONENT                                               */
/* ─────────────────────────────────────────────────────────────── */
export default function SubAdminManager() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  /* data + UI state */
  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  /* create modal */
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    permissions: [],
  });

  /* edit‑permissions modal (inline) */
  const [editingId, setEditingId] = useState(null);
  const [tempPerms, setTempPerms] = useState([]);

  /* ── fetch once ── */
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await axios.get(
          `${BACKEND_URL}/api/admin/sub-admins`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSubAdmins(data);
      } catch (err) {
        setError("Failed to load sub‑admins");
      } finally {
        setLoading(false);
      }
    })();
  }, [BACKEND_URL]);

  /* ───── helpers ───── */
  const togglePerm = (permListSetter) => (perm) =>
    permListSetter((prev) =>
      prev.includes(perm) ? prev.filter((x) => x !== perm) : [...prev, perm]
    );

  /* ───── filtered and sorted sub-admins ───── */
  const filteredSubAdmins = subAdmins
    .filter((admin) =>
      admin.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  /* ───── create ───── */
  async function handleCreate(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${BACKEND_URL}/api/admin/sub-admins`, newAdmin, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCreateModalOpen(false);
      window.location.reload(); // simple refresh
    } catch {
      setError("Create failed");
    }
  }

  /* ───── save edits ───── */
  async function savePerms(id) {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BACKEND_URL}/api/admin/sub-admins/${id}`,
        { permissions: tempPerms },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingId(null);
      window.location.reload();
    } catch {
      setError("Update failed");
    }
  }

  /* ──────────────────────────────────────────────────────────── */
  /* 3. RENDER                                                   */
  /* ──────────────────────────────────────────────────────────── */
  if (loading) return <p className="p-6">Loading…</p>;
  if (error) return <p className="p-6 text-pink-600">{error}</p>;

  return (
    <div className="p-6 bg-white min-h-screen text-gray-900">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#Ff8045]">
          Sub‑Admin Manager
        </h1>
        <button
          className="bg-[#44b977] hover:bg-[#44b977]/90 text-white px-4 py-2 rounded"
          onClick={() => setCreateModalOpen(true)}
        >
          Create Sub‑Admin
        </button>
      </header>

      {/* ───────── Search Bar ───────── */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-100 border border-purple-300 rounded px-3 py-2"
        />
      </div>

      {/* ───────── Create Modal ───────── */}
      {createModalOpen && (
        <Modal title="Create Sub‑Admin" onClose={() => setCreateModalOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {[
              ["Name", "name", "text"],
              ["Email", "email", "email"],
              ["Phone", "phone", "text"],
              ["Password", "password", "password"],
            ].map(([lbl, key, type]) => (
              <InputRow
                key={key}
                label={lbl}
                type={type}
                value={newAdmin[key]}
                onChange={(v) => setNewAdmin({ ...newAdmin, [key]: v })}
              />
            ))}

            <SectionPermissions
              grouped={groupedPermissions}
              checked={newAdmin.permissions}
              toggle={togglePerm((p) =>
                setNewAdmin((prev) => ({ ...prev, permissions: p }))
              )}
            />

            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
            >
              Create
            </button>
          </form>
        </Modal>
      )}

      {/* ───────── List ───────── */}
      <div className="bg-white border border-purple-200 rounded p-4">
        {filteredSubAdmins.length === 0 ? (
          <p>No sub‑admins found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-sm">
              <thead className="bg-purple-50">
                <tr>
                  {["Name", "Email", "Permissions", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSubAdmins.map((a) => (
                  <tr key={a._id} className="border-b">
                    <td className="px-4 py-2">{a.name}</td>
                    <td className="px-4 py-2">{a.email}</td>
                    <td className="px-4 py-2">
                      {editingId === a._id ? (
                        <SectionPermissions
                          grouped={groupedPermissions}
                          checked={tempPerms}
                          toggle={togglePerm(setTempPerms)}
                        />
                      ) : (
                        a.permissions?.join(", ") || "None"
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {editingId === a._id ? (
                        <>
                          <button
                            onClick={() => savePerms(a._id)}
                            className="bg-pink-600 hover:bg-pink-700 text-white px-3 py-1 rounded mr-2"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(a._id);
                            setTempPerms(a.permissions || []);
                          }}
                          className="bg-[#66C3D0] hover:bg-[#66C3D0]/90 text-white px-3 py-1 rounded"
                        >
                          Edit Permissions
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* 4. SMALL REUSABLE PARTS                                         */
/* ─────────────────────────────────────────────────────────────── */

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white p-6 rounded max-w-xl w-full relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-pink-600 text-white rounded px-2"
        >
          ×
        </button>
        <h2 className="text-lg font-semibold mb-4 text-purple-700">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function InputRow({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-100 border border-purple-300 rounded px-3 py-2"
      />
    </div>
  );
}

/* clickable grid of permission toggles, grouped by section */
function SectionPermissions({ grouped, checked, toggle }) {
  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([section, perms]) => (
        <div key={section}>
          <div className="text-xs font-semibold mb-1 text-purple-600">
            {section}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {perms.map((perm) => (
              <div
                key={perm}
                onClick={() => toggle(perm)}
                className={`cursor-pointer select-none text-center rounded p-2 text-xs border transition ${
                  checked.includes(perm)
                    ? "bg-pink-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {perm}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}