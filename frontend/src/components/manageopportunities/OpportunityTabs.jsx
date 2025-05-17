import React from "react";

export default function OpportunityTabs({ activeTab, setActiveTab, isSuperAdmin, canViewAllOpp }) {
  return (
    <div className="flex space-x-2">
      {isSuperAdmin ? (
        <>
          <button
            onClick={() => setActiveTab("my-opportunities")}
            className={`px-4 py-2 text-sm font-semibold rounded-t-md ${
              activeTab === "my-opportunities"
                ? "bg-[#Ff8045] text-white"
                : "bg-[#Ff8045] text-white"
            }`}
          >
            My Opportunities
          </button>
          <button
            onClick={() => setActiveTab("team-opportunities")}
            className={`px-4 py-2 text-sm font-semibold rounded-t-md ${
              activeTab === "team-opportunities"
                ? "bg-[#66C3D0] text-white"
                : "bg-[#66C3D0] text-white"
            }`}
          >
            Team Opportunities
          </button>
          <button
            onClick={() => setActiveTab("all-opportunities")}
            className={`px-4 py-2 text-sm font-semibold rounded-t-md ${
              activeTab === "all-opportunities"
                ? "bg-[#b3b3b3] text-white"
                : "bg-[#44b977] text-white"
            }`}
          >
            All Opportunities
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => setActiveTab("my-opportunities")}
            className={`px-4 py-2 text-sm font-semibold rounded-t-md ${
              activeTab === "my-opportunities"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            My Opportunities
          </button>
          <button
            onClick={() => setActiveTab("team-opportunities")}
            className={`px-4 py-2 text-sm font-semibold rounded-t-md ${
              activeTab === "team-opportunities"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Team Opportunities
          </button>
        </>
      )}
      {(isSuperAdmin || canViewAllOpp) && (
        <button
          onClick={() => setActiveTab("all-opportunities")}
          className={`px-4 py-2 text-sm font-semibold rounded-t-md ${
            activeTab === "all-opportunities"
              ? "bg-[#b3b3b3] text-white"
              : "bg-[#44b977] text-white"
          }`}
        >
          All Opportunities
        </button>
      )}
    </div>
  );
}
