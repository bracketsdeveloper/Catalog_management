"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import JobSheetGlobal from "../components/jobsheet/globalJobsheet";

/* ────────────────────────── constants ────────────────────────── */
const INVOICE_RECEIVED_OPTIONS = ["Yes", "No"];
const PAYMENT_STATUS_OPTIONS = ["Not Paid", "Partially Paid", "Fully Paid"];

const HEADER_COLS = [
  { key: "orderConfirmationDate", label: "Order Confirmation Date", type: "date" },
  { key: "deliveryDateTime", label: "Delivery Date", type: "date" },
  { key: "jobSheetNumber", label: "Job Sheet" },
  { key: "clientCompanyName", label: "Client Name" },
  { key: "eventName", label: "Event Name" },
  { key: "product", label: "Product" },
  { key: "size", label: "Size" },
  { key: "qtyRequired", label: "Qty Required", type: "number" },
  { key: "qtyOrdered", label: "Qty Ordered", type: "number" },
  { key: "sourcingFrom", label: "Source From" },
  { key: "cost", label: "Cost", type: "number" },
  { key: "negotiatedCost", label: "Negotiated Cost", type: "number" },
  { key: "paymentMade", label: "Amount Transfer", type: "number" },
  { key: "vendorInvoiceNumber", label: "Vendor Invoice Number" },
  { key: "vendorInvoiceReceived", label: "Vendor Invoice Received" },
  { key: "paymentStatus", label: "Payment Status" },
  { key: "source", label: "Source" },
];

/* header filter row */
function HeaderFilters({ filters, onChange }) {
  return (
    <tr className="bg-gray-100">
      {HEADER_COLS.map((c) => (
        <th key={c.key} className="p-1 border">
          {c.key === "paymentStatus" ? (
            <select
              className="w-full p-1 text-xs border rounded"
              value={filters[c.key] || ""}
              onChange={(e) => onChange(c.key, e.target.value)}
            >
              <option value="">All</option>
              {PAYMENT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="w-full p-1 text-xs border rounded"
              placeholder={`Filter ${c.label}`}
              value={filters[c.key] || ""}
              onChange={(e) => onChange(c.key, e.target.value)}
            />
          )}
        </th>
      ))}
      <th className="p-1 border"></th>
    </tr>
  );
}

/* edit-modal */
function EditInvoiceModal({ invoice, onClose, onSave }) {
  const [data, setData] = useState({ ...invoice });
  const ch = (f, v) => setData((p) => ({ ...p, [f]: v }));
  const save = async () => {
    if (data.vendorInvoiceNumber)
      data.vendorInvoiceNumber = data.vendorInvoiceNumber.toUpperCase();

    try {
      const token = localStorage.getItem("token");
      const invoiceData = {
        orderConfirmationDate: data.orderConfirmationDate,
        deliveryDateTime: data.deliveryDateTime,
        jobSheetNumber: data.jobSheetNumber,
        clientName: data.clientCompanyName,
        eventName: data.eventName,
        product: data.product,
        size: data.size || "",
        sourcingFrom: data.sourcingFrom,
        cost: data.cost || 0,
        negotiatedCost: data.negotiatedCost || 0,
        paymentMade: data.paymentMade || 0,
        vendorInvoiceNumber: data.vendorInvoiceNumber || "",
        vendorInvoiceReceived: data.vendorInvoiceReceived || "No",
        qtyRequired: data.qtyRequired || 0,
        qtyOrdered: data.qtyOrdered || 0,
        paymentStatus: data.paymentStatus || "Not Paid",
      };

      let response;
      const existing = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchaseInvoice/find`,
        {
          params: { jobSheetNumber: data.jobSheetNumber, product: data.product, size: data.size },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (existing.data._id) {
        response = await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchaseInvoice/${existing.data._id}`,
          invoiceData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchaseInvoice`,
          invoiceData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      onSave({ ...response.data.invoice, source: "invoice" });
    } catch (error) {
      console.error("Error saving invoice:", error);
      alert(`Failed to save invoice: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-full max-w-3xl max-h-[80vh] overflow-y-auto text-xs">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-purple-700">Edit Purchase Invoice</h2>
          <button onClick={onClose} className="text-2xl">×</button>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
          <label>
            <span className="font-bold">Order Confirmed:</span>{" "}
            <input
              type="date"
              value={data.orderConfirmationDate ? data.orderConfirmationDate.split("T")[0] : ""}
              onChange={(e) => ch("orderConfirmationDate", e.target.value)}
              className="border p-1"
            />
          </label>
          <label>
            <span className="font-bold">Delivery Date:</span>{" "}
            <input
              type="date"
              value={data.deliveryDateTime ? data.deliveryDateTime.split("T")[0] : ""}
              onChange={(e) => ch("deliveryDateTime", e.target.value)}
              className="border p-1"
            />
          </label>
          <label>
            <span className="font-bold">Job Sheet:</span>{" "}
            <input
              value={data.jobSheetNumber || ""}
              onChange={(e) => ch("jobSheetNumber", e.target.value)}
              className="border p-1"
            />
          </label>
          <label>
            <span className="font-bold">Client:</span>{" "}
            <input
              value={data.clientCompanyName || ""}
              onChange={(e) => ch("clientCompanyName", e.target.value)}
              className="border p-1"
            />
          </label>
          <label>
            <span className="font-bold">Event:</span>{" "}
            <input
              value={data.eventName || ""}
              onChange={(e) => ch("eventName", e.target.value)}
              className="border p-1"
            />
          </label>
          <label>
            <span className="font-bold">Product:</span>{" "}
            <input
              value={data.product || ""}
              onChange={(e) => ch("product", e.target.value)}
              className="border p-1"
            />
          </label>
          <label>
            <span className="font-bold">Size:</span>{" "}
            <input
              value={data.size || ""}
              onChange={(e) => ch("size", e.target.value)}
              className="border p-1"
            />
          </label>
          <label>
            <span className="font-bold">Source From:</span>{" "}
            <input
              value={data.sourcingFrom || ""}
              onChange={(e) => ch("sourcingFrom", e.target.value)}
              className="border p-1"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {[
            ["cost", "Cost"],
            ["negotiatedCost", "Negotiated Cost"],
            ["paymentMade", "Amount Transfer"],
            ["qtyRequired", "Qty Required"],
            ["qtyOrdered", "Qty Ordered"],
          ].map(([k, l]) => (
            <div key={k}>
              <label className="font-bold">{l}:</label>
              <input
                type="number"
                value={data[k] ?? ""}
                onChange={(e) => ch(k, parseFloat(e.target.value) || 0)}
                className="w-full border p-1"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="font-bold">Vendor Invoice #:</label>
            <input
              value={data.vendorInvoiceNumber ?? ""}
              onChange={(e) => ch("vendorInvoiceNumber", e.target.value)}
              className="w-full border p-1"
            />
          </div>
          <div>
            <label className="font-bold">Vendor Invoice Received:</label>
            <select
              value={data.vendorInvoiceReceived ?? "No"}
              onChange={(e) => ch("vendorInvoiceReceived", e.target.value)}
              className="w-full border p-1"
            >
              {INVOICE_RECEIVED_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold">Payment Status:</label>
            <select
              value={data.paymentStatus ?? "Not Paid"}
              onChange={(e) => ch("paymentStatus", e.target.value)}
              className="w-full border p-1 rounded"
            >
              {PAYMENT_STATUS_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="border px-4 py-2 rounded">Cancel</button>
          <button onClick={save} className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── main component ───────────────────── */
const initRange = { from: "", to: "" };
const initAdv = {
  jobSheetNumber: { ...initRange },
  orderConfirmationDate: { ...initRange },
  deliveryDateTime: { ...initRange },
};

export default function ManagePurchaseInvoice() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [headerFilters, setHeader] = useState({});
  const [adv, setAdv] = useState(initAdv);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState({ key: "", direction: "asc", type: "string" });
  const [activeTab, setActiveTab] = useState("open");
  const [canEdit, setCanEdit] = useState(false);
  const [modal, setModal] = useState(null);
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

  /* permissions */
  useEffect(() => {
    try {
      const perms = JSON.parse(localStorage.getItem("permissions") || "[]");
      setCanEdit(perms.includes("write-purchase"));
    } catch {}
  }, []);

  /* fetch + merge */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const [invRes, openRes, closedRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/purchaseInvoice`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/closedPurchases`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { partial: true },
          }),
        ]);

        const invoices = invRes.data;
        const receivedOpen = openRes.data.filter((p) => p.status === "received");
        const splitClosed = closedRes.data.filter((p) => p.splitId && p.status === "received");

        // Create a set of unique keys from PurchaseInvoice
        const invoiceKeys = new Set(
          invoices.map((i) => `${i.jobSheetNumber}|${i.product}|${i.size || ""}`)
        );

        const merged = [];

        // Process PurchaseInvoice records first
        invoices.forEach((i) => {
          merged.push({
            ...i,
            clientCompanyName: i.clientName,
            orderConfirmationDate: i.orderConfirmationDate,
            qtyRequired: i.qtyRequired ?? 0,
            qtyOrdered: i.qtyOrdered ?? 0,
            cost: i.cost ?? 0,
            negotiatedCost: i.negotiatedCost ?? 0,
            paymentMade: i.paymentMade ?? 0,
            vendorInvoiceNumber: i.vendorInvoiceNumber ?? "",
            vendorInvoiceReceived: i.vendorInvoiceReceived || "No",
            paymentStatus: i.paymentStatus || "Not Paid",
            size: i.size || "",
            source: "invoice",
          });
        });

        // Process OpenPurchase records, excluding those in PurchaseInvoice
        receivedOpen.forEach((p) => {
          const key = `${p.jobSheetNumber}|${p.product}|${p.size || ""}`;
          if (!invoiceKeys.has(key)) {
            merged.push({
              ...p,
              clientCompanyName: p.clientCompanyName,
              orderConfirmationDate: p.orderConfirmedDate,
              qtyRequired: p.qtyRequired ?? 0,
              qtyOrdered: p.qtyOrdered ?? 0,
              cost: p.cost ?? 0,
              negotiatedCost: p.negotiatedCost ?? 0,
              paymentMade: p.paymentMade ?? 0,
              vendorInvoiceNumber: p.vendorInvoiceNumber ?? "",
              vendorInvoiceReceived: p.vendorInvoiceReceived ?? "No",
              paymentStatus: p.paymentStatus ?? "Not Paid",
              size: p.size || "",
              source: "open",
            });
          }
        });

        // Process ClosedPurchase records, excluding those in PurchaseInvoice
        splitClosed.forEach((p) => {
          const key = `${p.jobSheetNumber}|${p.product}|${p.size || ""}`;
          if (!invoiceKeys.has(key) && !merged.some((m) => m._id === p._id && m.source === "closed")) {
            merged.push({
              ...p,
              clientCompanyName: p.clientCompanyName,
              orderConfirmationDate: p.orderConfirmedDate,
              qtyRequired: p.qtyRequired ?? 0,
              qtyOrdered: p.qtyOrdered ?? 0,
              cost: p.cost ?? 0,
              negotiatedCost: p.negotiatedCost ?? 0,
              paymentMade: p.paymentMade ?? 0,
              vendorInvoiceNumber: p.vendorInvoiceNumber ?? "",
              vendorInvoiceReceived: p.vendorInvoiceReceived ?? "No",
              paymentStatus: p.paymentStatus ?? "Not Paid",
              size: p.size || "",
              source: "closed",
            });
          }
        });

        setRows(merged);
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Failed to load purchase invoices");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* helpers */
  const isDate = (k) => k.includes("Date") || k === "deliveryDateTime";
  const cmp = (a, b, t) => {
    if (t === "date") return new Date(a || 0) - new Date(b || 0);
    if (t === "number") return (+a || 0) - (+b || 0);
    return String(a ?? "").localeCompare(String(b ?? ""), "en", { sensitivity: "base" });
  };

  /* filtering pipeline */
  const global = useMemo(
    () =>
      rows.filter((p) => {
        const s = search.toLowerCase();
        return [
          "jobSheetNumber",
          "clientCompanyName",
          "eventName",
          "product",
          "size",
          "sourcingFrom",
          "vendorInvoiceNumber",
          "paymentStatus",
          "source",
        ].some((f) => (p[f] || "").toLowerCase().includes(s)) ||
          (p.orderConfirmationDate &&
            new Date(p.orderConfirmationDate).toLocaleDateString().toLowerCase().includes(s)) ||
          (p.deliveryDateTime &&
            new Date(p.deliveryDateTime).toLocaleDateString().toLowerCase().includes(s));
      }),
    [rows, search]
  );

  const headerFiltered = useMemo(
    () =>
      global.filter((r) =>
        Object.entries(headerFilters).every(([k, v]) => {
          if (!v) return true;
          let val = r[k] ?? "";
          if (isDate(k) && val) val = new Date(val).toLocaleDateString();
          return String(val).toLowerCase().includes(v.toLowerCase());
        })
      ),
    [global, headerFilters]
  );

  const advFiltered = useMemo(() => {
    const inRange = (d, r) => {
      if (!r.from && !r.to) return true;
      if (!d) return false;
      const dt = new Date(d);
      if (r.from && dt < new Date(r.from)) return false;
      if (r.to && dt > new Date(r.to)) return false;
      return true;
    };
    return headerFiltered.filter(
      (r) =>
        (!adv.jobSheetNumber.from || r.jobSheetNumber >= adv.jobSheetNumber.from) &&
        (!adv.jobSheetNumber.to || r.jobSheetNumber <= adv.jobSheetNumber.to) &&
        inRange(r.orderConfirmationDate, adv.orderConfirmationDate) &&
        inRange(r.deliveryDateTime, adv.deliveryDateTime)
    );
  }, [headerFiltered, adv]);

  const tabFiltered = useMemo(() => {
    return advFiltered.filter((r) => {
      if (activeTab === "open") return r.vendorInvoiceReceived === "No";
      if (activeTab === "closed") return r.vendorInvoiceReceived === "Yes";
      if (activeTab === "partial") return r.source === "closed" && r.splitId && r.status === "received";
      return true;
    });
  }, [advFiltered, activeTab]);

  const sorted = useMemo(
    () =>
      [...tabFiltered].sort(
        (a, b) => cmp(a[sort.key], b[sort.key], sort.type) * (sort.direction === "asc" ? 1 : -1)
      ),
    [tabFiltered, sort]
  );

  /* handlers */
  const setHeaderFilter = (k, v) => setHeader((p) => ({ ...p, [k]: v }));
  const setAdvVal = (f, k, v) => setAdv((p) => ({ ...p, [f]: { ...p[f], [k]: v } }));
  const sortBy = (k, t = "string") =>
    setSort((p) => ({
      key: k,
      type: t,
      direction: p.key === k && p.direction === "asc" ? "desc" : "asc",
    }));

  const handlePartialInvoice = (inv) => {
    setModal({ ...inv, vendorInvoiceReceived: "Yes", source: "closed" });
  };

  /* export */
  const exportXlsx = () => {
    const data = sorted.map((r) => ({
      "Order Confirmed": r.orderConfirmationDate
        ? new Date(r.orderConfirmationDate).toLocaleDateString()
        : "",
      "Delivery Date": r.deliveryDateTime
        ? new Date(r.deliveryDateTime).toLocaleDateString()
        : "",
      "Job Sheet": r.jobSheetNumber,
      Client: r.clientCompanyName,
      Event: r.eventName,
      Product: r.product,
      Size: r.size || "",
      "Qty Required": r.qtyRequired,
      "Qty Ordered": r.qtyOrdered,
      "Source From": r.sourcingFrom,
      Cost: r.cost,
      "Negotiated Cost": r.negotiatedCost,
      "Payment Made": r.paymentMade,
      "Vendor Inv #": r.vendorInvoiceNumber,
      "Inv Received": r.vendorInvoiceReceived,
      "Payment Status": r.paymentStatus,
      Source: r.source,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "PurchaseInvoice");
    XLSX.writeFile(wb, "PurchaseInvoice.xlsx");
  };

  /* loading */
  if (loading)
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-purple-700 mb-4">Manage Purchase Invoice</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );

  /* UI */
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#Ff8045] mb-4">Manage Purchase Invoice</h1>

      {!canEdit && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          You don't have permission to edit.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        {["open", "closed", "partial"].map((t) => (
          <button
            key={t}
            className={`px-4 py-2 rounded ${activeTab === t ? "bg-[#Ff8045] text-white" : "bg-gray-200"}`}
            onClick={() => setActiveTab(t)}
          >
            {t === "open" ? "Open Purchase Invoice" : t === "closed" ? "Closed Purchase Invoice" : "Partial Invoice"}
          </button>
        ))}
      </div>

      {/* Toolbar */}
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
        {localStorage.getItem("isSuperAdmin") === "true" && (
          <button
            onClick={exportXlsx}
            className="bg-green-600 text-white text-xs px-4 py-2 rounded"
          >
            Export to Excel
          </button>
        )}
      </div>

      {/* Filters drawer */}
      {showFilters && (
        <div className="border border-purple-200 rounded-lg p-4 mb-4 text-xs bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["from", "to"].map((k) => (
              <div key={`js-${k}`}>
                <label className="font-semibold block mb-1">
                  Job Sheet #{k === "from" ? "From" : "To"}
                </label>
                <input
                  type="text"
                  className="w-full border p-1 rounded"
                  value={adv.jobSheetNumber[k]}
                  onChange={(e) => setAdvVal("jobSheetNumber", k, e.target.value.trim())}
                />
              </div>
            ))}
            {[
              ["orderConfirmationDate", "Order Confirmed Date"],
              ["deliveryDateTime", "Delivery Date"],
            ].flatMap(([key, label]) => [
              <div key={`${key}-from`}>
                <label className="font-semibold block mb-1">{label} From</label>
                <input
                  type="date"
                  className="w-full border p-1 rounded"
                  value={adv[key].from}
                  onChange={(e) => setAdvVal(key, "from", e.target.value)}
                />
              </div>,
              <div key={`${key}-to`}>
                <label className="font-semibold block mb-1">{label} To</label>
                <input
                  type="date"
                  className="w-full border p-1 rounded"
                  value={adv[key].to}
                  onChange={(e) => setAdvVal(key, "to", e.target.value)}
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

      {/* Table */}
      <table className="min-w-full border-collapse border border-gray-300 text-xs">
        <thead className="bg-gray-50">
          <tr>
            {HEADER_COLS.map((c) => (
              <th
                key={c.key}
                onClick={() => sortBy(c.key, c.type || "string")}
                className="p-2 border cursor-pointer"
              >
                {c.label} {sort.key === c.key ? (sort.direction === "asc" ? "↑" : "↓") : ""}
              </th>
            ))}
            <th className="p-2 border">Actions</th>
          </tr>
          <HeaderFilters filters={headerFilters} onChange={setHeaderFilter} />
        </thead>
        <tbody>
          {sorted.map((inv, index) => (
            <tr
              key={`${inv._id || inv.jobSheetNumber + inv.product + inv.size}-${index}`}
              className={inv.vendorInvoiceReceived === "Yes" ? "bg-green-100" : ""}
            >
              <td className="p-2 border">
                {inv.orderConfirmationDate
                  ? new Date(inv.orderConfirmationDate).toLocaleDateString()
                  : ""}
              </td>
              <td className="p-2 border">
                {inv.deliveryDateTime ? new Date(inv.deliveryDateTime).toLocaleDateString() : ""}
              </td>
              <td className="p-2 border">
                <button
                  className="border-b text-blue-500 hover:text-blue-700"
                  onClick={(e) => {
                    e.preventDefault();
                    handleOpenModal(inv.jobSheetNumber);
                  }}
                >
                  {inv.jobSheetNumber || "(No Number)"}
                </button>
              </td>
              <td className="p-2 border">{inv.clientCompanyName}</td>
              <td className="p-2 border">{inv.eventName}</td>
              <td className="p-2 border">{inv.product}</td>
              <td className="p-2 border">{inv.size || "N/A"}</td>
              <td className="p-2 border">{inv.qtyRequired}</td>
              <td className="p-2 border">{inv.qtyOrdered}</td>
              <td className="p-2 border">{inv.sourcingFrom}</td>
              <td className="p-2 border">{inv.cost}</td>
              <td className="p-2 border">{inv.negotiatedCost}</td>
              <td className="p-2 border">{inv.paymentMade}</td>
              <td className="p-2 border">{inv.vendorInvoiceNumber}</td>
              <td className="p-2 border">{inv.vendorInvoiceReceived}</td>
              <td className="p-2 border">{inv.paymentStatus}</td>
              <td className="p-2 border">{inv.source}</td>
              <td className="p-2 border flex gap-1">
                <button
                  disabled={!canEdit}
                  onClick={() => canEdit && setModal(inv)}
                  className="bg-blue-600 text-white w-full rounded py-0.5 text-[10px]"
                  title={!canEdit ? "No permission" : ""}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <JobSheetGlobal
        jobSheetNumber={selectedJobSheetNumber}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {modal && (
        <EditInvoiceModal
          invoice={modal}
          onClose={() => setModal(null)}
          onSave={(updatedInvoice) => {
            setRows((prev) => {
              const exists = prev.some(
                (r) =>
                  r.jobSheetNumber === updatedInvoice.jobSheetNumber &&
                  r.product === updatedInvoice.product &&
                  r.size === updatedInvoice.size
              );
              if (exists) {
                return prev.map((r) =>
                  r.jobSheetNumber === updatedInvoice.jobSheetNumber &&
                  r.product === updatedInvoice.product &&
                  r.size === updatedInvoice.size
                    ? { ...updatedInvoice, clientCompanyName: updatedInvoice.clientName }
                    : r
                );
              }
              return [
                { ...updatedInvoice, clientCompanyName: updatedInvoice.clientName },
                ...prev,
              ];
            });
            setModal(null);
          }}
        />
      )}
    </div>
  );
}