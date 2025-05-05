// components/invoicefollowup/InvoiceFollowUpModal.js
"use client";

import React, { useState } from "react";
import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function InvoiceFollowUpModal({ row, onClose, onSaved }) {
  const token = localStorage.getItem("token");
  const isSaved = Boolean(row._id);

  /* Local form state */
  const [form, setForm] = useState({
    ...row,
    dispatchedOn: row.dispatchedOn
      ? new Date(row.dispatchedOn).toISOString().slice(0, 10)
      : "",
  });

  const set = (k, v) => setForm({ ...form, [k]: v });

  /* Save */
  async function handleSave() {
    const body = {
      ...form,
      dispatchedOn: form.dispatchedOn ? new Date(form.dispatchedOn) : null,
      partialQty: parseInt(form.partialQty) || 0,
    };
    try {
      if (isSaved) {
        await axios.put(
          `${BACKEND}/api/admin/invoice-followup/${row._id}`,
          body,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${BACKEND}/api/admin/invoice-followup`,
          body,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-full max-w-2xl relative text-xs overflow-y-auto max-h-screen">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
        >
          ×
        </button>
        <h2 className="text-lg font-bold text-purple-700 mb-4">
          {isSaved ? "Edit Invoice Follow-Up" : "Add Invoice Follow-Up"}
        </h2>

        <div>
          add invoice
        </div>
        {/* Summary (non-editable) */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Field label="Order Date" value={fmt(form.orderDate)} />
          <Field label="Job Sheet #" value={form.jobSheetNumber} />
          <Field label="Client" value={form.clientCompanyName} />
          <Field label="Event" value={form.eventName} />
          <Field label="Quotation #" value={form.quotationNumber} />
          <Field label="CRM Name" value={form.crmName} />
          <Field label="Product" value={form.product} />
          <Field label="Dispatched On" value={fmt(form.dispatchedOn)} />
          <Field label="Delivered Through" value={form.deliveredThrough} />
          <Field label="PO Status" value={form.poStatus} />
          <Field label="Pending From (days)" value={form.pendingFromDays} />
          <Field label="Partial Qty" value={form.partialQty || ""} />

        </div> */}

        {/* Editable */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
  <Input
    label="Order Date"
    type="date"
    value={form.orderDate?.slice(0, 10) || ""}
    onChange={(v) => set("orderDate", v)}
  />
  <Input
    label="Job Sheet #"
    value={form.jobSheetNumber || ""}
    onChange={(v) => set("jobSheetNumber", v)}
  />
  <Input
    label="Client"
    value={form.clientCompanyName || ""}
    onChange={(v) => set("clientCompanyName", v)}
  />
  <Input
    label="Event"
    value={form.eventName || ""}
    onChange={(v) => set("eventName", v)}
  />
  <Input
    label="Quotation #"
    value={form.quotationNumber || ""}
    onChange={(v) => set("quotationNumber", v)}
  />
  <Input
    label="CRM Name"
    value={form.crmName || ""}
    onChange={(v) => set("crmName", v)}
  />
  <Input
    label="Product"
    value={form.product || ""}
    onChange={(v) => set("product", v)}
  />
  <Input
    label="Dispatched On"
    type="date"
    value={form.dispatchedOn?.slice(0, 10) || ""}
    onChange={(v) => set("dispatchedOn", v)}
  />
  <Input
    label="Delivered Through"
    value={form.deliveredThrough || ""}
    onChange={(v) => set("deliveredThrough", v)}
  />
  <Input
    label="PO Status"
    value={form.poStatus || ""}
    onChange={(v) => set("poStatus", v)}
  />
  <Input
    label="Pending From (days)"
    type="number"
    value={form.pendingFromDays || ""}
    onChange={(v) => set("pendingFromDays", v)}
  />
  <Input
    label="Partial Qty"
    type="number"
    value={form.partialQty || ""}
    onChange={(v) => set("partialQty", v)}
  />
</div>

{/* Already Editable Fields */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
  <Select
    label="Invoice Generated"
    value={form.invoiceGenerated}
    onChange={(v) => set("invoiceGenerated", v)}
    options={["No", "Yes"]}
  />
  <Input
    label="Invoice #"
    value={form.invoiceNumber || ""}
    onChange={(v) => set("invoiceNumber", v)}
  />
</div>


        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* Helpers */
function Field({ label, value }) {
  return (
    <div>
      <label className="text-gray-500">{label}</label>
      <div>{value ?? "-"}</div>
    </div>
  );
}

function Input({ label, type = "text", value, onChange }) {
  return (
    <div>
      <label className="font-medium">{label}</label>
      <input
        type={type}
        className="border rounded p-2 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="font-medium">{label}</label>
      <select
        className="border rounded p-2 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function fmt(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}