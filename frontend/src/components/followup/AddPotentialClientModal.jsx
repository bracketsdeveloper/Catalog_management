import React, { useState, useEffect } from "react";
import axios from "axios";

export default function AddPotentialClientModal({ pc, onClose }) {
  const isEdit = Boolean(pc);

  const [companyName, setCompanyName] = useState(pc?.companyName || "");
  const [contacts, setContacts] = useState(
    pc?.contacts?.length
      ? pc.contacts.map(c => ({
          ...c,
          assignedToName: c.assignedTo?.name || "",
          assignedTo: c.assignedTo?._id || c.assignedTo || ""
        }))
      : [
          {
            clientName: "",
            designation: "",
            source: "",
            mobile: "",
            email: "",
            location: "",
            assignedTo: "",
            assignedToName: ""
          }
        ]
  );

  const [fullUsers, setFullUsers] = useState([]);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/users?all=true`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(res => setFullUsers(res.data))
      .catch(console.error);
  }, []);

  const updateContact = (idx, field, val) => {
    const a = [...contacts];
    a[idx][field] = val;
    setContacts(a);
  };

  const addContact = () =>
    setContacts([
      ...contacts,
      {
        clientName: "",
        designation: "",
        source: "",
        mobile: "",
        email: "",
        location: "",
        assignedTo: "",
        assignedToName: ""
      }
    ]);

  const removeContact = idx =>
    setContacts(contacts.filter((_, i) => i !== idx));

  const onAssignedToChange = (idx, text) => {
    updateContact(idx, "assignedToName", text);
    setSuggestionIndex(idx);
    const q = text.toLowerCase();
    setUserSuggestions(
      fullUsers.filter(u =>
        u.name.toLowerCase().includes(q)
      )
    );
  };

  const pickUser = (idx, user) => {
    updateContact(idx, "assignedTo", user._id);
    updateContact(idx, "assignedToName", user.name);
    setUserSuggestions([]);
    setSuggestionIndex(-1);
  };

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      alert("Company Name is required");
      return;
    }

    const hasValidContact = contacts.some(c => c.clientName.trim());
    if (!hasValidContact) {
      alert("At least one contact must have a client name");
      return;
    }

    const cleanedContacts = contacts
      .map(({ assignedToName, ...rest }) => ({
        ...rest,
        assignedTo: rest.assignedTo || null
      }))
      .filter(c => c.clientName.trim());

    const payload = {
      companyName: companyName.trim(),
      contacts: cleanedContacts
    };

    const config = {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    };

    try {
      if (isEdit) {
        await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/potential-clients/${pc._id}`,
          payload,
          config
        );
      } else {
        await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/potential-clients`,
          payload,
          config
        );
      }
      onClose();
    } catch (error) {
      console.error("Error saving potential client:", error);
      alert(error.response?.data?.message || "Failed to save potential client");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-2xl p-6 rounded shadow-lg overflow-auto max-h-full z-50">
        <h2 className="text-lg font-bold mb-4">
          {isEdit ? "Edit" : "Add"} Potential Client
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium">Potential Company Name *</label>
          <input
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            className="border rounded w-full p-2 text-sm mt-1"
            placeholder="Enter company name"
          />
        </div>

        {contacts.map((c, i) => (
          <div key={i} className="border p-4 mb-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Contact {i + 1}</h3>
              {contacts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeContact(i)}
                  className="text-red-600 text-sm hover:text-red-800"
                >
                  Remove Contact
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">Client Name *</label>
                <input
                  placeholder="Enter client name"
                  value={c.clientName}
                  onChange={e => updateContact(i, "clientName", e.target.value)}
                  className="border rounded w-full p-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="block text-sm">Designation</label>
                <input
                  placeholder="Enter designation"
                  value={c.designation}
                  onChange={e => updateContact(i, "designation", e.target.value)}
                  className="border rounded w-full p-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="block text-sm">Source</label>
                <input
                  placeholder="Enter source"
                  value={c.source}
                  onChange={e => updateContact(i, "source", e.target.value)}
                  className="border rounded w-full p-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="block text-sm">Mobile</label>
                <input
                  placeholder="Enter mobile number"
                  value={c.mobile}
                  onChange={e => updateContact(i, "mobile", e.target.value)}
                  className="border rounded w-full p-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="block text-sm">Email</label>
                <input
                  placeholder="Enter email"
                  value={c.email}
                  onChange={e => updateContact(i, "email", e.target.value)}
                  className="border rounded w-full p-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="block text-sm">Location</label>
                <input
                  placeholder="Enter location"
                  value={c.location}
                  onChange={e => updateContact(i, "location", e.target.value)}
                  className="border rounded w-full p-2 text-sm mt-1"
                />
              </div>
              <div className="relative">
                <label className="block text-sm">Assigned To</label>
                <input
                  placeholder="Search user..."
                  value={c.assignedToName}
                  onChange={e => onAssignedToChange(i, e.target.value)}
                  className="border rounded w-full p-2 text-sm mt-1"
                />
                {suggestionIndex === i && userSuggestions.length > 0 && (
                  <ul className="absolute z-10 bg-white border border-gray-300 rounded mt-1 max-h-32 overflow-auto w-full shadow-lg text-sm">
                    {userSuggestions.map(u => (
                      <li
                        key={u._id}
                        onClick={() => pickUser(i, u)}
                        className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      >
                        {u.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addContact}
          className="bg-blue-500 text-white px-3 py-2 rounded text-sm mb-4 hover:bg-blue-600"
        >
          + Add Another Contact
        </button>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            {isEdit ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}