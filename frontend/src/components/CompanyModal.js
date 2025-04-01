import React, { useState } from "react";
import axios from "axios";

const CompanyModal = ({ onClose }) => {
  // New states for the extra fields (brandName and GSTIN)
  const [companyName, setCompanyName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [GSTIN, setGSTIN] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [clients, setClients] = useState([{ name: "", contactNumber: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddClient = () => {
    setClients([...clients, { name: "", contactNumber: "" }]);
  };

  const handleRemoveClient = (index) => {
    setClients(clients.filter((_, i) => i !== index));
  };

  const handleClientChange = (index, field, value) => {
    const newClients = [...clients];
    newClients[index][field] = value;
    setClients(newClients);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/companies`,
        {
          companyName,
          brandName,
          GSTIN,
          companyEmail,
          companyAddress,
          clients,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setLoading(false);
      onClose(); // Close modal after successful submission
    } catch (err) {
      console.error("Error creating company:", err);
      setError(err.response?.data?.message || "Error creating company");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border border-gray-200 shadow-lg">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
          >
            <span className="text-xl font-bold">&times;</span>
          </button>
          <h2 className="text-xl font-bold mb-4 text-purple-700">Add New Company</h2>
          {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
          <form onSubmit={handleSubmit}>
            {/* Company Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
                required
              />
            </div>
            {/* Brand Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Brand Name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            {/* GSTIN */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-700 mb-1">
                GSTIN
              </label>
              <input
                type="text"
                value={GSTIN}
                onChange={(e) => setGSTIN(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            {/* Company Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Company Email
              </label>
              <input
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
                required
              />
            </div>
            {/* Company Address */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Company Address
              </label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
                required
              />
            </div>
            {/* Clients */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Clients
              </label>
              {clients.map((client, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="Client Name"
                    value={client.name}
                    onChange={(e) =>
                      handleClientChange(index, "name", e.target.value)
                    }
                    className="border border-purple-300 rounded p-2 w-full"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Contact Number"
                    value={client.contactNumber}
                    onChange={(e) =>
                      handleClientChange(index, "contactNumber", e.target.value)
                    }
                    className="border border-purple-300 rounded p-2 w-full"
                    required
                  />
                  {clients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveClient(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={handleAddClient} className="text-blue-600">
                + Add Client
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
            >
              {loading ? "Creating..." : "Create Company"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanyModal;