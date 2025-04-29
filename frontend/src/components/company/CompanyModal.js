// client/src/components/CompanyModal.js
import React, { useState } from "react";
import axios from "axios";

export default function CompanyModal({
  mode,
  company,
  onClose,
  onSuccess,
  BACKEND_URL,
}) {
  const isEdit = mode === "edit";

  /* ---------- form state ---------- */
  const [form, setForm] = useState(
    isEdit
      ? {
          companyName: company.companyName,
          brandName: company.brandName || "",
          GSTIN: company.GSTIN || "",
          companyAddress: company.companyAddress || "",
          clients: company.clients || [],
        }
      : {
          companyName: "",
          brandName: "",
          GSTIN: "",
          companyAddress: "",
          clients: [],
        }
  );

  /* ---------- temp client buffer ---------- */
  const [clientTmp, setClientTmp] = useState({
    name: "",
    department: "",
    email: "",
    contactNumber: "",
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  /* ---------- helpers ---------- */
  const sanitiseContacts = (clients) =>
    clients
      .filter((c) => c && c.name && c.contactNumber)
      .map((c) => ({
        ...c,
        contactNumber: c.contactNumber.toString().trim(),
      }));

  /* ---------- client handlers ---------- */
  const addClient = () => {
    if (!clientTmp.name || !clientTmp.contactNumber) return;
    setForm((p) => ({ ...p, clients: [...p.clients, clientTmp] }));
    setClientTmp({ name: "", department: "", email: "", contactNumber: "" });
  };

  const removeClient = (idx) =>
    setForm((p) => ({ ...p, clients: p.clients.filter((_, i) => i !== idx) }));

  const updateClientField = (idx, field, value) =>
    setForm((p) => {
      const list = [...p.clients];
      list[idx] = { ...list[idx], [field]: value };
      return { ...p, clients: list };
    });

  /* ---------- submit ---------- */
  const submit = async () => {
    setErr("");

    const payload = {
      ...form,
      companyName: form.companyName.trim(),
      GSTIN: form.GSTIN.trim(),
      brandName: form.brandName.trim(),
      companyAddress: form.companyAddress.trim(),
      clients: sanitiseContacts(form.clients),
    };

    if (!payload.companyName) return setErr("Company name required");
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (isEdit) {
        await axios.put(
          `${BACKEND_URL}/api/admin/companies/${company._id}`,
          payload,
          config
        );
      } else {
        await axios.post(
          `${BACKEND_URL}/api/admin/companies`,
          payload,
          config
        );
      }
      onSuccess();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 400 ? "Validation error" : "Save failed");
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold mb-4">
          {isEdit ? "Edit Company" : "Add Company"}
        </h2>

        {err && <div className="bg-red-100 text-red-700 p-2 mb-3">{err}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* --- company basics --- */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              Company Name *
            </label>
            <input
              className="w-full p-2 border rounded"
              value={form.companyName}
              onChange={(e) =>
                setForm({ ...form, companyName: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Brand Name</label>
            <input
              className="w-full p-2 border rounded"
              value={form.brandName}
              onChange={(e) => setForm({ ...form, brandName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GSTIN</label>
            <input
              className="w-full p-2 border rounded"
              value={form.GSTIN}
              onChange={(e) => setForm({ ...form, GSTIN: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea
              rows={3}
              className="w-full p-2 border rounded"
              value={form.companyAddress}
              onChange={(e) =>
                setForm({ ...form, companyAddress: e.target.value })
              }
            />
          </div>

          {/* --- clients --- */}
          <div className="col-span-2 border-t pt-4">
            <label className="block text-sm font-medium mb-2">Clients</label>

            {/* add client */}
            <div className="flex flex-wrap gap-2 mb-3">
              {["name", "department", "email", "contactNumber"].map((f) => (
                <input
                  key={f}
                  placeholder={
                    f === "contactNumber"
                      ? "Contact"
                      : f.charAt(0).toUpperCase() + f.slice(1)
                  }
                  className="flex-1 min-w-[120px] p-2 border rounded"
                  value={clientTmp[f]}
                  onChange={(e) =>
                    setClientTmp({ ...clientTmp, [f]: e.target.value })
                  }
                />
              ))}
              <button
                onClick={addClient}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Add
              </button>
            </div>

            {/* list clients */}
            {form.clients.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 border">Name</th>
                      <th className="p-2 border">Department</th>
                      <th className="p-2 border">Email</th>
                      <th className="p-2 border">Contact</th>
                      <th className="p-2 border"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.clients.map((cl, idx) => (
                      <tr key={idx}>
                        {["name", "department", "email", "contactNumber"].map(
                          (f) => (
                            <td key={f} className="border p-1">
                              <input
                                className="w-full p-1 border rounded"
                                value={cl[f] || ""}
                                onChange={(e) =>
                                  updateClientField(idx, f, e.target.value)
                                }
                              />
                            </td>
                          )
                        )}
                        <td className="border p-1 text-center">
                          <button
                            onClick={() => removeClient(idx)}
                            className="text-red-600"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* --- actions --- */}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="border px-4 py-2 rounded">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className={`px-4 py-2 text-white rounded ${
              saving ? "bg-blue-400" : "bg-blue-600"
            }`}
          >
            {saving ? "Saving…" : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
