// frontend/components/admin/VendorAdd.jsx
import { useState, useEffect, useMemo } from "react";
import axios from "axios";

const RELIABILITY_OPTIONS = [
  { value: "reliable", label: "Reliable" },
  { value: "non-reliable", label: "Non-reliable" },
];

const normaliseReliability = (val) => {
  const s = (val || "").toString().trim().toLowerCase();
  return s === "non-reliable" || s === "non reliable" ? "non-reliable" : "reliable";
};

export const VendorAdd = ({ mode, vendor, onClose, onSuccess, BACKEND_URL }) => {
  const isEdit = mode === "edit";
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    vendorName: "",
    vendorCompany: "",
    brandDealing: "",
    location: "",
    clients: [],
    postalCode: "",
    reliability: "reliable",
    gstNumbers: [],      // [{gst,label,isPrimary}]
    bankAccounts: [],    // [{bankName,accountNumber,ifscCode,accountHolder,branch,isPrimary}]
  });

  const [clientTmp, setClientTmp] = useState({ name: "", contactNumber: "" });
  const [gstTmp, setGstTmp] = useState({ gst: "", label: "" });
  const [bankTmp, setBankTmp] = useState({ bankName: "", accountNumber: "", ifscCode: "", accountHolder: "", branch: "" });

  const reliableValue = useMemo(() => normaliseReliability(form.reliability), [form.reliability]);

  useEffect(() => {
    if (isEdit && vendor) {
      // Back-compat: vendor may still carry legacy gst / bank fields
      const existingGst = (vendor.gstNumbers && vendor.gstNumbers.length)
        ? vendor.gstNumbers
        : (vendor.gst ? [{ gst: vendor.gst, label: "", isPrimary: true }] : []);
      const existingBanks = (vendor.bankAccounts && vendor.bankAccounts.length)
        ? vendor.bankAccounts
        : ((vendor.bankName || vendor.accountNumber || vendor.ifscCode)
          ? [{ bankName: vendor.bankName || "", accountNumber: vendor.accountNumber || "", ifscCode: vendor.ifscCode || "", accountHolder: "", branch: "", isPrimary: true }]
          : []);

      setForm({
        vendorName: vendor.vendorName || "",
        vendorCompany: vendor.vendorCompany || "",
        brandDealing: vendor.brandDealing || "",
        location: vendor.location || "",
        clients: vendor.clients || [],
        postalCode: vendor.postalCode || "",
        reliability: normaliseReliability(vendor.reliability || "reliable"),
        gstNumbers: existingGst,
        bankAccounts: existingBanks,
      });
    }
  }, [isEdit, vendor]);

  /* ----- Clients ----- */
  const addClient = () => {
    if (!clientTmp.name || !clientTmp.contactNumber) return;
    setForm((p) => ({ ...p, clients: [...p.clients, clientTmp] }));
    setClientTmp({ name: "", contactNumber: "" });
  };
  const removeClient = (idx) =>
    setForm((p) => ({ ...p, clients: p.clients.filter((_, i) => i !== idx) }));
  const updateClientField = (idx, field, value) =>
    setForm((p) => {
      const list = [...p.clients];
      list[idx] = { ...list[idx], [field]: value };
      return { ...p, clients: list };
    });

  /* ----- GSTs ----- */
  const addGst = () => {
    const gst = gstTmp.gst.trim();
    if (!gst) return;
    setForm((p) => ({
      ...p,
      gstNumbers: p.gstNumbers.length
        ? [...p.gstNumbers, { gst, label: gstTmp.label.trim(), isPrimary: false }]
        : [{ gst, label: gstTmp.label.trim(), isPrimary: true }], // first is primary
    }));
    setGstTmp({ gst: "", label: "" });
  };
  const removeGst = (idx) =>
    setForm((p) => ({ ...p, gstNumbers: p.gstNumbers.filter((_, i) => i !== idx) }));
  const markPrimaryGst = (idx) =>
    setForm((p) => ({
      ...p,
      gstNumbers: p.gstNumbers.map((g, i) => ({ ...g, isPrimary: i === idx })),
    }));
  const updateGstField = (idx, field, value) =>
    setForm((p) => {
      const list = [...p.gstNumbers];
      list[idx] = { ...list[idx], [field]: value };
      return { ...p, gstNumbers: list };
    });

  /* ----- Banks ----- */
  const addBank = () => {
    const bn = bankTmp.bankName.trim(), an = bankTmp.accountNumber.trim(), ifsc = bankTmp.ifscCode.trim();
    if (!bn && !an && !ifsc) return;
    setForm((p) => ({
      ...p,
      bankAccounts: p.bankAccounts.length
        ? [...p.bankAccounts, { ...bankTmp, isPrimary: false }]
        : [{ ...bankTmp, isPrimary: true }], // first is primary
    }));
    setBankTmp({ bankName: "", accountNumber: "", ifscCode: "", accountHolder: "", branch: "" });
  };
  const removeBank = (idx) =>
    setForm((p) => ({ ...p, bankAccounts: p.bankAccounts.filter((_, i) => i !== idx) }));
  const markPrimaryBank = (idx) =>
    setForm((p) => ({
      ...p,
      bankAccounts: p.bankAccounts.map((b, i) => ({ ...b, isPrimary: i === idx })),
    }));
  const updateBankField = (idx, field, value) =>
    setForm((p) => {
      const list = [...p.bankAccounts];
      list[idx] = { ...list[idx], [field]: value };
      return { ...p, bankAccounts: list };
    });

  const sanitiseContacts = (clients) =>
    clients
      .filter((c) => c && c.name && c.contactNumber)
      .map((c) => ({ ...c, contactNumber: c.contactNumber.toString().trim() }));

  const submit = async () => {
    setErr("");
    const payload = {
      vendorName: form.vendorName.trim(),
      vendorCompany: form.vendorCompany.trim(),
      brandDealing: form.brandDealing.trim(),
      location: form.location.trim(),
      clients: sanitiseContacts(form.clients),
      postalCode: form.postalCode.trim(),
      reliability: normaliseReliability(form.reliability),
      gstNumbers: form.gstNumbers.map((g, i) => ({
        gst: (g.gst || "").trim(),
        label: (g.label || "").trim(),
        isPrimary: !!g.isPrimary && form.gstNumbers.length > 0 ? g.isPrimary : i === 0,
      })),
      bankAccounts: form.bankAccounts.map((b, i) => ({
        bankName: (b.bankName || "").trim(),
        accountNumber: (b.accountNumber || "").trim(),
        ifscCode: (b.ifscCode || "").trim(),
        accountHolder: (b.accountHolder || "").trim(),
        branch: (b.branch || "").trim(),
        isPrimary: !!b.isPrimary && form.bankAccounts.length > 0 ? b.isPrimary : i === 0,
      })),
    };

    if (!payload.vendorName) return setErr("Vendor name required");
    if (payload.postalCode && !/^\d{6}$/.test(payload.postalCode))
      return setErr("Postal code must be 6 digits");

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (isEdit) {
        await axios.put(`${BACKEND_URL}/api/admin/vendors/${vendor._id}`, payload, config);
        alert("Vendor updated successfully!");
      } else {
        await axios.post(`${BACKEND_URL}/api/admin/vendors`, payload, config);
        alert("Vendor created successfully!");
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
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold mb-4">{isEdit ? "Edit Vendor" : "Add Vendor"}</h2>

        {err && <div className="bg-red-100 text-red-700 p-2 mb-3">{err}</div>}

        {/* Basics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Vendor Name</label>
            <input
              className="w-full p-2 border rounded"
              value={form.vendorName}
              onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Vendor Company Name</label>
            <input
              className="w-full p-2 border rounded"
              value={form.vendorCompany}
              onChange={(e) => setForm({ ...form, vendorCompany: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Specialises In</label>
            <input
              className="w-full p-2 border rounded"
              value={form.brandDealing}
              onChange={(e) => setForm({ ...form, brandDealing: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Location</label>
            <textarea
              rows={3}
              className="w-full p-2 border rounded"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          {/* Reliability */}
          <div className="relative z-50">
            <label className="block text-sm font-medium mb-1">Reliability</label>
            <select
              className="w-full p-2 border rounded bg-white"
              value={reliableValue}
              onChange={(e) => setForm({ ...form, reliability: e.target.value })}
            >
              {RELIABILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              Mark <b>Non-reliable</b> to flag the row in red.
            </p>
          </div>

          {/* Postal code */}
          <div>
            <label className="block text-sm font-medium mb-1">Postal Code</label>
            <input
              className="w-full p-2 border rounded"
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              placeholder="6-digit postal code"
            />
          </div>

          {/* Contacts */}
          <div className="md:col-span-2 border-t pt-4">
            <label className="block text-sm font-medium mb-2">Contact</label>
            <div className="flex flex-wrap gap-2 mb-3">
              <input
                placeholder="Name"
                className="flex-1 min-w-[120px] p-2 border rounded"
                value={clientTmp.name}
                onChange={(e) => setClientTmp({ ...clientTmp, name: e.target.value })}
              />
              <input
                placeholder="Contact"
                className="flex-1 min-w-[120px] p-2 border rounded"
                value={clientTmp.contactNumber}
                onChange={(e) => setClientTmp({ ...clientTmp, contactNumber: e.target.value })}
              />
              <button onClick={addClient} className="bg-green-600 text-white px-4 py-2 rounded">
                Add
              </button>
            </div>
            {form.clients.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 border">Contact Name</th>
                      <th className="p-2 border">Contact Number</th>
                      <th className="p-2 border"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.clients.map((cl, idx) => (
                      <tr key={idx}>
                        <td className="border p-1">
                          <input
                            className="w-full p-1 border rounded"
                            value={cl.name || ""}
                            onChange={(e) => updateClientField(idx, "name", e.target.value)}
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            className="w-full p-1 border rounded"
                            value={cl.contactNumber || ""}
                            onChange={(e) => updateClientField(idx, "contactNumber", e.target.value)}
                          />
                        </td>
                        <td className="border p-1 text-center">
                          <button onClick={() => removeClient(idx)} className="text-red-600">
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

          {/* GSTs */}
          <div className="md:col-span-2 border-t pt-4">
            <label className="block text-sm font-medium mb-2">GST Numbers</label>
            <div className="flex flex-wrap gap-2 mb-3">
              <input
                placeholder="GST"
                className="flex-1 min-w-[160px] p-2 border rounded"
                value={gstTmp.gst}
                onChange={(e) => setGstTmp({ ...gstTmp, gst: e.target.value })}
              />
              <input
                placeholder="Label (optional)"
                className="flex-1 min-w-[160px] p-2 border rounded"
                value={gstTmp.label}
                onChange={(e) => setGstTmp({ ...gstTmp, label: e.target.value })}
              />
              <button onClick={addGst} className="bg-green-600 text-white px-4 py-2 rounded">
                Add
              </button>
            </div>
            {form.gstNumbers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 border">GST</th>
                      <th className="p-2 border">Label</th>
                      <th className="p-2 border">Primary</th>
                      <th className="p-2 border"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.gstNumbers.map((g, idx) => (
                      <tr key={idx}>
                        <td className="border p-1">
                          <input
                            className="w-full p-1 border rounded"
                            value={g.gst || ""}
                            onChange={(e) => updateGstField(idx, "gst", e.target.value)}
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            className="w-full p-1 border rounded"
                            value={g.label || ""}
                            onChange={(e) => updateGstField(idx, "label", e.target.value)}
                          />
                        </td>
                        <td className="border p-1 text-center">
                          <input
                            type="radio"
                            name="primaryGst"
                            checked={!!g.isPrimary}
                            onChange={() => markPrimaryGst(idx)}
                          />
                        </td>
                        <td className="border p-1 text-center">
                          <button onClick={() => removeGst(idx)} className="text-red-600">
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

          {/* Banks */}
          <div className="md:col-span-2 border-t pt-4">
            <label className="block text-sm font-medium mb-2">Bank Accounts</label>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
              <input
                placeholder="Bank Name"
                className="p-2 border rounded"
                value={bankTmp.bankName}
                onChange={(e) => setBankTmp({ ...bankTmp, bankName: e.target.value })}
              />
              <input
                placeholder="Account Number"
                className="p-2 border rounded"
                value={bankTmp.accountNumber}
                onChange={(e) => setBankTmp({ ...bankTmp, accountNumber: e.target.value })}
              />
              <input
                placeholder="IFSC Code"
                className="p-2 border rounded"
                value={bankTmp.ifscCode}
                onChange={(e) => setBankTmp({ ...bankTmp, ifscCode: e.target.value })}
              />
              <input
                placeholder="Account Holder"
                className="p-2 border rounded"
                value={bankTmp.accountHolder}
                onChange={(e) => setBankTmp({ ...bankTmp, accountHolder: e.target.value })}
              />
              <input
                placeholder="Branch"
                className="p-2 border rounded"
                value={bankTmp.branch}
                onChange={(e) => setBankTmp({ ...bankTmp, branch: e.target.value })}
              />
            </div>
            <button onClick={addBank} className="bg-green-600 text-white px-4 py-2 rounded mb-3">
              Add Account
            </button>

            {form.bankAccounts.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 border">Bank</th>
                      <th className="p-2 border">Account #</th>
                      <th className="p-2 border">IFSC</th>
                      <th className="p-2 border">Holder</th>
                      <th className="p-2 border">Branch</th>
                      <th className="p-2 border">Primary</th>
                      <th className="p-2 border"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.bankAccounts.map((b, idx) => (
                      <tr key={idx}>
                        <td className="border p-1">
                          <input
                            className="w-full p-1 border rounded"
                            value={b.bankName || ""}
                            onChange={(e) => updateBankField(idx, "bankName", e.target.value)}
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            className="w-full p-1 border rounded"
                            value={b.accountNumber || ""}
                            onChange={(e) => updateBankField(idx, "accountNumber", e.target.value)}
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            className="w-full p-1 border rounded"
                            value={b.ifscCode || ""}
                            onChange={(e) => updateBankField(idx, "ifscCode", e.target.value)}
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            className="w-full p-1 border rounded"
                            value={b.accountHolder || ""}
                            onChange={(e) => updateBankField(idx, "accountHolder", e.target.value)}
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            className="w-full p-1 border rounded"
                            value={b.branch || ""}
                            onChange={(e) => updateBankField(idx, "branch", e.target.value)}
                          />
                        </td>
                        <td className="border p-1 text-center">
                          <input
                            type="radio"
                            name="primaryBank"
                            checked={!!b.isPrimary}
                            onChange={() => markPrimaryBank(idx)}
                          />
                        </td>
                        <td className="border p-1 text-center">
                          <button onClick={() => removeBank(idx)} className="text-red-600">
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

        {/* actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="border px-4 py-2 rounded">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className={`px-4 py-2 text-white rounded ${saving ? "bg-blue-400" : "bg-blue-600"}`}
          >
            {saving ? "Saving…" : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};
