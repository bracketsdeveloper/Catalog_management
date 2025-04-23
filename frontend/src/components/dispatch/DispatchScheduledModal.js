// components/dispatch/DispatchScheduledModal.js
"use client";

import React, { useState } from "react";
import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function DispatchScheduledModal({ row, onClose, onSaved }) {
  const token = localStorage.getItem("token");
  const isSaved = Boolean(row._id);

  /* local form */
  const [form, setForm] = useState({
    ...row,
    sentOn: row.sentOn
      ? new Date(row.sentOn).toISOString().slice(0, 10)
      : "",
  });

  const enable = form.jobSheetValidated === "Yes";
  const set = (k, v) => setForm({ ...form, [k]: v });

  /* save */
  async function handleSave() {
    const body = {
      ...form,
      sentOn: form.sentOn ? new Date(form.sentOn) : null,
    };
    try {
      if (isSaved) {
        await axios.put(
          `${BACKEND}/api/admin/dispatch-schedule/${row._id}`,
          body,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${BACKEND}/api/admin/dispatch-schedule`,
          body,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      onSaved();
      onClose(); // close modal
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
          {isSaved ? "Edit Dispatch" : "Add Dispatch"}
        </h2>

        {/* summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Field label="Batch / Full" value={form.batchType} />
          <Field label="Job Sheet #" value={form.jobSheetNumber} />
          <Field label="Product" value={form.product} />
          <Field label="Client" value={form.clientCompanyName} />
          <Field label="Created" value={fmt(form.jobSheetCreatedDate)} />
          <Field label="Expected Delivery" value={fmt(form.expectedDeliveryDate)} />
        </div>

        {/* editable */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Select
            label="Batch / Full Dispatch"
            value={form.batchType}
            onChange={(v) => set("batchType", v)}
            options={["Batch", "Full Dispatch"]}
          />
          <Select
            label="Job Sheet Validated*"
            value={form.jobSheetValidated}
            onChange={(v) => set("jobSheetValidated", v)}
            options={["No", "Yes"]}
          />
          <Input
            label="Dispatch Qty"
            type="number"
            value={form.dispatchQty || ""}
            onChange={(v) => set("dispatchQty", v)}
            disabled={!enable}
          />
          <Input
            label="Sent On"
            type="date"
            value={form.sentOn}
            onChange={(v) => set("sentOn", v)}
            disabled={!enable}
          />
          <Input
            label="Mode of Delivery"
            value={form.modeOfDelivery || ""}
            onChange={(v) => set("modeOfDelivery", v)}
            disabled={!enable}
          />
          <Input
            label="DC#"
            value={form.dcNumber || ""}
            onChange={(v) => set("dcNumber", v)}
            disabled={!enable}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(v) => set("status", v)}
            options={["none", "sent", "pending", "alert"]}
            disabled={!enable}
          />
          <div className="md:col-span-2">
            <label className="font-medium">Remarks</label>
            <textarea
              className="border rounded p-2 w-full"
              value={form.remarks || ""}
              onChange={(e) => set("remarks", e.target.value)}
              disabled={!enable}
            />
          </div>
        </div>

        {/* buttons */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* helpers */
function Field({ label, value }) {
  return (
    <div>
      <label className="text-gray-500">{label}</label>
      <div>{value ?? "-"}</div>
    </div>
  );
}
function Input({ label, type = "text", value, onChange, disabled }) {
  return (
    <div>
      <label className="font-medium">{label}</label>
      <input
        type={type}
        className="border rounded p-2 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
function Select({ label, value, onChange, options, disabled }) {
  return (
    <div>
      <label className="font-medium">{label}</label>
      <select
        className="border rounded p-2 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
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