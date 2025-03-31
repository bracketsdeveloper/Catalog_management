"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function ManageCompanies() {
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [companyLogs, setCompanyLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1
  });

  useEffect(() => {
    fetchCompanies();
  }, [pagination.page]);

  async function fetchCompanies() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/companies`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: pagination.page,
          limit: pagination.limit
        }
      });
      setCompanies(res.data.companies);
      setPagination(prev => ({
        ...prev,
        totalPages: res.data.totalPages
      }));
      setError(null);
    } catch (err) {
      console.error("Error fetching companies:", err);
      setError(err.response?.data?.message || "Failed to fetch companies");
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
        alert(err.response?.data?.message || "Failed to delete company");
      }
    }
  };

  const handleEdit = (company) => {
    setSelectedCompany(company);
    setEditModalOpen(true);
  };

  const fetchCompanyLogs = async (companyId) => {
    try {
      setLogsLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/companies/${companyId}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanyLogs(res.data);
      setLogsModalOpen(true);
    } catch (err) {
      console.error("Error fetching company logs:", err);
      alert(err.response?.data?.message || "Failed to fetch company logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const token = localStorage.getItem("token");
    window.open(`${BACKEND_URL}/api/admin/companies/template?token=${token}`, '_blank');
  };

  const isValidFile = (file) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    return file && validTypes.includes(file.type);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!isValidFile(file)) {
      setUploadError("Invalid file type. Please upload an Excel file (.xlsx, .xls)");
      e.target.value = '';
      return;
    }

    try {
      setUploadProgress(0);
      setUploadError(null);
      setUploadSuccess(null);

      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem("token");
      
      // Ensure URL is properly formatted
      const uploadUrl = `${BACKEND_URL}/api/admin/companies/bulk`.replace(/([^:]\/)\/+/g, '$1');
      
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      setUploadSuccess(`Successfully uploaded ${response.data.count} companies`);
      fetchCompanies();
    } catch (err) {
      console.error('Error uploading file:', err);
      const errorMessage = err.response?.data?.message || 
                         err.response?.data?.error || 
                         err.message || 
                         'Error uploading file';
      setUploadError(errorMessage);
      
      if (err.response?.data?.errors) {
        setUploadError(prev => `${prev}: ${err.response.data.errors.join(', ')}`);
      }
    } finally {
      e.target.value = '';
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Companies</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Add Company
          </button>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Bulk Upload
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Company Name</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Brand Name</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">GSTIN</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Clients</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Address</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company._id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{company.companyName}</td>
                    <td className="p-3">{company.brandName || '-'}</td>
                    <td className="p-3">{company.GSTIN || '-'}</td>
                    <td className="p-3">{company.companyEmail || '-'}</td>
                    <td className="p-3">
                      {company.clients?.length > 0 ? (
                        <div className="space-y-1">
                          {company.clients.map((client, idx) => (
                            <div key={idx} className="text-sm">
                              {client.name} ({client.contactNumber})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No clients</span>
                      )}
                    </td>
                    <td className="p-3">{company.companyAddress || '-'}</td>
                    <td className="p-3 space-x-1">
                      <button
                        onClick={() => handleEdit(company)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-sm"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => fetchCompanyLogs(company._id)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-sm"
                        title="View Logs"
                      >
                        Logs
                      </button>
                      <button
                        onClick={() => handleDelete(company._id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className={`px-4 py-2 rounded ${pagination.page === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              Previous
            </button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className={`px-4 py-2 rounded ${pagination.page === pagination.totalPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Add Company Modal */}
      <AddCompanyModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={() => {
          setAddModalOpen(false);
          fetchCompanies();
        }}
        BACKEND_URL={BACKEND_URL}
      />

      {/* Edit Company Modal */}
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

      {/* Audit Logs Modal */}
      <LogsModal
        isOpen={logsModalOpen}
        logs={companyLogs}
        isLoading={logsLoading}
        onClose={() => {
          setLogsModalOpen(false);
          setCompanyLogs(null);
        }}
      />

      {/* Bulk Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        progress={uploadProgress}
        error={uploadError}
        success={uploadSuccess}
        onDownloadTemplate={downloadTemplate}
        onFileUpload={handleFileUpload}
        onClose={() => {
          setUploadModalOpen(false);
          setUploadError(null);
          setUploadSuccess(null);
          setUploadProgress(0);
        }}
      />
    </div>
  );
}

// Modal Components (Add these below the main component or in separate files)

function AddCompanyModal({ isOpen, onClose, onCreated, BACKEND_URL }) {
  const [formData, setFormData] = useState({
    companyName: "",
    brandName: "",
    GSTIN: "",
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
    setFormData(prev => ({
      ...prev,
      clients: [...prev.clients, { name: clientName, contactNumber: clientContact }],
    }));
    setClientName("");
    setClientContact("");
    setError("");
  };

  const removeClient = (index) => {
    setFormData(prev => ({
      ...prev,
      clients: prev.clients.filter((_, i) => i !== index)
    }));
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
      setError(err.response?.data?.message || "Error creating company");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <h2 className="text-2xl font-bold mb-4">Add New Company</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
            <input
              type="text"
              value={formData.brandName}
              onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
            <input
              type="text"
              value={formData.GSTIN}
              onChange={(e) => setFormData({ ...formData, GSTIN: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="22AAAAA0000A1Z5"
            />
          </div>
          
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
            <input
              type="email"
              value={formData.companyEmail}
              onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
            <textarea
              value={formData.companyAddress}
              onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
            />
          </div>
          
          <div className="col-span-2">
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Add Clients</label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  placeholder="Client Name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Contact Number"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={addClient}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Add
                </button>
              </div>
              
              {formData.clients.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <span className="font-medium">Current Clients</span>
                  </div>
                  <ul className="divide-y">
                    {formData.clients.map((client, idx) => (
                      <li key={idx} className="px-4 py-2 flex justify-between items-center">
                        <div>
                          <span className="font-medium">{client.name}</span> - {client.contactNumber}
                        </div>
                        <button
                          onClick={() => removeClient(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={`px-4 py-2 rounded-md text-white ${saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {saving ? (
              <>
                <span className="inline-block animate-spin mr-2">↻</span>
                Saving...
              </>
            ) : 'Save Company'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCompanyModal({ company, onClose, onUpdated, BACKEND_URL }) {
  const [formData, setFormData] = useState({
    companyName: company.companyName,
    brandName: company.brandName || "",
    GSTIN: company.GSTIN || "",
    companyEmail: company.companyEmail || "",
    companyAddress: company.companyAddress || "",
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
    setFormData(prev => ({
      ...prev,
      clients: [...prev.clients, { name: clientName, contactNumber: clientContact }],
    }));
    setClientName("");
    setClientContact("");
    setError("");
  };

  const removeClient = (index) => {
    setFormData(prev => ({
      ...prev,
      clients: prev.clients.filter((_, i) => i !== index)
    }));
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
      setError(err.response?.data?.message || "Error updating company");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <h2 className="text-2xl font-bold mb-4">Edit Company</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
            <input
              type="text"
              value={formData.brandName}
              onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
            <input
              type="text"
              value={formData.GSTIN}
              onChange={(e) => setFormData({ ...formData, GSTIN: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="22AAAAA0000A1Z5"
            />
          </div>
          
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
            <input
              type="email"
              value={formData.companyEmail}
              onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
            <textarea
              value={formData.companyAddress}
              onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
            />
          </div>
          
          <div className="col-span-2">
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Manage Clients</label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  placeholder="Client Name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Contact Number"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={addClient}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Add
                </button>
              </div>
              
              {formData.clients.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <span className="font-medium">Current Clients ({formData.clients.length})</span>
                  </div>
                  <ul className="divide-y">
                    {formData.clients.map((client, idx) => (
                      <li key={idx} className="px-4 py-2 flex justify-between items-center">
                        <div>
                          <span className="font-medium">{client.name}</span> - {client.contactNumber}
                        </div>
                        <button
                          onClick={() => removeClient(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={`px-4 py-2 rounded-md text-white ${saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {saving ? (
              <>
                <span className="inline-block animate-spin mr-2">↻</span>
                Saving...
              </>
            ) : 'Update Company'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LogsModal({ isOpen, logs, isLoading, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <h2 className="text-2xl font-bold mb-4">Company Audit Logs</h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {logs?.company && (
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Company Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Company Name</p>
                    <p>{logs.company.companyName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Brand Name</p>
                    <p>{logs.company.brandName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">GSTIN</p>
                    <p>{logs.company.GSTIN || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Created At</p>
                    <p>{new Date(logs.company.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Created By</p>
                    <p>{logs.company.createdBy?.name || 'System'}</p>
                  </div>
                  {logs.company.updatedAt && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Last Updated</p>
                        <p>{new Date(logs.company.updatedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Updated By</p>
                        <p>{logs.company.updatedBy?.name || 'System'}</p>
                      </div>
                    </>
                  )}
                  {logs.company.deleted && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Deleted At</p>
                        <p>{new Date(logs.company.deletedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Deleted By</p>
                        <p>{logs.company.deletedBy?.name || 'System'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <h3 className="text-lg font-semibold mb-3">Activity Log</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Action</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Field</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Old Value</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">New Value</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Performed By</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">IP Address</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs?.logs?.length > 0 ? (
                    logs.logs.map((log, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-3 capitalize">{log.action}</td>
                        <td className="p-3">{log.field || 'N/A'}</td>
                        <td className="p-3 max-w-xs truncate">
                          {log.oldValue ? 
                            (Array.isArray(log.oldValue) ? 
                              log.oldValue.map(item => JSON.stringify(item)).join(', ') : 
                              typeof log.oldValue === 'object' ? 
                                JSON.stringify(log.oldValue) : 
                                log.oldValue.toString()) : 
                            'N/A'}
                        </td>
                        <td className="p-3 max-w-xs truncate">
                          {log.newValue ? 
                            (Array.isArray(log.newValue) ? 
                              log.newValue.map(item => JSON.stringify(item)).join(', ') : 
                              typeof log.newValue === 'object' ? 
                                JSON.stringify(log.newValue) : 
                                log.newValue.toString()) : 
                            'N/A'}
                        </td>
                        <td className="p-3">{log.performedBy?.name || 'System'}</td>
                        <td className="p-3">{log.ipAddress}</td>
                        <td className="p-3">{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="p-4 text-center text-gray-500">
                        No activity logs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ isOpen, progress, error, success, onDownloadTemplate, onFileUpload, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Bulk Upload Companies</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">1. Download Template</h3>
            <p className="text-sm text-gray-600 mb-3">
              Download the Excel template file and fill in your company data.
            </p>
            <button
              onClick={onDownloadTemplate}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              Download Template
            </button>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">2. Upload Filled Template</h3>
            <p className="text-sm text-gray-600 mb-3">
              Select your filled Excel file to upload.
            </p>
            <input
              type="file"
              id="bulk-upload"
              accept=".xlsx, .xls"
              onChange={onFileUpload}
              className="hidden"
            />
            <label
              htmlFor="bulk-upload"
              className="w-full block bg-gray-100 hover:bg-gray-200 border-2 border-dashed border-gray-300 rounded-md py-8 text-center cursor-pointer"
            >
              <div className="flex flex-col items-center justify-center">
                <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  Click to select file or drag and drop
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  Excel files only (.xlsx, .xls)
                </span>
              </div>
            </label>
            
            {progress > 0 && progress < 100 && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">
                  Uploading: {progress}%
                </p>
              </div>
            )}
          </div>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    {success}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}