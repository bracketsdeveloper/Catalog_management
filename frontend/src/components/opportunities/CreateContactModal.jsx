import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

export default function CreateContactModal({ onClose, onContactCreated, companyName }) {
  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // This function assumes you have an endpoint to add a new contact to a company.
  // For example, a PUT request to /api/admin/companies/add-contact that updates a company's clients array.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !contactNumber) {
      alert("Contact name and number are required.");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${BACKEND_URL}/api/admin/companies/add-contact`,
        {
          companyName,
          contact: { name, department, email,  contactNumber },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onContactCreated({ name, department, email, contactNumber });
    } catch (error) {
      console.error("Error creating contact:", error);
      alert("Error creating contact.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-4 rounded shadow-md w-80">
        <h2 className="text-lg font-semibold mb-4">Create Contact</h2>
        <form onSubmit={handleSubmit}>
               <div className="mb-2">
            <label className="block text-sm font-medium">Contact Name </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded w-full px-2 py-1 text-sm"
            />
          </div>
            <div className="mb-2">
            <label className="block text-sm font-medium">Contact Number </label>
            <input
              type="text"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="border rounded w-full px-2 py-1 text-sm"
            />
          </div>
           <div className="mb-2">
            <label className="block text-sm font-medium">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="border rounded w-full px-2 py-1 text-sm"
            />
          </div>
           <div className="mb-2">
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded w-full px-2 py-1 text-sm"
            />
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
