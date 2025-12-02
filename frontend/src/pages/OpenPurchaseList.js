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
    { key: "jobSheetCreatedDate", label: "JS Date" },
    { key: "jobSheetNumber", label: "JS #" },
    { key: "clientCompanyName", label: "Client" },
    { key: "eventName", label: "Event" },
    { key: "product", label: "Product" },
    { key: "productPrice", label: "Cost" },
    { key: "size", label: "Size" },
    { key: "qtyRequired", label: "Qty Req" },
    { key: "qtyOrdered", label: "Qty Ord" },
    { key: "sourcedBy", label: "By" },
    { key: "sourcingFrom", label: "Source" },
    { key: "deliveryDateTime", label: "Deliv Date" },
    { key: "vendorContactNumber", label: "Vendor #" },
    { key: "orderConfirmedDate", label: "Order Conf" },
    { key: "expectedReceiveDate", label: "Exp Recv" },
    { key: "schedulePickUp", label: "Pick-Up" },
    { key: "invoiceRemarks", label: "Inv Rmk" },
    { key: "remarks", label: "Remarks" },
  ];

  return (
    <tr className="bg-gray-100">
      <th className="p-1 border w-24">
        <select
          className="w-full p-1 text-xs border rounded"
          value={headerFilters.completionState || ""}
          onChange={(e) => onFilterChange("completionState", e.target.value)}
        >
          <option value="">All</option>
          <option value="Partially">Partial</option>
          <option value="Fully">Full</option>
        </select>
      </th>

      {cols.map((c) => (
        <th key={c.key} className="p-1 border">
          <input
            type="text"
            className="w-full p-1 text-xs border rounded"
            placeholder={c.label}
            value={headerFilters[c.key] || ""}
            onChange={(e) => onFilterChange(c.key, e.target.value)}
          />
        </th>
      ))}
      <th className="p-1 border w-24">
        <select
          className="w-full p-1 text-xs border rounded"
          value={headerFilters.status || ""}
          onChange={(e) => onFilterChange("status", e.target.value)}
        >
          <option value="">All</option>
          <option value="pending">pending</option>
          <option value="received">received</option>
          <option value="alert">alert</option>
          <option value="__empty__">Empty</option>
        </select>
      </th>
      <th className="p-1 border w-24" />
      <th className="p-1 border w-24">
        <select
          className="w-full p-1 text-xs border rounded"
          value={headerFilters.__poStatus || ""}
          onChange={(e) => onFilterChange("__poStatus", e.target.value)}
        >
          <option value="">All</option>
          <option value="generated">Yes</option>
          <option value="not">No</option>
        </select>
      </th>
      <th className="p-1 border w-16" />
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
      <div className="bg-white p-4 rounded w-full max-w-xl text-xs">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-purple-700">Manage Follow-Ups</h3>
          <button onClick={close} className="text-xl">×</button>
        </div>

        <div className="mb-3 space-y-2">
          <label className="font-bold text-xs">Add New Follow-Up</label>
          <div className="grid grid-cols-3 gap-1">
            <input
              type="date"
              className="p-1 border rounded text-xs"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              type="text"
              className="p-1 border rounded text-xs"
              placeholder="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <input
              type="text"
              className="p-1 border rounded text-xs"
              placeholder="Remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button onClick={add} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
              Add
            </button>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto border p-2 mb-3">
          {local.length === 0 && <p className="text-gray-600 text-xs">No follow-ups.</p>}
          {local.map((fu, i) => {
            const overdue = !fu.done && fu.followUpDate && fu.followUpDate < today;
            return (
              <div
                key={i}
                className={`border rounded p-1 mb-1 text-xs ${
                  overdue ? "bg-red-100" : "bg-gray-50"
                }`}
              >
                <div className="grid grid-cols-4 gap-1">
                  <input
                    type="date"
                    className="p-1 border rounded text-xs"
                    value={fu.followUpDate || ""}
                    onChange={(e) => editField(i, "followUpDate", e.target.value)}
                  />
                  <input
                    type="text"
                    className="p-1 border rounded text-xs"
                    placeholder="Note"
                    value={fu.note || ""}
                    onChange={(e) => editField(i, "note", e.target.value)}
                  />
                  <input
                    type="text"
                    className="p-1 border rounded text-xs"
                    placeholder="Remarks"
                    value={fu.remarks || ""}
                    onChange={(e) => editField(i, "remarks", e.target.value)}
                  />
                  <div className="flex items-center gap-1">
                    {!fu.done && (
                      <button
                        onClick={() => markDone(i)}
                        className="bg-green-600 text-white px-1 py-0.5 rounded text-xs"
                      >
                        Done
                      </button>
                    )}
                    <button
                      onClick={() => remove(i)}
                      className="text-red-600 px-1 py-0.5 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="mt-1 text-[9px] text-gray-600">
                  {new Date(fu.updatedAt).toLocaleDateString()} by {fu.updatedBy || "admin"}
                  {fu.done ? " • Done" : ""}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={close}
            className="bg-green-700 text-white px-3 py-1 rounded text-xs"
          >
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
  placeholder = "Search vendor...",
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
      <span
        className={
          "text-[8px] px-1 py-0 rounded " +
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
        className="w-full border p-1 rounded text-xs"
        placeholder={loading ? "Loading..." : placeholder}
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
        <div className="absolute z-[120] mt-1 w-full max-h-48 overflow-auto bg-white border rounded shadow text-xs">
          {filtered.length === 0 && (
            <div className="px-2 py-1 text-gray-500">No matches</div>
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
                  "px-2 py-1 cursor-pointer " +
                  (isHi ? "bg-gray-100" : "") +
                  (disableNonReliable && nonRel ? " opacity-60" : "")
                }
                title={
                  disableNonReliable && nonRel
                    ? "Selection disabled for non-reliable vendors"
                    : ""
                }
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="font-medium truncate">
                    {v.vendorCompany || v.vendorName || "(Unnamed)"}
                  </div>
                  {badge(v.reliability)}
                </div>
                <div className="text-[10px] text-gray-600 truncate">
                  {v.vendorName ? `${v.vendorName} • ` : ""}
                  {v.location || "-"}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {selected && (
        <div className="mt-1 text-xs text-gray-600">
          <div className="truncate">
            <span className="font-medium">Selected:</span>{" "}
            {selected.vendorCompany || selected.vendorName || "-"}
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

    if (
      payload.productPrice !== undefined &&
      payload.productPrice !== null &&
      payload.productPrice !== ""
    ) {
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
        <div className="bg-white p-4 rounded w-full max-w-2xl text-xs max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold text-purple-700">Edit Open Purchase</h2>
            <button onClick={onClose} className="text-xl">×</button>
          </div>
          <form className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="font-bold">JS #:</label> {data.jobSheetNumber}
              </div>
              <div>
                <label className="font-bold">JS Date:</label>{" "}
                {data.jobSheetCreatedDate
                  ? new Date(data.jobSheetCreatedDate).toLocaleDateString()
                  : "N/A"}
              </div>
              <div className="truncate">
                <label className="font-bold">Client:</label> {data.clientCompanyName}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-xs">Product Price:</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border p-1 text-xs"
                  value={data.productPrice ?? ""}
                  onChange={(e) =>
                    change(
                      "productPrice",
                      e.target.value === "" ? "" : parseFloat(e.target.value)
                    )
                  }
                />
              </div>
              <div>
                <label className="font-bold text-xs">Qty Ordered:</label>
                <input
                  type="number"
                  className="w-full border p-1 text-xs"
                  value={data.qtyOrdered || ""}
                  onChange={(e) =>
                    change("qtyOrdered", parseInt(e.target.value, 10) || 0)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-xs">Vendor #:</label>
                <input
                  type="text"
                  className="w-full border p-1 text-xs"
                  value={data.vendorContactNumber || ""}
                  onChange={(e) => change("vendorContactNumber", e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold text-xs">Completion:</label>
                <select
                  className="w-full border p-1 text-xs"
                  value={data.completionState || ""}
                  onChange={(e) => change("completionState", e.target.value)}
                >
                  <option value="">--</option>
                  <option value="Partially">Partially</option>
                  <option value="Fully">Fully</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-xs">Remarks:</label>
                <input
                  type="text"
                  className="w-full border p-1 text-xs"
                  value={data.remarks || ""}
                  onChange={(e) => change("remarks", e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold text-xs">Inv Remarks:</label>
                <input
                  type="text"
                  className="w-full border p-1 text-xs"
                  value={data.invoiceRemarks || ""}
                  onChange={(e) => change("invoiceRemarks", e.target.value)}
                  placeholder="PO / flows to Closed"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-bold text-xs">Order Confirmed:</label>
                <input
                  type="date"
                  className="w-full border p-1 text-xs"
                  value={data.orderConfirmedDate?.substring(0, 10) || ""}
                  onChange={(e) => change("orderConfirmedDate", e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold text-xs">Exp Receive:</label>
                <input
                  type="date"
                  className="w-full border p-1 text-xs"
                  value={data.expectedReceiveDate?.substring(0, 10) || ""}
                  onChange={(e) => change("expectedReceiveDate", e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold text-xs">Pick-Up:</label>
                <input
                  type="datetime-local"
                  className="w-full border p-1 text-xs"
                  value={data.schedulePickUp?.substring(0, 16) || ""}
                  onChange={(e) => change("schedulePickUp", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-xs">Status:</label>
                <select
                  className="w-full border p-1 text-xs"
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
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setFuModal(true)}
                  className="bg-blue-600 text-white px-2 py-1 rounded text-xs w-full"
                >
                  View Follow-Ups
                </button>
              </div>
            </div>
          </form>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={onClose} className="px-3 py-1 border rounded text-xs">
              Cancel
            </button>
            <button
              onClick={save}
              className="px-3 py-1 bg-green-700 text-white rounded text-xs"
            >
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

/* ---------------- DEFAULT PO TERMS ---------------- */
const DEFAULT_PO_TERMS = `1. The Vendor warrants that all goods supplied shall strictly conform to the specifications, samples (pre-approved or otherwise), drawings, and/or standards explicitly referenced in this Purchase Order.

2. Quality Standards: All materials must be new, defect-free, and of first-class quality.

3. Right to Inspect and Reject: We reserve the right to inspect all goods upon delivery.

4. Proofing: For custom or branded items, submit pre-production sample for approval.

5. Firm Delivery Date: Required Delivery Date is firm and of the essence.

6. Notification of Delay: Vendor must immediately notify us of any potential delay.

7. Late Delivery Penalty: Right to assess penalty for Liquidated Damages.

8. Cancellation Rights: May cancel PO without penalty if delayed.

9. Payment Terms: Net 30 days.

10. Shipping Terms: Specify responsibility.

11. Confidentiality: Do not disclose client details without consent.

12. Acceptance: Vendor acceptance occurs upon earliest of acknowledgment, shipment, or commencement.

13. Jurisdiction: Bangalore.`;

/* ---------------- Generate PO Modal ---------------- */
function GeneratePOModal({ row, onClose, onCreated }) {
  const [vendorId, setVendorId] = useState("");
  const [productCode, setProductCode] = useState("");
  const [issueDate, setIssueDate] = useState(toISODate(new Date()));
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState(
    toISODate(row?.deliveryDateTime)
  );
  const [deliveryAddress, setDeliveryAddress] = useState("Ace Gifting Solutions");

  const [vendorGst, setVendorGst] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");

  const [remarks, setRemarks] = useState("");
  const [terms, setTerms] = useState(DEFAULT_PO_TERMS);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!vendorId) {
      alert("Please select a vendor.");
      return;
    }
    if (!row || !row._id || String(row._id).startsWith("temp_")) {
      alert("Save first, then generate PO.");
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
        vendor: {
          gstNumber: vendorGst || undefined,
          address: vendorAddress || undefined,
        },
      };

      const url = `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchase-orders/from-open/${row._id}`;
      const res = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const po = res.data && res.data.po;
      alert(`PO created: ${po && po.poNumber ? po.poNumber : "(no number)"}`);
      if (onCreated) onCreated(po);
      onClose();
    } catch (e) {
      console.error(e);
      alert(
        (e &&
          e.response &&
          e.response.data &&
          e.response.data.message) ||
          "Failed to generate PO"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white p-4 rounded w-full max-w-md text-xs">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-purple-700">Generate PO</h3>
          <button onClick={onClose} className="text-xl">×</button>
        </div>

        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-xs">Job Sheet #</label>
              <div className="border rounded p-1 text-xs">{row.jobSheetNumber}</div>
            </div>
            <div>
              <label className="font-bold text-xs">Product</label>
              <div className="border rounded p-1 text-xs truncate">
                {row.product}
                {row.size ? ` — ${row.size}` : ""}
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-xs">Vendor</label>
            <VendorTypeahead
              value={vendorId}
              onChange={(id, v) => {
                setVendorId(id || "");
                if (v) {
                  setVendorGst(v.gst || "");
                  setVendorAddress(v.address || v.location || "");
                } else {
                  setVendorGst("");
                  setVendorAddress("");
                }
              }}
              placeholder="Search vendor..."
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-xs">Vendor GST</label>
              <input
                type="text"
                className="w-full border p-1 rounded text-xs"
                value={vendorGst}
                onChange={(e) => setVendorGst(e.target.value)}
                placeholder="GSTIN"
              />
            </div>
            <div>
              <label className="font-bold text-xs">Issue Date</label>
              <input
                type="date"
                className="w-full border p-1 rounded text-xs"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-xs">Delivery Date</label>
            <input
              type="date"
              className="w-full border p-1 rounded text-xs"
              value={requiredDeliveryDate}
              onChange={(e) => setRequiredDeliveryDate(e.target.value)}
            />
          </div>

          <div>
            <label className="font-bold text-xs">Delivery Address</label>
            <input
              type="text"
              className="w-full border p-1 rounded text-xs"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Address"
            />
          </div>

          <div>
            <label className="font-bold text-xs">PO Remarks</label>
            <input
              type="text"
              className="w-full border p-1 rounded text-xs"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex justify-end gap-1">
          <button onClick={onClose} className="px-2 py-1 border rounded text-xs">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-2 py-1 bg-[#Ff8045] text-white rounded text-xs disabled:opacity-60"
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
  const [sortConfig, setSortConfig] = useState({
    key: "deliveryDateTime",
    direction: "asc",
  });

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
      } catch {
        /* ignore */
      }
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

    return purchases.filter((rec) => !jobSheetStatus[rec.jobSheetNumber]?.allReceived);
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

        if (k === "completionState") {
          return (r.completionState || "") === v;
        }

        if (k === "__poStatus") {
          const generated = !!(r.poId || r.poNumber);
          return v === "generated" ? generated : v === "not" ? !generated : true;
        }

        const raw = r[k];
        const cell = raw
          ? k.includes("Date")
            ? new Date(raw).toLocaleDateString()
            : String(raw)
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
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
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
        Completion: r.completionState || "",
        "Job Sheet #": r.jobSheetNumber,
        "Job Sheet Date": fmtDate(r.jobSheetCreatedDate),
        Client: r.clientCompanyName,
        Event: r.eventName,
        Product: r.product,
        "Product Price":
          typeof r.productPrice === "number" ? r.productPrice : "",
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

  if (loading)
    return (
      <div className="p-4">
        <h1 className="text-lg font-bold text-purple-700 mb-3">Open Purchases</h1>
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-300 rounded"></div>
          <div className="h-48 bg-gray-300 rounded"></div>
        </div>
      </div>
    );

  return (
    <div className="p-4">
      {!perms.includes("write-purchase") && (
        <div className="mb-3 p-1 bg-red-100 text-red-800 rounded text-xs">
          No edit permission for purchase records.
        </div>
      )}
      <h1 className="text-lg font-bold text-[#Ff8045] mb-3">Open Purchases</h1>
      <div className="flex flex-wrap gap-1 mb-3">
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-1 rounded text-xs flex-grow"
        />
        <button
          onClick={() => setShowFilters((f) => !f)}
          className="bg-[#Ff8045] text-white px-3 py-1 rounded text-xs"
        >
          Filters
        </button>
        {(isSuperAdmin || canExport) && (
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-3 py-1 rounded text-xs"
          >
            Export
          </button>
        )}
      </div>

      {/* Advanced filters toggle content */}
      {showFilters && (
        <div className="mb-3 border rounded p-2 text-xs bg-gray-50 space-y-1">
          <div className="font-bold mb-1">Advanced Filters</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
            <div>
              <label className="block text-xs">JS # From</label>
              <input
                type="text"
                className="border p-1 rounded w-full text-xs"
                value={advFilters.jobSheetNumber.from}
                onChange={(e) =>
                  setAdvFilters((p) => ({
                    ...p,
                    jobSheetNumber: {
                      ...p.jobSheetNumber,
                      from: e.target.value,
                    },
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs">JS # To</label>
              <input
                type="text"
                className="border p-1 rounded w-full text-xs"
                value={advFilters.jobSheetNumber.to}
                onChange={(e) =>
                  setAdvFilters((p) => ({
                    ...p,
                    jobSheetNumber: {
                      ...p.jobSheetNumber,
                      to: e.target.value,
                    },
                  }))
                }
              />
            </div>

            {[
              ["jobSheetCreatedDate", "JS Date"],
              ["deliveryDateTime", "Delivery"],
              ["orderConfirmedDate", "Order Conf"],
              ["expectedReceiveDate", "Exp Recv"],
              ["schedulePickUp", "Pick-Up"],
            ].map(([key, label]) => (
              <React.Fragment key={key}>
                <div>
                  <label className="block text-xs">{label} From</label>
                  <input
                    type="date"
                    className="border p-1 rounded w-full text-xs"
                    value={advFilters[key].from}
                    onChange={(e) =>
                      setAdvFilters((p) => ({
                        ...p,
                        [key]: { ...p[key], from: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs">{label} To</label>
                  <input
                    type="date"
                    className="border p-1 rounded w-full text-xs"
                    value={advFilters[key].to}
                    onChange={(e) =>
                      setAdvFilters((p) => ({
                        ...p,
                        [key]: { ...p[key], to: e.target.value },
                      }))
                    }
                  />
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-end gap-1 mt-1">
            <button
              className="px-2 py-0.5 border rounded text-xs"
              onClick={() => setAdvFilters(initAdv)}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border-b border-gray-300 text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-1 border w-24 cursor-pointer" onClick={() => sortBy("completionState")}>
                Completion{sortConfig.key === "completionState" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-20 cursor-pointer" onClick={() => sortBy("jobSheetCreatedDate")}>
                JS Date{sortConfig.key === "jobSheetCreatedDate" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-20 cursor-pointer" onClick={() => sortBy("jobSheetNumber")}>
                JS #{sortConfig.key === "jobSheetNumber" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-32 cursor-pointer" onClick={() => sortBy("clientCompanyName")}>
                Client{sortConfig.key === "clientCompanyName" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-24 cursor-pointer" onClick={() => sortBy("eventName")}>
                Event{sortConfig.key === "eventName" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-32 cursor-pointer" onClick={() => sortBy("product")}>
                Product{sortConfig.key === "product" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-16 cursor-pointer" onClick={() => sortBy("productPrice")}>
                Cost{sortConfig.key === "productPrice" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-16 cursor-pointer" onClick={() => sortBy("size")}>
                Size{sortConfig.key === "size" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-12 cursor-pointer" onClick={() => sortBy("qtyRequired")}>
                Qty Req{sortConfig.key === "qtyRequired" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-12 cursor-pointer" onClick={() => sortBy("qtyOrdered")}>
                Qty Ord{sortConfig.key === "qtyOrdered" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-20 cursor-pointer" onClick={() => sortBy("sourcedBy")}>
                By{sortConfig.key === "sourcedBy" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-32 cursor-pointer" onClick={() => sortBy("sourcingFrom")}>
                Source{sortConfig.key === "sourcingFrom" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-20 cursor-pointer" onClick={() => sortBy("deliveryDateTime")}>
                Deliv Date{sortConfig.key === "deliveryDateTime" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-24 cursor-pointer" onClick={() => sortBy("vendorContactNumber")}>
                Vendor #{sortConfig.key === "vendorContactNumber" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-20 cursor-pointer" onClick={() => sortBy("orderConfirmedDate")}>
                Order Conf{sortConfig.key === "orderConfirmedDate" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-20 cursor-pointer" onClick={() => sortBy("expectedReceiveDate")}>
                Exp Recv{sortConfig.key === "expectedReceiveDate" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-20 cursor-pointer" onClick={() => sortBy("schedulePickUp")}>
                Pick-Up{sortConfig.key === "schedulePickUp" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-32 cursor-pointer" onClick={() => sortBy("invoiceRemarks")}>
                Inv Rmk{sortConfig.key === "invoiceRemarks" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-40 cursor-pointer" onClick={() => sortBy("remarks")}>
                Remarks{sortConfig.key === "remarks" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-24 cursor-pointer" onClick={() => sortBy("status")}>
                Status{sortConfig.key === "status" ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
              <th className="p-1 border w-24">Follow-Up</th>
              <th className="p-1 border w-24">PO Status</th>
              <th className="p-1 border w-16">Actions</th>
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
                      ? "bg-red-100"
                      : p.status === "pending"
                      ? "bg-orange-100"
                      : p.status === "received"
                      ? "bg-green-100"
                      : ""
                  }
                >
                  <td className="p-1 border text-center">{p.completionState || ""}</td>
                  <td className="p-1 border">{fmtDate(p.jobSheetCreatedDate)}</td>
                  <td className="p-1 border">
                    <button
                      className="text-blue-500 hover:text-blue-700 text-xs underline"
                      onClick={(e) => {
                        e.preventDefault();
                        handleOpenModal(p.jobSheetNumber);
                      }}
                    >
                      {p.jobSheetNumber || "(No #)"}
                    </button>
                  </td>
                  <td className="p-1 border truncate max-w-[8rem]" title={p.clientCompanyName}>
                    {p.clientCompanyName}
                  </td>
                  <td className="p-1 border truncate max-w-[6rem]" title={p.eventName}>
                    {p.eventName}
                  </td>
                  <td className="p-1 border truncate max-w-[8rem]" title={p.product}>
                    {p.product}
                  </td>
                  <td className="p-1 border text-right">
                    {typeof p.productPrice === "number"
                      ? p.productPrice.toFixed(2)
                      : "—"}
                  </td>
                  <td className="p-1 border">{p.size || "—"}</td>
                  <td className="p-1 border text-center">{p.qtyRequired}</td>
                  <td className="p-1 border text-center">{p.qtyOrdered}</td>
                  <td className="p-1 border truncate max-w-[5rem]" title={p.sourcedBy}>
                    {p.sourcedBy || ""}
                  </td>
                  <td className="p-1 border truncate max-w-[8rem]" title={p.sourcingFrom}>
                    {p.sourcingFrom}
                  </td>
                  <td className="p-1 border">{fmtDate(p.deliveryDateTime)}</td>
                  <td className="p-1 border truncate max-w-[6rem]" title={p.vendorContactNumber}>
                    {p.vendorContactNumber}
                  </td>
                  <td className="p-1 border">{fmtDate(p.orderConfirmedDate)}</td>
                  <td className="p-1 border">{fmtDate(p.expectedReceiveDate)}</td>
                  <td className="p-1 border">{fmtDate(p.schedulePickUp)}</td>
                  <td className="p-1 border truncate max-w-[8rem]" title={p.invoiceRemarks}>
                    {p.invoiceRemarks || ""}
                  </td>
                  <td className="p-1 border truncate max-w-[10rem]" title={p.remarks}>
                    {p.remarks}
                  </td>
                  <td className="p-1 border text-center">{p.status || "—"}</td>
                  <td className="p-1 border truncate max-w-[6rem]" title={latest ? (latest.remarks || latest.note) : ""}>
                    {latest
                      ? latest.remarks && latest.remarks.trim()
                        ? latest.remarks
                        : latest.note || "—"
                      : "—"}
                  </td>
                  <td className="p-1 border text-center">
                    {poGenerated ? (
                      <span className="inline-block px-1 py-0 text-[9px] rounded bg-green-600 text-white">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-block px-1 py-0 text-[9px] rounded bg-gray-400 text-white">
                        No
                      </span>
                    )}
                  </td>
                  <td className="p-1 border relative">
                    <div className="mt-0">
                      <button
                        className="w-full border rounded py-0 text-[10px]"
                        onClick={() =>
                          setMenuOpenFor((cur) => (cur === p._id ? null : p._id))
                        }
                      >
                        ⋮
                      </button>
                      {menuOpen && (
                        <div className="absolute right-0 z-[120] mt-1 w-32 bg-white border rounded shadow text-xs">
                          <button
                            className={
                              "block w-full text-left px-2 py-1 hover:bg-gray-100 " +
                              (!perms.includes("write-purchase") ||
                              p.status === "received"
                                ? "opacity-50 cursor-not-allowed"
                                : "")
                            }
                            onClick={() => {
                              if (
                                !perms.includes("write-purchase") ||
                                p.status === "received"
                              )
                                return;
                              setMenuOpenFor(null);
                              setCurrentEdit(p);
                              setEditModal(true);
                            }}
                          >
                            Edit
                          </button>

                          <button
                            className={
                              "block w-full text-left px-2 py-1 hover:bg-gray-100 text-red-600 " +
                              (!perms.includes("write-purchase")
                                ? "opacity-50 cursor-not-allowed"
                                : "")
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
                                "block w-full text-left px-2 py-1 hover:bg-gray-100 " +
                                (!perms.includes("write-purchase")
                                  ? "opacity-50 cursor-not-allowed"
                                  : "")
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
      </div>

      {isModalOpen && (
        <JobSheetGlobal
          jobSheetNumber={selectedJobSheetNumber}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}

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