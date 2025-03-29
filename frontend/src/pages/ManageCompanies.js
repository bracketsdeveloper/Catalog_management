"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ManageCompanies() {
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching companies:", err);
      setError("Failed to fetch companies");
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (companyId) => {
    if (window.confirm("Are you sure you want to delete this company?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${BACKEND_URL}/api/admin/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchCompanies();
      } catch (err) {
        console.error("Error deleting company:", err);
        alert("Failed to delete company");
      }
    }
  };

  const handleEdit = (company) => {
    setSelectedCompany(company);
    setEditModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Companies</h1>
        <button
          onClick={() => setAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Add Company
        </button>
      </div>
      {loading ? (
        <div>Loading companies...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Company Name</th>
              <th className="p-2 text-left">Company Email</th>
              <th className="p-2 text-left">Clients</th>
              <th className="p-2 text-left">Company Address</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company._id} className="border-b">
                <td className="p-2">{company.companyName}</td>
                <td className="p-2">{company.companyEmail}</td>
                <td className="p-2">
                  {company.clients && company.clients.length > 0 ? (
                    company.clients.map((client, idx) => (
                      <div key={idx}>
                        {client.name} ({client.contactNumber})
                      </div>
                    ))
                  ) : (
                    <div>No Clients</div>
                  )}
                </td>
                <td className="p-2">{company.companyAddress}</td>
                <td className="p-2">
                  <button
                    onClick={() => handleEdit(company)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(company._id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {addModalOpen && (
        <AddCompanyModal
          onClose={() => setAddModalOpen(false)}
          onCreated={() => {
            setAddModalOpen(false);
            fetchCompanies();
          }}
          BACKEND_URL={BACKEND_URL}
        />
      )}
      {editModalOpen && selectedCompany && (
        <EditCompanyModal
          company={selectedCompany}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedCompany(null);
          }}
          onUpdated={() => {
            setEditModalOpen(false);
            setSelectedCompany(null);
            fetchCompanies();
          }}
          BACKEND_URL={BACKEND_URL}
        />
      )}
    </div>
  );
}

function AddCompanyModal({ onClose, onCreated, BACKEND_URL }) {
  const [formData, setFormData] = useState({
    companyName: "",
    companyEmail: "",
    companyAddress: "",
    clients: [],
  });
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addClient = () => {
    if (!clientName || !clientContact) {
      setError("Please enter both client name and contact number.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      clients: [...prev.clients, { name: clientName, contactNumber: clientContact }],
    }));
    setClientName("");
    setClientContact("");
    setError("");
  };

  const handleSubmit = async () => {
    if (!formData.companyName) {
      setError("Company Name is required");
      return;
    }
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      await axios.post(`${BACKEND_URL}/api/admin/companies`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onCreated();
    } catch (err) {
      console.error("Error creating company:", err);
      setError("Error creating company");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded w-4/5 max-w-2xl overflow-auto max-h-full">
        <h2 className="text-2xl font-bold mb-4">Add Company</h2>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium">Company Name *</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="border p-2 rounded w-full"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium">Company Email</label>
            <input
              type="email"
              value={formData.companyEmail}
              onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
              className="border p-2 rounded w-full"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium">Company Address</label>
            <textarea
              value={formData.companyAddress}
              onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
              className="border p-2 rounded w-full"
              rows="3"
            ></textarea>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium">Add Client</label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Client Name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="border p-2 rounded w-full"
              />
              <input
                type="text"
                placeholder="Contact Number"
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                className="border p-2 rounded w-full"
              />
              <button
                onClick={addClient}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded"
              >
                Add
              </button>
            </div>
          </div>
          {formData.clients.length > 0 && (
            <div className="col-span-2">
              <label className="block text-sm font-medium">Clients Added:</label>
              <ul className="list-disc pl-5">
                {formData.clients.map((client, idx) => (
                  <li key={idx}>
                    {client.name} - {client.contactNumber}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end space-x-4">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`px-4 py-2 rounded text-white ${saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Company"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCompanyModal({ company, onClose, onUpdated, BACKEND_URL }) {
  const [formData, setFormData] = useState({
    companyName: company.companyName,
    companyEmail: company.companyEmail,
    companyAddress: company.companyAddress,
    clients: company.clients || [],
  });
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addClient = () => {
    if (!clientName || !clientContact) {
      setError("Please enter both client name and contact number.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      clients: [...prev.clients, { name: clientName, contactNumber: clientContact }],
    }));
    setClientName("");
    setClientContact("");
    setError("");
  };

  const handleSubmit = async () => {
    if (!formData.companyName) {
      setError("Company Name is required");
      return;
    }
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      await axios.put(`${BACKEND_URL}/api/admin/companies/${company._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onUpdated();
    } catch (err) {
      console.error("Error updating company:", err);
      setError("Error updating company");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded w-4/5 max-w-2xl overflow-auto max-h-full">
        <h2 className="text-2xl font-bold mb-4">Edit Company</h2>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium">Company Name *</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="border p-2 rounded w-full"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium">Company Email</label>
            <input
              type="email"
              value={formData.companyEmail}
              onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
              className="border p-2 rounded w-full"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium">Company Address</label>
            <textarea
              value={formData.companyAddress}
              onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
              className="border p-2 rounded w-full"
              rows="3"
            ></textarea>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium">Add Client</label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Client Name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="border p-2 rounded w-full"
              />
              <input
                type="text"
                placeholder="Contact Number"
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                className="border p-2 rounded w-full"
              />
              <button
                onClick={addClient}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded"
              >
                Add
              </button>
            </div>
          </div>
          {formData.clients.length > 0 && (
            <div className="col-span-2">
              <label className="block text-sm font-medium">Clients Added:</label>
              <ul className="list-disc pl-5">
                {formData.clients.map((client, idx) => (
                  <li key={idx}>
                    {client.name} - {client.contactNumber}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end space-x-4">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`px-4 py-2 rounded text-white ${saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
            disabled={saving}
          >
            {saving ? "Saving..." : "Update Company"}
          </button>
        </div>
      </div>
    </div>
  );
}
