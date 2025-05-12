// client/src/components/managepotentialclients/ToggleButtons.jsx
import React from "react";

export default function ToggleButtons({ activeTab, setActiveTab, isSuperAdmin }) {
  const tabs = [
    { key: "my",   label: "My"   },
    { key: "team", label: "Team" },
    ...(isSuperAdmin ? [{ key: "all", label: "All" }] : [])
  ];

  return (
    <div className="inline-flex rounded bg-gray-200 overflow-hidden">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => setActiveTab(t.key)}
          className={
            "px-4 py-2 text-sm " +
            (activeTab === t.key
              ? "bg-white text-blue-600 font-semibold"
              : "text-gray-700")
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
