import { useState, useEffect } from "react";
import axios from "axios";

export const VendorAdd = ({ mode, vendor, onClose, onSuccess, BACKEND_URL }) => {
  const isEdit = mode === "edit";
  const [error, setError] = useState("");
  const [vendorList, setVendorList] = useState([]);
  const [form, setForm] = useState({
    vendorName: "",
    vendorCompany: "",
    brandDealing: "",
    location: "",
    clients: [],
    gst: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    postalCode: "",
  });

  const [clientTmp, setClientTmp] = useState({
    name: "",
    contactNumber: "",
  });

  useEffect(() => {
    if (isEdit && vendor) {
      setForm({
        vendorName: vendor.vendorName || "",
        vendorCompany: vendor.vendorCompany || "",
        brandDealing: vendor.brandDealing || "",
        location: vendor.location || "",
        clients: vendor.clients || [],
        gst: vendor.gst || "",
        bankName: vendor.bankName || "",
        accountNumber: vendor.accountNumber || "",
        ifscCode: vendor.ifscCode || "",
        postalCode: vendor.postalCode || "",
      });
    }
  }, [isEdit, vendor]);

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

  const sanitiseContacts = (clients) =>
    clients
      .filter((c) => c && c.name && c.contactNumber)
      .map((c) => ({
        ...c,
        contactNumber: c.contactNumber.toString().trim(),
      }));

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendorList(res.data);
    } catch (err) {
      console.error("Error fetching vendors:", err);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");

    const payload = {
      ...form,
      vendorName: form.vendorName.trim(),
      vendorCompany: form.vendorCompany.trim(),
      brandDealing: form.brandDealing.trim(),
      location: form.location.trim(),
      clients: sanitiseContacts(form.clients),
      gst: form.gst.trim(),
      bankName: form.bankName.trim(),
      accountNumber: form.accountNumber.trim(),
      ifscCode: form.ifscCode.trim(),
      postalCode: form.postalCode.trim(),
    };

    if (!payload.vendorName) return setErr("Vendor name required");
    if (payload.postalCode && !/^\d{6}$/.test(payload.postalCode))
      return setErr("Postal code must be 6 digits");

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (isEdit) {
        await axios.put(
          `${BACKEND_URL}/api/admin/vendors/${vendor._id}`,
          payload,
          config
        );
        alert("Vendor updated successfully!");
        setError("");
      } else {
        await axios.post(
          `${BACKEND_URL}/api/admin/vendors`,
          payload,
          config
        );
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
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold mb-4">
          {isEdit ? "Edit Vendor" : "Add Vendor"}
        </h2>

        {err && <div className="bg-red-100 text-red-700 p-2 mb-3">{err}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* --- company basics --- */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Vendor Name</label>
            <input
              className="w-full p-2 border rounded"
              value={form.vendorName}
              onChange={(e) =>
                setForm({ ...form, vendorName: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Vendor Company Name
            </label>
            <input
              className="w-full p-2 border rounded"
              value={form.vendorCompany}
              onChange={(e) =>
                setForm({ ...form, vendorCompany: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
            Specialises In
            </label>
            <input
              className="w-full p-2 border rounded"
              value={form.brandDealing}
              onChange={(e) =>
                setForm({ ...form, brandDealing: e.target.value })
              }
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Location</label>
            <textarea
              rows={3}
              className="w-full p-2 border rounded"
              value={form.location}
              onChange={(e) =>
                setForm({ ...form, location: e.target.value })
              }
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Postal Code</label>
            <input
              className="w-full p-2 border rounded"
              value={form.postalCode}
              onChange={(e) =>
                setForm({ ...form, postalCode: e.target.value })
              }
              placeholder="6-digit postal code"
            />
          </div>

          {/* --- clients --- */}
          <div className="col-span-2 border-t pt-4">
            <label className="block text-sm font-medium mb-2">Contact</label>

            {/* add client */}
            <div className="flex flex-wrap gap-2 mb-3">
              {["name", "contactNumber"].map((f) => (
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
                      <th className="p-2 border">Contact Name</th>
                      <th className="p-2 border">Contact Number</th>
                      <th className="p-2 border"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.clients.map((cl, idx) => (
                      <tr key={idx}>
                        {["name", "contactNumber"].map((f) => (
                          <td key={f} className="border p-1">
                            <input
                              className="w-full p-1 border rounded"
                              value={cl[f] || ""}
                              onChange={(e) =>
                                updateClientField(idx, f, e.target.value)
                              }
                            />
                          </td>
                        ))}
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
          <div>
            <label className="block text-sm font-medium mb-1">GST Number</label>
            <input
              className="w-full p-2 border rounded"
              value={form.gst}
              onChange={(e) => setForm({ ...form, gst: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bank Name</label>
            <input
              className="w-full p-2 border rounded"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Account Number
            </label>
            <input
              className="w-full p-2 border rounded"
              value={form.accountNumber}
              onChange={(e) =>
                setForm({ ...form, accountNumber: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">IFSC Code</label>
            <input
              className="w-full p-2 border rounded"
              value={form.ifscCode}
              onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
            />
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
          {error && (
            <div className="bg-red-100 text-red-700 p-2 mb-3">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
};