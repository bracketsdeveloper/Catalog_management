// ../components/opportunities/CompetitorTab.jsx
import React from "react";

export default function CompetitorTab({ competitors, setCompetitors }) {
  const handleAddCompetitor = () => {
    setCompetitors((prev) => [
      ...prev,
      {
        competitorCode: "Auto-generated",
        competitorName: "",
        competitorActivity: "",
      },
    ]);
  };

  const handleRemoveCompetitor = (index) => {
    setCompetitors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    setCompetitors((prev) =>
      prev.map((comp, i) =>
        i === index ? { ...comp, [field]: value } : comp
      )
    );
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-4 gap-4 mb-2 text-blue-900 text-sm font-semibold">
        <div>Opportunity Competitor Code</div>
        <div>Opportunity Competitor Name *</div>
        <div>Competitor Activity</div>
        <div>Delete</div>
      </div>

      {competitors.map((comp, index) => (
        <div
          key={index}
          className="grid grid-cols-4 gap-4 items-center bg-gray-50 p-2 mb-2 rounded"
        >
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm bg-gray-100"
            value={comp.competitorCode}
            readOnly
          />
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm"
            placeholder="Enter competitor name"
            value={comp.competitorName}
            onChange={(e) => handleChange(index, "competitorName", e.target.value)}
          />
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm"
            placeholder="Activity"
            value={comp.competitorActivity}
            onChange={(e) =>
              handleChange(index, "competitorActivity", e.target.value)
            }
          />
          <div className="flex justify-center">
            <button
              onClick={() => handleRemoveCompetitor(index)}
              className="text-red-600 hover:text-red-800 text-xl"
              title="Remove"
            >
              &#10060;
            </button>
          </div>
        </div>
      ))}

      {competitors.length === 0 && (
        <div className="text-sm text-gray-500 italic mb-2">
          No competitors added.
        </div>
      )}

      <button
        onClick={handleAddCompetitor}
        className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-sm"
      >
        + Add Competitor
      </button>
    </div>
  );
}
