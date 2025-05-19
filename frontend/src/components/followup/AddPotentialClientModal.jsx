// client/src/components/followup/AddPotentialClientModal.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function AddPotentialClientModal({ pc, onClose }) {
  const isEdit = Boolean(pc);

  // Company + contacts
  const [companyName, setCompanyName] = useState(pc?.companyName || "");
  const [contacts, setContacts] = useState(
    pc?.contacts.length
      ? pc.contacts.map(c => ({ ...c, assignedToName: c.assignedToName || "" }))
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

  // Full users list + filtered suggestions
  const [fullUsers, setFullUsers] = useState([]);
  const [userSuggestions, setUserSuggestions] = useState([]);

  // Load all users once
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

  // On typing into Assigned To name field, filter local users list
  const onAssignedToChange = (idx, text) => {
    updateContact(idx, "assignedToName", text);
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
  };

  const handleSubmit = async () => {
    const payload = {
      companyName,
      contacts: contacts.map(({ assignedToName, ...rest }) => rest)
    };
    const config = {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    };
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
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-2xl p-6 rounded shadow-lg overflow-auto max-h-full z-50">
        <h2 className="text-lg font-bold mb-4">
          {isEdit ? "Edit" : "Add"} Potential Client
        </h2>

        <div className="mb-4">
          <label className="block text-sm">Potential Company Name</label>
          <input
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            className="border rounded w-full p-2 text-sm"
          />
        </div>

        {contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <input
              placeholder="Client Name"
              value={c.clientName}
              onChange={e => updateContact(i, "clientName", e.target.value)}
              className="border rounded p-2 text-sm"
            />
            <input
              placeholder="Designation"
              value={c.designation}
              onChange={e => updateContact(i, "designation", e.target.value)}
              className="border rounded p-2 text-sm"
            />
            <input
              placeholder="Source"
              value={c.source}
              onChange={e => updateContact(i, "source", e.target.value)}
              className="border rounded p-2 text-sm"
            />

            <input
              placeholder="Mobile"
              value={c.mobile}
              onChange={e => updateContact(i, "mobile", e.target.value)}
              className="border rounded p-2 text-sm"
            />
            <input
              placeholder="Email"
              value={c.email}
              onChange={e => updateContact(i, "email", e.target.value)}
              className="border rounded p-2 text-sm"
            />
            <input
              placeholder="Location"
              value={c.location}
              onChange={e => updateContact(i, "location", e.target.value)}
              className="border rounded p-2 text-sm"
            />

            <div className="relative col-span-2">
              <label className="block text-sm">Assigned To</label>
              <input
                value={c.assignedToName}
                onChange={e => onAssignedToChange(i, e.target.value)}
                className="border rounded w-full p-2 text-sm"
              />
              {userSuggestions.length > 0 && (
                <ul className="absolute z-10 bg-white border mt-1 max-h-32 overflow-auto w-full text-sm">
                  {userSuggestions.map(u => (
                    <li
                      key={u._id}
                      onClick={() => pickUser(i, u)}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {u.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {contacts.length > 1 && (
              <button
                className="text-red-600 text-xl self-center"
                onClick={() => removeContact(i)}
              >
                &times;
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addContact}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm mb-4"
        >
          + Add Another Contact
        </button>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm"
          >
            {isEdit ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
