"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { TrashIcon } from "@heroicons/react/24/solid";
import * as XLSX from "xlsx";
import JobSheetGlobal from "../components/jobsheet/globalJobsheet";

/* ───────────────── Header Filters ───────────────── */
function HeaderFilters({ headerFilters, onFilterChange }) {
  const cols = [
    "jobSheetCreatedDate",
    "jobSheetNumber",
    "clientCompanyName",
    "eventName",
    "product",
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
    "remarks",
  ];

  return (
    <tr className="bg-gray-100">
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
      {/* Status filter */}
      <th className="p-1 border">
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
      {/* Actions */}
      <th className="p-1 border"></th>
    </tr>
  );
}

/* ───────────────── Follow-Up Modal ───────────────── */
function FollowUpModal({ followUps, onUpdate, onClose }) {
  const [local, setLocal] = useState(followUps || []);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const add = () => {
    if (!date.trim() || !note.trim()) return;
    setLocal((p) => [
      ...p,
      { updatedAt: new Date(), followUpDate: date, note, done: false, updatedBy: "admin" },
    ]);
    setDate("");
    setNote("");
  };
  const remove = (i) => setLocal((p) => p.filter((_, idx) => idx !== i));
  const markDone = (i) =>
    setLocal((p) => p.map((fu, idx) => (idx === i ? { ...fu, done: true } : fu)));
  const close = () => {
    onUpdate(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded w-full max-w-lg text-xs">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-purple-700">Manage Follow-Ups</h3>
          <button onClick={close} className="text-2xl">×</button>
        </div>
        <div className="mb-4 space-y-2">
          <label className="font-bold">Add New Follow-Up:</label>
          <div className="flex gap-2">
            <input
              type="date"
              className="p-1 border rounded flex-none"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              type="text"
              className="p-1 border rounded flex-grow"
              placeholder="Enter note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button onClick={add} className="bg-blue-600 text-white px-2 py-1 rounded">
              Add
            </button>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto border p-2 mb-4">
          {local.length === 0 && <p className="text-gray-600">No follow-ups.</p>}
          {local.map((fu, i) => (
            <div
              key={i}
              className={`flex justify-between items-center border-b py-1 ${
                !fu.done && fu.followUpDate < today ? "bg-red-200" : ""
              }`}
            >
              <span>
                {fu.followUpDate} – {fu.note} {fu.done && "(Done)"}
              </span>
              <div className="flex gap-2">
                {!fu.done && (
                  <button onClick={() => markDone(i)} className="bg-green-600 text-white px-2 rounded">
                    Done
                  </button>
                )}
                <button onClick={() => remove(i)} className="text-red-600">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button onClick={close} className="bg-green-700 text-white px-4 py-1 rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Edit Modal ───────────────── */
const statusOptions = ["", "pending", "received", "alert"];
function EditPurchaseModal({ purchase, onClose, onSave }) {
  const [data, setData] = useState({ ...purchase });
  const [fuModal, setFuModal] = useState(false);

  const change = (f, v) => setData((p) => ({ ...p, [f]: v }));
  const save = () => {
    if (data.status === "received" && !window.confirm("Marked RECEIVED. Save changes?"))
      return;
    const payload = { ...data };
    if (payload.status === "") {
      delete payload.status;
    }
    onSave(payload);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white p-6 rounded w-full max-w-3xl text-xs">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-purple-700">Edit Open Purchase</h2>
            <button onClick={onClose} className="text-2xl">×</button>
          </div>
          <form className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><label className="font-bold">Job Sheet #:</label> {data.jobSheetNumber}</div>
              <div>
                <label className="font-bold">Job Sheet Date:</label>{" "}
                {new Date(data.jobSheetCreatedDate).toLocaleDateString()}
              </div>
              <div><label className="font-bold">Client:</label> {data.clientCompanyName}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="font-bold">Event:</label> {data.eventName}</div>
              <div><label className="font-bold">Product:</label> {data.product}</div>
              <div><label className="font-bold">Size:</label> {data.size || "N/A"}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="font-bold">Sourced From:</label> {data.sourcingFrom}</div>
              <div>
                <label className="font-bold">Delivery Date:</label>{" "}
                {data.deliveryDateTime
                  ? new Date(data.deliveryDateTime).toLocaleDateString()
                  : "N/A"}
              </div>
              <div><label className="font-bold">Qty Req'd:</label> {data.qtyRequired}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold">Qty Ordered:</label>
                <input
                  type="number"
                  className="w-full border p-1"
                  value={data.qtyOrdered || ""}
                  onChange={(e) =>
                    change("qtyOrdered", parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <label className="font-bold">Vendor #:</label>
                <input
                  type="text"
                  className="w-full border p-1"
                  value={data.vendorContactNumber || ""}
                  onChange={(e) => change("vendorContactNumber", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold">Remarks:</label>
                <input
                  type="text"
                  className="w-full border p-1"
                  value={data.remarks || ""}
                  onChange={(e) => change("remarks", e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold">Order Confirmed:</label>
                <input
                  type="date"
                  className="w-full border p-1"
                  value={data.orderConfirmedDate?.substring(0, 10) || ""}
                  onChange={(e) =>
                    change("orderConfirmedDate", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-bold">Expected Recv':</label>
                <input
                  type="date"
                  className="w-full border p-1"
                  value={data.expectedReceiveDate?.substring(0, 10) || ""}
                  onChange={(e) =>
                    change("expectedReceiveDate", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="font-bold">Pick-Up Dt/Tm:</label>
                <input
                  type="datetime-local"
                  className="w-full border p-1"
                  value={data.schedulePickUp?.substring(0, 16) || ""}
                  onChange={(e) => change("schedulePickUp", e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold">Status:</label>
                <select
                  className="w-full border p-1"
                  value={data.status || ""}
                  onChange={(e) => change("status", e.target.value)}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s === "" ? "Empty" : s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setFuModal(true)}
                className="bg-blue-600 text-white px-2 py-1 rounded"
              >
                View Follow-Ups
              </button>
            </div>
          </form>
          <div className="flex justify-end gap-4 mt-6">
            <button onClick={onClose} className="px-4 py-2 border rounded">
              Cancel
            </button>
            <button onClick={save} className="px-4 py-2 bg-green-700 text-white rounded">
              Save
            </button>
          </div>
        </div>
      </div>
      {fuModal && (
        <FollowUpModal
          followUps={data.followUp}
          onUpdate={(f) => change("followUp", f)}
          onClose={() => setFuModal(false)}
        />
      )}
    </>
  );
}

/* ───────────────── Main Component ───────────────── */
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
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "" });

  const [perms, setPerms] = useState([]);
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const canExport = isSuperAdmin || perms.includes("export-purchase");

  const [selectedJobSheetNumber, setSelectedJobSheetNumber] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [currentEdit, setCurrentEdit] = useState(null);
  const [viewFuModal, setViewFuModal] = useState(false);
  const [viewFuId, setViewFuId] = useState(null);

  /* ─────────── Modal Handlers ─────────── */
  const handleOpenModal = (jobSheetNumber) => {
    setSelectedJobSheetNumber(jobSheetNumber);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJobSheetNumber(null);
  };

  /* ─────────── Permissions load ─────────── */
  useEffect(() => {
    const str = localStorage.getItem("permissions");
    if (str) {
      try {
        setPerms(JSON.parse(str));
      } catch {}
    }
  }, []);

  /* ─────────── Fetch data ─────────── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPurchases(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ─────────── Filtering Pipeline ─────────── */
  const globalFiltered = useMemo(() => {
    const s = search.toLowerCase();
    return purchases.filter((p) =>
      [
        "jobSheetNumber",
        "clientCompanyName",
        "eventName",
        "product",
        "size",
        "sourcingFrom",
        "vendorContactNumber",
      ].some((f) => (p[f] || "").toLowerCase().includes(s))
    );
  }, [purchases, search]);

  const headerFiltered = useMemo(() => {
    return globalFiltered.filter((r) =>
      Object.entries(headerFilters).every(([k, v]) => {
        if (!v) return true;
        if (k === "status") {
          if (v === "__empty__") return !r.status;
          return (r.status || "").toLowerCase() === v.toLowerCase();
        }
        const cell = r[k]
          ? k.includes("Date")
            ? new Date(r[k]).toLocaleDateString()
            : String(r[k])
          : "";
        return cell.toLowerCase().includes(v.toLowerCase());
      })
    );
  }, [globalFiltered, headerFilters]);

  const advFiltered = useMemo(() => {
    const inRange = (d, { from, to }) => {
      if (!from && !to) return true;
      if (!d) return false;
      const dt = new Date(d);
      if (from && dt < new Date(from)) return false;
      if (to && dt > new Date(to)) return false;
      return true;
    };
    return headerFiltered.filter((r) => {
      const numOK =
        (!advFilters.jobSheetNumber.from ||
          r.jobSheetNumber >= advFilters.jobSheetNumber.from) &&
        (!advFilters.jobSheetNumber.to ||
          r.jobSheetNumber <= advFilters.jobSheetNumber.to);
      return (
        numOK &&
        inRange(r.jobSheetCreatedDate, advFilters.jobSheetCreatedDate) &&
        inRange(r.deliveryDateTime, advFilters.deliveryDateTime) &&
        inRange(r.orderConfirmedDate, advFilters.orderConfirmedDate) &&
        inRange(r.expectedReceiveDate, advFilters.expectedReceiveDate) &&
        inRange(r.schedulePickUp, advFilters.schedulePickUp)
      );
    });
  }, [headerFiltered, advFilters]);

  const afterGroup = useMemo(() => {
    if (headerFilters.status === "received") return advFiltered;
    const bySheet = {};
    advFiltered.forEach((r) => {
      bySheet[r.jobSheetNumber] = bySheet[r.jobSheetNumber] || [];
      bySheet[r.jobSheetNumber].push(r);
    });
    return Object.values(bySheet).flatMap((arr) =>
      arr.every((a) => a.status === "received") ? [] : arr
    );
  }, [advFiltered, headerFilters.status]);

  const rows = useMemo(() => {
    const byKey = {};
    afterGroup.forEach((r) => {
      const key = `${r.jobSheetNumber}_${r.product}`;
      byKey[key] = byKey[key] || [];
      byKey[key].push(r);
    });
    return Object.values(byKey).flatMap((arr) => {
      const hasReal = arr.some((a) => a.size && a.size.toLowerCase() !== "n/a");
      return hasReal
        ? arr.filter((a) => a.size && a.size.toLowerCase() !== "n/a")
        : arr;
    });
  }, [afterGroup]);

  /* ─────────── Client-side sorting ─────────── */
  const sortedRows = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return rows;
    const sorted = [...rows].sort((a, b) => {
      let aVal = a[sortConfig.key] ?? "";
      let bVal = b[sortConfig.key] ?? "";
      if (sortConfig.key.includes("Date")) {
        aVal = aVal ? new Date(aVal) : new Date(0);
        bVal = bVal ? new Date(bVal) : new Date(0);
      } else if (typeof aVal === "number") {
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      if (aVal > bVal) return 1;
      if (aVal < bVal) return -1;
      return 0;
    });
    return sortConfig.direction === "desc" ? sorted.reverse() : sorted;
  }, [rows, sortConfig]);

  const sortBy = (key) => {
    setSortConfig((prev) => {
      let dir = "asc";
      if (prev.key === key && prev.direction === "asc") dir = "desc";
      else if (prev.key === key && prev.direction === "desc") dir = "";
      return { key, direction: dir };
    });
  };

  /* ─────────── Export to Excel ─────────── */
  const exportToExcel = () => {
    if (!canExport) {
      alert("You don't have permission to export purchase records.");
      return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      sortedRows.map((r) => ({
        "Job Sheet #": r.jobSheetNumber,
        "Job Sheet Date": new Date(r.jobSheetCreatedDate).toLocaleDateString(),
        Client: r.clientCompanyName,
        Event: r.eventName,
        Product: r.product,
        Size: r.size || "N/A",
        "Qty Required": r.qtyRequired,
        "Qty Ordered": r.qtyOrdered,
        "Sourced By": r.sourcedBy || "",
        "Sourced From": r.sourcingFrom,
        "Delivery Date": r.deliveryDateTime
          ? new Date(r.deliveryDateTime).toLocaleDateString()
          : "",
        "Vendor Contact": r.vendorContactNumber,
        "Order Confirmed": r.orderConfirmedDate
          ? new Date(r.orderConfirmedDate).toLocaleDateString()
          : "",
        "Expected Receive": r.expectedReceiveDate
          ? new Date(r.expectedReceiveDate).toLocaleDateString()
          : "",
        "Schedule PickUp": r.schedulePickUp
          ? new Date(r.schedulePickUp).toLocaleDateString()
          : "",
        Remarks: r.remarks,
        Status: r.status,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "OpenPurchases");
    XLSX.writeFile(wb, "open_purchases.xlsx");
  };

  if (loading)
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-purple-700 mb-4">
          Open Purchases
        </h1>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );

  return (
    <div className="p-6">
      {!perms.includes("write-purchase") && (
        <div className="mb-4 p-2 bg-red-200 text-red-800 rounded">
          You don't have permission to edit purchase records.
        </div>
      )}
      <h1 className="text-2xl font-bold text-[#Ff8045] mb-4">
        Open Purchases
      </h1>
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Global search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded flex-grow text-xs"
        />
        <button
          onClick={() => setShowFilters((f) => !f)}
          className="bg-[#Ff8045] text-white px-4 py-2 rounded text-xs"
        >
          Filters
        </button>
        {canExport && (
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded text-xs"
          >
            Export to Excel
          </button>
        )}
      </div>
      {showFilters && (
        <div className="border p-4 mb-4 bg-gray-50 rounded text-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block mb-1 font-semibold">
                Job Sheet # From
              </label>
              <input
                type="text"
                className="w-full border p-1 rounded"
                value={advFilters.jobSheetNumber.from}
                onChange={(e) =>
                  setAdvFilters((p) => ({
                    ...p,
                    jobSheetNumber: { ...p.jobSheetNumber, from: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">
                Job Sheet # To
              </label>
              <input
                type="text"
                className="w-full border p-1 rounded"
                value={advFilters.jobSheetNumber.to}
                onChange={(e) =>
                  setAdvFilters((p) => ({
                    ...p,
                    jobSheetNumber: { ...p.jobSheetNumber, to: e.target.value },
                  }))
                }
              />
            </div>
            {[
              ["jobSheetCreatedDate", "Job Sheet Created Date"],
              ["deliveryDateTime", "Delivery Date"],
              ["orderConfirmedDate", "Order Confirmed Date"],
              ["expectedReceiveDate", "Expected Receive Date"],
              ["schedulePickUp", "Schedule PickUp"],
            ].map(([k, label]) => (
              <React.Fragment key={k}>
                <div>
                  <label className="block mb-1 font-semibold">{label} From</label>
                  <input
                    type={k === "schedulePickUp" ? "datetime-local" : "date"}
                    className="w-full border p-1 rounded"
                    value={advFilters[k].from}
                    onChange={(e) =>
                      setAdvFilters((p) => ({
                        ...p,
                        [k]: { ...p[k], from: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{label} To</label>
                  <input
                    type={k === "schedulePickUp" ? "datetime-local" : "date"}
                    className="w-full border p-1 rounded"
                    value={advFilters[k].to}
                    onChange={(e) =>
                      setAdvFilters((p) => ({
                        ...p,
                        [k]: { ...p[k], to: e.target.value },
                      }))
                    }
                  />
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowFilters(false)}
              className="bg-purple-600 text-white px-3 py-1 rounded text-xs"
            >
              Apply
            </button>
            <button
              onClick={() => setAdvFilters(initAdv)}
              className="bg-gray-400 text-white px-3 py-1 rounded text-xs"
            >
              Clear
            </button>
          </div>
        </div>
      )}
      <table className="min-w-full border-collapse border border-gray-300 text-xs">
        <thead className="bg-gray-50">
          <tr>
            {[
              { key: "jobSheetCreatedDate", label: "Job Sheet Date" },
              { key: "jobSheetNumber", label: "Job Sheet #" },
              { key: "clientCompanyName", label: "Client" },
              { key: "eventName", label: "Event" },
              { key: "product", label: "Product" },
              { key: "size", label: "Size" },
              { key: "qtyRequired", label: "Qty Req'd" },
              { key: "qtyOrdered", label: "Qty Ordered" },
              { key: "sourcedBy", label: "Sourced By" },
              { key: "sourcingFrom", label: "Sourced From" },
              { key: "deliveryDateTime", label: "Delivery Date" },
              { key: "vendorContactNumber", label: "Vendor #" },
              { key: "orderConfirmedDate", label: "Order Conf." },
              { key: "expectedReceiveDate", label: "Expected Recv." },
              { key: "schedulePickUp", label: "Pick-Up" },
              { key: "remarks", label: "Remarks" },
              { key: "status", label: "Status" },
            ].map(({ key, label }) => (
              <th
                key={key}
                onClick={() => sortBy(key)}
                className="p-2 border cursor-pointer"
              >
                {label}
                {sortConfig.key === key
                  ? sortConfig.direction === "asc"
                    ? " ▲"
                    : sortConfig.direction === "desc"
                    ? " ▼"
                    : ""
                  : ""}
              </th>
            ))}
            <th className="p-2 border">Follow-Up</th>
            <th className="p-2 border">Actions</th>
          </tr>
          <HeaderFilters
            headerFilters={headerFilters}
            onFilterChange={(k, v) =>
              setHeaderFilters((p) => ({ ...p, [k]: v }))
            }
          />
        </thead>
        <tbody>
          {sortedRows.map((p) => {
            const latest = p.followUp?.length
              ? p.followUp.reduce((l, fu) =>
                  new Date(fu.updatedAt) > new Date(l.updatedAt) ? fu : l
                )
              : null;
            return (
              <tr
                key={`${p._id}_${p.product}_${p.size || ""}`}
                className={
                  p.status === "alert"
                    ? "bg-red-200"
                    : p.status === "pending"
                    ? "bg-orange-200"
                    : p.status === "received"
                    ? "bg-green-200"
                    : ""
                }
              >
                <td className="p-2 border">
                  {new Date(p.jobSheetCreatedDate).toLocaleDateString()}
                </td>
                <td className="p-2 border">
                  <button
                    className="border-b text-blue-500 hover:text-blue-700"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOpenModal(p.jobSheetNumber);
                    }}
                  >
                    {p.jobSheetNumber || "(No Number)"}
                  </button>
                </td>
                <td className="p-2 border">{p.clientCompanyName}</td>
                <td className="p-2 border">{p.eventName}</td>
                <td className="p-2 border">{p.product}</td>
                <td className="p-2 border">{p.size || "N/A"}</td>
                <td className="p-2 border">{p.qtyRequired}</td>
                <td className="p-2 border">{p.qtyOrdered}</td>
                <td className="p-2 border">{p.sourcedBy || ""}</td>
                <td className="p-2 border">{p.sourcingFrom}</td>
                <td className="p-2 border">
                  {p.deliveryDateTime
                    ? new Date(p.deliveryDateTime).toLocaleDateString()
                    : ""}
                </td>
                <td className="p-2 border">{p.vendorContactNumber}</td>
                <td className="p-2 border">
                  {p.orderConfirmedDate
                    ? new Date(p.orderConfirmedDate).toLocaleDateString()
                    : ""}
                </td>
                <td className="p-2 border">
                  {p.expectedReceiveDate
                    ? new Date(p.expectedReceiveDate).toLocaleDateString()
                    : ""}
                </td>
                <td className="p-2 border">
                  {p.schedulePickUp
                    ? new Date(p.schedulePickUp).toLocaleDateString()
                    : ""}
                </td>
                <td className="p-2 border">{p.remarks}</td>
                <td className="p-2 border">{p.status}</td>
                <td className="p-2 border">
                  {latest ? latest.note : "—"}
                </td>
                <td className="p-2 border space-y-1">
                  <button
                    disabled={!perms.includes("write-purchase") || p.status === "received"}
                    onClick={() => {
                      if (!perms.includes("write-purchase") || p.status === "received") return;
                      setCurrentEdit(p);
                      setEditModal(true);
                    }}
                    className="bg-blue-700 text-white w-full rounded py-0.5 text-[10px]"
                  >
                    Edit
                  </button>
                  <button
                    disabled={!perms.includes("write-purchase")}
                    onClick={async () => {
                      if (!perms.includes("write-purchase") || !window.confirm("Delete this purchase?"))
                        return;
                      try {
                        const token = localStorage.getItem("token");
                        await axios.delete(
                          `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${p._id}`,
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        setPurchases((prev) =>
                          prev.filter((x) => x._id !== p._id)
                        );
                      } catch {
                        alert("Error deleting.");
                      }
                    }}
                    className="bg-red-700 text-white w-full rounded py-0.5 text-[10px]"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <JobSheetGlobal
        jobSheetNumber={selectedJobSheetNumber}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
      {editModal && currentEdit && (
        <EditPurchaseModal
          purchase={currentEdit}
          onClose={() => setEditModal(false)}
          onSave={async (u) => {
            try {
              const token = localStorage.getItem("token");
              const headers = { Authorization: `Bearer ${token}` };
              let updatedPurchase;
              if (u._id && u._id.startsWith("temp_")) {
                const { _id, ...data } = u;
                const response = await axios.post(
                  `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`,
                  data,
                  { headers }
                );
                updatedPurchase = response.data.purchase;
              } else {
                const response = await axios.put(
                  `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${u._id}`,
                  u,
                  { headers }
                );
                updatedPurchase = response.data.purchase;
              }
              setPurchases((prev) =>
                prev.map((x) => (x._id === u._id ? updatedPurchase : x))
              );
            } catch (error) {
              console.error("Error saving purchase:", error);
              const message = error.response?.data?.message || "Error saving purchase";
              alert(message);
            } finally {
              setEditModal(false);
            }
          }}
        />
      )}
      {viewFuModal && viewFuId && (
        <FollowUpModal
          followUps={purchases.find((x) => x._id === viewFuId)?.followUp || []}
          onUpdate={(f) =>
            setPurchases((prev) =>
              prev.map((x) => (x._id === viewFuId ? { ...x, followUp: f } : x))
            )
          }
          onClose={() => setViewFuModal(false)}
        />
      )}
    </div>
  );
}