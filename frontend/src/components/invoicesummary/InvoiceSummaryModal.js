"use client";

import React, { useState } from "react";
import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function InvoicesSummaryModal({ row, onClose, onSaved }) {
  const token = localStorage.getItem("token");
  const isSaved = Boolean(row._id);

  /* Local form */
  const [form, setForm] = useState({
    ...row,
    invoiceDate: row.invoiceDate
      ? new Date(row.invoiceDate).toISOString().slice(0, 10)
      : "",
    invoiceMailedOn: row.invoiceMailedOn
      ? new Date(row.invoiceMailedOn).toISOString().slice(0, 10)
      : "",
    invoiceNumber: row.invoiceNumber || "",
  });
  const [error, setError] = useState("");

  const set = (k, v) => {
    setForm({ ...form, [k]: v });
    setError("");
  };

  /* Save */
  async function handleSave() {
    if (form.invoiceNumber.includes(",")) {
      setError("Invoice number cannot contain commas");
      return;
    }

    const body = {
      ...form,
      invoiceDate: form.invoiceDate ? new Date(form.invoiceDate) : null,
      invoiceMailedOn: form.invoiceMailedOn ? new Date(form.invoiceMailedOn) : null,
      invoiceAmount: parseFloat(form.invoiceAmount) || 0,
    };

    try {
      if (isSaved) {
        await axios.put(
          `${BACKEND}/api/admin/invoices-summary/${row._id}`,
          body,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${BACKEND}/api/admin/invoices-summary`,
          body,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      const message =
        err.response?.data?.message || "Save failed. Please try again.";
      setError(message);
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
          {isSaved ? "Edit Invoice Summary" : "Add Invoice Summary"}
        </h2>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Field label="Job Sheet #" value={form.jobSheetNumber} />
          <Field label="Client" value={form.clientCompanyName} />
          <Field label="Client Name" value={form.clientName} />
          <Field label="Event" value={form.eventName} />
          <Field label="Invoice #" value={form.invoiceNumber} />
          <Field label="CRM Name" value={form.crmName} />
        </div>

        {/* Editable */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input
            label="Invoice Date"
            type="date"
            value={form.invoiceDate}
            onChange={(v) => set("invoiceDate", v)}
          />
          <Input
            label="Invoice Amount"
            type="number"
            value={form.invoiceAmount || ""}
            onChange={(v) => set("invoiceAmount", v)}
          />
          <Select
            label="Invoice Mailed"
            value={form.invoiceMailed}
            onChange={(v) => set("invoiceMailed", v)}
            options={["No", "Yes"]}
          />
          <Input
            label="Invoice Mailed On"
            type="date"
            value={form.invoiceMailedOn}
            onChange={(v) => set("invoiceMailedOn", v)}
          />
          <Input
            label="Uploaded on Portal"
            value={form.invoiceUploadedOnPortal || ""}
            onChange={(v) => set("invoiceUploadedOnPortal", v)}
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