// ../components/opportunities/NoteTab.jsx
import React from "react";

export default function NoteTab({ notes, setNotes }) {
  const handleAddNote = () => {
    setNotes((prev) => [
      ...prev,
      {
        noteCode: "Auto-generated",
        noteDate: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        noteContent: "",
        isActive: true,
      },
    ]);
  };

  const handleRemoveNote = (index) => {
    setNotes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    setNotes((prev) =>
      prev.map((n, i) =>
        i === index ? { ...n, [field]: value } : n
      )
    );
  };

  const toggleIsActive = (index) => {
    setNotes((prev) =>
      prev.map((n, i) =>
        i === index ? { ...n, isActive: !n.isActive } : n
      )
    );
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-5 gap-4 mb-2 text-blue-900 text-sm font-semibold">
        <div>Note Code</div>
        <div>Note Date</div>
        <div>Note Content</div>
        <div>Is Active</div>
        <div>Delete</div>
      </div>

      {notes.map((nt, index) => (
        <div
          key={index}
          className="grid grid-cols-5 gap-4 items-center bg-gray-50 p-2 mb-2 rounded"
        >
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm bg-gray-100"
            value={nt.noteCode}
            readOnly
          />
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm"
            value={nt.noteDate}
            onChange={(e) => handleChange(index, "noteDate", e.target.value)}
          />
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm"
            placeholder="Enter note content"
            value={nt.noteContent}
            onChange={(e) => handleChange(index, "noteContent", e.target.value)}
          />
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={nt.isActive}
              onChange={() => toggleIsActive(index)}
              className="h-4 w-4"
            />
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => handleRemoveNote(index)}
              className="text-red-600 hover:text-red-800 text-xl"
              title="Remove"
            >
              &#10060;
            </button>
          </div>
        </div>
      ))}

      {notes.length === 0 && (
        <div className="text-sm text-gray-500 italic mb-2">
          No notes added.
        </div>
      )}

      <button
        onClick={handleAddNote}
        className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-sm"
      >
        + Add Notes
      </button>
    </div>
  );
}
