import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function CreateCompanyModal({ onClose, onCompanyCreated }) {
  const [segmentsList, setSegmentsList] = useState([]);

  const [form, setForm] = useState({
    companyName: "",
    brandName: "",
    GSTIN: "",
    companyAddress: "",
    pincode: "",
    segment: "",
    vendorCode: "",
    paymentTerms: "",
    portalUpload: "",
    remarks: "",
    clients: [],
  });

  // Clients add temp
  const [clientTmp, setClientTmp] = useState({
    name: "",
    department: "",
    email: "",
    contactNumber: "",
  });

  // CRM Multi-select
  const [selectedCrms, setSelectedCrms] = useState([]); // [{_id,name,email}]
  const [crmQuery, setCrmQuery] = useState("");
  const [crmSuggest, setCrmSuggest] = useState([]);
  const [crmLoading, setCrmLoading] = useState(false);
  const debounceRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Fetch segments
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/segments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSegmentsList(res.data || []);
      } catch (e) {
        console.error("Failed to fetch segments", e);
        setSegmentsList([]);
      }
    })();
  }, []);

  // Debounced CRM suggest
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (!crmQuery.trim()) {
        setCrmSuggest([]);
        return;
      }
      try {
        setCrmLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/companies/crm-suggest`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: crmQuery },
        });

        const selectedIds = new Set(selectedCrms.map((u) => String(u._id)));
        setCrmSuggest((res.data || []).filter((u) => !selectedIds.has(String(u._id))));
      } catch (e) {
        setCrmSuggest([]);
      } finally {
        setCrmLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [crmQuery, selectedCrms]);

  const sanitiseContacts = (clients) =>
    (clients || [])
      .filter((c) => c && c.name && c.contactNumber)
      .map((c) => ({
        ...c,
        contactNumber: c.contactNumber.toString().trim(),
        name: (c.name || "").toString().trim(),
        department: (c.department || "").toString().trim(),
        email: (c.email || "").toString().trim(),
      }));

  const addClient = () => {
    if (!clientTmp.name?.trim() || !clientTmp.contactNumber?.toString().trim()) return;
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

  const addCrm = (u) => {
    setSelectedCrms((prev) => {
      if (prev.some((x) => String(x._id) === String(u._id))) return prev;
      return [...prev, u];
    });
    setCrmQuery("");
    setCrmSuggest([]);
  };

  const removeCrm = (id) => {
    setSelectedCrms((prev) => prev.filter((u) => String(u._id) !== String(id)));
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    setErr("");

    if (!form.companyName.trim() || !form.pincode.trim()) {
      setErr("Company name and pincode are required");
      return;
    }

    const payload = {
      ...form,
      companyName: form.companyName.trim(),
      pincode: form.pincode.trim(),
      GSTIN: (form.GSTIN || "").trim(),
      brandName: (form.brandName || "").trim(),
      companyAddress: (form.companyAddress || "").trim(),
      remarks: (form.remarks || "").trim(),
      vendorCode: (form.vendorCode || "").trim(),
      paymentTerms: (form.paymentTerms || "").trim(),
      portalUpload: (form.portalUpload || "").trim(),
      segment: (form.segment || "").trim(),
      clients: sanitiseContacts(form.clients),
      crmIncharge: selectedCrms.map((u) => u._id),
    };

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const res = await axios.post(`${BACKEND_URL}/api/admin/companies`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Your backend returns { message, company }
      const created = res.data?.company || res.data;

      onCompanyCreated?.(created);
      onClose?.();
    } catch (e) {
      console.error("Error creating company:", e);
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 400 ? "Validation error" : "Create failed");
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-lg shadow-md w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Create Company</h2>
          <button onClick={onClose} className="text-2xl leading-none text-gray-600 hover:text-gray-900">
            ×
          </button>
        </div>

        {err && <div className="bg-red-100 text-red-700 p-2 mb-3 rounded">{err}</div>}

        <form onSubmit={submit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full p-2 border rounded"
                value={form.companyName}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium mb-1">Brand Name</label>
              <input
                className="w-full p-2 border rounded"
                value={form.brandName}
                onChange={(e) => setForm((p) => ({ ...p, brandName: e.target.value }))}
              />
            </div>

            {/* GSTIN */}
            <div>
              <label className="block text-sm font-medium mb-1">GSTIN</label>
              <input
                className="w-full p-2 border rounded"
                value={form.GSTIN}
                onChange={(e) => setForm((p) => ({ ...p, GSTIN: e.target.value }))}
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                rows={3}
                className="w-full p-2 border rounded"
                value={form.companyAddress}
                onChange={(e) => setForm((p) => ({ ...p, companyAddress: e.target.value }))}
              />
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full p-2 border rounded"
                value={form.pincode}
                onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value }))}
              />
            </div>

            {/* Segment */}
            <div>
              <label className="block text-sm font-medium mb-1">Segment</label>
              <select
                className="w-full p-2 border rounded"
                value={form.segment}
                onChange={(e) => setForm((p) => ({ ...p, segment: e.target.value }))}
              >
                <option value="">Select segment</option>
                {segmentsList.map((seg) => (
                  <option key={seg._id} value={seg.segmentName}>
                    {seg.segmentName}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor Code */}
            <div>
              <label className="block text-sm font-medium mb-1">Vendor Code</label>
              <input
                className="w-full p-2 border rounded"
                value={form.vendorCode}
                onChange={(e) => setForm((p) => ({ ...p, vendorCode: e.target.value }))}
              />
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-sm font-medium mb-1">Payment Terms</label>
              <input
                className="w-full p-2 border rounded"
                value={form.paymentTerms}
                onChange={(e) => setForm((p) => ({ ...p, paymentTerms: e.target.value }))}
              />
            </div>

            {/* Portal Upload */}
            <div>
              <label className="block text-sm font-medium mb-1">Portal Upload</label>
              <input
                className="w-full p-2 border rounded"
                value={form.portalUpload}
                onChange={(e) => setForm((p) => ({ ...p, portalUpload: e.target.value }))}
              />
            </div>

            {/* Remarks */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Remarks</label>
              <textarea
                rows={2}
                className="w-full p-2 border rounded"
                value={form.remarks}
                onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
              />
            </div>

            {/* CRM Incharge */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">CRM Incharge</label>
              <div className="border rounded p-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedCrms.map((u) => (
                    <span
                      key={String(u._id)}
                      className="inline-flex items-center gap-2 bg-gray-100 border rounded px-2 py-1 text-xs"
                    >
                      {u.name || u.email}
                      <button type="button" className="text-red-600" onClick={() => removeCrm(u._id)}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <input
                  className="w-full p-2 border rounded"
                  placeholder="Type name, email, or phone to add CRM"
                  value={crmQuery}
                  onChange={(e) => setCrmQuery(e.target.value)}
                />

                {crmQuery && (
                  <div className="mt-2 max-h-48 overflow-y-auto border rounded">
                    {crmLoading ? (
                      <div className="p-2 text-sm text-gray-500">Searching…</div>
                    ) : crmSuggest.length ? (
                      crmSuggest.map((u) => (
                        <button
                          key={String(u._id)}
                          type="button"
                          onClick={() => addCrm({ _id: u._id, name: u.name, email: u.email })}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        >
                          <div className="font-medium">{u.name}</div>
                          <div className="text-gray-600">{u.email}</div>
                        </button>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500">No matches</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Clients */}
            <div className="md:col-span-2 border-t pt-4">
              <label className="block text-sm font-medium mb-2">Clients</label>

              <div className="flex flex-wrap gap-2 mb-3">
                {["name", "department", "email", "contactNumber"].map((f) => (
                  <input
                    key={f}
                    placeholder={f === "contactNumber" ? "Contact" : f.charAt(0).toUpperCase() + f.slice(1)}
                    className="flex-1 min-w-[140px] p-2 border rounded"
                    value={clientTmp[f]}
                    onChange={(e) => setClientTmp((p) => ({ ...p, [f]: e.target.value }))}
                  />
                ))}
                <button
                  type="button"
                  onClick={addClient}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
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
                          {["name", "department", "email", "contactNumber"].map((f) => (
                            <td key={f} className="border p-1">
                              <input
                                className="w-full p-1 border rounded"
                                value={cl[f] || ""}
                                onChange={(e) => updateClientField(idx, f, e.target.value)}
                              />
                            </td>
                          ))}
                          <td className="border p-1 text-center">
                            <button type="button" onClick={() => removeClient(idx)} className="text-red-600">
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
            <button type="button" onClick={onClose} className="border px-4 py-2 rounded">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 text-white rounded ${saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
