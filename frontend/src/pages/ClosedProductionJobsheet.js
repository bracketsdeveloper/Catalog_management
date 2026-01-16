// src/pages/ClosedProductionJobsheet.js
"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import ClosedProductionJobSheetTable from "../components/productionjobsheet/ClosedProductionJobSheetTable";

/* ───────────────────── helpers ───────────────────── */
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const token = localStorage.getItem("token");

const dateKeys = [
  "jobSheetCreatedDate",
  "deliveryDateTime",
  "expectedReceiveDate",
  "expectedPostBranding",
  "schedulePickUp",
];
const toDate = (d) => (d ? new Date(d) : new Date(0));
const cmp = (a, b, t) =>
  t === "date"
    ? toDate(a) - toDate(b)
    : String(a ?? "").localeCompare(String(b ?? ""), "en", {
        sensitivity: "base",
      });

/* ─────────── initial adv-filter shape ─────── */
const initRange = { from: "", to: "" };
const initAdv = {
  jobSheetNumber: { ...initRange },
  jobSheetCreatedDate: { ...initRange },
  deliveryDateTime: { ...initRange },
  expectedReceiveDate: { ...initRange },
  schedulePickUp: { ...initRange },
};

export default function ClosedProductionJobsheet() {
  /* --------------- state --------------- */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [headerFilters, setHeader] = useState({});
  const [advFilters, setAdv] = useState(initAdv);
  const [showFilters, setShowFilters] = useState(false);

  const [sort, setSort] = useState({
    key: "jobSheetCreatedDate",
    direction: "asc",
    type: "date",
  });

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Add this state for modal handling
  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  /* --------------- fetch --------------- */
  const fetchRows = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/productionjobsheets/aggregated`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRows(res.data.filter((r) => (r.status || "").toLowerCase() === "received"));
    } catch (e) {
      console.error("Fetch closed prod-jobsheets failed:", e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchRows();
  }, []);

  useEffect(() => {
    try {
      setIsSuperAdmin(localStorage.getItem("isSuperAdmin") === "true");
    } catch {}
  }, []);

  /* --------------- filtering pipeline --------------- */
  const global = useMemo(
    () =>
      rows.filter((r) =>
        JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  // FIXED: Header filters with proper date handling
  const headered = useMemo(
    () =>
      global.filter((r) =>
        Object.entries(headerFilters).every(([k, v]) => {
          if (!v) return true;
          
          // Special handling for status
          if (k === "status") {
            return (r[k] || "").toLowerCase() === v.toLowerCase();
          }
          
          let val = r[k] ?? "";
          
          // Handle date fields with native date inputs
          if (dateKeys.includes(k) && val && v) {
            try {
              const rowDate = new Date(val);
              const filterDate = new Date(v);
              
              if (isNaN(rowDate.getTime()) || isNaN(filterDate.getTime())) {
                // If date parsing fails, fall back to string search
                return String(val).toLowerCase().includes(v.toLowerCase());
              }
              
              // For date type (without time) - compare dates only
              if (k !== "schedulePickUp") {
                const rowDateStr = rowDate.toISOString().split('T')[0];
                const filterDateStr = filterDate.toISOString().split('T')[0];
                return rowDateStr === filterDateStr;
              }
              // For datetime type - compare full date-time
              return rowDate.toISOString().slice(0, 16) === filterDate.toISOString().slice(0, 16);
            } catch {
              // Fallback to string search if date parsing fails
              return String(val).toLowerCase().includes(v.toLowerCase());
            }
          }
          
          // Handle number fields
          if (["qtyRequired", "qtyOrdered"].includes(k)) {
            return String(val).includes(v);
          }
          
          // Handle text fields (case-insensitive partial match)
          return String(val).toLowerCase().includes(v.toLowerCase());
        })
      ),
    [global, headerFilters]
  );

  const adv = useMemo(() => {
    const inRange = (d, { from, to }) => {
      if (!from && !to) return true;
      if (!d) return false;
      const dt = new Date(d);
      if (from && dt < new Date(from)) return false;
      if (to && dt > new Date(to)) return false;
      return true;
    };
    return headered.filter(
      (r) =>
        (!advFilters.jobSheetNumber.from ||
          r.jobSheetNumber >= advFilters.jobSheetNumber.from) &&
        (!advFilters.jobSheetNumber.to ||
          r.jobSheetNumber <= advFilters.jobSheetNumber.to) &&
        inRange(r.jobSheetCreatedDate, advFilters.jobSheetCreatedDate) &&
        inRange(r.deliveryDateTime, advFilters.deliveryDateTime) &&
        inRange(r.expectedReceiveDate, advFilters.expectedReceiveDate) &&
        inRange(r.schedulePickUp, advFilters.schedulePickUp)
    );
  }, [headered, advFilters]);

  const sorted = useMemo(
    () =>
      [...adv].sort(
        (a, b) => cmp(a[sort.key], b[sort.key], sort.type) * (sort.direction === "asc" ? 1 : -1)
      ),
    [adv, sort]
  );

  /* --------------- handlers --------------- */
  const setHeaderFilter = (k, v) => setHeader((p) => ({ ...p, [k]: v }));
  const setAdvFilter = (f, k, v) => setAdv((p) => ({ ...p, [f]: { ...p[f], [k]: v } }));
  const sortBy = (k, t = "string") =>
    setSort((p) => ({
      key: k,
      type: t,
      direction: p.key === k && p.direction === "asc" ? "desc" : "asc",
    }));

  // Add this handler function
  const handleActionClick = (record) => {
    setCurrent(record);
    setModalOpen(true);
  };

  /* --------------- export --------------- */
  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    const sheet = sorted.map((r) => ({
      "Order Date": r.jobSheetCreatedDate
        ? new Date(r.jobSheetCreatedDate).toLocaleDateString()
        : "",
      "Job Sheet": r.jobSheetNumber,
      "Delivery Date": r.deliveryDateTime
        ? new Date(r.deliveryDateTime).toLocaleDateString()
        : "",
      Client: r.clientCompanyName,
      Event: r.eventName,
      Product: r.product,
      "Qty Req": r.qtyRequired,
      "Qty Ord": r.qtyOrdered,
      "Expected In-Hand": r.expectedReceiveDate
        ? new Date(r.expectedReceiveDate).toLocaleDateString()
        : "",
      "Branding Type": r.brandingType,
      "Branding Vendor": r.brandingVendor,
      "Expected Post Brand": r.expectedPostBranding,
      "Schedule Pick-Up": r.schedulePickUp
        ? new Date(r.schedulePickUp).toLocaleString()
        : "",
      Remarks: r.remarks,
      Status: r.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), "Closed");
    XLSX.writeFile(wb, "ClosedProductionJobSheets.xlsx");
  };

  /* --------------- UI --------------- */
  return (
    <div className="p-4">
      <h1 className="text-2xl text-purple-700 font-bold mb-4">
        Closed Production Job Sheet
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
          className="bg-purple-600 text-white text-xs px-4 py-2 rounded"
        >
          Filters
        </button>
        {isSuperAdmin && (
          <button
            onClick={exportXlsx}
            className="bg-green-600 text-white text-xs px-4 py-2 rounded"
          >
            Export&nbsp;to&nbsp;Excel
          </button>
        )}
      </div>

      {showFilters && (
        <div className="border border-purple-200 rounded-lg p-4 mb-4 text-xs bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["from", "to"].map((k) => (
              <div key={`js-${k}`}>
                <label className="block font-semibold mb-1">
                  Job Sheet #{k === "from" ? "From" : "To"}
                </label>
                <input
                  type="text"
                  className="w-full border p-1 rounded"
                  value={advFilters.jobSheetNumber[k]}
                  onChange={(e) => setAdvFilter("jobSheetNumber", k, e.target.value.trim())}
                />
              </div>
            ))}

            {[
              ["jobSheetCreatedDate", "Order Date"],
              ["deliveryDateTime", "Delivery Date"],
              ["expectedReceiveDate", "Expected Receive"],
              ["schedulePickUp", "Schedule Pick-Up"],
            ].flatMap(([key, label]) => [
              <div key={`${key}-from`}>
                <label className="block font-semibold mb-1">{label} From</label>
                <input
                  type={key === "schedulePickUp" ? "datetime-local" : "date"}
                  className="w-full border p-1 rounded"
                  value={advFilters[key].from}
                  onChange={(e) => setAdvFilter(key, "from", e.target.value)}
                />
              </div>,
              <div key={`${key}-to`}>
                <label className="block font-semibold mb-1">{label} To</label>
                <input
                  type={key === "schedulePickUp" ? "datetime-local" : "date"}
                  className="w-full border p-1 rounded"
                  value={advFilters[key].to}
                  onChange={(e) => setAdvFilter(key, "to", e.target.value)}
                />
              </div>,
            ])}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowFilters(false)}
              className="bg-purple-600 text-white px-3 py-1 rounded"
            >
              Apply
            </button>
            <button
              onClick={() => setAdv(initAdv)}
              className="bg-gray-400 text-white px-3 py-1 rounded"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <ClosedProductionJobSheetTable
        data={sorted}
        sortField={sort.key}
        sortOrder={sort.direction}
        onSortChange={(fld) =>
          sortBy(
            fld,
            dateKeys.includes(fld) ? "date" : ["qtyRequired", "qtyOrdered"].includes(fld)
              ? "number"
              : "string"
          )
        }
        headerFilters={headerFilters}
        onHeaderFilterChange={setHeaderFilter}
        onActionClick={handleActionClick}
      />
    </div>
  );
}