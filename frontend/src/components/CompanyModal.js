import React, { useState } from "react";
import axios from "axios";

const CompanyModal = ({ onClose }) => {
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [clients, setClients] = useState([{ name: "", contactNumber: "" }]);

  const handleAddClient = () => {
    setClients([...clients, { name: "", contactNumber: "" }]);
  };

  const handleClientChange = (index, field, value) => {
    const newClients = [...clients];
    newClients[index][field] = value;
    setClients(newClients);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/admin/companies`, {
        companyName,
        companyEmail,
        companyAddress,
        clients,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onClose(); // Close modal after successful submission
    } catch (error) {
      console.error("Error creating company:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border border-gray-200 shadow-lg">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
          >
            <span className="text-xl font-bold">&times;</span>
          </button>
          <h2 className="text-xl font-bold mb-4 text-purple-700">Add New Company</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-700 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-700 mb-1">Company Email</label>
              <input
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-700 mb-1">Company Address</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-700 mb-1">Clients</label>
              {clients.map((client, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="Client Name"
                    value={client.name}
                    onChange={(e) => handleClientChange(index, "name", e.target.value)}
                    className="border border-purple-300 rounded p-2 w-full"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Contact Number"
                    value={client.contactNumber}
                    onChange={(e) => handleClientChange(index, "contactNumber", e.target.value)}
                    className="border border-purple-300 rounded p-2 w-full"
                    required
                  />
                </div>
              ))}
              <button type="button" onClick={handleAddClient} className="text-blue-600">
                + Add Client
              </button>
            </div>
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
              Create Company
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanyModal;