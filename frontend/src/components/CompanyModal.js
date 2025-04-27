// src/components/CompanyModal.js
import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function CompanyModal({ onClose }) {
  const [form, setForm] = useState({
    companyName: "",
    brandName: "",
    GSTIN: "",
    companyAddress: "",
    clients: [{ name: "", department: "", email: "", contactNumber: "" }],
  });
  const [saving, setSaving] = useState(false);

  const addClient = () =>
    setForm({ ...form, clients: [...form.clients, { name: "", department: "", email: "", contactNumber: "" }] });

  const save = async () => {
    setSaving(true);
    await axios.post(`${BACKEND_URL}/api/admin/companies`, form, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-[500px] relative max-h-[90vh] overflow-auto">
        <button className="absolute top-3 right-3 text-gray-600 hover:text-gray-900" onClick={onClose}>
          ×
        </button>
        <h3 className="text-xl font-bold mb-4">Add Company</h3>
        <div className="space-y-4">
          {["companyName", "brandName", "GSTIN", "companyAddress"].map((f) => (
            <div key={f} className="flex flex-col">
              <label className="text-sm font-medium mb-1 capitalize">{f}</label>
              <input
                className="border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${f}`}
                value={form[f]}
                onChange={(e) => setForm({ ...form, [f]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <h4 className="font-semibold text-sm mt-6 mb-2">Clients</h4>
        <div className="space-y-3">
          {form.clients.map((cl, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-3">
              {["name", "department", "email", "contactNumber"].map((f) => (
                <div key={f} className="flex flex-col">
                  <label className="text-xs font-medium mb-1 capitalize">{f}</label>
                  <input
                    className="border p-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${f}`}
                    value={cl[f]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        clients: form.clients.map((c, i) => (i === idx ? { ...c, [f]: e.target.value } : c)),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        <button
          className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          onClick={addClient}
        >
          + Add Client
        </button>
        <button
          className={`mt-6 w-full bg-green-600 text-white px-4 py-2 rounded-md ${
            saving ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700 transition-colors"
          }`}
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
