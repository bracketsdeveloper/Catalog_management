"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import ProductionJobSheetInvoiceTable from
  "../components/productionjobsheet/ProductionJobSheetInvoiceTable";
import ProductionJobSheetInvoiceModal from
  "../components/productionjobsheet/ProductionJobSheetInvoiceModal";

/* ───────── helpers ───────── */
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const token       = localStorage.getItem("token");
const toDate = (d) => (d ? new Date(d) : new Date(0));
const cmp = (a, b, t) =>
  t === "date"
    ? toDate(a) - toDate(b)
    : String(a ?? "").localeCompare(String(b ?? ""), "en", { sensitivity: "base" });

/* advanced-filter shape */
const initRange = { from: "", to: "" };
const initAdv   = {
  jobSheetNumber:        { ...initRange },
  orderConfirmationDate: { ...initRange },
  vendorInvoiceReceived: "",          // "", "yes", "no"
};

export default function ManageProductionInvoice() {
  /* --------------- state --------------- */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch]   = useState("");
  const [headerF, setHeaderF] = useState({});
  const [adv, setAdv]         = useState(initAdv);
  const [showFilters, setShow]= useState(false);

  const [sort, setSort] = useState({
    key: "orderConfirmationDate",
    direction: "asc",
    type: "date",
  });

  const [tab, setTab] = useState("open"); // open | closed
  const [perms, setPerms] = useState([]);
  const [modal, setModal] = useState(null);

  /* --------------- permissions --------------- */
  useEffect(() => {
    try {
      setPerms(JSON.parse(localStorage.getItem("permissions") || "[]"));
    } catch {/* ignore */}
  }, []);
  const canEdit = perms.includes("write-production");

  /* --------------- fetch --------------- */
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${BACKEND_URL}/api/admin/productionjobsheetinvoice/aggregated`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRows(data);
    } catch (e) {
      console.error("Fetch invoices failed:", e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchInvoices();
  }, []);

  /* --------------- filter pipeline --------------- */
  const global = useMemo(
    () => rows.filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const head = useMemo(
    () =>
      global.filter((r) =>
        Object.entries(headerF).every(([k, v]) => {
          if (!v) return true;
          let val = r[k] ?? "";
          if (k === "orderConfirmationDate" && val)
            val = new Date(val).toLocaleDateString();
          return String(val).toLowerCase().includes(v.toLowerCase());
        })
      ),
    [global, headerF]
  );

  const advFiltered = useMemo(() => {
    const inRange = (d, { from, to }) => {
      if (!from && !to) return true;
      if (!d) return false;
      const dt = new Date(d);
      if (from && dt < new Date(from)) return false;
      if (to && dt > new Date(to)) return false;
      return true;
    };

    return head.filter(
      (r) =>
        (!adv.jobSheetNumber.from || r.jobSheetNumber >= adv.jobSheetNumber.from) &&
        (!adv.jobSheetNumber.to   || r.jobSheetNumber <= adv.jobSheetNumber.to)   &&
        inRange(r.orderConfirmationDate, adv.orderConfirmationDate)               &&
        (adv.vendorInvoiceReceived === ""
          ? true
          : (r.vendorInvoiceReceived || "no").toLowerCase() === adv.vendorInvoiceReceived)
    );
  }, [head, adv]);

  const tabbed = useMemo(
    () =>
      advFiltered.filter((i) =>
        tab === "open"
          ? (i.vendorInvoiceReceived || "no").toLowerCase() === "no"
          : (i.vendorInvoiceReceived || "no").toLowerCase() === "yes"
      ),
    [advFiltered, tab]
  );

  const sorted = useMemo(
    () =>
      [...tabbed].sort(
        (a, b) => cmp(a[sort.key], b[sort.key], sort.type) * (sort.direction === "asc" ? 1 : -1)
      ),
    [tabbed, sort]
  );

  /* --------------- handlers --------------- */
  const sortBy = (k, t = "string") =>
    setSort((p) => ({
      key: k,
      type: t,
      direction: p.key === k && p.direction === "asc" ? "desc" : "asc",
    }));

  const setAdvRange = (field, bound, value) =>
    setAdv((p) => ({ ...p, [field]: { ...p[field], [bound]: value } }));

  /* --------------- export --------------- */
  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        sorted.map((i) => ({
          "Order Confirmation": d(i.orderConfirmationDate),
          "Job Sheet": i.jobSheetNumber,
          Client: i.clientCompanyName,
          Event: i.eventName,
          Product: i.product,
          "Qty Req": i.qtyRequired,
          "Qty Ord": i.qtyOrdered,
          "Source From": i.sourceFrom,
          Cost: i.cost,
          "Negotiated Cost": i.negotiatedCost,
          "Payment Modes": i.paymentModes?.map((p) => p.mode).join(", "),
          "Vendor Inv #": i.vendorInvoiceNumber,
          "Inv Received": i.vendorInvoiceReceived,
        }))
      ),
      "Invoices"
    );
    XLSX.writeFile(wb, "ProductionJobSheetInvoice.xlsx");
  };

  /* --------------- UI --------------- */
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-[#Ff8045] mb-4">
        Production Job Sheet Invoice
      </h1>

      {!canEdit && (
        <div className="mb-4 p-2 bg-red-200 text-red-700 border border-red-400 rounded">
          You don't have permission to edit production job sheet invoices.
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-4">
        {["open", "closed"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded ${tab === t ? "bg-[#Ff8045] text-white" : "bg-gray-200"}`}
          >
            {t === "open" ? "Open Invoices" : "Closed Invoices"}
          </button>
        ))}
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          className="border p-2 rounded flex-grow md:flex-none md:w-1/3"
          placeholder="Global search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={() => setShow((p) => !p)}
          className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white text-xs px-4 py-2 rounded"
        >
          Filters
        </button>
        <button
          onClick={exportXlsx}
          className="bg-green-600 text-white text-xs px-4 py-2 rounded"
        >
          Export to Excel
        </button>
      </div>

      {/* drawer */}
      {showFilters && (
        <div className="border border-purple-200 rounded-lg p-4 mb-4 text-xs bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["from", "to"].map((b) => (
              <div key={`js-${b}`}>
                <label className="font-semibold block mb-1">
                  Job Sheet #{b === "from" ? "From" : "To"}
                </label>
                <input
                  className="w-full border p-1 rounded"
                  value={adv.jobSheetNumber[b]}
                  onChange={(e) => setAdvRange("jobSheetNumber", b, e.target.value.trim())}
                />
              </div>
            ))}
            {["from", "to"].map((b) => (
              <div key={`ocd-${b}`}>
                <label className="font-semibold block mb-1">
                  Order Confirmation {b === "from" ? "From" : "To"}
                </label>
                <input
                  type="date"
                  className="w-full border p-1 rounded"
                  value={adv.orderConfirmationDate[b]}
                  onChange={(e) => setAdvRange("orderConfirmationDate", b, e.target.value)}
                />
              </div>
            ))}
            <div className="col-span-full md:col-span-1">
              <label className="font-semibold block mb-1">
                Vendor Invoice Received
              </label>
              <select
                className="w-full border p-1 rounded"
                value={adv.vendorInvoiceReceived}
                onChange={(e) => setAdv((p) => ({ ...p, vendorInvoiceReceived: e.target.value }))}
              >
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShow(false)}
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

      {/* table */}
      <ProductionJobSheetInvoiceTable
        data={sorted}
        sortConfig={sort}
        onSortChange={(k) =>
          sortBy(
            k,
            k === "orderConfirmationDate" || k === "cost" || k === "negotiatedCost"
              ? "date"
              : "string"
          )
        }
        onActionClick={(inv) => (canEdit ? setModal(inv) : alert("No permission."))}
        headerFilters={headerF}
        onHeaderFilterChange={(k, v) => setHeaderF((p) => ({ ...p, [k]: v }))}
      />

      {modal && (
        <ProductionJobSheetInvoiceModal
          invoice={modal}
          onClose={() => {
            setModal(null);
            fetchInvoices();          // <-- reload with the DEFINITE fetcher
          }}
        />
      )}
    </div>
  );
}

/* local util for export */
function d(v) {
  return !v ? "" : new Date(v).toLocaleDateString();
}
