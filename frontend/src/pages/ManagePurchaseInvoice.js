"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import JobSheetGlobal from "../components/jobsheet/globalJobsheet";

/* ────────────────────────── constants ────────────────────────── */
const INVOICE_RECEIVED_OPTIONS = ["Yes", "No"];
const PAYMENT_STATUS_OPTIONS = ["Not Paid", "Partially Paid", "Fully Paid"];

const HEADER_COLS = [
  { key: "orderConfirmedDate", label: "Order Confirmation Date", type: "date" },
  { key: "deliveryDateTime", label: "Delivery Date", type: "date" },
  { key: "jobSheetNumber", label: "Job Sheet" },
  { key: "clientCompanyName", label: "Client Name" },
  { key: "eventName", label: "Event Name" },
  { key: "product", label: "Product" },
  { key: "qtyRequired", label: "Qty Required", type: "number" },
  { key: "qtyOrdered", label: "Qty Ordered", type: "number" },
  { key: "sourcingFrom", label: "Source From" },
  { key: "cost", label: "Cost", type: "number" },
  { key: "negotiatedCost", label: "Negotiated Cost", type: "number" },
 { key: "paymentMade", label: "Amount Transfer", type: "number" },
  { key: "vendorInvoiceNumber", label: "Vendor Invoice Number" },
  { key: "vendorInvoiceReceived", label: "Vendor Invoice Received" },
  { key: "paymentStatus", label: "Payment Status" },
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
      let response;
      // Map fields to match PurchaseInvoice schema
      const invoiceData = {
        orderConfirmationDate: data.orderConfirmedDate,
        jobSheetNumber: data.jobSheetNumber,
        clientName: data.clientCompanyName,
        eventName: data.eventName,
        product: data.product,
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

      // Check if this is an existing PurchaseInvoice by querying
      const existing = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchaseInvoice/find`,
        {
          params: { jobSheetNumber: data.jobSheetNumber, product: data.product },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (existing.data._id) {
        // Update existing PurchaseInvoice
        console.log("Updating invoice with ID:", existing.data._id);
        response = await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchaseInvoice/${existing.data._id}`,
          invoiceData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new PurchaseInvoice
        console.log("Creating new invoice for:", data.jobSheetNumber, data.product);
        response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchaseInvoice`,
          invoiceData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      onSave(response.data.invoice);
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
            {data.orderConfirmedDate ? new Date(data.orderConfirmedDate).toLocaleDateString() : ""}
          </label>
          <label>
            <span className="font-bold">Delivery Date:</span>{" "}
            {data.deliveryDateTime ? new Date(data.deliveryDateTime).toLocaleDateString() : ""}
          </label>
          <label>
            <span className="font-bold">Job Sheet:</span> {data.jobSheetNumber}
          </label>
          <label>
            <span className="font-bold">Client:</span> {data.clientCompanyName}
          </label>
          <label>
            <span className="font-bold">Event:</span> {data.eventName}
          </label>
          <label>
            <span className="font-bold">Product:</span> {data.product}
          </label>
          <label>
            <span className="font-bold">Source From:</span> {data.sourcingFrom}
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
         {[
          ["cost", "Cost"],
          ["negotiatedCost", "Negotiated Cost"],
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
          {/* Payment Status Dropdown */}
        <div>
          <label className="font-bold">Payment Status:</label>
          <select
            value={data.paymentStatus ?? "Not Paid"}
            onChange={(e) => ch("paymentStatus", e.target.value)}
            className="w-full border p-1 rounded"
          >
            <option value="Not Paid">Not Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Fully Paid">Fully Paid</option>
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
  orderConfirmedDate: { ...initRange },
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
        const token = localStorage.getItem("token");
        const [openRes, invRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/purchaseInvoice`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const received = openRes.data.filter((p) => p.status === "received");
        const invoices = invRes.data;

        const merged = received.map((p) => {
          const m = invoices.find(
            (i) => i.jobSheetNumber === p.jobSheetNumber && i.product === p.product
          );
          return {
            ...p,
            qtyRequired: m?.qtyRequired ?? p.qtyRequired ?? 0,
            qtyOrdered: m?.qtyOrdered ?? p.qtyOrdered ?? 0,
            cost: m?.cost ?? p.cost ?? 0,
            negotiatedCost: m?.negotiatedCost ?? p.negotiatedCost ?? 0,
            paymentMade: m?.paymentMade ?? p.paymentMade ?? 0,
            vendorInvoiceNumber: m?.vendorInvoiceNumber ?? p.vendorInvoiceNumber ?? "",
            vendorInvoiceReceived: m?.vendorInvoiceReceived ?? p.vendorInvoiceReceived ?? "No",
            paymentStatus: m?.paymentStatus ?? p.paymentStatus ?? "Not Paid",
            _id: m?._id, // Use PurchaseInvoice _id only
            clientCompanyName: m?.clientName ?? p.clientCompanyName,
            orderConfirmedDate: m?.orderConfirmationDate ?? p.orderConfirmedDate,
          };
        });

        invoices.forEach((i) => {
          if (
            !merged.some(
              (x) => x.jobSheetNumber === i.jobSheetNumber && x.product === i.product
            )
          ) {
            merged.push({
              ...i,
个别: i.clientName,
              orderConfirmedDate: i.orderConfirmationDate,
              qtyRequired: i.qtyRequired ?? 0,
              qtyOrdered: i.qtyOrdered ?? 0,
              paymentStatus: i.paymentStatus ?? "Not Paid",
            });
          }
        });
        setRows(merged);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* helpers */
  const isDate = (k) => k.endsWith("Date") || k === "deliveryDateTime";
  const cmp = (a, b, t) => {
    if (t === "date") return new Date(a || 0) - new Date(b || 0);
    if (t === "number") return (+a || 0) - (+b || 0);
    return String(a ?? "").localeCompare(String(b ?? ""), "en", { sensitivity: "base" });
  };

  /* ---------- filtering pipeline ---------- */
  const global = useMemo(
    () =>
      rows.filter((r) => {
        const s = search.toLowerCase();
        return (
          [
            "jobSheetNumber",
            "clientCompanyName",
            "eventName",
            "product",
            "sourcingFrom",
            "vendorInvoiceNumber",
            "vendorInvoiceReceived",
            "paymentStatus",
          ].some((f) => (r[f] || "").toLowerCase().includes(s)) ||
          (r.orderConfirmedDate &&
            new Date(r.orderConfirmedDate).toLocaleDateString().toLowerCase().includes(s))
        );
      }),
    [rows, search]
  );

  const header = useMemo(
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
        (!adv.jobSheetNumber.from || r.jobSheetNumber >= adv.jobSheetNumber.from) &&
        (!adv.jobSheetNumber.to || r.jobSheetNumber <= adv.jobSheetNumber.to) &&
        inRange(r.orderConfirmedDate, adv.orderConfirmedDate) &&
        inRange(r.deliveryDateTime, adv.deliveryDateTime)
    );
  }, [header, adv]);

  const tabFiltered = useMemo(
    () =>
      advFiltered.filter((r) =>
        activeTab === "open" ? r.vendorInvoiceReceived === "No" : r.vendorInvoiceReceived === "Yes"
      ),
    [advFiltered, activeTab]
  );

  const sorted = useMemo(
    () =>
      [...tabFiltered].sort(
        (a, b) => cmp(a[sort.key], b[sort.key], sort.type) * (sort.direction === "asc" ? 1 : -1)
      ),
    [tabFiltered, sort]
  );

  /* ---------- handlers ---------- */
  const setHeaderFilter = (k, v) => setHeader((p) => ({ ...p, [k]: v }));
  const setAdvVal = (f, k, v) => setAdv((p) => ({ ...p, [f]: { ...p[f], [k]: v } }));
  const sortBy = (k, t = "string") =>
    setSort((p) => ({ key: k, type: t, direction: p.key === k && p.direction === "asc" ? "desc" : "asc" }));

  /* ---------- export ---------- */
  const exportXlsx = () => {
    const data = sorted.map((r) => ({
      "Order Confirmed": r.orderConfirmedDate
        ? new Date(r.orderConfirmedDate).toLocaleDateString()
        : "",
      "Delivery Date": r.deliveryDateTime ? new Date(r.deliveryDateTime).toLocaleDateString() : "",
      "Job Sheet": r.jobSheetNumber,
      Client: r.clientCompanyName,
      Event: r.eventName,
      Product: r.product,
      "Qty Required": r.qtyRequired,
      "Qty Ordered": r.qtyOrdered,
      "Source From": r.sourcingFrom,
      Cost: r.cost,
      "Negotiated Cost": r.negotiatedCost,
      "Payment Made": r.paymentMade,
      "Vendor Inv #": r.vendorInvoiceNumber,
      "Inv Received": r.vendorInvoiceReceived,
      "Payment Status": r.paymentStatus,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "PurchaseInvoice");
    XLSX.writeFile(wb, "PurchaseInvoice.xlsx");
  };

  /* ---------- loading ---------- */
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

  /* ---------- UI ---------- */
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
        {["open", "closed"].map((t) => (
          <button
            key={t}
            className={`px-4 py-2 rounded ${activeTab === t ? "bg-[#Ff8045] text-white" : "bg-gray-200"}`}
            onClick={() => setActiveTab(t)}
          >
            {t === "open" ? "Open Purchase Invoice" : "Closed Purchase Invoice"}
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
              ["orderConfirmedDate", "Order Confirmed Date"],
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
              key={`${inv._id || inv.jobSheetNumber + inv.product}-${index}`}
              className={inv.vendorInvoiceReceived === "Yes" ? "bg-green-100" : ""}
            >
              <td className="p-2 border">
                {inv.orderConfirmedDate ? new Date(inv.orderConfirmedDate).toLocaleDateString() : ""}
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
              <td className="p-2 border">{inv.qtyRequired}</td>
              <td className="p-2 border">{inv.qtyOrdered}</td>
              <td className="p-2 border">{inv.sourcingFrom}</td>
              <td className="p-2 border">{inv.cost}</td>
              <td className="p-2 border">{inv.negotiatedCost}</td>
              <td className="p-2 border">{inv.paymentMade}</td>
              <td className="p-2 border">{inv.vendorInvoiceNumber}</td>
              <td className="p-2 border">{inv.vendorInvoiceReceived}</td>
              <td className="p-2 border">{inv.paymentStatus}</td>
              <td className="p-2 border">
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
                  r.product === updatedInvoice.product
              );
              if (exists) {
                return prev.map((r) =>
                  r.jobSheetNumber === updatedInvoice.jobSheetNumber &&
                  r.product === updatedInvoice.product
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