import React, { useState, useEffect } from "react";
import axios from "axios";

export default function CompanyModal({
  mode,
  company,
  onClose,
  onSuccess,
  BACKEND_URL,
}) {
  const isEdit = mode === "edit";

  const [segmentsList, setSegmentsList] = useState([]);
  const [form, setForm] = useState({
    companyName: company?.companyName || "",
    brandName: company?.brandName || "",
    GSTIN: company?.GSTIN || "",
    companyAddress: company?.companyAddress || "",
    clients: company?.clients || [],
    segment: company?.segment || "",
    vendorCode: company?.vendorCode || "",
    paymentTerms: company?.paymentTerms || "",
    portalUpload: company?.portalUpload || "",
  });
  const [clientTmp, setClientTmp] = useState({
    name: "",
    department: "",
    email: "",
    contactNumber: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function fetchSegments() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/segments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSegmentsList(res.data);
      } catch (e) {
        console.error("Failed to fetch segments", e);
      }
    }
    fetchSegments();
  }, [BACKEND_URL]);

  const sanitiseContacts = (clients) =>
    clients
      .filter((c) => c && c.name && c.contactNumber)
      .map((c) => ({
        ...c,
        contactNumber: c.contactNumber.toString().trim(),
      }));

  const addClient = () => {
    if (!clientTmp.name || !clientTmp.contactNumber) return;
    setForm((p) => ({ ...p, clients: [...p.clients, clientTmp] }));
    setClientTmp({ name: "", department: "", email: "", contactNumber: "" });
  };
  const removeClient = (idx) =>
    setForm((p) => ({
      ...p,
      clients: p.clients.filter((_, i) => i !== idx),
    }));
  const updateClientField = (idx, field, value) =>
    setForm((p) => {
      const list = [...p.clients];
      list[idx] = { ...list[idx], [field]: value };
      return { ...p, clients: list };
    });

  const submit = async () => {
    setErr("");
    if (!form.companyName.trim()) {
      setErr("Company name required");
      return;
    }
    const payload = {
      ...form,
      companyName: form.companyName.trim(),
      GSTIN: form.GSTIN.trim(),
      brandName: form.brandName.trim(),
      companyAddress: form.companyAddress.trim(),
      clients: sanitiseContacts(form.clients),
    };
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold mb-4">
          {isEdit ? "Edit Company" : "Add Company"}
        </h2>
        {err && <div className="bg-red-100 text-red-700 p-2 mb-3">{err}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Company Basics */}
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

          {/* New Fields */}
          <div>
            <label className="block text-sm font-medium mb-1">Segment</label>
            <select
              className="w-full p-2 border rounded"
              value={form.segment}
              onChange={(e) => setForm({ ...form, segment: e.target.value })}
            >
              <option value="">Select segment</option>
              {segmentsList.map((seg) => (
                <option key={seg._id} value={seg.segmentName}>
                  {seg.segmentName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Vendor Code
            </label>
            <input
              className="w-full p-2 border rounded"
              value={form.vendorCode}
              onChange={(e) =>
                setForm({ ...form, vendorCode: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Payment Terms
            </label>
            <input
              className="w-full p-2 border rounded"
              value={form.paymentTerms}
              onChange={(e) =>
                setForm({ ...form, paymentTerms: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Portal Upload
            </label>
            <input
              className="w-full p-2 border rounded"
              value={form.portalUpload}
              onChange={(e) =>
                setForm({ ...form, portalUpload: e.target.value })
              }
            />
          </div>

          {/* Clients Section */}
          <div className="col-span-2 border-t pt-4">
            <label className="block text-sm font-medium mb-2">Clients</label>
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

        {/* Actions */}
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
