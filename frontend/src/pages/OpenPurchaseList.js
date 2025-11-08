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
    "invoiceRemarks", // NEW filter
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
      {/* Follow-Up filter cell */}
      <th className="p-1 border"></th>
      {/* PO Status filter cell */}
      <th className="p-1 border">
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
      {/* Actions filter cell */}
      <th className="p-1 border"></th>
    </tr>
  );
}

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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40">
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
              className={`flex justify-between items-center border-b py-1 ${!fu.done && fu.followUpDate < today ? "bg-red-200" : ""}`}
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
      <span
        className={
          "text-[10px] px-1 py-[1px] rounded " +
          (isBad ? "bg-red-600 text-white" : "bg-green-600 text-white")
        }
      >
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
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-white border rounded shadow">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">No matches</div>
          )}
          {filtered.map((v, idx) => {
            const isHi = idx === highlight;
            const nonRel = (v.reliability || "reliable") === "non-reliable";
            return (
              <div
                key={v._id}
                onMouseEnter={() => setHighlight(idx)}
                onMouseLeave={() => setHighlight(-1)}
                onClick={() => selectVendor(v)}
                className={
                  "px-3 py-2 text-xs cursor-pointer " +
                  (isHi ? "bg-gray-100" : "") +
                  (disableNonReliable && nonRel ? " opacity-60" : "")
                }
                title={disableNonReliable && nonRel ? "Selection disabled for non-reliable vendors" : ""}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">
                    {v.vendorCompany || v.vendorName || "(Unnamed Vendor)"}
                  </div>
                  {badge(v.reliability)}
                </div>
                <div className="text-[11px] text-gray-600">
                  {v.vendorName ? `${v.vendorName} • ` : ""}
                  {v.location || "-"}
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
          <div>
            <span className="font-medium">Selected:</span>{" "}
            {selected.vendorCompany || selected.vendorName || "-"}{" "}
            {badge(selected.reliability)}
          </div>
          <div>
            <span className="font-medium">Location:</span> {selected.location || "-"}
          </div>
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
    if (data.status === "received" && !window.confirm("Marked RECEIVED. Save changes?"))
      return;
    const payload = { ...data };
    if (payload.status === "") delete payload.status;

    // Ensure numeric price (empty -> 0)
    if (payload.productPrice !== undefined && payload.productPrice !== null && payload.productPrice !== "") {
      payload.productPrice = Number(payload.productPrice) || 0;
    }

    // Ensure invoiceRemarks is a string
    if (payload.invoiceRemarks === undefined || payload.invoiceRemarks === null) {
      payload.invoiceRemarks = "";
    } else {
      payload.invoiceRemarks = String(payload.invoiceRemarks);
    }

    onSave(payload);
  };

  return (
    <>
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
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
              <div>
                <label className="font-bold">Product Price:</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border p-1"
                  value={data.productPrice ?? ""}
                  onChange={(e) =>
                    change("productPrice", e.target.value === "" ? "" : parseFloat(e.target.value))
                  }
                />
              </div>
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
                    change("qtyOrdered", parseInt(e.target.value, 10) || 0)
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
                <label className="font-bold">General Remarks:</label>
                <input
                  type="text"
                  className="w-full border p-1"
                  value={data.remarks || ""}
                  onChange={(e) => change("remarks", e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold">Invoice Remarks:</label>
                <input
                  type="text"
                  className="w-full border p-1"
                  value={data.invoiceRemarks || ""}
                  onChange={(e) => change("invoiceRemarks", e.target.value)}
                  placeholder="Shown on PO / flows to Closed"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-bold">Order Confirmed:</label>
                <input
                  type="date"
                  className="w-full border p-1"
                  value={data.orderConfirmedDate?.substring(0, 10) || ""}
                  onChange={(e) => change("orderConfirmedDate", e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold">Expected Recv':</label>
                <input
                  type="date"
                  className="w-full border p-1"
                  value={data.expectedReceiveDate?.substring(0, 10) || ""}
                  onChange={(e) => change("expectedReceiveDate", e.target.value)}
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

/* ---------------- Generate PO Modal (uses VendorTypeahead) ---------------- */
function GeneratePOModal({ row, onClose, onCreated }) {
  const [vendorId, setVendorId] = useState("");
  const [productCode, setProductCode] = useState("");
  const [issueDate, setIssueDate] = useState(toISODate(new Date()));
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState(
    toISODate(row?.deliveryDateTime)
  );
  const [deliveryAddress, setDeliveryAddress] = useState("Ace Gifting Solutions");
  const [remarks, setRemarks] = useState("");
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!vendorId) {
      alert("Please select a vendor.");
      return;
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
      };
      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${row._id}/generate-po`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const po = res.data && res.data.po;
      alert(`PO created: ${po && po.poNumber ? po.poNumber : "(no number)"}`);
      if (onCreated) onCreated(po);
      onClose();
    } catch (e) {
      console.error(e);
      alert(
        (e && e.response && e.response.data && e.response.data.message) ||
        "Failed to generate PO"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded w-full max-w-2xl text-xs">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-purple-700">Generate Purchase Order</h3>
          <button onClick={onClose} className="text-2xl">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="font-bold">Job Sheet #</label>
            <div className="border rounded p-2">{row.jobSheetNumber}</div>
          </div>
          <div>
            <label className="font-bold">Product</label>
            <div className="border rounded p-2">
              {row.product}
              {row.size ? ` — ${row.size}` : ""}
            </div>
          </div>

          <div className="col-span-2">
            <label className="font-bold">Vendor</label>
            <VendorTypeahead
              value={vendorId}
              onChange={(id) => setVendorId(id)}
            />
          </div>

          <div>
            <label className="font-bold">Product Code (optional)</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="Matches Product.productId"
            />
          </div>
          <div>
            <label className="font-bold">Issue Date</label>
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="font-bold">Required Delivery Date</label>
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={requiredDeliveryDate}
              onChange={(e) => setRequiredDeliveryDate(e.target.value)}
            />
          </div>
          <div>
            <label className="font-bold">Delivery Address</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Ace Gifting Solutions"
            />
          </div>
          <div className="col-span-2">
            <label className="font-bold">PO Remarks</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Header-level PO remarks (optional)"
            />
          </div>
          <div className="col-span-2">
            <label className="font-bold">Terms</label>
            <textarea
              className="w-full border p-2 rounded min-h-[80px]"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Leave blank to use default terms on the server."
            />
          </div>

          <div className="col-span-2">
            <div className="text-[11px] text-gray-600">
              <b>Line Item Invoice Remarks:</b> {row.invoiceRemarks || "(none)"}<br />
              This will be added to the PO item automatically.
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-3 py-2 bg-[#Ff8045] text-white rounded disabled:opacity-60"
          >
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

  const [perms, setPerms] = useState([]);
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const canExport = isSuperAdmin || perms.includes("export-purchase");

  const [selectedJobSheetNumber, setSelectedJobSheetNumber] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [currentEdit, setCurrentEdit] = useState(null);

  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [poModalRow, setPoModalRow] = useState(null);

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
    if (str) {
      try {
        setPerms(JSON.parse(str));
      } catch {}
    }
  }, []);

  const loadPurchases = async (cfg = sortConfig) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { sortKey: cfg.key, sortDirection: cfg.direction },
        }
      );
      setPurchases(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig]);

  const filteredPurchases = useMemo(() => {
    const jobSheetStatus = {};
    purchases.forEach((rec) => {
      if (!jobSheetStatus[rec.jobSheetNumber]) {
        jobSheetStatus[rec.jobSheetNumber] = { allReceived: true, items: 0 };
      }
      jobSheetStatus[rec.jobSheetNumber].items += 1;
      if (rec.status !== "received") {
        jobSheetStatus[rec.jobSheetNumber].allReceived = false;
      }
    });

    return purchases.filter(
      (rec) => !jobSheetStatus[rec.jobSheetNumber]?.allReceived
    );
  }, [purchases]);

  const globalFiltered = useMemo(() => {
    const s = search.toLowerCase();
    return filteredPurchases.filter((p) =>
      [
        "jobSheetNumber",
        "clientCompanyName",
        "eventName",
        "product",
        "size",
        "sourcingFrom",
        "vendorContactNumber",
        "remarks",
        "invoiceRemarks",
      ].some((f) => (p[f] || "").toLowerCase().includes(s))
    );
  }, [filteredPurchases, search]);

  const headerFiltered = useMemo(() => {
    return globalFiltered.filter((r) =>
      Object.entries(headerFilters).every(([k, v]) => {
        if (!v) return true;
        if (k === "status") {
          if (v === "__empty__") return !r.status;
          return (r.status || "").toLowerCase() === v.toLowerCase();
        }
        if (k === "__poStatus") {
          const generated = !!(r.poId || r.poNumber);
          return v === "generated" ? generated : v === "not" ? !generated : true;
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
    const inRange = (d, range) => {
      const from = range.from;
      const to = range.to;
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

  const rows = useMemo(() => {
    const byKey = {};
    advFiltered.forEach((r) => {
      const key = `${r.jobSheetNumber}_${r.product}_${r.size || ""}`;
      byKey[key] = r;
    });
    return Object.values(byKey);
  }, [advFiltered]);

  const sortBy = (key) => {
    setSortConfig((prev) => {
      let dir = "asc";
      if (prev.key === key && prev.direction === "asc") dir = "desc";
      else if (prev.key === key && prev.direction === "desc") dir = "";
      return { key, direction: dir };
    });
  };

  const exportToExcel = () => {
    if (!canExport) {
      alert("You don't have permission to export purchase records.");
      return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
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
        "Invoice Remarks": r.invoiceRemarks || "", // NEW in export
        Remarks: r.remarks || "",
        Status: r.status,
        "PO Status": r.poId || r.poNumber ? "Generated" : "Not generated",
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
        {(isSuperAdmin || canExport) && (
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded text-xs"
          >
            Export to Excel
          </button>
        )}
      </div>
      <table className="min-w-full border-collapse border-b border-gray-300 text-xs">
        <thead className="bg-gray-50">
          <tr>
            {[
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
              { key: "vendorContactNumber", label: "Vendor #" },
              { key: "orderConfirmedDate", label: "Order Conf." },
              { key: "expectedReceiveDate", label: "Expected Recv." },
              { key: "schedulePickUp", label: "Pick-Up" },
              { key: "invoiceRemarks", label: "Invoice Remarks" }, // NEW column
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
            <th className="p-2 border">PO Status</th>
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
          {rows.map((p) => {
            const latest = p.followUp?.length
              ? p.followUp.reduce((l, fu) =>
                  new Date(fu.updatedAt) > new Date(l.updatedAt) ? fu : l
                )
              : null;

            const menuOpen = menuOpenFor === p._id;
            const poGenerated = !!(p.poId || p.poNumber);

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
                <td className="p-2 border">{fmtDate(p.jobSheetCreatedDate)}</td>
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
                <td className="p-2 border">
                  {typeof p.productPrice === "number" ? p.productPrice.toFixed(2) : "—"}
                </td>
                <td className="p-2 border">{p.size || "N/A"}</td>
                <td className="p-2 border">{p.qtyRequired}</td>
                <td className="p-2 border">{p.qtyOrdered}</td>
                <td className="p-2 border">{p.sourcedBy || ""}</td>
                <td className="p-2 border">{p.sourcingFrom}</td>
                <td className="p-2 border">{fmtDate(p.deliveryDateTime)}</td>
                <td className="p-2 border">{p.vendorContactNumber}</td>
                <td className="p-2 border">{fmtDate(p.orderConfirmedDate)}</td>
                <td className="p-2 border">{fmtDate(p.expectedReceiveDate)}</td>
                <td className="p-2 border">{fmtDate(p.schedulePickUp)}</td>
                <td className="p-2 border">{p.invoiceRemarks || ""}</td>
                <td className="p-2 border">{p.remarks}</td>
                <td className="p-2 border">{p.status || "N/A"}</td>
                <td className="p-2 border">{latest ? latest.note : "—"}</td>

                {/* PO Status */}
                <td className="p-2 border">
                  {poGenerated ? (
                    <span className="inline-block px-2 py-0.5 text-[10px] rounded bg-green-600 text-white">
                      Generated
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 text-[10px] rounded bg-gray-400 text-white">
                      Not generated
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="p-2 border space-y-1 relative">
                  

                  <div className="mt-1">
                    <button
                      className="w-full border rounded py-0.5 text-[10px]"
                      onClick={() =>
                        setMenuOpenFor((cur) => (cur === p._id ? null : p._id))
                      }
                    >
                      ⋮
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 z-10 mt-1 w-44 bg-white border rounded shadow">
                        <button
                          className={
                            "block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 " +
                            (!perms.includes("write-purchase") || p.status === "received"
                              ? "opacity-50 cursor-not-allowed"
                              : "")
                          }
                          onClick={() => {
                            if (!perms.includes("write-purchase") || p.status === "received") return;
                            setMenuOpenFor(null);
                            setCurrentEdit(p);
                            setEditModal(true);
                          }}
                        >
                          Edit
                        </button>

                        <button
                          className={
                            "block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 text-red-600 " +
                            (!perms.includes("write-purchase") ? "opacity-50 cursor-not-allowed" : "")
                          }
                          onClick={async () => {
                            if (!perms.includes("write-purchase")) return;
                            setMenuOpenFor(null);
                            if (!window.confirm("Delete this purchase?")) return;
                            try {
                              const token = localStorage.getItem("token");
                              await axios.delete(
                                `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${p._id}`,
                                { headers: { Authorization: `Bearer ${token}` } }
                              );
                              await loadPurchases();
                            } catch {
                              alert("Error deleting.");
                            }
                          }}
                        >
                          Delete
                        </button>

                        {!poGenerated && (
                          <button
                            className={
                              "block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 " +
                              (!perms.includes("write-purchase") ? "opacity-50 cursor-not-allowed" : "")
                            }
                            onClick={() => {
                              if (!perms.includes("write-purchase")) return;
                              setMenuOpenFor(null);
                              setPoModalRow(p);
                            }}
                          >
                            Generate PO
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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

              if (u._id && String(u._id).startsWith("temp_")) {
                const { _id, isTemporary, ...data } = u;
                await axios.post(
                  `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`,
                  data,
                  { headers }
                );
              } else {
                await axios.put(
                  `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${u._id}`,
                  u,
                  { headers }
                );
              }

              await loadPurchases();
            } catch (error) {
              console.error("Error saving purchase:", error);
            } finally {
              setEditModal(false);
            }
          }}
        />
      )}

      {poModalRow && (
        <GeneratePOModal
          row={poModalRow}
          onClose={() => setPoModalRow(null)}
          onCreated={async () => {
            await loadPurchases();
          }}
        />
      )}
    </div>
  );
}
