"use client";

import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import * as XLSX from "xlsx";

/* ---------------- Helpers ---------------- */
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "");
const toISO = (d) => (d ? String(d).substring(0, 10) : "");
const nz = (v) => (isNaN(+v) ? 0 : +v);

/** Client preview totals (server will recompute anyway on save) */
function computeTotals(items) {
  let sub = 0;
  let gst = 0;
  for (const it of items || []) {
    const line = nz(it.quantity) * nz(it.unitPrice);
    const gstAmt = line * (nz(it.gstPercent) / 100);
    sub += line;
    gst += gstAmt;
  }
  return { subTotal: sub, gstTotal: gst, grandTotal: Math.round(sub + gst) };
}

/** Flatten server PO -> UI shape (keeps raw for anything else) */
function normalizePO(po) {
  const r = po || {};
  const v = r.vendor || {};
  const first = (r.items && r.items[0]) || {};
  return {
    _id: r._id || r.id || "",
    poNumber: r.poNumber || "",
    issueDate: r.issueDate || r.createdAt || "",
    requiredDeliveryDate: r.requiredDeliveryDate || "",
    deliveryAddress: r.deliveryAddress || "",
    jobSheetNumber: r.jobSheetNumber || "",
    clientCompanyName: r.clientCompanyName || "",
    eventName: r.eventName || "",

    // vendor
    vendorCompany: v.vendorCompany || "",
    vendorName: v.vendorName || "",
    vendorAddress: v.address || "",
    vendorEmail: v.email || "",
    vendorPhone: v.phone || "",
    vendorGst: v.gstNumber || v.gst || "",

    // first item (for table row)
    firstItem: {
      productName: first.productName || "",
      productDescription: first.productDescription || "",
      quantity: first.quantity || 0,
      unitPrice: first.unitPrice || 0,
      gstPercent: first.gstPercent || 0,
      total: first.total || 0,
      hsnCode: first.hsnCode || "",
    },

    // full items for modal editing
    items: Array.isArray(r.items)
      ? r.items.map((it, i) => ({
          itemNo: it.itemNo ?? i + 1,
          productName: it.productName || "",
          productDescription: it.productDescription || "",
          quantity: it.quantity || 0,
          unitPrice: it.unitPrice || 0,
          gstPercent: it.gstPercent || 0,
          total: it.total || 0,
          hsnCode: it.hsnCode || "",
        }))
      : [],

    // totals
    subTotal: r.subTotal || 0,
    gstTotal: r.gstTotal || 0,
    grandTotal: r.grandTotal || 0,

    remarks: r.remarks || "",
    terms: r.terms || "",

    raw: r, // keep whole server doc (for vendorId, etc.)
  };
}

/* Default Terms (frontend fallback to ensure it gets saved if blank) */
const DEFAULT_TERMS = `The Vendor warrants that all goods supplied shall strictly confirm to the specifications, samples (pre-approved or otherwise), drawings, and/or standards explicitly referenced in this Purchase Order.
Quality Standards: All materials must be new, defect-free, and of first-class quality, suitable for the intended use as premium corporate gifts. This includes specific requirements on durability, colorfastness, finish, and safety standards (e.g., non-toxic, food-safe, etc.).
Right to Inspect and Reject: We reserve the right to inspect all goods upon delivery. If, upon inspection, any item is found to be defective, non-conforming, or of unacceptable quality, we may reject the entire shipment or the non-conforming portion at the Vendor's risk and expense. The Vendor shall bear all costs of return and shall, either provide a full refund or replace the rejected goods within agreed days.
Proofing: For custom or branded items, the Vendor must submit a pre-production sample/proof for written approval before mass production begins. Production without written approval is at the Vendor's sole risk.
Firm Delivery Date: The Required Delivery Date specified in the Header Details is firm and of the essence. The Vendor must ensure delivery to the specified address on or before this date.
Notification of Delay: The Vendor must immediately notify us in writing of any potential delay, providing the reasons and a revised expected delivery date.
Late Delivery Penalty (Liquidated Damages): Should the Vendor fail to deliver the goods by the Required Delivery Date, we reserve the right to assess a penalty for Liquidated Damages.
Cancellation Rights: If delivery is delayed by more than committed days beyond the Required Delivery Date, we may, without prejudice to any other rights or remedies, cancel the entire Purchase Order without penalty and secure the goods from an alternate source, holding the original Vendor responsible for any additional costs incurred.
Payment Terms: Net 30 days from the later of (a) the invoice date or (b) the date of acceptance of the goods by Ace.
Shipping Terms: Specify the shipping responsibility.
The Vendor agrees not to disclose or use any specific branding, client details, or product designs related to this PO for any other purpose without the prior written consent of Ace Gifting Solutions.
The Vendor's acceptance of this Purchase Order is deemed to occur upon the earliest of (a) written acknowledgment, (b) shipment of the goods, or (c) commencement of work on the goods.
PO is subject to Bangalore Jurisdiction.`;

/* ---------- Edit PO Modal (scrollable with sticky footer) ---------- */
function EditPOModal({ po, onClose, onSave }) {
  const fmtNum = (v) => (isNaN(+v) ? 0 : +v);
  const toISO2 = (d) => (d ? String(d).substring(0, 10) : "");

  // header
  const [issueDate, setIssueDate] = useState(toISO2(po.issueDate));
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState(toISO2(po.requiredDeliveryDate));
  const [deliveryAddress, setDeliveryAddress] = useState(po.deliveryAddress || "");
  const [clientCompanyName, setClientCompanyName] = useState(po.clientCompanyName || "");
  const [eventName, setEventName] = useState(po.eventName || "");
  const [jobSheetNumber, setJobSheetNumber] = useState(po.jobSheetNumber || "");
  const [remarks, setRemarks] = useState(po.remarks || "");
  const [terms, setTerms] = useState(po.terms || "");

  // vendor
  const [vendorCompany, setVendorCompany] = useState(po.vendorCompany || "");
  const [vendorName, setVendorName] = useState(po.vendorName || "");
  const [vendorAddress, setVendorAddress] = useState(po.vendorAddress || "");
  const [vendorEmail, setVendorEmail] = useState(po.vendorEmail || "");
  const [vendorPhone, setVendorPhone] = useState(po.vendorPhone || "");
  const [vendorGst, setVendorGst] = useState(po.vendorGst || "");

  // items
  const [items, setItems] = useState(po.items || []);

  const computeTotalsLocal = (list) => {
    let sub = 0;
    let gst = 0;
    for (const it of list) {
      const line = fmtNum(it.quantity) * fmtNum(it.unitPrice);
      const g = line * (fmtNum(it.gstPercent) / 100);
      sub += line;
      gst += g;
    }
    return { subTotal: sub, gstTotal: gst, grandTotal: Math.round(sub + gst) };
  };
  const { subTotal, gstTotal, grandTotal } = computeTotalsLocal(items);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemNo: prev.length + 1,
        productName: "",
        productDescription: "",
        quantity: 0,
        unitPrice: 0,
        gstPercent: 0,
        hsnCode: "",
        total: 0,
      },
    ]);
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, itemNo: i + 1 })));
  };

  const changeItem = (idx, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      const cur = { ...copy[idx] };
      if (["quantity", "unitPrice", "gstPercent"].includes(field)) cur[field] = fmtNum(value);
      else cur[field] = value;
      cur.total = fmtNum(cur.quantity) * fmtNum(cur.unitPrice);
      copy[idx] = cur;
      return copy;
    });
  };

  const save = () => {
    const payload = {
      issueDate: issueDate || null,
      requiredDeliveryDate: requiredDeliveryDate || null,
      deliveryAddress,
      clientCompanyName,
      eventName,
      jobSheetNumber,
      remarks,
      terms: terms && terms.trim() ? terms : DEFAULT_TERMS,
      vendor: {
        vendorId: po.raw?.vendor?.vendorId || undefined,
        vendorCompany,
        vendorName,
        address: vendorAddress,
        phone: vendorPhone,
        email: vendorEmail,
        gstNumber: vendorGst,
      },
      items: items.map((it, i) => ({
        itemNo: i + 1,
        productName: it.productName || "",
        productDescription: it.productDescription || "",
        quantity: Number.isFinite(+it.quantity) ? +it.quantity : 0,
        unitPrice: Number.isFinite(+it.unitPrice) ? +it.unitPrice : 0,
        gstPercent: Number.isFinite(+it.gstPercent) ? +it.gstPercent : 0,
        total:
          (Number.isFinite(+it.quantity) ? +it.quantity : 0) *
          (Number.isFinite(+it.unitPrice) ? +it.unitPrice : 0),
        hsnCode: it.hsnCode || "",
      })),
    };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white w-[95vw] max-w-5xl max-h-[90vh] rounded shadow-lg flex flex-col text-xs">
        {/* header (non-scrolling) */}
        <div className="px-6 pt-6 pb-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-purple-700">Edit Purchase Order</h2>
          <button onClick={onClose} className="text-2xl leading-none px-2">
            ×
          </button>
        </div>

        {/* body (scrollable) */}
        <div className="px-6 py-4 overflow-y-auto">
          {/* Basic & Client/Event */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="font-bold">PO Number</label>
              <div className="border rounded p-2 bg-gray-50">{po.poNumber || "-"}</div>
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
              <label className="font-bold">Required Delivery</label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={requiredDeliveryDate}
                onChange={(e) => setRequiredDeliveryDate(e.target.value)}
              />
            </div>

            <div>
              <label className="font-bold">Client</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                value={clientCompanyName}
                onChange={(e) => setClientCompanyName(e.target.value)}
              />
            </div>
            <div>
              <label className="font-bold">Event</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </div>
            <div>
              <label className="font-bold">Job Sheet #</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                value={jobSheetNumber}
                onChange={(e) => setJobSheetNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Delivery & Notes */}
          <div className="mt-3">
            <label className="font-bold">Delivery Address</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="font-bold">Remarks</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
            <div>
              <label className="font-bold">Terms</label>
              <textarea
                className="w-full border p-2 rounded min-h-[96px]"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>
          </div>

          {/* Vendor */}
          <div className="mt-4 border rounded p-3">
            <div className="font-semibold mb-2 text-purple-700">Vendor</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-bold">Company</label>
                <input
                  className="w-full border p-2 rounded"
                  value={vendorCompany}
                  onChange={(e) => setVendorCompany(e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold">Contact Name</label>
                <input
                  className="w-full border p-2 rounded"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold">Phone</label>
                <input
                  className="w-full border p-2 rounded"
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold">Email</label>
                <input
                  className="w-full border p-2 rounded"
                  value={vendorEmail}
                  onChange={(e) => setVendorEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="font-bold">GSTIN</label>
                <input
                  className="w-full border p-2 rounded"
                  value={vendorGst}
                  onChange={(e) => setVendorGst(e.target.value)}
                />
              </div>
              <div className="md:col-span-1 md:col-start-1 md:row-start-3 md:col-span-3">
                <label className="font-bold">Address</label>
                <input
                  className="w-full border p-2 rounded"
                  value={vendorAddress}
                  onChange={(e) => setVendorAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-purple-700">Items</div>
              <button
                onClick={addItem}
                className="px-2 py-1 bg-blue-600 text-white rounded"
              >
                + Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 border">#</th>
                    <th className="p-2 border">Product</th>
                    <th className="p-2 border">Description</th>
                    <th className="p-2 border">HSN</th>
                    <th className="p-2 border">Qty</th>
                    <th className="p-2 border">Unit Price</th>
                    <th className="p-2 border">GST %</th>
                    <th className="p-2 border">Line Total</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const line = nz(it.quantity) * nz(it.unitPrice);
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-2 border text-center">{idx + 1}</td>
                        <td className="p-2 border">
                          <input
                            className="w-full border p-1 rounded"
                            value={it.productName}
                            onChange={(e) =>
                              changeItem(idx, "productName", e.target.value)
                            }
                          />
                        </td>
                        <td className="p-2 border">
                          <input
                            className="w-full border p-1 rounded"
                            value={it.productDescription}
                            onChange={(e) =>
                              changeItem(idx, "productDescription", e.target.value)
                            }
                          />
                        </td>
                        <td className="p-2 border">
                          <input
                            className="w-full border p-1 rounded"
                            value={it.hsnCode || ""}
                            onChange={(e) => changeItem(idx, "hsnCode", e.target.value)}
                          />
                        </td>
                        <td className="p-2 border">
                          <input
                            type="number"
                            className="w-24 border p-1 rounded text-right"
                            value={it.quantity}
                            onChange={(e) =>
                              changeItem(idx, "quantity", e.target.value)
                            }
                          />
                        </td>
                        <td className="p-2 border">
                          <input
                            type="number"
                            className="w-28 border p-1 rounded text-right"
                            value={it.unitPrice}
                            onChange={(e) =>
                              changeItem(idx, "unitPrice", e.target.value)
                            }
                          />
                        </td>
                        <td className="p-2 border">
                          <input
                            type="number"
                            className="w-20 border p-1 rounded text-right"
                            value={it.gstPercent}
                            onChange={(e) =>
                              changeItem(idx, "gstPercent", e.target.value)
                            }
                          />
                        </td>
                        <td className="p-2 border text-right">
                          {line.toFixed(2)}
                        </td>
                        <td className="p-2 border">
                          <button
                            className="px-2 py-1 bg-red-600 text-white rounded"
                            onClick={() => removeItem(idx)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td className="p-3 text-center text-gray-500" colSpan={9}>
                        No items. Click “Add Item” to start.
                      </td>
                    </tr>
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot>
                    <tr>
                      <td
                        className="p-2 border text-right font-semibold"
                        colSpan={7}
                      >
                        Subtotal
                      </td>
                      <td className="p-2 border text-right">
                        {subTotal.toFixed(2)}
                      </td>
                      <td className="p-2 border"></td>
                    </tr>
                    <tr>
                      <td
                        className="p-2 border text-right font-semibold"
                        colSpan={7}
                      >
                        GST
                      </td>
                      <td className="p-2 border text-right">
                        {gstTotal.toFixed(2)}
                      </td>
                      <td className="p-2 border"></td>
                    </tr>
                    <tr>
                      <td
                        className="p-2 border text-right font-semibold"
                        colSpan={7}
                      >
                        Grand Total
                      </td>
                      <td className="p-2 border text-right">
                        {grandTotal.toFixed(2)}
                      </td>
                      <td className="p-2 border"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* footer (sticky) */}
        <div className="px-6 py-3 border-t sticky bottom-0 bg-white flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={save}
            className="px-3 py-2 bg-green-700 text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------- Portal-based Kebab Menu to avoid clipping --------- */
function KebabMenu({ anchorRef, onClose, children, width = 176 }) {
  const [pos, setPos] = useState({ top: 0, left: 0, above: false });
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    const place = () => {
      if (!anchorRef?.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const pad = 4;
      const estimatedHeight = 140;
      const spaceBelow = window.innerHeight - rect.bottom;
      const above = spaceBelow < estimatedHeight + 12;

      const top = above
        ? Math.max(8, rect.top - estimatedHeight - pad)
        : Math.min(window.innerHeight - 8, rect.bottom + pad);
      const left = Math.min(
        window.innerWidth - width - 8,
        rect.right - width
      );
      setPos({ top, left, above });
    };

    place();
    const onScroll = () => place();
    const onResize = () => place();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [anchorRef, width]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target)) return;
      if (anchorRef?.current && anchorRef.current.contains(e.target)) return;
      onClose?.();
    };
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose, anchorRef]);

  const node = (
    <div
      ref={menuRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, width }}
      className="z-[9999] rounded-md border bg-white shadow-xl"
      role="menu"
    >
      {children}
    </div>
  );
  return ReactDOM.createPortal(node, document.body);
}

/* ---------- List Page ---------- */
export default function PurchaseOrdersList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editPo, setEditPo] = useState(null);

  // kebab menu state: which row is open + ref to anchor button
  const [openMenuId, setOpenMenuId] = useState(null);
  const anchorRefs = useRef({});

  // header filters per-column
  const [filters, setFilters] = useState({
    poNumber: "",
    jobSheetNumber: "",
    clientCompanyName: "",
    eventName: "",
    productName: "",
    qty: "",
    unitPrice: "",
    gstPercent: "",
    lineTotal: "",
    vendor: "",
    issueDate: "",
    requiredDeliveryDate: "",
    subTotal: "",
    gstTotal: "",
    grandTotal: "",
  });

  // sorting
  const [sort, setSort] = useState({ key: "createdAt", dir: "desc" });

  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]") || [];
  const canWrite = permissions.includes("write-purchase");
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchase-orders`,
          { headers, params: { sortKey: "createdAt", sortDirection: "desc" } }
        );
        const list = Array.isArray(res.data) ? res.data : [];
        setRows(list.map(normalizePO));
      } catch (e) {
        console.error("Fetch POs failed:", e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // global text search
  const globallySearched = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = [
        r.poNumber,
        r.jobSheetNumber,
        r.clientCompanyName,
        r.eventName,
        r.vendorCompany,
        r.vendorName,
        r.deliveryAddress,
        r.remarks,
        r.firstItem.productName,
        r.firstItem.productDescription,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  // per-column header filters
  const headerFiltered = useMemo(() => {
    return globallySearched.filter((r) => {
      const checks = [
        [filters.poNumber, r.poNumber],
        [filters.jobSheetNumber, r.jobSheetNumber],
        [filters.clientCompanyName, r.clientCompanyName],
        [filters.eventName, r.eventName],
        [filters.productName, r.firstItem.productName],
        [filters.qty, String(r.firstItem.quantity)],
        [filters.unitPrice, String(r.firstItem.unitPrice)],
        [filters.gstPercent, String(r.firstItem.gstPercent)],
        [filters.lineTotal, String(r.firstItem.total)],
        [filters.vendor, r.vendorCompany || r.vendorName || ""],
        [filters.issueDate, fmtDate(r.issueDate)],
        [filters.requiredDeliveryDate, fmtDate(r.requiredDeliveryDate)],
        [filters.subTotal, String(r.subTotal)],
        [filters.gstTotal, String(r.gstTotal)],
        [filters.grandTotal, String(r.grandTotal)],
      ];
      return checks.every(([needle, hay]) =>
        !needle
          ? true
          : String(hay || "")
              .toLowerCase()
              .includes(String(needle).toLowerCase())
      );
    });
  }, [globallySearched, filters]);

  // sorting client-side
  const sorted = useMemo(() => {
    const data = [...headerFiltered];
    const { key, dir } = sort || {};
    if (!key || !dir) return data;

    const getter = (r) => {
      switch (key) {
        case "poNumber":
          return r.poNumber || "";
        case "jobSheetNumber":
          return r.jobSheetNumber || "";
        case "clientCompanyName":
          return r.clientCompanyName || "";
        case "eventName":
          return r.eventName || "";
        case "productName":
          return r.firstItem?.productName || "";
        case "qty":
          return nz(r.firstItem?.quantity);
        case "unitPrice":
          return nz(r.firstItem?.unitPrice);
        case "gstPercent":
          return nz(r.firstItem?.gstPercent);
        case "lineTotal":
          return nz(r.firstItem?.total);
        case "vendor":
          return (r.vendorCompany || r.vendorName || "").toLowerCase();
        case "issueDate":
          return new Date(r.issueDate || 0).getTime();
        case "requiredDeliveryDate":
          return new Date(r.requiredDeliveryDate || 0).getTime();
        case "subTotal":
          return nz(r.subTotal);
        case "gstTotal":
          return nz(r.gstTotal);
        case "grandTotal":
          return nz(r.grandTotal);
        default:
          return 0;
      }
    };

    data.sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [headerFiltered, sort]);

  const cycleSort = (key) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      if (prev.dir === "desc") return { key: "", dir: "" };
      return { key, dir: "asc" };
    });
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      sorted.map((r) => ({
        "PO #": r.poNumber,
        "Job Sheet #": r.jobSheetNumber,
        Client: r.clientCompanyName,
        Event: r.eventName,
        Vendor: r.vendorCompany || r.vendorName,
        "Issue Date": fmtDate(r.issueDate),
        "Required Delivery": fmtDate(r.requiredDeliveryDate),
        "Line Product": r.firstItem.productName,
        "Line Desc": r.firstItem.productDescription,
        Qty: r.firstItem.quantity,
        "Unit Price": r.firstItem.unitPrice,
        "GST %": r.firstItem.gstPercent,
        "Line Total": r.firstItem.total,
        Subtotal: r.subTotal,
        "GST Total": r.gstTotal,
        "Grand Total": r.grandTotal,
        "Delivery Address": r.deliveryAddress,
        Remarks: r.remarks,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "POs");
    XLSX.writeFile(wb, "purchase_orders.xlsx");
  };

  // export to PDF (client-side print to PDF) in requested layout
  const exportRowToPdf = (r) => {
    const items =
      Array.isArray(r.items) && r.items.length
        ? r.items.map((it, i) => ({
            itemNo: it.itemNo ?? i + 1,
            productName: it.productName || "",
            productDescription: it.productDescription || "",
            hsnCode: it.hsnCode || "",
            quantity: isNaN(+it.quantity) ? 0 : +it.quantity,
            unitPrice: isNaN(+it.unitPrice) ? 0 : +it.unitPrice,
            gstPercent: isNaN(+it.gstPercent) ? 0 : +it.gstPercent,
          }))
        : [
            {
              itemNo: 1,
              productName: r.firstItem?.productName || "",
              productDescription: r.firstItem?.productDescription || "",
              hsnCode: r.firstItem?.hsnCode || "",
              quantity: isNaN(+r.firstItem?.quantity) ? 0 : +r.firstItem.quantity,
              unitPrice: isNaN(+r.firstItem?.unitPrice)
                ? 0
                : +r.firstItem.unitPrice,
              gstPercent: isNaN(+r.firstItem?.gstPercent)
                ? 0
                : +r.firstItem.gstPercent,
            },
          ].filter(Boolean);

    const fmtAmt = (n) =>
      (Number.isFinite(+n) ? +n : 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    const fmtDateShort = (d) => {
      if (!d) return "—";
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return "—";
      return dt.toLocaleDateString("en-GB");
    };

    let subTotal = 0,
      gstTotal = 0,
      grandTotal = 0;
    const rowsCalc = items.map((it) => {
      const line = (it.quantity || 0) * (it.unitPrice || 0);
      const gstAmt = line * ((it.gstPercent || 0) / 100);
      const total = line + gstAmt;
      subTotal += line;
      gstTotal += gstAmt;
      grandTotal += total;
      return { ...it, line, gstAmt, total };
    });

    const win = window.open("", "_blank");
    if (!win) return;

    const style = `
    <style>
      @page { size: A4; margin: 5mm; }
      * { box-sizing: border-box; }
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-family: Calibri, Arial, sans-serif; width: 210mm; margin: 0 auto; padding: 0; }
      .sheet {
        position: relative;
        width: 210mm; min-height: 297mm;
        padding: 10px 12px;
        border: 1px solid #000; border-bottom: 0;
        display: flex; flex-direction: column;
      }

      .logo {
        position: absolute;
        top: 6px; right: 10px;
        width: 140px; height: 88px;
        object-fit: contain; display: block;
      }

      .title { text-align:center; font-weight:700; font-size: 20px; margin: 0 0 6px 0; padding: 0; text-transform: uppercase; }

      .topbar { position: relative; margin: 0 0 6px 0; padding: 0; }
      .brand { font-size: 13px; line-height: 1.3; text-align: center; margin: 0; padding: 0; }
      .brand h1 { margin: 0; font-size: 20px; }

      .grid3 {
        display:flex; border:1px solid #000; border-bottom:0;
        font-size:11px; margin:0;
      }
      .cell { padding:5px; border-right:1px solid #000; position: relative; width:33.33%; }
      .cell:last-child { border-right:0; }
      .cell h4.secHead {
        display:block; background:#e8f4ff; border-bottom:1px solid #000;
        margin: -5px -5px 4px -5px; padding: 4px 6px;
        font-size:11px; font-weight:700; white-space:nowrap;
      }

      .kv { display:flex; justify-content: space-between; gap:8px; white-space:nowrap; }
      .kv .l { font-weight:700; }
      .fw { font-weight:700; }
      .right { text-align:right; }
      .center { text-align:center; }

      table.itemsTable {
        border-collapse: collapse; width: 100%;
        border:1px solid #000; border-bottom:0; line-height:1.2; margin:0;
      }
      table.itemsTable thead th {
        font-size: 10px; white-space: nowrap; padding: 4px 6px;
        border-left:1px solid #000; border-right:1px solid #000;
        background:#e8f4ff;
      }
      table.itemsTable thead tr { border-bottom:1px solid #000; }
      table.itemsTable tbody td {
        font-size: 10px; padding: 8px 6px;
        border-left:1px solid #000; border-right:1px solid #000;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .totRowBorderTop td { border-top: 1px solid #000; }

      .totbox { display:flex; gap:0; margin:0; }
      .totL, .totR {
        flex:1; border:1px solid #000; border-bottom:0; padding:0; margin:0;
      }
      .totL { border-right:0; }
      .totR { border-left:1px solid #000; }
      .totLTable, .totTable { width:100%; border-collapse:collapse; }
      .totLTable td, .totTable td {
        font-size:11px; padding:5px 6px; border-bottom:1px solid #000;
      }
      .totLTable tr:last-child td, .totTable tr:last-child td { border-bottom:0; }

      .termsRow {
        border: 1px solid #000; border-top: 1px solid #000;
        padding: 0; margin: 0;
      }
      .termsHead {
        background:#e8f4ff; border-bottom:1px solid #000;
        font-weight:700; font-size:11px; padding: 6px 8px;
      }
      .termsBody {
        font-size: 11px; line-height:1.3; padding: 8px;
        white-space: pre-wrap; word-break: break-word;
      }
    </style>
  `;

    const brandBlock = `
    <div class="topbar">
      <div class="brand">
        <h1>ACE PRINT PACK</h1>
        <div># 61, 1st Floor, 5th Main Road, Chamrajpet, Bangalore 560018</div>
        <div>Phone: +91 9945261108 | Email: accounts@aceprintpack.com</div>
        <div>GSTIN: 29ABCFA9924A1ZL</div>
      </div>
    </div>
  `;

    const headerGrid = `
    <div class="grid3">
      <div class="cell">
        <h4 class="secHead">Vendor</h4>
        <div class="fw">${r.vendorCompany || r.vendorName || "-"}</div>
        <div>${r.vendorAddress || ""}</div>
        <div>${r.vendorPhone || ""}${
          r.vendorEmail ? " | " + r.vendorEmail : ""
        }</div>
        <div>${r.vendorGst ? "GSTIN: " + r.vendorGst : ""}</div>
      </div>
      <div class="cell">
        <h4 class="secHead">Delivery Address</h4>
        <div>${r.deliveryAddress || "—"}</div>
        <div class="kv"><span class="l">Required By:</span><span>${fmtDateShort(
          r.requiredDeliveryDate
        )}</span></div>
      </div>
      <div class="cell">
        <h4 class="secHead">PO Details</h4>
        <div class="kv"><span class="l">PO #:</span><span>${
          r.poNumber || "—"
        }</span></div>
        <div class="kv"><span class="l">Issue Date:</span><span>${fmtDateShort(
          r.issueDate || r.raw?.createdAt
        )}</span></div>
        <div class="kv"><span class="l">Job Sheet #:</span><span>${
          r.jobSheetNumber || "—"
        }</span></div>
        
      </div>
    </div>
  `;

    const itemsTable = `
    <table class="itemsTable">
      <thead>
        <tr>
          <th class="center" style="width:7%">Item</th>
          <th class="center" style="width:28%">Product</th>
          <th class="center" style="width:30%">Description</th>
          <th class="center" style="width:10%">HSN</th>
          <th class="center" style="width:8%">Qty</th>
          <th class="center" style="width:10%">Unit Price</th>
          <th class="center" style="width:7%">GST %</th>
          <th class="center" style="width:12%">Total</th>
        </tr>
      </thead>
      <tbody>
        ${
          rowsCalc.length
            ? rowsCalc
                .map(
                  (it) => `
              <tr>
                <td class="center">${it.itemNo}</td>
                <td>${it.productName}</td>
                <td>${it.productDescription}</td>
                <td class="center">${it.hsnCode || "—"}</td>
                <td class="center">${it.quantity}</td>
                <td class="right">${fmtAmt(it.unitPrice)}</td>
                <td class="center">${Number(it.gstPercent || 0)}%</td>
                <td class="right">${fmtAmt(it.total)}</td>
              </tr>`
                )
                .join("")
            : `<tr><td class="center" colspan="8">No items</td></tr>`
        }
        ${
          rowsCalc.length
            ? `
          <tr class="totRowBorderTop">
            <td colspan="5" class="center fw">Totals</td>
            <td class="right fw">${fmtAmt(subTotal)}</td>
            <td class="center fw">GST</td>
            <td class="right fw">${fmtAmt(grandTotal)}</td>
          </tr>`
            : ""
        }
      </tbody>
    </table>
  `;

    const totalsBlock = `
    <div class="totbox">
      <div class="totL">
        <table class="totLTable">
          <tbody>
            <tr>
              <td class="fw" style="width:35%">Remarks</td>
              <td>${r.remarks || ""}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="totR">
        <table class="totTable">
          <tbody>
            <tr>
              <td class="fw" style="width:60%">Sub-total</td>
              <td class="right">${fmtAmt(subTotal)}</td>
            </tr>
            <tr>
              <td class="fw">GST Total</td>
              <td class="right">${fmtAmt(gstTotal)}</td>
            </tr>
            <tr>
              <td class="fw">Grand Total</td>
              <td class="right">${fmtAmt(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

    const termsFullWidth = `
    <div class="termsRow">
      <div class="termsHead">Terms & Conditions</div>
      <div class="termsBody">${(r.terms && r.terms.trim()) || "—"}</div>
    </div>
  `;

    const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title></title>
        ${style}
      </head>
      <body>
        <div class="sheet">
          <img class="logo" alt="Logo" src="/logo.png" />
          <div class="title">PURCHASE ORDER</div>
          ${brandBlock}
          ${headerGrid}
          ${itemsTable}
          ${totalsBlock}
          ${termsFullWidth}
        </div>
        <script>
          window.onload = function(){ window.print(); }
        </script>
      </body>
    </html>
  `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-purple-700 mb-4">
          Purchase Orders
        </h1>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  const H = ({ id, label }) => (
    <th
      className="p-2 border cursor-pointer select-none"
      onClick={() => cycleSort(id)}
      title="Click to sort"
    >
      {label}
      {sort.key === id
        ? sort.dir === "asc"
          ? " ▲"
          : sort.dir === "desc"
          ? " ▼"
          : ""
        : ""}
    </th>
  );

  return (
    <div className="p-6 text-xs">
      <h1 className="text-2xl font-bold text-[#Ff8045] mb-4">
        Purchase Orders
      </h1>
      <div className="flex gap-2 mb-4">
        <input
          className="border p-2 rounded flex-1"
          placeholder="Search POs…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          onClick={exportToExcel}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Export Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <H id="poNumber" label="PO #" />
              <H id="jobSheetNumber" label="Job Sheet #" />
              <H id="clientCompanyName" label="Client" />
              <H id="eventName" label="Event" />
              <H id="productName" label="Product (first line)" />
              <H id="qty" label="Qty" />
              <H id="unitPrice" label="Unit" />
              <H id="gstPercent" label="GST %" />
              <H id="lineTotal" label="Line Total" />
              <H id="vendor" label="Vendor" />
              <H id="issueDate" label="Issue Date" />
              <H id="requiredDeliveryDate" label="Req. Delivery" />
              <H id="subTotal" label="Subtotal" />
              <H id="gstTotal" label="GST" />
              <H id="grandTotal" label="Grand Total" />
              <th className="p-2 border">Actions</th>
            </tr>
            <tr className="bg-gray-100">
              {[
                ["poNumber", "Filter PO #"],
                ["jobSheetNumber", "Filter Job Sheet #"],
                ["clientCompanyName", "Filter Client"],
                ["eventName", "Filter Event"],
                ["productName", "Filter Product"],
                ["qty", "Qty"],
                ["unitPrice", "Unit"],
                ["gstPercent", "GST %"],
                ["lineTotal", "Line Total"],
                ["vendor", "Filter Vendor"],
                ["issueDate", "Issue Date (dd/mm/yyyy)"],
                ["requiredDeliveryDate", "Req. Delivery (dd/mm/yyyy)"],
                ["subTotal", "Subtotal"],
                ["gstTotal", "GST"],
                ["grandTotal", "Grand Total"],
              ].map(([k, ph]) => (
                <th key={k} className="p-1 border">
                  <input
                    type="text"
                    className="w-full p-1 text-xs border rounded"
                    placeholder={ph}
                    value={filters[k]}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, [k]: e.target.value }))
                    }
                  />
                </th>
              ))}
              <th className="p-1 border"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              if (!anchorRefs.current[r._id])
                anchorRefs.current[r._id] = React.createRef();

              return (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="p-2 border">{r.poNumber}</td>
                  <td className="p-2 border">{r.jobSheetNumber}</td>
                  <td className="p-2 border">{r.clientCompanyName}</td>
                  <td className="p-2 border">{r.eventName}</td>

                  <td className="p-2 border">
                    <div className="font-semibold">
                      {r.firstItem.productName || "-"}
                    </div>
                    <div className="text-[11px] text-gray-600">
                      {r.firstItem.productDescription || ""}
                    </div>
                  </td>
                  <td className="p-2 border">{r.firstItem.quantity}</td>
                  <td className="p-2 border">{r.firstItem.unitPrice}</td>
                  <td className="p-2 border">{r.firstItem.gstPercent}</td>
                  <td className="p-2 border">{r.firstItem.total}</td>

                  <td className="p-2 border">
                    {r.vendorCompany || r.vendorName || ""}
                  </td>
                  <td className="p-2 border">{fmtDate(r.issueDate)}</td>
                  <td className="p-2 border">
                    {fmtDate(r.requiredDeliveryDate)}
                  </td>

                  <td className="p-2 border">{r.subTotal}</td>
                  <td className="p-2 border">{r.gstTotal}</td>
                  <td className="p-2 border font-semibold">{r.grandTotal}</td>

                  <td className="p-2 border relative">
                    <button
                      ref={anchorRefs.current[r._id]}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId((prev) =>
                          prev === r._id ? null : r._id
                        );
                      }}
                      className="w-full border rounded py-0.5 hover:bg-gray-100"
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === r._id}
                      title="More actions"
                    >
                      ⋯
                    </button>

                    {openMenuId === r._id && (
                      <KebabMenu
                        anchorRef={anchorRefs.current[r._id]}
                        onClose={() => setOpenMenuId(null)}
                      >
                        <button
                          role="menuitem"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100"
                          onClick={() => {
                            exportRowToPdf(r);
                            setOpenMenuId(null);
                          }}
                        >
                          Export PDF
                        </button>
                        <button
                          role="menuitem"
                          disabled={!canWrite}
                          className={
                            "w-full text-left px-3 py-2 text-xs hover:bg-gray-100 " +
                            (!canWrite
                              ? "opacity-50 cursor-not-allowed"
                              : "")
                          }
                          onClick={() => {
                            if (!canWrite) return;
                            setEditPo(r);
                            setOpenMenuId(null);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          role="menuitem"
                          disabled={!canWrite}
                          className={
                            "w-full text-left px-3 py-2 text-xs hover:bg-gray-100 text-red-600 " +
                            (!canWrite
                              ? "opacity-50 cursor-not-allowed"
                              : "")
                          }
                          onClick={async () => {
                            if (!canWrite) return;
                            if (!window.confirm("Delete this PO?")) return;
                            try {
                              await axios.delete(
                                `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchase-orders/${r._id}`,
                                { headers }
                              );
                              setRows((prev) =>
                                prev.filter((x) => x._id !== r._id)
                              );
                            } catch (e) {
                              alert("Delete failed");
                            } finally {
                              setOpenMenuId(null);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </KebabMenu>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td
                  className="p-4 text-center text-gray-500"
                  colSpan={16}
                >
                  No purchase orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editPo && (
        <EditPOModal
          po={editPo}
          onClose={() => setEditPo(null)}
          onSave={async (payload) => {
            try {
              const res = await axios.put(
                `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchase-orders/${editPo._id}`,
                payload,
                { headers }
              );
              const updatedRaw =
                (res.data && (res.data.purchaseOrder || res.data.po)) ||
                res.data;
              const updated = normalizePO(updatedRaw);
              setRows((prev) =>
                prev.map((x) => (x._id === updated._id ? updated : x))
              );
              setEditPo(null);
            } catch (e) {
              console.error(e);
              alert("Save failed");
            }
          }}
        />
      )}
    </div>
  );
}
