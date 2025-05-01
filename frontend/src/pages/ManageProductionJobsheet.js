"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import ProductionJobSheetTable from "../components/productionjobsheet/ProductionJobSheetTable";
import ProductionJobSheetModal from "../components/productionjobsheet/ProductionJobSheetModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/* ─────—— helpers ─────—— */
const dateKeys = [
  "jobSheetCreatedDate",
  "deliveryDateTime",
  "expectedReceiveDate",
  "schedulePickUp",
];
const toDate = (d) => (d ? new Date(d) : new Date(0));
const cmp = (a, b, t) =>
  t === "date"
    ? toDate(a) - toDate(b)
    : String(a ?? "").localeCompare(String(b ?? ""), "en", {
        sensitivity: "base",
      });

/* ─────—— initial filter states ─────—— */
const initRange = { from: "", to: "" };
const initAdv = {
  jobSheetNumber: { ...initRange },
  jobSheetCreatedDate: { ...initRange },
  deliveryDateTime: { ...initRange },
  expectedReceiveDate: { ...initRange },
  schedulePickUp: { ...initRange },
};

/* ─────—— skeleton row ─────—— */
const SkeletonRow = () => (
  <tr className="animate-pulse">
    {Array.from({ length: 17 }).map((_, i) => (
      <td key={i} className="border px-2 py-1">
        <div className="h-4 bg-gray-200 rounded w-full" />
      </td>
    ))}
  </tr>
);

export default function ManageProductionJobsheet() {
  const token = localStorage.getItem("token");

  /* --------------- state --------------- */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [headerFilters, setHeaderFilters] = useState({});
  const [advFilters, setAdvFilters] = useState(initAdv);
  const [showFilters, setShowFilters] = useState(false);

  const [sort, setSort] = useState({
    key: "jobSheetCreatedDate",
    direction: "asc",
    type: "date",
  });

  const [permissions, setPermissions] = useState([]);
  const canEdit = permissions.includes("write-production");

  /* modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  
  /* --------------- permissions --------------- */
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("permissions") || "[]");
      setPermissions(p);
    } catch {}
  }, []);

  /* --------------- fetch --------------- */
  const fetchRows = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/productionjobsheets/aggregated`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRows(res.data);
    } catch (e) {
      console.error("Fetch prod-jobsheets failed:", e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchRows();
  }, []);

  /* --------------- filter pipeline --------------- */
  // 1. Hide fully-received groups
  const notFullyReceived = useMemo(() => {
    const g = {};
    rows.forEach((r) => (g[r.jobSheetNumber] = g[r.jobSheetNumber] || []).push(r));
    return Object.values(g)
      .filter((arr) => arr.some((x) => (x.status || "").toLowerCase() !== "received"))
      .flat();
  }, [rows]);

  // 2. Global search
  const global = useMemo(
    () =>
      notFullyReceived.filter((r) =>
        JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
      ),
    [notFullyReceived, search]
  );

  // 3. Header filters
  const header = useMemo(
    () =>
      global.filter((r) =>
        Object.entries(headerFilters).every(([k, v]) => {
          if (!v) return true;
          let val = r[k] ?? "";
          if (dateKeys.includes(k) && val) val = new Date(val).toLocaleDateString();
          return String(val).toLowerCase().includes(v.toLowerCase());
        })
      ),
    [global, headerFilters]
  );

  // 4. Advanced range filters
  const adv = useMemo(() => {
    const inRange = (d, { from, to }) => {
      if (!from && !to) return true;
      if (!d) return false;
      const dt = new Date(d);
      if (from && dt < new Date(from)) return false;
      if (to && dt > new Date(to)) return false;
      return true;
    };
    return header.filter(
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
  }, [header, advFilters]);

  // 5. Sort
  const sorted = useMemo(
    () =>
      [...adv].sort(
        (a, b) => cmp(a[sort.key], b[sort.key], sort.type) * (sort.direction === "asc" ? 1 : -1)
      ),
    [adv, sort]
  );

  /* --------------- handlers --------------- */
  const changeHeader = (k, v) => setHeaderFilters((p) => ({ ...p, [k]: v }));
  const changeAdv = (f, k, v) => setAdvFilters((p) => ({ ...p, [f]: { ...p[f], [k]: v } }));
  const sortBy = (k, t = "string") =>
    setSort((p) => ({
      key: k,
      type: t,
      direction: p.key === k && p.direction === "asc" ? "desc" : "asc",
    }));

  const openModal = (rec) => {
    if (!canEdit) return alert("No permission.");
    setCurrent(rec);
    setModalOpen(true);
  };

  /* --------------- export --------------- */
  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    const sheetData = sorted.map((r) => ({
      "Order Date": r.jobSheetCreatedDate
        ? new Date(r.jobSheetCreatedDate).toLocaleDateString()
        : "",
      "Delivery Date": r.deliveryDateTime
        ? new Date(r.deliveryDateTime).toLocaleDateString()
        : "",
      "Job Sheet": r.jobSheetNumber,
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
      "Expected Post-Brand": r.expectedPostBranding
        ? new Date(r.expectedPostBranding).toLocaleDateString()
        : "",
      "Schedule Pick-Up": r.schedulePickUp
        ? new Date(r.schedulePickUp).toLocaleString()
        : "",
      Remarks: r.remarks,
      Status: r.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetData), "Production");
    XLSX.writeFile(wb, "production_jobsheets.xlsx");
  };

  /* --------------- UI --------------- */
  return (
    <div className="p-4">
      <h1 className="text-2xl text-[#Ff8045] font-bold mb-4">
        Manage Production Job Sheet
      </h1>

      {!canEdit && (
        <div className="mb-4 p-2 text-red-700 bg-red-200 border border-red-400 rounded">
          You don't have permission to edit production job sheets.
        </div>
      )}

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
          onClick={exportXlsx}
          className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded"
        >
          Export&nbsp;to&nbsp;Excel
        </button>
      </div>

      {/* advanced drawer */}
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
                  onChange={(e) => changeAdv("jobSheetNumber", k, e.target.value.trim())}
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
                  onChange={(e) => changeAdv(key, "from", e.target.value)}
                />
              </div>,
              <div key={`${key}-to`}>
                <label className="block font-semibold mb-1">{label} To</label>
                <input
                  type={key === "schedulePickUp" ? "datetime-local" : "date"}
                  className="w-full border p-1 rounded"
                  value={advFilters[key].to}
                  onChange={(e) => changeAdv(key, "to", e.target.value)}
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
              onClick={() => setAdvFilters(initAdv)}
              className="bg-gray-400 text-white px-3 py-1 rounded"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* table (with header filters & sort) */}
      {loading ? (
        <table className="min-w-full text-xs">
          <tbody>{Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
        </table>
      ) : (
        <ProductionJobSheetTable
          data={sorted}
          onActionClick={openModal}
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
          onHeaderFilterChange={changeHeader}
        />
      )}

      {modalOpen && current && (
        <ProductionJobSheetModal record={current} onClose={() => (setModalOpen(false), fetchRows())} />
      )}
    </div>
  );
}
