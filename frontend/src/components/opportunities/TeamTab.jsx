// ../components/opportunities/TeamTab.jsx
import React from "react";

export default function TeamTab({ teamMembers, setTeamMembers, users = [] }) {
  const handleAddTeamMember = () => {
    setTeamMembers((prev) => [
      ...prev,
      {
        teamMemberCode: "Auto-generated",
        userName: "",
        description: "",
        isActive: true,
      },
    ]);
  };

  const handleRemoveTeamMember = (index) => {
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    setTeamMembers((prev) =>
      prev.map((tm, i) =>
        i === index ? { ...tm, [field]: value } : tm
      )
    );
  };

  const toggleIsActive = (index) => {
    setTeamMembers((prev) =>
      prev.map((tm, i) =>
        i === index ? { ...tm, isActive: !tm.isActive } : tm
      )
    );
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-5 gap-4 mb-2 text-blue-900 text-sm font-semibold">
        <div>Team Member Code</div>
        <div>User Name *</div>
        <div>Description</div>
        <div>Is Active</div>
        <div>Delete</div>
      </div>

      {teamMembers.map((tm, index) => (
        <div
          key={index}
          className="grid grid-cols-5 gap-4 items-center bg-gray-50 p-2 mb-2 rounded"
        >
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm bg-gray-100"
            value={tm.teamMemberCode}
            readOnly
          />
          {/* userName selection from users list */}
          <select
            className="border rounded px-2 py-1 text-sm"
            value={tm.userName}
            onChange={(e) => handleChange(index, "userName", e.target.value)}
          >
            <option value="">--Select User--</option>
            {users.map((u) => (
              <option key={u._id} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            className="border rounded px-2 py-1 text-sm"
            placeholder="Description"
            value={tm.description}
            onChange={(e) => handleChange(index, "description", e.target.value)}
          />

          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={tm.isActive}
              onChange={() => toggleIsActive(index)}
              className="h-4 w-4"
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => handleRemoveTeamMember(index)}
              className="text-red-600 hover:text-red-800 text-xl"
              title="Remove"
            >
              &#10060;
            </button>
          </div>
        </div>
      ))}

      {teamMembers.length === 0 && (
        <div className="text-sm text-gray-500 italic mb-2">
          No team members added.
        </div>
      )}

      <button
        onClick={handleAddTeamMember}
        className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-sm"
      >
        + Add Team
      </button>
    </div>
  );
}
