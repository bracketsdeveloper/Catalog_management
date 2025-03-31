// ../components/opportunities/ContactTab.jsx
import React from "react";

export default function ContactTab({ contacts, setContacts }) {
  const handleAddContact = () => {
    setContacts((prev) => [
      ...prev,
      {
        contactCode: "Auto-generated",
        contactName: "",
        description: "",
        isActive: true,
      },
    ]);
  };

  const handleRemoveContact = (index) => {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    setContacts((prev) =>
      prev.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    );
  };

  const toggleIsActive = (index) => {
    setContacts((prev) =>
      prev.map((contact, i) =>
        i === index ? { ...contact, isActive: !contact.isActive } : contact
      )
    );
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-5 gap-4 mb-2 text-blue-900 text-sm font-semibold">
        <div>Contact Code</div>
        <div>Contact Name</div>
        <div>Description</div>
        <div>Is Active</div>
        <div>Delete</div>
      </div>

      {contacts.map((contact, index) => (
        <div
          key={index}
          className="grid grid-cols-5 gap-4 items-center bg-gray-50 p-2 mb-2 rounded"
        >
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm bg-gray-100"
            value={contact.contactCode}
            readOnly
          />
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm"
            placeholder="Contact Name"
            value={contact.contactName}
            onChange={(e) => handleChange(index, "contactName", e.target.value)}
          />
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm"
            placeholder="Description"
            value={contact.description}
            onChange={(e) => handleChange(index, "description", e.target.value)}
          />
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={contact.isActive}
              onChange={() => toggleIsActive(index)}
              className="h-4 w-4"
            />
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => handleRemoveContact(index)}
              className="text-red-600 hover:text-red-800 text-xl"
              title="Remove"
            >
              &#10060;
            </button>
          </div>
        </div>
      ))}

      {contacts.length === 0 && (
        <div className="text-sm text-gray-500 italic mb-2">
          No contacts added.
        </div>
      )}

      <button
        onClick={handleAddContact}
        className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-sm"
      >
        + Add Contact
      </button>
    </div>
  );
}
