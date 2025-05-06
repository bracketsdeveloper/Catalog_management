// pages/OpenPurchases.js
"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { TrashIcon } from '@heroicons/react/24/solid'; // or `/outline` for outlined style
import * as XLSX from "xlsx";
import JobSheetGlobal from "../components/jobsheet/globalJobsheet";


/* ───────────────── Header Filters ───────────────── */
function HeaderFilters({ headerFilters, onFilterChange }) {
  const columns = [
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
    "followUp",
    "remarks",
    "status",
  ];

  return (
    <tr className="bg-gray-100">
      
  {columns.map((c) => (
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
      {/* {columns.map((c) => (
        <th key={c} className="p-1 border border-gray-300">
          {c === "status" ? (
            <select
              className="w-full p-1 text-xs border rounded"
              value={headerFilters[c] || ""}
              onChange={(e) => onFilterChange(c, e.target.value)}
            >
              <option value="">All</option>
              <option value="received">Received</option>
              <option value="pending">Pending</option>
              <option value="alert">Alert</option>
            </select>
          ) : (
            <input
              type="text"
              className="w-full p-1 text-xs border rounded"
              placeholder={`Filter ${c}`}
              value={headerFilters[c] || ""}
              onChange={(e) => onFilterChange(c, e.target.value)}
            />
          )}
        </th>
      ))} */}
      <th className="p-1 border border-gray-300" colSpan={2}></th>
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
          <button onClick={close} className="text-2xl">
            &times;
          </button>
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
                  <button
                    onClick={() => markDone(i)}
                    className="bg-green-600 text-white px-2 rounded"
                  >
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
    if (data.status === "received" && !window.confirm("Marked RECEIVED. Save changes?")) return;
    onSave(data);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white p-6 rounded w-full max-w-3xl text-xs">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-purple-700">Edit Open Purchase</h2>
            <button onClick={onClose} className="text-2xl">
              &times;
            </button>
          </div>

          <form className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-bold">Job Sheet Number:</label> {data.jobSheetNumber}
              </div>
              <div>
                <label className="font-bold">Job Sheet Date:</label>{" "}
                {new Date(data.jobSheetCreatedDate).toLocaleDateString()}
              </div>
              <div>
                <label className="font-bold">Client Company Name:</label> {data.clientCompanyName}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-bold">Event Name:</label> {data.eventName}
              </div>
              <div>
                <label className="font-bold">Product:</label> {data.product}
              </div>
              <div>
                <label className="font-bold">Size:</label> {data.size || "N/A"}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-bold">Sourced From:</label> {data.sourcingFrom}
              </div>
              <div>
                <label className="font-bold">Delivery Date:</label>{" "}
                {data.deliveryDateTime ? new Date(data.deliveryDateTime).toLocaleDateString() : "N/A"}
              </div>
              <div>
                <label className="font-bold">Qty Required:</label> {data.qtyRequired}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold">Qty Ordered:</label>
                <input
                  type="number"
                  className="w-full border p-1"
                  value={data.qtyOrdered || ""}
                  onChange={(e) => change("qtyOrdered", parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="font-bold">Vendor Contact Number:</label>
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
                <label className="font-bold">Order Confirmed Date:</label>
                <input
                  type="date"
                  className="w-full border p-1"
                  value={data.orderConfirmedDate?.substring(0, 10) || ""}
                  onChange={(e) => change("orderConfirmedDate", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-bold">Expected Receive Date:</label>
                <input
                  type="date"
                  className="w-full border p-1"
                  value={data.expectedReceiveDate?.substring(0, 10) || ""}
                  onChange={(e) => change("expectedReceiveDate", e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold">Schedule Pick Up:</label>
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
                  value={data.status}
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
const initDateRange = { from: "", to: "" };
const initAdv = {
  jobSheetNumber: { from: "", to: "" },
  jobSheetCreatedDate: { ...initDateRange },
  deliveryDateTime: { ...initDateRange },
  orderConfirmedDate: { ...initDateRange },
  expectedReceiveDate: { ...initDateRange },
  schedulePickUp: { ...initDateRange },
};

export default function OpenPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [currentEdit, setCurrentEdit] = useState(null);
  const [viewFuModal, setViewFuModal] = useState(false);
  const [viewFuId, setViewFuId] = useState(null);
  const [search, setSearch] = useState("");
  const [headerFilters, setHeaderFilters] = useState({});
  const [advFilters, setAdvFilters] = useState(initAdv);
  const [showFilters, setShowFilters] = useState(false);
//  const [sort, setSort] = useState({
//   key: "jobSheetCreatedDate", // Default column to sort by
//   direction: "asc", // Default direction (ascending)
// });

const [sort, setSort] = useState({ key: "", direction: "asc" });
  const [perms, setPerms] = useState([]);
  const canEdit = perms.includes("write-purchase");

const [selectedJobSheetNumber, setSelectedJobSheetNumber] = useState(null);
const [isModalOpen, setIsModalOpen] = useState(false);


const handleOpenModal = (jobSheetNumber) => {
  setSelectedJobSheetNumber(jobSheetNumber);
  setIsModalOpen(true);
};

const handleCloseModal = () => {
  setIsModalOpen(false);
  setSelectedJobSheetNumber(null);
};

  

  useEffect(() => {
    const str = localStorage.getItem("permissions");
    if (str)
      try {
        setPerms(JSON.parse(str));
      } catch {}
  }, []);


  //sorceby logic
const handleSourcedByChange = async (e, id) => {
  const selectedSourcedBy = e.target.value;
  
  const token = localStorage.getItem('token'); // Or sessionStorage, wherever you saved after login

  try {
    await axios.put(
      `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${id}`,
      { sourcedBy: selectedSourcedBy },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setPurchases((prevPurchases) =>
      prevPurchases.map((purchase) =>
        purchase._id === id
          ? { ...purchase, sourcedBy: selectedSourcedBy }
          : purchase
      )
    );

    alert("Successfully updated sourcedBy!");
  } catch (error) {
    console.error("Error updating sourcedBy:", error);
    alert("Failed to update sourcedBy!");
  }
};

const handleSourcedByDelete = async (id) => {
  const token = localStorage.getItem("token");

  try {
    await axios.put(
           `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${id}`,
      { sourcedBy: "" }, // Clear the sourcedBy field
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setPurchases((prevPurchases) =>
      prevPurchases.map((purchase) =>
        purchase._id === id ? { ...purchase, sourcedBy: "" } : purchase
      )
    );

    alert("Successfully deleted sourcedBy!");
  } catch (error) {
    console.error("Error deleting sourcedBy:", error);
    alert("Failed to delete sourcedBy");
  }
};



  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const url = `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases?sortKey=${sort.key}&sortDirection=${sort.direction}`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setPurchases(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchPurchases();
  }, [sort]);

  const globalFiltered = useMemo(() => {
    const s = search.toLowerCase();
    return purchases.filter((p) =>
      ["jobSheetNumber", "clientCompanyName", "eventName", "product", "size", "sourcingFrom", "vendorContactNumber"].some(
        (f) => (p[f] || "").toLowerCase().includes(s)
      )
    );
  }, [purchases, search]);

  const headerFiltered = useMemo(() => {
    const keys = [
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
      "followUp",
      "remarks",
      "status",
    ];
    
    return globalFiltered.filter((r) =>
      keys.every((k) => {
        if (!headerFilters[k]) return true;
        let v = "";
        if (r[k]) {
          v =
            k.includes("Date") || k === "schedulePickUp" || k === "deliveryDateTime"
              ? new Date(r[k]).toLocaleDateString()
              : String(r[k]);
        }
        return v.toLowerCase().includes(headerFilters[k].toLowerCase());
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
        (!advFilters.jobSheetNumber.from || r.jobSheetNumber >= advFilters.jobSheetNumber.from) &&
        (!advFilters.jobSheetNumber.to || r.jobSheetNumber <= advFilters.jobSheetNumber.to);
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

  const groupFilter = (recs) => {
    const g = {};
    recs.forEach((r) => (g[r.jobSheetNumber] = g[r.jobSheetNumber] || []).push(r));
    return Object.values(g).flatMap((arr) =>
      arr.every((a) => a.status === "received") ? [] : arr
    );
  };

  const filterNA = (recs) => {
    const g = {};
    recs.forEach(
      (r) =>
        (g[`${r.jobSheetNumber}_${r.product}`] = g[`${r.jobSheetNumber}_${r.product}`] || []).push(r)
    );
    return Object.values(g).flatMap((arr) => {
      const hasReal = arr.some((a) => a.size && a.size.toLowerCase() !== "n/a");
      return hasReal ? arr.filter((a) => a.size && a.size.toLowerCase() !== "n/a") : arr;
    });
  };

  const rows = filterNA(groupFilter(advFiltered));

  const changeHeaderFilter = (k, v) => setHeaderFilters((p) => ({ ...p, [k]: v }));
  const changeAdv = (f, k, v) => setAdvFilters((p) => ({ ...p, [f]: { ...p[f], [k]: v } }));

  const sortBy = (k) =>
    setSort((p) => ({ key: k, direction: p.key === k && p.direction === "asc" ? "desc" : "asc" }));


  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        "Job Sheet #": r.jobSheetNumber,
        "Job Sheet Date": new Date(r.jobSheetCreatedDate).toLocaleDateString(),
        Client: r.clientCompanyName,
        Event: r.eventName,
        Product: r.product,
        Size: r.size || "N/A",
        "Qty Required": r.qtyRequired,
        "Qty Ordered": r.qtyOrdered,
        "Sourced By": r.sourcedBy || "N/A",
        "Sourced From": r.sourcingFrom,
        "Delivery Date": r.deliveryDateTime ? new Date(r.deliveryDateTime).toLocaleDateString() : "",
        "Vendor Contact": r.vendorContactNumber,
        "Order Confirmed": r.orderConfirmedDate ? new Date(r.orderConfirmedDate).toLocaleDateString() : "",
        "Expected Receive": r.expectedReceiveDate ? new Date(r.expectedReceiveDate).toLocaleDateString() : "",
        "Schedule PickUp": r.schedulePickUp ? new Date(r.schedulePickUp).toLocaleString() : "",
        Status: r.status,
        Remarks: r.remarks,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "OpenPurchases");
    XLSX.writeFile(wb, "open_purchases.xlsx");
  };

  if (loading)
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-purple-700 mb-4">Open Purchases</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );

  return (
    <div className="p-6">
      {!canEdit && (
        <div className="mb-4 p-2 bg-red-200 text-red-800 border border-red-400 rounded">
          You don't have permission to edit purchase records.
        </div>
      )}

      <h1 className="text-2xl font-bold text-[#Ff8045] mb-4">Open Purchases</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          className="border p-2 rounded flex-grow md:flex-none md:w-1/3"
          placeholder="Global search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={() => setShowFilters((p) => !p)}
          className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white text-xs px-4 py-2 rounded"
        >
          Filters
        </button>
        <button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded"
        >
          Export to Excel
        </button>
      </div>

      {showFilters && (
        <div className="border border-purple-200 rounded-lg p-4 mb-4 text-xs bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 font-semibold">Job Sheet # From</label>
              <input
                type="text"
                className="w-full border p-1 rounded"
                value={advFilters.jobSheetNumber.from}
                onChange={(e) => changeAdv("jobSheetNumber", "from", e.target.value.trim())}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Job Sheet # To</label>
              <input
                type="text"
                className="w-full border p-1 rounded"
                value={advFilters.jobSheetNumber.to}
                onChange={(e) => changeAdv("jobSheetNumber", "to", e.target.value.trim())}
              />
            </div>

            {[
              ["jobSheetCreatedDate", "Job Sheet Created"],
              ["deliveryDateTime", "Delivery Date"],
              ["orderConfirmedDate", "Order Confirmed"],
              ["expectedReceiveDate", "Expected Receive"],
              ["schedulePickUp", "Schedule Pick-Up"],
            ].map(([k, label]) => (
              <React.Fragment key={k}>
                <div>
                  <label className="block mb-1 font-semibold">{label} From</label>
                  <input
                    type={k === "schedulePickUp" ? "datetime-local" : "date"}
                    className="w-full border p-1 rounded"
                    value={advFilters[k].from}
                    onChange={(e) => changeAdv(k, "from", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">{label} To</label>
                  <input
                    type={k === "schedulePickUp" ? "datetime-local" : "date"}
                    className="w-full border p-1 rounded"
                    value={advFilters[k].to}
                    onChange={(e) => changeAdv(k, "to", e.target.value)}
                  />
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowFilters(false)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
            >
              Apply
            </button>
            <button
              onClick={() => setAdvFilters(initAdv)}
              className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded"
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
              { k: "jobSheetCreatedDate", l: "Job Sheet Created Date" },
              { k: "jobSheetNumber", l: "Job Sheet Number" },
              { k: "clientCompanyName", l: "Client Company Name" },
              { k: "eventName", l: "Event Name" },
              { k: "product", l: "Product" },
              { k: "size", l: "Size" },
              { k: "qtyRequired", l: "Qty Required" },
              { k: "qtyOrdered", l: "Qty Ordered" },
              { k: "sourcedBy", l: "Sourced By" },
              { k: "sourcingFrom", l: "Sourced From" },
              { k: "deliveryDateTime", l: "Delivery Date" },
              { k: "vendorContactNumber", l: "Vendor Contact Number" },
              { k: "orderConfirmedDate", l: "Order Confirmed Date" },
              { k: "expectedReceiveDate", l: "Expected Receive Date" },
              { k: "schedulePickUp", l: "Schedule Pick Up" }
            ].map(({ k, l }) => (
          
             <th
                key={k}
                onClick={() => sortBy(k)}
                className="p-2 border cursor-pointer"
              >
                {l} {sort.key === k ? (sort.direction === "asc" ? "↑" : "↓") : ""}
              </th>
            ))}
            <th className="p-2 border">Follow Up</th>
            <th onClick={() => sortBy("remarks")} className="p-2 border cursor-pointer">
              Remarks {sort.key === "remarks" ? (sort.direction === "asc" ? "↑" : "↓") : ""}
            </th>
            <th onClick={() => sortBy("status")} className="p-2 border cursor-pointer">
                Status {sort.key === "status" ? (sort.direction === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="p-2 border">Actions</th>
          </tr>
          <HeaderFilters headerFilters={headerFilters} onFilterChange={changeHeaderFilter} />
        </thead>
        <tbody>

          {rows.map((p) => {
            const latest =
              p.followUp?.length
                ? p.followUp.reduce((l, fu) =>
                    new Date(fu.updatedAt) > new Date(l.updatedAt) ? fu : l
                  )
                : null;
              console.log("Status:", p.status);
            return (
              
              <tr
                key={p._id || `${p.jobSheetNumber}_${p.product}_${p.size || ""}`}
                className={
                   p.status?.trim().toLowerCase() === "alert"
                      ? "bg-red-300"
                      : p.status?.trim().toLowerCase() === "pending"
                      ? "bg-orange-300"
                      : p.status?.trim().toLowerCase() === "received"
                      ? "bg-green-300"
                      : ""
                }
              >

            <td className="p-2 border">
                {new Date(p.jobSheetCreatedDate).toLocaleDateString()}
                </td>
                <td  className="p-2 border">
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
                 <td className="p-2 border">
                    {p.sourcedBy ? (
                      <div className="flex justify-between">
                       <div>
                      <span className="text-sm font-medium text-gray-700">{p.sourcedBy}</span>
                        </div>
                        <div>
                       <button
                        onClick={() => handleSourcedByDelete(p._id)}
                        className="text-red-600 text-sm underline"
                      >
                        <TrashIcon className="h-4 w-4" />
                        </button>
                        </div>
                    </div>
                    ) : (
                      <select
                        name="sourcedBy"
                        value={p.sourcedBy}
                        onChange={(e) => handleSourcedByChange(e, p._id)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="">Select</option>
                        <option value="Mohan">Mohan</option>
                        <option value="Neeraj">Neeraj</option>
                        <option value="Sathya">Sathya</option>
                        <option value="Vijaylakshmi">Vijaylakshmi</option>
                      </select>
                    )}
                  </td>

                <td className="p-2 border">{p.sourcingFrom}</td>
                <td className="p-2 border">
                  {p.deliveryDateTime ? new Date(p.deliveryDateTime).toLocaleDateString() : ""}
                </td>
                <td className="p-2 border">{p.vendorContactNumber}</td>
                <td className="p-2 border">
                  {p.orderConfirmedDate ? new Date(p.orderConfirmedDate).toLocaleDateString() : ""}
                </td>
                <td className="p-2 border">
                  {p.expectedReceiveDate ? new Date(p.expectedReceiveDate).toLocaleDateString() : ""}
                </td>
                <td className="p-2 border">
                  {p.schedulePickUp ? new Date(p.schedulePickUp).toLocaleString() : ""}
                </td>
                <td className="p-2 border">
                  {latest ? (
                    <button
                      className="text-blue-600 underline"
                      onClick={() => {
                        setViewFuId(p._id);
                        setViewFuModal(true);
                      }}
                    >
                      {latest.note} ({latest.followUpDate}
                      {latest.done ? ", Done" : ""})
                    </button>
                  ) : (
                    "No follow-ups"
                  )}
                </td>
                <td className="p-2 border">{p.remarks}</td>
                
                <td className="p-2 border">{p.status}</td>
                <td className="p-2 border space-y-1">
                  <button 
                    className="bg-blue-700 text-white w-full rounded py-0.5 text-[10px]"
                    disabled={!canEdit || p.status === "received"}
                    onClick={() => {
                      if (!canEdit || p.status === "received") return;
                      setCurrentEdit(p);
                      setEditModal(true);
                    }}
                  >
                    Edit
                  </button>
                  {!p.isTemporary && !(p._id || "").startsWith("temp_") && (
                    <button
                      className="bg-red-700 text-white w-full rounded py-0.5 text-[10px]"
                      disabled={!canEdit}
                      onClick={async () => {
                        if (!canEdit || !window.confirm("Delete this purchase?")) return;
                        try {
                          const token = localStorage.getItem("token");
                          await axios.delete(
                            `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${p._id}`,
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          setPurchases((prev) => prev.filter((x) => x._id !== p._id));
                          alert("Deleted.");
                        } catch (err) {
                          console.error(err);
                          alert("Error deleting.");
                        }
                      }}
                    >
                      Delete
                    </button>
                  )}
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
              if (u._id && !u._id.startsWith("temp_")) {
                await axios.put(
                  `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${u._id}`,
                  u,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
              } else {
                await axios.post(
                  `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`,
                  { ...u, _id: undefined },
                  { headers: { Authorization: `Bearer ${token}` } }
                );
              }
              await fetchPurchases();
              setEditModal(false);
            } catch (err) {
              console.error(err);
              alert("Error saving.");
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
          onClose={() => {
            setViewFuModal(false);
            setViewFuId(null);
          }}
        />
      )}
    </div>
  );
}
