"use client";

import React, { useState } from "react";
import axios from "axios";
import FollowUpModal from "./FollowUpModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PendingPackingModal({ row, onClose, onSaved }) {
  const token = localStorage.getItem("token");
  const isSaved = Boolean(row._id); // if already in PendingPacking collection

  /* local form state (clone row to avoid mutating) */
  const [form, setForm] = useState({
    ...row,
    jobSheetValidated: row.jobSheetValidated || "No",
    brandedProductExpectedOn:
      row.brandedProductExpectedOn &&
      new Date(row.brandedProductExpectedOn).toISOString().slice(0, 10),
  });

  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setForm({ ...form, [k]: v });

  /* computed: whether dependent inputs are enabled */
  const enableQC = form.jobSheetValidated === "Yes";

  /* save handler */
  async function handleSave() {
    setSaving(true);
    try {
      const body = {
        ...form,
        brandedProductExpectedOn: form.brandedProductExpectedOn
          ? new Date(form.brandedProductExpectedOn)
          : null,
      };

      if (isSaved) {
        await axios.put(
          `${BACKEND_URL}/api/admin/packing-pending/${row._id}`,
          body,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(`${BACKEND_URL}/api/admin/packing-pending`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      onSaved();
    } catch (err) {
      console.error(err);
      alert("Save failed – check console");
    } finally {
      setSaving(false);
    }
  }

  /* follow‑up array helpers */
  const removeFollowUp = (idx) => {
    setField(
      "followUp",
      form.followUp.filter((_, i) => i !== idx)
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-full max-w-2xl relative overflow-y-auto max-h-screen">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
        >
          ×
        </button>
        <h2 className="text-xl font-bold text-purple-700 mb-4">
          {isSaved ? "Edit Row" : "Add Row"}
        </h2>

        {/* immutable info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
          <Field label="Job Sheet #" value={row.jobSheetNumber} />
          <Field label="Product" value={row.product} />
          <Field label="Client" value={row.clientCompanyName} />
          <Field
            label="Created"
            value={formatDate(row.jobSheetCreatedDate)}
          />
          <Field
            label="Expected Delivery"
            value={formatDate(row.expectedDeliveryDate)}
          />
        </div>

        {/* editable fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium">Job Sheet Validated *</label>
            <select
              className="border rounded p-2 w-full"
              value={form.jobSheetValidated}
              onChange={(e) => setField("jobSheetValidated", e.target.value)}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">
              Branded Product Expected On
            </label>
            <input
              type="date"
              className="border rounded p-2 w-full"
              value={form.brandedProductExpectedOn || ""}
              onChange={(e) =>
                setField("brandedProductExpectedOn", e.target.value)
              }
              disabled={!enableQC}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Qty Rejected</label>
            <input
              type="number"
              min="0"
              className="border rounded p-2 w-full"
              value={form.qtyRejected || 0}
              onChange={(e) => setField("qtyRejected", e.target.value)}
              disabled={!enableQC}
            />
          </div>

          <div>
            <label className="text-sm font-medium">QC Done By</label>
            <input
              type="text"
              className="border rounded p-2 w-full"
              value={form.qcDoneBy || ""}
              onChange={(e) => setField("qcDoneBy", e.target.value)}
              disabled={!enableQC}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="border rounded p-2 w-full"
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
              disabled={!enableQC}
            >
              <option value="None">None</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Alert">Alert</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Remarks</label>
            <textarea
              className="border rounded p-2 w-full"
              value={form.remarks || ""}
              onChange={(e) => setField("remarks", e.target.value)}
              disabled={!enableQC}
            />
          </div>
        </div>

        {/* follow‑ups */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm">Follow‑ups</span>
            <button
              onClick={() => setFollowUpOpen(true)}
              className="text-blue-600 text-sm"
              disabled={!enableQC}
            >
              + Add
            </button>
          </div>
          {form.followUp && form.followUp.length ? (
            <ul className="list-disc ml-5 text-xs">
              {form.followUp.map((fu, idx) => (
                <li key={idx} className="mb-1">
                  {formatDate(fu.followUpDate)} – {fu.note}{" "}
                  <button
                    onClick={() => removeFollowUp(idx)}
                    className="text-red-500 ml-1"
                    disabled={!enableQC}
                  >
                    x
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">No follow‑ups</p>
          )}
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
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* follow‑up modal */}
        {followUpOpen && (
          <FollowUpModal
            onClose={() => setFollowUpOpen(false)}
            onSave={(fu) =>
              setField("followUp", [...(form.followUp || []), fu])
            }
          />
        )}
      </div>
    </div>
  );
}

/* helpers ---------------------------------------------------------- */
function Field({ label, value }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <div>{value ?? "-"}</div>
    </div>
  );
}
function formatDate(val) {
  if (!val) return "-";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}
