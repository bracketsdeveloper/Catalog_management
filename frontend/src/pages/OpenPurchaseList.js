"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import JobSheetGlobal from "../components/jobsheet/globalJobsheet";

/* ---------------- Small helpers ---------------- */
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "");
const toISODate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

/* ---------------- FollowUpView Component ---------------- */
function FollowUpView({ purchases, onClose }) {
  const [sortConfig, setSortConfig] = useState({ key: "followUpDate", direction: "desc" });
  const [searchTerm, setSearchTerm] = useState("");

  // Flatten all follow-ups with their parent purchase info
  const allFollowUps = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const followUps = [];
    
    purchases.forEach(purchase => {
      if (purchase.followUp && Array.isArray(purchase.followUp)) {
        purchase.followUp.forEach(fu => {
          if (fu.followUpDate) {
            const followUpDate = new Date(fu.followUpDate);
            followUpDate.setHours(0, 0, 0, 0);
            
            let status = "future";
            const diffTime = followUpDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) status = "past";
            else if (diffDays === 0) status = "today";
            else if (diffDays === 1) status = "tomorrow";
            else status = "future";
            
            followUps.push({
              ...fu,
              status,
              diffDays,
              parentPurchase: purchase,
              followUpDate: fu.followUpDate,
              createdBy: fu.updatedBy || "Unknown User"
            });
          }
        });
      }
    });
    
    return followUps;
  }, [purchases]);

  // Filter follow-ups based on search
  const filteredFollowUps = useMemo(() => {
    if (!searchTerm) return allFollowUps;
    
    const term = searchTerm.toLowerCase();
    return allFollowUps.filter(fu => 
      fu.parentPurchase.jobSheetNumber?.toLowerCase().includes(term) ||
      fu.parentPurchase.clientCompanyName?.toLowerCase().includes(term) ||
      fu.parentPurchase.product?.toLowerCase().includes(term) ||
      fu.note?.toLowerCase().includes(term) ||
      fu.remarks?.toLowerCase().includes(term) ||
      fu.createdBy?.toLowerCase().includes(term)
    );
  }, [allFollowUps, searchTerm]);

  // Sort follow-ups
  const sortedFollowUps = useMemo(() => {
    const sorted = [...filteredFollowUps];
    
    sorted.sort((a, b) => {
      // First sort by status priority: today -> tomorrow -> future -> past
      const statusOrder = { today: 0, tomorrow: 1, future: 2, past: 3 };
      const statusCompare = statusOrder[a.status] - statusOrder[b.status];
      if (statusCompare !== 0) return statusCompare;
      
      // Then sort by follow-up date
      const dateA = new Date(a.followUpDate);
      const dateB = new Date(b.followUpDate);
      
      if (sortConfig.key === "followUpDate") {
        return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
      }
      
      // Then sort by job sheet number
      if (sortConfig.key === "jobSheetNumber") {
        const valA = a.parentPurchase.jobSheetNumber || "";
        const valB = b.parentPurchase.jobSheetNumber || "";
        return sortConfig.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      // Sort by createdBy
      if (sortConfig.key === "createdBy") {
        const valA = a.createdBy || "";
        const valB = b.createdBy || "";
        return sortConfig.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      return 0;
    });
    
    return sorted;
  }, [filteredFollowUps, sortConfig]);

  const sortBy = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
    }));
  };

  const getStatusBadge = (status) => {
    const styles = {
      today: "bg-red-500 text-white",
      tomorrow: "bg-orange-500 text-white", 
      future: "bg-blue-500 text-white",
      past: "bg-gray-500 text-white"
    };
    
    const labels = {
      today: "TODAY",
      tomorrow: "TOMORROW",
      future: "UPCOMING", 
      past: "PAST"
    };
    
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const exportToExcel = () => {
    const data = sortedFollowUps.map(fu => ({
      "Status": fu.status.toUpperCase(),
      "Follow-up Date": fmtDate(fu.followUpDate),
      "Job Sheet #": fu.parentPurchase.jobSheetNumber,
      "Client": fu.parentPurchase.clientCompanyName,
      "Product": fu.parentPurchase.product,
      "Note": fu.note || "",
      "Remarks": fu.remarks || "",
      "Created By": fu.createdBy || "Unknown User",
      "Done": fu.done ? "Yes" : "No",
      "Last Updated": fmtDate(fu.updatedAt)
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Follow-ups");
    XLSX.writeFile(wb, "purchase_followups.xlsx");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-purple-700">Follow-ups View</h2>
          <button onClick={onClose} className="text-2xl">
            ×
          </button>
        </div>

        {/* Search and Controls */}
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Search follow-ups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border p-2 rounded text-xs w-64"
          />
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded text-xs"
          >
            Export to Excel
          </button>
        </div>

        {/* Follow-ups Table */}
        <div className="overflow-auto flex-1">
          <table className="min-w-full border-collapse border-b border-gray-300 text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th 
                  className="p-2 border cursor-pointer"
                  onClick={() => sortBy("status")}
                >
                  Status {sortConfig.key === "status" && (sortConfig.direction === "asc" ? "▲" : "▼")}
                </th>
                <th 
                  className="p-2 border cursor-pointer"
                  onClick={() => sortBy("followUpDate")}
                >
                  Follow-up Date {sortConfig.key === "followUpDate" && (sortConfig.direction === "asc" ? "▲" : "▼")}
                </th>
                <th 
                  className="p-2 border cursor-pointer"
                  onClick={() => sortBy("jobSheetNumber")}
                >
                  Job Sheet # {sortConfig.key === "jobSheetNumber" && (sortConfig.direction === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-2 border">Client</th>
                <th className="p-2 border">Product</th>
                <th className="p-2 border">Note</th>
                <th className="p-2 border">Remarks</th>
                <th 
                  className="p-2 border cursor-pointer"
                  onClick={() => sortBy("createdBy")}
                >
                  Created By {sortConfig.key === "createdBy" && (sortConfig.direction === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-2 border">Done</th>
                <th className="p-2 border">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {sortedFollowUps.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-4 text-center text-gray-500">
                    No follow-ups found
                  </td>
                </tr>
              ) : (
                sortedFollowUps.map((fu, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-2 border">{getStatusBadge(fu.status)}</td>
                    <td className="p-2 border">{fmtDate(fu.followUpDate)}</td>
                    <td className="p-2 border font-medium">
                      {fu.parentPurchase.jobSheetNumber}
                    </td>
                    <td className="p-2 border">{fu.parentPurchase.clientCompanyName}</td>
                    <td className="p-2 border">{fu.parentPurchase.product}</td>
                    <td className="p-2 border">{fu.note || "-"}</td>
                    <td className="p-2 border">{fu.remarks || "-"}</td>
                    <td className="p-2 border font-medium text-blue-600">
                      {fu.createdBy || "Unknown User"}
                    </td>
                    <td className="p-2 border">
                      {fu.done ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : (
                        <span className="text-red-600">✗</span>
                      )}
                    </td>
                    <td className="p-2 border">{fmtDate(fu.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function HeaderFilters({ headerFilters, onFilterChange }) {
  const cols = [
    "jobSheetCreatedDate",
    "jobSheetNumber",
    "clientCompanyName",
    "eventName",
    "product",
    "productPrice",
    "size",
    "qtyRequired",
    "qtyOrdered",
    "sourcedBy",
    "sourcingFrom",
    "deliveryDateTime",
    "vendorContactNumber",
    "orderConfirmedDate",
    "expectedReceiveDate",
    "schedulePickUp",
    "invoiceRemarks",
    "remarks",
  ];

  return (
    <tr className="bg-gray-100">
      <th className="p-1 border" style={{ width: "120px" }}>
        <select
          className="w-full p-1 text-xs border rounded"
          value={headerFilters.completionState || ""}
          onChange={(e) => onFilterChange("completionState", e.target.value)}
        >
          <option value="">All</option>
          <option value="Partially">Partially</option>
          <option value="Fully">Fully</option>
        </select>
      </th>

      {cols.map((c) => (
        <th key={c} className="p-1 border">
          <input
            type="text"
            className="w-full p-1 text-xs border rounded"
            placeholder={`Filter ${c}`}
            value={headerFilters[c] || ""}
            onChange={(e) => onFilterChange(c, e.target.value)}
          />
        </th>
      ))}
      <th className="p-1 border" style={{ width: "120px" }}>
        <select
          className="w-full p-1 text-xs border rounded"
          value={headerFilters.status || ""}
          onChange={(e) => onFilterChange("status", e.target.value)}
        >
          <option value="">All</option>
          <option value="pending">pending</option>
          <option value="received">received</option>
          <option value="alert">alert</option>
          <option value="__empty__">No Status</option>
        </select>
      </th>
      <th className="p-1 border" style={{ width: "180px" }} />
      <th className="p-1 border" style={{ width: "120px" }}>
        <select
          className="w-full p-1 text-xs border rounded"
          value={headerFilters.__poStatus || ""}
          onChange={(e) => onFilterChange("__poStatus", e.target.value)}
        >
          <option value="">All</option>
          <option value="generated">Generated</option>
          <option value="not">Not generated</option>
        </select>
      </th>
      <th className="p-1 border" style={{ width: "80px" }} />
    </tr>
  );
}

/* ===================== FollowUpModal (with remarks) ===================== */
function FollowUpModal({ followUps, onUpdate, onClose }) {
  const [local, setLocal] = useState(
    Array.isArray(followUps)
      ? followUps.map((f) => ({
          updatedAt: f.updatedAt ? new Date(f.updatedAt) : new Date(),
          followUpDate: f.followUpDate || "",
          note: f.note || "",
          remarks: f.remarks || "",
          done: !!f.done,
          updatedBy: f.updatedBy || "admin",
        }))
      : []
  );

  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [remarks, setRemarks] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const add = () => {
    if (!date.trim() || (!note.trim() && !remarks.trim())) return;
    setLocal((p) => [
      ...p,
      {
        updatedAt: new Date(),
        followUpDate: date,
        note,
        remarks,
        done: false,
        updatedBy: "admin",
      },
    ]);
    setDate("");
    setNote("");
    setRemarks("");
  };

  const remove = (i) => setLocal((p) => p.filter((_, idx) => idx !== i));
  const markDone = (i) =>
    setLocal((p) => p.map((fu, idx) => (idx === i ? { ...fu, done: true } : fu)));

  const editField = (i, field, value) =>
    setLocal((p) =>
      p.map((fu, idx) =>
        idx === i ? { ...fu, [field]: value, updatedAt: new Date() } : fu
      )
    );

  const close = () => {
    onUpdate(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded w-full max-w-xl text-xs">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-purple-700">Manage Follow-Ups</h3>
          <button onClick={close} className="text-2xl">×</button>
        </div>

        <div className="mb-4 space-y-2">
          <label className="font-bold">Add New Follow-Up</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="date"
              className="p-1 border rounded"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              type="text"
              className="p-1 border rounded"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <input
              type="text"
              className="p-1 border rounded"
              placeholder="Remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button onClick={add} className="bg-blue-600 text-white px-3 py-1 rounded">Add</button>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto border p-2 mb-4">
          {local.length === 0 && <p className="text-gray-600">No follow-ups.</p>}
          {local.map((fu, i) => {
            const overdue = !fu.done && fu.followUpDate && fu.followUpDate < today;
            return (
              <div key={i} className={`border rounded p-2 mb-2 ${overdue ? "bg-red-200" : "bg-gray-50"}`}>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="date"
                    className="p-1 border rounded"
                    value={fu.followUpDate || ""}
                    onChange={(e) => editField(i, "followUpDate", e.target.value)}
                  />
                  <input
                    type="text"
                    className="p-1 border rounded"
                    placeholder="Note"
                    value={fu.note || ""}
                    onChange={(e) => editField(i, "note", e.target.value)}
                  />
                  <input
                    type="text"
                    className="p-1 border rounded"
                    placeholder="Remarks"
                    value={fu.remarks || ""}
                    onChange={(e) => editField(i, "remarks", e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    {!fu.done && (
                      <button onClick={() => markDone(i)} className="bg-green-600 text-white px-2 py-1 rounded">Done</button>
                    )}
                    <button onClick={() => remove(i)} className="text-red-600 px-2 py-1">Remove</button>
                  </div>
                </div>
                <div className="mt-1 text-[10px] text-gray-600">
                  Updated {new Date(fu.updatedAt).toLocaleString()} by {fu.updatedBy || "admin"}
                  {fu.done ? " • (Done)" : ""}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button onClick={close} className="bg-green-700 text-white px-4 py-1 rounded">Close</button>
        </div>
      </div>
    </div>
  );
}

const statusOptions = ["", "pending", "received", "alert"];

/* ---------------- Vendor Typeahead ---------------- */
function VendorTypeahead({
  value,
  onChange,
  disableNonReliable = false,
  placeholder = "Search vendor by company/name/location…",
}) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/vendors`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = Array.isArray(res.data) ? res.data : [];
        setVendors(data.filter((v) => !v.deleted));
      } catch (e) {
        console.error("Fetch vendors failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return vendors.slice(0, 50);
    return vendors
      .filter((v) => {
        const hay = [
          v.vendorCompany,
          v.vendorName,
          v.brandDealing,
          v.location,
          v.gst,
          v.postalCode,
          v.reliability,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      })
      .slice(0, 50);
  }, [vendors, q]);

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight >= 0 && filtered[highlight]) {
        selectVendor(filtered[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const selected = vendors.find((v) => String(v._id) === String(value)) || null;

  const selectVendor = (v) => {
    if (disableNonReliable && (v.reliability || "reliable") === "non-reliable") {
      return;
    }
    setQ((v.vendorCompany || v.vendorName || "").toString());
    setOpen(false);
    setHighlight(-1);
    onChange && onChange(String(v._id), v);
  };

  const badge = (rel) => {
    const isBad = (rel || "reliable") === "non-reliable";
    return (
      <span className={`text-[10px] px-1 py-[1px] rounded ${isBad ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}>
        {isBad ? "NON-RELIABLE" : "RELIABLE"}
      </span>
    );
  };

  return (
    <div className="relative" ref={wrapRef}>
      <input
        ref={inputRef}
        type="text"
        className="w-full border p-2 rounded"
        placeholder={loading ? "Loading vendors…" : placeholder}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHighlight(-1);
          if (!e.target.value) onChange && onChange("", null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        disabled={loading}
      />
      {open && (
        <div className="absolute z-[120] mt-1 w-full max-h-60 overflow-auto bg-white border rounded shadow">
          {filtered.length === 0 && <div className="px-3 py-2 text-xs text-gray-500">No matches</div>}
          {filtered.map((v, idx) => {
            const isHi = idx === highlight;
            const nonRel = (v.reliability || "reliable") === "non-reliable";
            return (
              <div
                key={v._id}
                onMouseEnter={() => setHighlight(idx)}
                onMouseLeave={() => setHighlight(-1)}
                onClick={() => selectVendor(v)}
                className={`px-3 py-2 text-xs cursor-pointer ${isHi ? "bg-gray-100" : ""} ${disableNonReliable && nonRel ? " opacity-60" : ""}`}
                title={disableNonReliable && nonRel ? "Selection disabled for non-reliable vendors" : ""}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{v.vendorCompany || v.vendorName || "(Unnamed Vendor)"}</div>
                  {badge(v.reliability)}
                </div>
                <div className="text-[11px] text-gray-600">
                  {v.vendorName ? `${v.vendorName} • ` : ""}{v.location || "-"}
                  {v.brandDealing ? ` • ${v.brandDealing}` : ""}
                </div>
                <div className="text-[10px] text-gray-500">
                  {v.gst ? `GST: ${v.gst}` : ""} {v.postalCode ? ` • ${v.postalCode}` : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {selected && (
        <div className="mt-1 text-xs text-gray-600">
          <div><span className="font-medium">Selected:</span> {selected.vendorCompany || selected.vendorName || "-"} {badge(selected.reliability)}</div>
          <div><span className="font-medium">Location:</span> {selected.location || "-"}</div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Edit Purchase Modal ---------------- */
function EditPurchaseModal({ purchase, onClose, onSave }) {
  const [data, setData] = useState({ ...purchase });
  const [fuModal, setFuModal] = useState(false);

  const change = (f, v) => setData((p) => ({ ...p, [f]: v }));
  const save = () => {
    if (data.status === "received" && !window.confirm("Marked RECEIVED. Save changes?")) return;

    const payload = { ...data };
    if (payload.status === "") delete payload.status;

    if (payload.productPrice !== undefined && payload.productPrice !== null && payload.productPrice !== "") {
      payload.productPrice = Number(payload.productPrice) || 0;
    }

    if (payload.invoiceRemarks === undefined || payload.invoiceRemarks === null) {
      payload.invoiceRemarks = "";
    } else {
      payload.invoiceRemarks = String(payload.invoiceRemarks);
    }

    if (payload.completionState === undefined || payload.completionState === null) {
      payload.completionState = "";
    } else {
      const v = String(payload.completionState).trim();
      payload.completionState = v === "Partially" || v === "Fully" ? v : "";
    }

    onSave(payload);
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
        <div className="bg-white p-6 rounded w-full max-w-3xl text-xs">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-purple-700">Edit Open Purchase</h2>
            <button onClick={onClose} className="text-2xl">×</button>
          </div>
          <form className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><label className="font-bold">Job Sheet #:</label> {data.jobSheetNumber}</div>
              <div><label className="font-bold">Job Sheet Date:</label> {data.jobSheetCreatedDate ? new Date(data.jobSheetCreatedDate).toLocaleDateString() : "N/A"}</div>
              <div><label className="font-bold">Client:</label> {data.clientCompanyName}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="font-bold">Event:</label> {data.eventName}</div>
              <div><label className="font-bold">Product:</label> {data.product}</div>
              <div><label className="font-bold">Size:</label> {data.size || "N/A"}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-bold">Product Price:</label>
                <input type="number" step="0.01" className="w-full border p-1" value={data.productPrice ?? ""}
                  onChange={(e) => change("productPrice", e.target.value === "" ? "" : parseFloat(e.target.value))}
                />
              </div>
              <div><label className="font-bold">Sourced From:</label> {data.sourcingFrom}</div>
              <div><label className="font-bold">Delivery Date:</label> {data.deliveryDateTime ? new Date(data.deliveryDateTime).toLocaleDateString() : "N/A"}</div>
              <div><label className="font-bold">Qty Req'd:</label> {data.qtyRequired}</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-bold">Qty Ordered:</label>
                <input type="number" className="w-full border p-1" value={data.qtyOrdered || ""}
                  onChange={(e) => change("qtyOrdered", parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div>
                <label className="font-bold">Vendor #:</label>
                <input type="text" className="w-full border p-1" value={data.vendorContactNumber || ""}
                  onChange={(e) => change("vendorContactNumber", e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold">Completion:</label>
                <select className="w-full border p-1" value={data.completionState || ""}
                  onChange={(e) => change("completionState", e.target.value)}>
                  <option value="">--</option><option value="Partially">Partially</option><option value="Fully">Fully</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold">General Remarks:</label>
                <input type="text" className="w-full border p-1" value={data.remarks || ""}
                  onChange={(e) => change("remarks", e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold">Invoice Remarks:</label>
                <input type="text" className="w-full border p-1" value={data.invoiceRemarks || ""}
                  onChange={(e) => change("invoiceRemarks", e.target.value)} placeholder="Shown on PO / flows to Closed"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-bold">Order Confirmed:</label>
                <input type="date" className="w-full border p-1" value={data.orderConfirmedDate?.substring(0, 10) || ""}
                  onChange={(e) => change("orderConfirmedDate", e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold">Expected Recv':</label>
                <input type="date" className="w-full border p-1" value={data.expectedReceiveDate?.substring(0, 10) || ""}
                  onChange={(e) => change("expectedReceiveDate", e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold">Pick-Up Dt/Tm:</label>
                <input type="datetime-local" className="w-full border p-1" value={data.schedulePickUp?.substring(0, 16) || ""}
                  onChange={(e) => change("schedulePickUp", e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold">Status:</label>
                <select className="w-full border p-1" value={data.status || ""} onChange={(e) => change("status", e.target.value)}>
                  {statusOptions.map((s) => (<option key={s} value={s}>{s === "" ? "Empty" : s}</option>))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={() => setFuModal(true)} className="bg-blue-600 text-white px-2 py-1 rounded">View Follow-Ups</button>
            </div>
          </form>
          <div className="flex justify-end gap-4 mt-6">
            <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
            <button onClick={save} className="px-4 py-2 bg-green-700 text-white rounded">Save</button>
          </div>
        </div>
      </div>
      {fuModal && (<FollowUpModal followUps={data.followUp} onUpdate={(f) => change("followUp", f)} onClose={() => setFuModal(false)} />)}
    </>
  );
}

/* ---------------- DEFAULT PO TERMS (prefill) ---------------- */
const DEFAULT_PO_TERMS = `1. The Vendor warrants that all goods supplied shall strictly conform to the specifications, samples (pre-approved or otherwise), drawings, and/or standards explicitly referenced in this Purchase Order.

2. Quality Standards: All materials must be new, defect-free, and of first-class quality, suitable for the intended use as premium corporate gifts. This includes specific requirements on durability, colorfastness, finish, and safety standards (e.g., non-toxic, food-safe, etc.).

3. Right to Inspect and Reject: We reserve the right to inspect all goods upon delivery. If, upon inspection, any item is found to be defective, non-conforming, or of unacceptable quality, we may reject the entire shipment or the non-conforming portion at the Vendor's risk and expense. The Vendor shall bear all costs of return and shall, either provide a full refund or replace the rejected goods within agreed days.

4. Proofing: For custom or branded items, the Vendor must submit a pre-production sample/proof for written approval before mass production begins. Production without written approval is at the Vendor's sole risk.

5. Firm Delivery Date: The Required Delivery Date specified in the Header Details is firm and of the essence. The Vendor must ensure delivery to the specified address on or before this date.

6. Notification of Delay: The Vendor must immediately notify us in writing of any potential delay, providing the reasons and a revised expected delivery date.

7. Late Delivery Penalty (Liquidated Damages): Should the Vendor fail to deliver the goods by the Required Delivery Date, we reserve the right to assess a penalty for Liquidated Damages.

8. Cancellation Rights: If delivery is delayed by more than committed days beyond the Required Delivery Date, we may, without prejudice to any other rights or remedies, cancel the entire Purchase Order without penalty and secure the goods from an alternate source, holding the original Vendor responsible for any additional costs incurred.

9. Payment Terms: Net 30 days from the later of (a) the invoice date or (b) the date of acceptance of the goods by Ace.

10. Shipping Terms: Specify the shipping responsibility.

11. The Vendor agrees not to disclose or use any specific branding, client details, or product designs related to this PO for any other purpose without the prior written consent of Ace Gifting Solutions.

12. The Vendor's acceptance of this Purchase Order is deemed to occur upon the earliest of (a) written acknowledgment, (b) shipment of the goods, or (c) commencement of work on the goods.

13. PO is subject to Bangalore Jurisdiction.`;

/* ---------------- Generate PO Modal ---------------- */
function GeneratePOModal({ row, onClose, onCreated }) {
  const [vendorId, setVendorId] = useState("");
  const [productCode, setProductCode] = useState("");
  const [issueDate, setIssueDate] = useState(toISODate(new Date()));
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState(toISODate(row?.deliveryDateTime));
  const [deliveryAddress, setDeliveryAddress] = useState("Ace Gifting Solutions");

  const [vendorGst, setVendorGst] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");

  const [remarks, setRemarks] = useState("");
  const [terms, setTerms] = useState(DEFAULT_PO_TERMS);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!vendorId) { alert("Please select a vendor."); return; }
    if (!row || !row._id || String(row._id).startsWith("temp_")) {
      alert("This row hasn't been saved yet. Save it first, then generate a PO."); return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        vendorId,
        productCode: productCode || undefined,
        issueDate: issueDate || undefined,
        requiredDeliveryDate: requiredDeliveryDate || undefined,
        deliveryAddress: deliveryAddress || undefined,
        remarks,
        terms: terms || undefined,
        vendor: { gstNumber: vendorGst || undefined, address: vendorAddress || undefined },
      };

      const url = `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchase-orders/from-open/${row._id}`;
      const res = await axios.post(url, payload, { headers: { Authorization: `Bearer ${token}` } });

      const po = res.data && res.data.po;
      alert(`PO created: ${po && po.poNumber ? po.poNumber : "(no number)"}`);
      if (onCreated) onCreated(po);
      onClose();
    } catch (e) {
      console.error(e);
      alert((e && e.response && e.response.data && e.response.data.message) || "Failed to generate PO");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded w-full max-w-2xl text-xs">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-purple-700">Generate Purchase Order</h3>
          <button onClick={onClose} className="text-2xl">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className="font-bold">Job Sheet #</label><div className="border rounded p-2">{row.jobSheetNumber}</div></div>
          <div><label className="font-bold">Product</label><div className="border rounded p-2">{row.product}{row.size ? ` — ${row.size}` : ""}</div></div>

          <div className="col-span-2"><label className="font-bold">Vendor</label><VendorTypeahead value={vendorId}
            onChange={(id, v) => { setVendorId(id || ""); if (v) { setVendorGst(v.gst || ""); setVendorAddress(v.address || v.location || ""); } else { setVendorGst(""); setVendorAddress(""); } }}
          /></div>

          <div><label className="font-bold">Vendor GSTIN</label><input type="text" className="w-full border p-2 rounded" value={vendorGst}
            onChange={(e) => setVendorGst(e.target.value)} placeholder="Override / confirm vendor GSTIN"
          /></div>
          <div><label className="font-bold">Vendor Address</label><input type="text" className="w-full border p-2 rounded" value={vendorAddress}
            onChange={(e) => setVendorAddress(e.target.value)} placeholder="Override / confirm vendor address"
          /></div>

          <div><label className="font-bold">Product Code (optional)</label><input type="text" className="w-full border p-2 rounded" value={productCode}
            onChange={(e) => setProductCode(e.target.value)} placeholder="Matches Product.productId"
          /></div>
          <div><label className="font-bold">Issue Date</label><input type="date" className="w-full border p-2 rounded" value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          /></div>
          <div><label className="font-bold">Required Delivery Date</label><input type="date" className="w-full border p-2 rounded" value={requiredDeliveryDate}
            onChange={(e) => setRequiredDeliveryDate(e.target.value)}
          /></div>
          <div><label className="font-bold">Delivery Address</label><input type="text" className="w-full border p-2 rounded" value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Ace Gifting Solutions"
          /></div>
          <div className="col-span-2"><label className="font-bold">PO Remarks</label><input type="text" className="w-full border p-2 rounded" value={remarks}
            onChange={(e) => setRemarks(e.target.value)} placeholder="Header-level PO remarks (optional)"
          /></div>
          <div className="col-span-2"><label className="font-bold">Terms</label><textarea className="w-full border p-2 rounded min-h-[120px]" value={terms}
            onChange={(e) => setTerms(e.target.value)}
          /><div className="mt-1"><button type="button" className="text-[11px] underline" onClick={() => setTerms(DEFAULT_PO_TERMS)}>Reset to default terms</button></div></div>

          <div className="col-span-2"><div className="text-[11px] text-gray-600"><b>Line Item Invoice Remarks:</b> {row.invoiceRemarks || "(none)"}<br />This will be added to the PO item automatically.</div></div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-3 py-2 bg-[#Ff8045] text-white rounded disabled:opacity-60">
            {loading ? "Creating…" : "Create PO"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Advanced date filter init ---------------- */
const initAdv = {
  jobSheetNumber: { from: "", to: "" },
  jobSheetCreatedDate: { from: "", to: "" },
  deliveryDateTime: { from: "", to: "" },
  orderConfirmedDate: { from: "", to: "" },
  expectedReceiveDate: { from: "", to: "" },
  schedulePickUp: { from: "", to: "" },
};

export default function OpenPurchaseList() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [headerFilters, setHeaderFilters] = useState({});
  const [advFilters, setAdvFilters] = useState(initAdv);
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "deliveryDateTime", direction: "asc" });
  const [showFollowUpView, setShowFollowUpView] = useState(false); // ADDED STATE FOR FOLLOW-UP VIEW

  const [perms, setPerms] = useState([]);
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const canExport = isSuperAdmin || perms.includes("export-purchase");

  const [selectedJobSheetNumber, setSelectedJobSheetNumber] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [currentEdit, setCurrentEdit] = useState(null);

  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [poModalRow, setPoModalRow] = useState(null);

  const handleOpenModal = (jobSheetNumber) => { setSelectedJobSheetNumber(jobSheetNumber); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedJobSheetNumber(null); };

  useEffect(() => {
    const str = localStorage.getItem("permissions");
    if (str) { try { setPerms(JSON.parse(str)); } catch { /* ignore */ } }
  }, []);

  const loadPurchases = async (cfg = sortConfig) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`,
        { headers: { Authorization: `Bearer ${token}` }, params: { sortKey: cfg.key, sortDirection: cfg.direction } }
      );
      setPurchases(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { loadPurchases(); }, [sortConfig]);

  const filteredPurchases = useMemo(() => {
    const jobSheetStatus = {};
    purchases.forEach((rec) => {
      if (!jobSheetStatus[rec.jobSheetNumber]) { jobSheetStatus[rec.jobSheetNumber] = { allReceived: true, items: 0 }; }
      jobSheetStatus[rec.jobSheetNumber].items += 1;
      if (rec.status !== "received") { jobSheetStatus[rec.jobSheetNumber].allReceived = false; }
    });
    return purchases.filter((rec) => !jobSheetStatus[rec.jobSheetNumber]?.allReceived);
  }, [purchases]);

  const globalFiltered = useMemo(() => {
    const s = search.toLowerCase();
    return filteredPurchases.filter((p) =>
      ["jobSheetNumber", "clientCompanyName", "eventName", "product", "size", "sourcingFrom", "vendorContactNumber", "remarks", "invoiceRemarks"]
        .some((f) => (p[f] || "").toLowerCase().includes(s))
    );
  }, [filteredPurchases, search]);

  const headerFiltered = useMemo(() => {
    return globalFiltered.filter((r) =>
      Object.entries(headerFilters).every(([k, v]) => {
        if (!v) return true;
        if (k === "status") { if (v === "__empty__") return !r.status; return (r.status || "").toLowerCase() === v.toLowerCase(); }
        if (k === "completionState") { return (r.completionState || "") === v; }
        if (k === "__poStatus") { const generated = !!(r.poId || r.poNumber); return v === "generated" ? generated : v === "not" ? !generated : true; }
        const raw = r[k]; const cell = raw ? k.includes("Date") ? new Date(raw).toLocaleDateString() : String(raw) : "";
        return cell.toLowerCase().includes(v.toLowerCase());
      })
    );
  }, [globalFiltered, headerFilters]);

  const advFiltered = useMemo(() => {
    const inRange = (d, range) => {
      const from = range.from; const to = range.to;
      if (!from && !to) return true; if (!d) return false;
      const dt = new Date(d);
      if (from && dt < new Date(from)) return false;
      if (to && dt > new Date(to)) return false;
      return true;
    };
    return headerFiltered.filter((r) => {
      const numOK = (!advFilters.jobSheetNumber.from || r.jobSheetNumber >= advFilters.jobSheetNumber.from) &&
                    (!advFilters.jobSheetNumber.to || r.jobSheetNumber <= advFilters.jobSheetNumber.to);
      return numOK && inRange(r.jobSheetCreatedDate, advFilters.jobSheetCreatedDate) &&
                     inRange(r.deliveryDateTime, advFilters.deliveryDateTime) &&
                     inRange(r.orderConfirmedDate, advFilters.orderConfirmedDate) &&
                     inRange(r.expectedReceiveDate, advFilters.expectedReceiveDate) &&
                     inRange(r.schedulePickUp, advFilters.schedulePickUp);
    });
  }, [headerFiltered, advFilters]);

  const rows = useMemo(() => {
    const byKey = {};
    advFiltered.forEach((r) => { const key = `${r.jobSheetNumber}_${r.product}_${r.size || ""}`; byKey[key] = r; });
    return Object.values(byKey);
  }, [advFiltered]);

  const sortBy = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) { return { key, direction: prev.direction === "asc" ? "desc" : "asc" }; }
      return { key, direction: "asc" };
    });
  };

  const exportToExcel = () => {
    if (!canExport) { alert("You don't have permission to export purchase records."); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Completion: r.completionState || "",
        "Job Sheet #": r.jobSheetNumber,
        "Job Sheet Date": fmtDate(r.jobSheetCreatedDate),
        Client: r.clientCompanyName,
        Event: r.eventName,
        Product: r.product,
        "Product Price": typeof r.productPrice === "number" ? r.productPrice : "",
        Size: r.size || "N/A",
        "Qty Required": r.qtyRequired,
        "Qty Ordered": r.qtyOrdered,
        "Sourced By": r.sourcedBy || "",
        "Sourced From": r.sourcingFrom,
        "Delivery Date": fmtDate(r.deliveryDateTime),
        "Vendor Contact": r.vendorContactNumber,
        "Order Confirmed": fmtDate(r.orderConfirmedDate),
        "Expected Receive": fmtDate(r.expectedReceiveDate),
        "Schedule PickUp": fmtDate(r.schedulePickUp),
        "Invoice Remarks": r.invoiceRemarks || "",
        Remarks: r.remarks || "",
        Status: r.status,
        "PO Status": r.poId || r.poNumber ? "Generated" : "Not generated",
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "OpenPurchases");
    XLSX.writeFile(wb, "open_purchases.xlsx");
  };

  if (loading) return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">Open Purchases</h1>
      <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-300 rounded"></div><div className="h-64 bg-gray-300 rounded"></div></div>
    </div>
  );

  return (
    <div className="p-6">
      {!perms.includes("write-purchase") && (
        <div className="mb-4 p-2 bg-red-200 text-red-800 rounded">You don't have permission to edit purchase records.</div>
      )}
      <h1 className="text-2xl font-bold text-[#Ff8045] mb-4">Open Purchases</h1>
      
      {/* Updated Header with reduced search bar and NEW "View Follow-ups" button */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          type="text"
          placeholder="Global search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded text-xs w-64"
        />
        <button
          onClick={() => setShowFilters((f) => !f)}
          className="bg-[#Ff8045] text-white px-4 py-2 rounded text-xs"
        >
          Filters
        </button>
        {/* ADDED "View Follow-ups" BUTTON HERE */}
        <button
          onClick={() => setShowFollowUpView(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded text-xs"
        >
          View Follow-ups
        </button>
        {(isSuperAdmin || canExport) && (<button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded text-xs">Export to Excel</button>)}
      </div>

      {showFilters && (
        <div className="mb-4 border rounded p-3 text-xs bg-gray-50 space-y-2">
          <div className="font-bold mb-1">Advanced Filters</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div><label className="block">Job Sheet # From</label><input type="text" className="border p-1 rounded w-full"
              value={advFilters.jobSheetNumber.from} onChange={(e) => setAdvFilters((p) => ({ ...p, jobSheetNumber: { ...p.jobSheetNumber, from: e.target.value } }))}
            /></div>
            <div><label className="block">Job Sheet # To</label><input type="text" className="border p-1 rounded w-full"
              value={advFilters.jobSheetNumber.to} onChange={(e) => setAdvFilters((p) => ({ ...p, jobSheetNumber: { ...p.jobSheetNumber, to: e.target.value } }))}
            /></div>
            {[["jobSheetCreatedDate", "Job Sheet Date"], ["deliveryDateTime", "Delivery Date"], ["orderConfirmedDate", "Order Confirmed"],
              ["expectedReceiveDate", "Expected Receive"], ["schedulePickUp", "Pick-Up"]].map(([key, label]) => (<React.Fragment key={key}>
                <div><label className="block">{label} From</label><input type="date" className="border p-1 rounded w-full"
                  value={advFilters[key].from} onChange={(e) => setAdvFilters((p) => ({ ...p, [key]: { ...p[key], from: e.target.value } }))}
                /></div>
                <div><label className="block">{label} To</label><input type="date" className="border p-1 rounded w-full"
                  value={advFilters[key].to} onChange={(e) => setAdvFilters((p) => ({ ...p, [key]: { ...p[key], to: e.target.value } }))}
                /></div>
              </React.Fragment>))}
          </div>
          <div className="flex justify-end gap-2 mt-2"><button className="px-3 py-1 border rounded" onClick={() => setAdvFilters(initAdv)}>Clear</button></div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border-b border-gray-300 text-xs table-fixed">
          <colgroup>
            <col className="w-24" /> {/* Completion */}
            <col className="w-24" /> {/* Job Sheet Date */}
            <col className="w-24" /> {/* Job Sheet # */}
            <col className="w-32" /> {/* Client */}
            <col className="w-28" /> {/* Event */}
            <col className="w-36" /> {/* Product */}
            <col className="w-20" /> {/* Cost */}
            <col className="w-20" /> {/* Size */}
            <col className="w-16" /> {/* Qty Req */}
            <col className="w-20" /> {/* Qty Ordered */}
            <col className="w-28" /> {/* Sourced By */}
            <col className="w-32" /> {/* Sourced From */}
            <col className="w-24" /> {/* Delivery Date */}
            <col className="w-32" /> {/* Vendor Contact */}
            <col className="w-24" /> {/* Order Conf Date */}
            <col className="w-24" /> {/* Expected Recv Date */}
            <col className="w-24" /> {/* Pick-Up Date */}
            <col className="w-40" /> {/* Invoice Remarks */}
            <col className="w-48" /> {/* Order Remarks */}
            <col className="w-24" /> {/* Status */}
            <col className="w-40" /> {/* Follow-Up */}
            <col className="w-24" /> {/* PO Status */}
            <col className="w-20" /> {/* Actions */}
          </colgroup>
          <thead className="bg-gray-50">
            <tr>
              {[
                { key: "completionState", label: "Completion" },
                { key: "jobSheetCreatedDate", label: "Job Sheet Date" },
                { key: "jobSheetNumber", label: "Job Sheet #" },
                { key: "clientCompanyName", label: "Client" },
                { key: "eventName", label: "Event" },
                { key: "product", label: "Product" },
                { key: "productPrice", label: "Cost" },
                { key: "size", label: "Size" },
                { key: "qtyRequired", label: "Qty Req" },
                { key: "qtyOrdered", label: "Qty Ordered" },
                { key: "sourcedBy", label: "Sourced By" },
                { key: "sourcingFrom", label: "Sourced From" },
                { key: "deliveryDateTime", label: "Delivery Date" },
                { key: "vendorContactNumber", label: "Vendor Contact" },
                { key: "orderConfirmedDate", label: "Order Conf Date." },
                { key: "expectedReceiveDate", label: "Expected Recv Date." },
                { key: "schedulePickUp", label: "Pick-Up Date" },
                { key: "invoiceRemarks", label: "Invoice Remarks" },
                { key: "remarks", label: "Order Remarks" },
                { key: "status", label: "Status" },
              ].map(({ key, label }) => (
                <th key={key} onClick={() => sortBy(key)} className="p-2 border cursor-pointer">
                  {label}{sortConfig.key === key ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
                </th>
              ))}
              <th className="p-2 border">Follow-Up</th>
              <th className="p-2 border">PO Status</th>
              <th className="p-2 border">Actions</th>
            </tr>
            <HeaderFilters headerFilters={headerFilters} onFilterChange={(k, v) => setHeaderFilters((p) => ({ ...p, [k]: v }))} />
          </thead>
          <tbody>
            {rows.map((p) => {
              const latest = p.followUp?.length ? p.followUp.reduce((l, fu) => new Date(fu.updatedAt) > new Date(l.updatedAt) ? fu : l) : null;
              const menuOpen = menuOpenFor === p._id;
              const poGenerated = !!(p.poId || p.poNumber);
              return (
                <tr key={`${p._id}_${p.product}_${p.size || ""}`}
                  className={p.status === "alert" ? "bg-red-200" : p.status === "pending" ? "bg-orange-200" : p.status === "received" ? "bg-green-200" : ""}
                >
                  <td className="p-2 border break-words">{p.completionState || ""}</td>
                  <td className="p-2 border break-words">{fmtDate(p.jobSheetCreatedDate)}</td>
                  <td className="p-2 border break-words">
                    <button className="text-blue-500 hover:text-blue-700 underline" onClick={(e) => { e.preventDefault(); handleOpenModal(p.jobSheetNumber); }}>
                      {p.jobSheetNumber || "(No Number)"}
                    </button>
                  </td>
                  <td className="p-2 border break-words">{p.clientCompanyName}</td>
                  <td className="p-2 border break-words">{p.eventName}</td>
                  <td className="p-2 border break-words">{p.product}</td>
                  <td className="p-2 border break-words text-right">{typeof p.productPrice === "number" ? p.productPrice.toFixed(2) : "—"}</td>
                  <td className="p-2 border break-words">{p.size || "N/A"}</td>
                  <td className="p-2 border break-words text-center">{p.qtyRequired}</td>
                  <td className="p-2 border break-words text-center">{p.qtyOrdered}</td>
                  <td className="p-2 border break-words">{p.sourcedBy || ""}</td>
                  <td className="p-2 border break-words">{p.sourcingFrom}</td>
                  <td className="p-2 border break-words">{fmtDate(p.deliveryDateTime)}</td>
                  <td className="p-2 border break-words">{p.vendorContactNumber}</td>
                  <td className="p-2 border break-words">{fmtDate(p.orderConfirmedDate)}</td>
                  <td className="p-2 border break-words">{fmtDate(p.expectedReceiveDate)}</td>
                  <td className="p-2 border break-words">{fmtDate(p.schedulePickUp)}</td>
                  <td className="p-2 border break-words">{p.invoiceRemarks || ""}</td>
                  <td className="p-2 border break-words">{p.remarks}</td>
                  <td className="p-2 border break-words">{p.status || "N/A"}</td>
                  <td className="p-2 border break-words">{latest ? (latest.remarks && latest.remarks.trim() ? latest.remarks : latest.note || "—") : "—"}</td>
                  <td className="p-2 border break-words text-center">
                    {poGenerated ? (
                      <span className="inline-block px-2 py-0.5 text-[10px] rounded bg-green-600 text-white">Generated</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-[10px] rounded bg-gray-400 text-white">Not generated</span>
                    )}
                  </td>
                  <td className="p-2 border break-words relative">
                    <div className="mt-1"><button className="w-full border rounded py-0.5 text-[10px]" onClick={() => setMenuOpenFor((cur) => (cur === p._id ? null : p._id))}>⋮</button>
                      {menuOpen && (
                        <div className="absolute right-0 z-[120] mt-1 w-44 bg-white border rounded shadow">
                          <button className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${!perms.includes("write-purchase") || p.status === "received" ? "opacity-50 cursor-not-allowed" : ""}`}
                            onClick={() => { if (!perms.includes("write-purchase") || p.status === "received") return; setMenuOpenFor(null); setCurrentEdit(p); setEditModal(true); }}>Edit</button>
                          <button className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 text-red-600 ${!perms.includes("write-purchase") ? "opacity-50 cursor-not-allowed" : ""}`}
                            onClick={async () => { if (!perms.includes("write-purchase")) return; setMenuOpenFor(null); if (!window.confirm("Delete this purchase?")) return;
                              try { const token = localStorage.getItem("token"); await axios.delete(
                                `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${p._id}`, { headers: { Authorization: `Bearer ${token}` } }); await loadPurchases();
                              } catch { alert("Error deleting."); } }}>Delete</button>
                          {!poGenerated && (<button className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${!perms.includes("write-purchase") ? "opacity-50 cursor-not-allowed" : ""}`}
                            onClick={() => { if (!perms.includes("write-purchase")) return; setMenuOpenFor(null); setPoModalRow(p); }}>Generate PO</button>)}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <JobSheetGlobal jobSheetNumber={selectedJobSheetNumber} isOpen={isModalOpen} onClose={handleCloseModal} />
      {editModal && currentEdit && (<EditPurchaseModal purchase={currentEdit} onClose={() => setEditModal(false)} onSave={async (u) => {
        try { const token = localStorage.getItem("token"); const headers = { Authorization: `Bearer ${token}` };
          if (u._id && String(u._id).startsWith("temp_")) { const { _id, isTemporary, ...data } = u;
            await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`, data, { headers });
          } else { await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${u._id}`, u, { headers }); }
          await loadPurchases();
        } catch (error) { console.error("Error saving purchase:", error); } finally { setEditModal(false); }
      }} />)}
      {poModalRow && (<GeneratePOModal row={poModalRow} onClose={() => setPoModalRow(null)} onCreated={async () => { await loadPurchases(); }} />)}
      
      {/* ADDED: Follow-up View Modal */}
      {showFollowUpView && (
        <FollowUpView
          purchases={rows}
          onClose={() => setShowFollowUpView(false)}
        />
      )}
    </div>
  );
}