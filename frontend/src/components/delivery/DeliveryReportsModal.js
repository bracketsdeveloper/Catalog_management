// components/delivery/DeliveryReportsModal.js
"use client";

import React, { useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import FollowUpModal from "../packing/FollowUpModal";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function DeliveryReportsModal({ row, onClose, onSaved }) {
  const token = localStorage.getItem("token");
  const isSaved = Boolean(row._id);

  /* ---------- local form state ---------- */
  const [form, setForm] = useState({
    ...row,
    status: row.status || "none",
    sentOn: row.sentOn ? new Date(row.sentOn).toISOString().slice(0, 10) : "",
    deliveredOn: row.deliveredOn
      ? new Date(row.deliveredOn).toISOString().slice(0, 10)
      : "",
  });

  const [excelFile, setExcelFile] = useState(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  const set = (k, v) => setForm({ ...form, [k]: v });

  /* ---------- save (create / update) ---------- */
  async function handleSave() {
    const fd = new FormData();
    fd.append(
      "data",
      JSON.stringify({
        ...form,
        sentOn: form.sentOn ? new Date(form.sentOn) : null,
        deliveredOn: form.deliveredOn ? new Date(form.deliveredOn) : null,
      })
    );
    if (excelFile) fd.append("excel", excelFile);

    try {
      if (isSaved) {
        await axios.put(
          `${BACKEND}/api/admin/delivery-reports/${row._id}`,
          fd,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(`${BACKEND}/api/admin/delivery-reports`, fd, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  }

  /* ---------- excel file change ---------- */
  const handleExcelChange = (file) => {
    setExcelFile(file);
    set("excelFileName", file.name);
  };

  /* ---------- UI ---------- */
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
          {isSaved ? "Edit Delivery Report" : "Add Delivery Report"}
        </h2>

        {/* --- immutable info --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Field label="Batch / Full" value={form.batchType} />
          <Field label="Job Sheet #" value={form.jobSheetNumber} />
          <Field label="Product" value={form.product} />
          <Field label="Client" value={form.clientCompanyName} />
          <Field label="Dispatch Qty" value={form.dispatchQty} />
          <Field label="Sent On" value={fmt(form.sentOn)} />
        </div>

        {/* --- editable section --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <InputField
            label="Sent Through"
            value={form.deliveredSentThrough || ""}
            onChange={(v) => set("deliveredSentThrough", v)}
          />
          <InputField
            label="DC#"
            value={form.dcNumber || ""}
            onChange={(v) => set("dcNumber", v)}
          />
          <InputField
            label="Delivered On"
            type="date"
            value={form.deliveredOn}
            onChange={(v) => set("deliveredOn", v)}
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(v) => set("status", v)}
            options={["none", "Delivered", "Pending", "Alert"]}
          />
          <div className="md:col-span-2">
            <label className="font-medium">Excel File</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleExcelChange(e.target.files[0])}
              className="w-full border rounded p-2"
            />
            {form.excelFileName && (
              <p className="mt-1 text-xs text-green-700">
                {form.excelFileName}
              </p>
            )}
          </div>

          {/* follow-up section */}
          <div className="md:col-span-2 flex justify-between items-center">
            <span className="font-medium">Follow-ups</span>
            <button
              className="text-blue-600"
              onClick={() => setFollowUpOpen(true)}
            >
              + Add Follow-up
            </button>
          </div>

          <div className="md:col-span-2">
            {form.followUp?.length ? (
              <ul className="list-disc ml-5">
                {form.followUp
                  .sort(
                    (a, b) =>
                      new Date(b.followUpDate) - new Date(a.followUpDate)
                  )
                  .map((f, idx) => (
                    <li key={idx}>
                      {fmt(f.followUpDate)} – {f.note}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-gray-500">No follow-ups</p>
            )}
          </div>
        </div>

        {/* buttons */}
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

        {followUpOpen && (
          <FollowUpModal
            onClose={() => setFollowUpOpen(false)}
            onSave={(fu) => set("followUp", [...(form.followUp || []), fu])}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- reusable tiny components ---------- */
function Field({ label, value }) {
  return (
    <div>
      <label className="text-gray-500">{label}</label>
      <div>{value ?? "-"}</div>
    </div>
  );
}
function InputField({ label, value, onChange, type = "text" }) {
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
function SelectField({ label, value, onChange, options }) {
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
