"use client";

import React, { useState } from "react";
import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function PaymentFollowUpModal({ row, onClose, onSaved }) {
  const token = localStorage.getItem("token");
  const isSaved = Boolean(row._id);

  /* Local form */
  const [form, setForm] = useState({
    ...row,
    invoiceDate: row.invoiceDate
      ? new Date(row.invoiceDate).toISOString().slice(0, 10)
      : "",
    dueDate: row.dueDate
      ? new Date(row.dueDate).toISOString().slice(0, 10)
      : "",
    invoiceMailedOn: row.invoiceMailedOn
      ? new Date(row.invoiceMailedOn).toISOString().slice(0, 10)
      : "",
    paymentReceived: row.paymentReceived || [],
    discountAllowed: row.discountAllowed || 0,
    TDS: row.TDS || 0,
    remarks: row.remarks || "",
  });

  const [followUpModal, setFollowUpModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({
    date: new Date().toISOString().slice(0, 10),
    note: "",
    by: "",
  });
  const [newPayment, setNewPayment] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    referenceNumber: "",
    bankName: "",
    amount: "",
  });
  const [error, setError] = useState("");

  const set = (k, v) => {
    setForm({ ...form, [k]: v });
    setError("");
  };

  /* Add Follow-Up */
  const addFollowUp = () => {
    const updatedFollowUps = [
      ...(form.followUps || []),
      {
        ...newFollowUp,
        date: new Date(newFollowUp.date),
        updatedOn: new Date(),
      },
    ];
    set("followUps", updatedFollowUps);
    setFollowUpModal(false);
    setNewFollowUp({ date: new Date().toISOString().slice(0, 10), note: "", by: "" });
  };

  /* Add Payment */
  const addPayment = () => {
    if (!newPayment.referenceNumber || !newPayment.bankName || !newPayment.amount) {
      setError("All payment fields are required");
      return;
    }
    const updatedPayments = [
      ...(form.paymentReceived || []),
      {
        ...newPayment,
        paymentDate: new Date(newPayment.paymentDate),
        amount: parseFloat(newPayment.amount) || 0,
        updatedOn: new Date(),
      },
    ];
    set("paymentReceived", updatedPayments);
    setPaymentModal(false);
    setNewPayment({
      paymentDate: new Date().toISOString().slice(0, 10),
      referenceNumber: "",
      bankName: "",
      amount: "",
    });
    setError("");
  };

  /* Save */
  async function handleSave() {
    const body = {
      ...form,
      invoiceDate: form.invoiceDate ? new Date(form.invoiceDate) : null,
      dueDate: form.dueDate ? new Date(form.dueDate) : null,
      invoiceMailedOn: form.invoiceMailedOn ? new Date(form.invoiceMailedOn) : null,
      invoiceAmount: parseFloat(form.invoiceAmount) || 0,
      discountAllowed: parseFloat(form.discountAllowed) || 0,
      TDS: parseFloat(form.TDS) || 0,
    };
    try {
      if (isSaved) {
        await axios.put(
          `${BACKEND}/api/admin/payment-followup/${row._id}`,
          body,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${BACKEND}/api/admin/payment-followup`,
          body,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Save failed");
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
          {isSaved ? "Edit Payment Follow-Up" : "Add Payment Follow-Up"}
        </h2>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Field label="Job Sheet #" value={form.jobSheetNumber} />
          <Field label="Client Company" value={form.clientCompanyName} />
          <Field label="Client Name" value={form.clientName} />
          <Field label="Invoice #" value={form.invoiceNumber} />
          <Field label="Invoice Mailed" value={form.invoiceMailed} />
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
          <Input
            label="Due Date"
            type="date"
            value={form.dueDate}
            onChange={(v) => set("dueDate", v)}
          />
          <Input
            label="Invoice Mailed On"
            type="date"
            value={form.invoiceMailedOn}
            onChange={(v) => set("invoiceMailedOn", v)}
          />
          <Input
            label="Discount Allowed"
            type="number"
            value={form.discountAllowed || ""}
            onChange={(v) => set("discountAllowed", v)}
          />
          <Input
            label="TDS"
            type="number"
            value={form.TDS || ""}
            onChange={(v) => set("TDS", v)}
          />
          <Input
            label="Remarks"
            value={form.remarks || ""}
            onChange={(v) => set("remarks", v)}
          />
        </div>

        {/* Payments */}
        <div className="mb-4">
          <label className="font-medium">Payments Received</label>
          <div className="border rounded p-2">
            {form.paymentReceived?.length ? (
              form.paymentReceived.map((p, i) => (
                <div key={i} className="border-b py-1">
                  {new Date(p.paymentDate).toLocaleDateString()} - {p.amount} (Ref: {p.referenceNumber}, Bank: {p.bankName}, Updated: {new Date(p.updatedOn).toLocaleDateString()})
                </div>
              ))
            ) : (
              <div>No payments</div>
            )}
            <button
              onClick={() => setPaymentModal(true)}
              className="mt-2 text-blue-600 hover:underline"
            >
              Add Payment
            </button>
          </div>
        </div>

        {/* Follow-Ups */}
        <div className="mb-4">
          <label className="font-medium">Follow-Ups</label>
          <div className="border rounded p-2">
            {form.followUps?.length ? (
              form.followUps.map((f, i) => (
                <div key={i} className="border-b py-1">
                  {new Date(f.date).toLocaleDateString()} - {f.note} (by {f.by}, updated {new Date(f.updatedOn).toLocaleDateString()})
                </div>
              ))
            ) : (
              <div>No follow-ups</div>
            )}
            <button
              onClick={() => setFollowUpModal(true)}
              className="mt-2 text-blue-600 hover:underline"
            >
              Add Follow-Up
            </button>
          </div>
        </div>

        {/* Payment Modal */}
        {paymentModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white p-4 rounded w-full max-w-md">
              <h3 className="text-md font-bold mb-2">Add Payment</h3>
              <div className="grid grid-cols-1 gap-2">
                <Input
                  label="Payment Date"
                  type="date"
                  value={newPayment.paymentDate}
                  onChange={(v) => setNewPayment({ ...newPayment, paymentDate: v })}
                />
                <Input
                  label="Reference Number"
                  value={newPayment.referenceNumber}
                  onChange={(v) => setNewPayment({ ...newPayment, referenceNumber: v })}
                />
                <Input
                  label="Bank Name"
                  value={newPayment.bankName}
                  onChange={(v) => setNewPayment({ ...newPayment, bankName: v })}
                />
                <Input
                  label="Amount"
                  type="number"
                  value={newPayment.amount}
                  onChange={(v) => setNewPayment({ ...newPayment, amount: v })}
                />
              </div>
              {error && <div className="text-red-500 mt-2">{error}</div>}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setPaymentModal(false);
                    setError("");
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={addPayment}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )
      }
        {/* Follow-Up Modal */}
        {followUpModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white p-4 rounded w-full max-w-md">
              <h3 className="text-md font-bold mb-2">Add Follow-Up</h3>
              <div className="grid grid-cols-1 gap-2">
                <Input
                  label="Date"
                  type="date"
                  value={newFollowUp.date}
                  onChange={(v) => setNewFollowUp({ ...newFollowUp, date: v })}
                />
                <Input
                  label="Note"
                  value={newFollowUp.note}
                  onChange={(v) => setNewFollowUp({ ...newFollowUp, note: v })}
                />
                <Input
                  label="By"
                  value={newFollowUp.by}
                  onChange={(v) => setNewFollowUp({ ...newFollowUp, by: v })}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setFollowUpModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={addFollowUp}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

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