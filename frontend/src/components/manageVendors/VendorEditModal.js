    import React, { useState } from "react";
    import axios from "axios";
    export const VendorEditModal = (
        {
            mode,
            vendor,
            onClose,
            onSuccess,
            BACKEND_URL,
        }
    ) => {
        const isEdit = mode === "edit";

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
        });

        const [clientTmp, setClientTmp] = useState({
            name: "",
            contactNumber: "",
        });

        const addClient = () =>
            setForm((p) => ({ ...p, clients: [...p.clients, clientTmp] }));

        const removeClient = (idx) =>
            setForm((p) => ({ ...p, clients: p.clients.filter((_, i) => i !== idx) }));

        const sanitiseContacts = (clients) =>
            clients
                .filter((c) => c && c.name && c.contactNumber)
                .map((c) => ({
                    ...c,
                    contactNumber: c.contactNumber.toString().trim(),
                }));


        const [saving, setSaving] = useState(false);
        const [err, setErr] = useState("");

        const submit = async () => {
            setErr("");

            const payload = {
                vendorName: form.vendorName,
                vendorCompany: form.vendorCompany,
                brandDealing: form.brandDealing,
                location: form.location,
                clients: sanitiseContacts(form.clients),
                gst: form.gst,
                bankName: form.bankName,
                accountNumber: form.accountNumber,
                ifscCode: form.ifscCode,
            };

            if (isEdit) {
                await axios.put(
                    `${BACKEND_URL}/api/admin/vendors/${vendor._id}`,    
                    payload,
                    {
                        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                    }
                );
            } else {
                await axios.post(
                    `${BACKEND_URL}/api/admin/vendors`,
                    payload,
                    {
                        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                    }
                );
            }
            onSuccess();
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">    
                <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                    <h2 className="text-2xl font-bold mb-4">
                        {isEdit ? "Edit Vendor" : "Add Vendor"}
                    </h2>

                    {err && <div className="bg-red-100 text-red-700 p-2 mb-3">{err}</div>}

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        {/* --- company basics --- */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">
                                Vendor Name
                            </label>
                            <input
                                className="w-full p-2 border rounded"
                                value={form.vendorName}
                                onChange={(e) =>
                                    setForm({ ...form, vendorName: e.target.value })
                                }
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
                            <label className="block text-sm font-medium mb-1">Brand Dealing</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={form.brandDealing}
                                onChange={(e) => setForm({ ...form, brandDealing: e.target.value })}
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

                        {/* --- clients --- */}
                        <div className="col-span-2 border-t pt-4">                            
                            <label className="block text-sm font-medium mb-2">Clients</label>

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
                                    className="bg-blue-500 text-white px-3 py-1 rounded"
                                >                                    
                                    Add
                                </button>
                            </div>

                            <ul className="text-xs mt-1">
                                {form.clients.map((cl, idx) => (
                                    <li key={idx} className="flex justify-between">
                                        {cl.name}: {cl.contactNumber}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );    
}   