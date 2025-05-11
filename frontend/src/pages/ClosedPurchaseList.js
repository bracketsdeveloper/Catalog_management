// pages/ClosedPurchases.js
"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import JobSheetGlobal from "../components/jobsheet/globalJobsheet";

/* ─────────── Header Filters ─────────── */
function HeaderFilters({ filters, onChange, statusOptions }) {
  const cols = [
    "jobSheetCreatedDate",
    "deliveryDateTime",
    "jobSheetNumber",
    "clientCompanyName",
    "eventName",
    "product",
    "qtyRequired",
    "qtyOrdered",
    "sourcedBy",
    "sourcingFrom",
    "vendorContactNumber",
    "orderConfirmedDate",
    "expectedReceiveDate",
    "schedulePickUp",
    "remarks",
    "status",
  ];
  return (
    <tr className="bg-gray-100">
      {cols.map((c) => (
        <th key={c} className="p-1 border">
          {c === "status" ? (
            <select
              className="w-full p-1 text-xs border rounded"
              value={filters[c] || ""}
              onChange={(e) => onChange(c, e.target.value)}
            >
              <option value="">All Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="w-full p-1 text-xs border rounded"
              placeholder={`Filter ${c}`}
              value={filters[c] || ""}
              onChange={(e) => onChange(c, e.target.value)}
            />
          )}
        </th>
      ))}
    </tr>
  );
}

/* ─────────── Date helpers ─────────── */
const initRange = { from: "", to: "" };
const initAdv = {
  jobSheetNumber: { ...initRange },
  jobSheetCreatedDate: { ...initRange },
  deliveryDateTime: { ...initRange },
  orderConfirmedDate: { ...initRange },
  expectedReceiveDate: { ...initRange },
  schedulePickUp: { ...initRange },
};

/* ─────────── Main ─────────── */
export default function ClosedPurchases() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [headerFilters, setHeaderFilters] = useState({});
  const [advFilters, setAdvFilters] = useState(initAdv);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState({
    key: "schedulePickUp",
    direction: "asc",
    type: "date",
  });

  // Define available status options
  const statusOptions = ["Pending", "received"];

  // calling jobsheet global

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

  /* -------- fetch closed purchases -------- */
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRows(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isDate = (k) =>
    k.includes("Date") || k === "schedulePickUp" || k === "deliveryDateTime";

  const cmp = (a, b, type) =>
    type === "number"
      ? (a ?? 0) - (b ?? 0)
      : type === "date"
      ? new Date(a || 0) - new Date(b || 0)
      : String(a ?? "").localeCompare(String(b ?? ""), "en", {
          sensitivity: "base",
        });

  /* -------- global search -------- */
  const globalFiltered = useMemo(() => {
    const s = search.toLowerCase();
    return rows.filter((p) =>
      [
        "jobSheetNumber",
        "clientCompanyName",
        "eventName",
        "product",
        "sourcedBy",
        "sourcingFrom",
        "vendorContactNumber",
      ].some((f) => (p[f] || "").toLowerCase().includes(s))
    );
  }, [rows, search]);

  /* -------- header filters -------- */
  const headerFiltered = useMemo(
    () =>
      globalFiltered.filter((r) =>
        Object.entries(headerFilters).every(([k, v]) => {
          if (!v) return true;
          let val = r[k] ?? "";
          if (isDate(k) && val) val = new Date(val).toLocaleDateString();
          return String(val).toLowerCase().includes(v.toLowerCase());
        })
      ),
    [globalFiltered, headerFilters]
  );

  /* -------- advanced filters -------- */
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

  /* -------- sort -------- */
  const sorted = useMemo(
    () =>
      [...advFiltered].sort((a, b) => {
        const res = cmp(a[sort.key], b[sort.key], sort.type);
        return sort.direction === "asc" ? res : -res;
      }),
    [advFiltered, sort]
  );

  /* -------- handlers -------- */
  const changeHeader = (k, v) =>
    setHeaderFilters((p) => ({ ...p, [k]: v }));
  const changeAdv = (f, k, v) =>
    setAdvFilters((p) => ({ ...p, [f]: { ...p[f], [k]: v } }));
  const sortBy = (k, type = "string") =>
    setSort((p) => ({
      key: k,
      direction: p.key === k && p.direction === "asc" ? "desc" : "asc",
      type,
    }));

  /* -------- export -------- */
  const exportToExcel = () => {
    const data = sorted.map((r) => ({
      "Job Sheet Created": r.jobSheetCreatedDate
        ? new Date(r.jobSheetCreatedDate).toLocaleDateString()
        : "",
      "Delivery Date": r.deliveryDateTime
        ? new Date(r.deliveryDateTime).toLocaleDateString()
        : "",
      "Job Sheet #": r.jobSheetNumber,
      Client: r.clientCompanyName,
      Event: r.eventName,
      Product: r.product,
      "Qty Required": r.qtyRequired,
      "Qty Ordered": r.qtyOrdered,
      "Sourced By": r.sourcedBy,
      "Sourced From": r.sourcingFrom,
      "Vendor Contact": r.vendorContactNumber,
      "Order Confirmed": r.orderConfirmedDate
        ? r.orderConfirmedDate.substring(0, 10)
        : "",
      "Expected Receive": r.expectedReceiveDate
        ? r.expectedReceiveDate.substring(0, 10)
        : "",
      "Schedule Pick Up": r.schedulePickUp
        ? r.schedulePickUp.substring(0, 16)
        : "",
      Remarks: r.remarks,
      Status: r.status,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Closed");
    XLSX.writeFile(wb, "Closed_Purchases.xlsx");
  };

  /* -------- skeleton -------- */
  if (loading)
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-purple-700 mb-4">
          Closed Purchases
        </h1>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );

  /* -------- UI -------- */
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#Ff8045] mb-4">
        Closed Purchases
      </h1>

      {/* toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
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

      {/* advanced filters */}
      {showFilters && (
        <div className="border border-purple-200 rounded-lg p-4 mb-4 text-xs bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">
                Job Sheet # From
              </label>
              <input
                type="text"
                className="w-full border p-1 rounded"
                value={advFilters.jobSheetNumber.from}
                onChange={(e) =>
                  changeAdv("jobSheetNumber", "from", e.target.value.trim())
                }
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Job Sheet # To</label>
              <input
                type="text"
                className="w-full border p-1 rounded"
                value={advFilters.jobSheetNumber.to}
                onChange={(e) =>
                  changeAdv("jobSheetNumber", "to", e.target.value.trim())
                }
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
                  <label className="block font-semibold mb-1">
                    {label} From
                  </label>
                  <input
                    type={k === "schedulePickUp" ? "datetime-local" : "date"}
                    className="w-full border p-1 rounded"
                    value={advFilters[k].from}
                    onChange={(e) => changeAdv(k, "from", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    {label} To
                  </label>
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

      {/* table */}
      <table className="min-w-full border-collapse border border-gray-300 text-xs">
        <thead className="bg-gray-50">
          <tr>
            {[
              ["jobSheetCreatedDate", "Job Sheet Created Date", "date"],
              ["deliveryDateTime", "Delivery Date", "date"],
              ["jobSheetNumber", "Job Sheet #", "string"],
              ["clientCompanyName", "Client Company Name", "string"],
              ["eventName", "Event Name", "string"],
              ["product", "Product", "string"],
              ["qtyRequired", "Qty Required", "number"],
              ["qtyOrdered", "Qty Ordered", "number"],
              ["sourcedBy", "Sourced By", "string"],
              ["sourcingFrom", "Sourced From", "string"],
              ["vendorContactNumber", "Vendor Contact", "string"],
              ["orderConfirmedDate", "Order Confirmed Date", "date"],
              ["expectedReceiveDate", "Expected Receive Date", "date"],
              ["schedulePickUp", "Schedule Pick Up", "date"],
              ["remarks", "Remarks", "string"],
              ["status", "Status", "string"],
            ].map(([k, l, t]) => (
              <th
                key={k}
                onClick={() => sortBy(k, t)}
                className="p-2 border cursor-pointer"
              >
                {l}{" "}
                {sort.key === k ? (sort.direction === "asc" ? "↑" : "↓") : ""}
              </th>
            ))}
          </tr>
          <HeaderFilters
            filters={headerFilters}
            onChange={changeHeader}
            statusOptions={statusOptions}
          />
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr
              key={p._id}
              className="bg-green-300"
            >
              <td className="p-2 border">
                {new Date(p.jobSheetCreatedDate).toLocaleDateString()}
              </td>
              <td className="p-2 border">
                {p.deliveryDateTime
                  ? new Date(p.deliveryDateTime).toLocaleDateString()
                  : ""}
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
              <td className="p-2 border">{p.qtyRequired}</td>
              <td className="p-2 border">{p.qtyOrdered}</td>
              <td className="p-2 border">{p.sourcedBy}</td>
              <td className="p-2 border">{p.sourcingFrom}</td>
              <td className="p-2 border">{p.vendorContactNumber}</td>
              <td className="p-2 border">
                {p.orderConfirmedDate
                  ? p.orderConfirmedDate.substring(0, 10)
                  : ""}
              </td>
              <td className="p-2 border">
                {p.expectedReceiveDate
                  ? p.expectedReceiveDate.substring(0, 10)
                  : ""}
              </td>
              <td className="p-2 border">
                {p.schedulePickUp
                  ? p.schedulePickUp.substring(0, 16)
                  : ""}
              </td>
              <td className="p-2 border">{p.remarks}</td>
              <td className="p-2 border">{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

       
                <JobSheetGlobal
                  jobSheetNumber={selectedJobSheetNumber} 
                  isOpen={isModalOpen}
                  onClose={handleCloseModal}
                />
              
    </div>
  );
}
