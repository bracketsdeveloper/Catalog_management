import React from "react";

function OpportunityStatusTable({ opportunities, formatDate, handleSort, sortConfig, isSuperAdmin, setOpportunityFilter, setSelectedUser, users }) {
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? " ↑" : sortConfig.direction === "desc" ? " ↓" : "";
  };

  // Filter out opportunities with stage "Won", "Lost", or "Discontinued"
  const filteredOpportunities = opportunities.filter(
    (opp) => !["Won", "Lost", "Discontinued","Won/Lost/Discontinued"].includes(opp.opportunityStage)
  );

  return (
    <div className="overflow-x-auto">
      {/* Filter Controls */}
      <div className="mb-4 flex items-center gap-4">
        {!isSuperAdmin && (
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-md ${filteredOpportunities.length > 0 && filteredOpportunities.every((opp) => opp.opportunityOwner === users[0]?.name) ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
              onClick={() => setOpportunityFilter("my")}
            >
              My
            </button>
            <button
              className={`px-4 py-2 rounded-md ${filteredOpportunities.length > 0 && filteredOpportunities.some((opp) => opp.teamMembers?.some((m) => m.userName === users[0]?.name) && opp.opportunityOwner !== users[0]?.name) ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
              onClick={() => setOpportunityFilter("team")}
            >
              Team
            </button>
          </div>
        )}
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <label className="font-medium">Filter by user:</label>
            <select
              className="border p-2 rounded-md"
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="all">All Users</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Opportunities Table */}
      <div className="relative max-h-[500px] overflow-y-auto">
        <table className="min-w-full bg-white border border-gray-200 text-[10px]">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr>
              <th
                className="py-2 border-b text-center cursor-pointer"
                onClick={() => handleSort("opportunityCode")}
              >
                Code{getSortIndicator("opportunityCode")}
              </th>
              <th
                className="py-2 border-b text-center cursor-pointer"
                onClick={() => handleSort("opportunityName")}
              >
                Name{getSortIndicator("opportunityName")}
              </th>
              <th
                className="py-2 border-b text-center cursor-pointer"
                onClick={() => handleSort("account")}
              >
                Account{getSortIndicator("account")}
              </th>
              <th
                className="py-2 border-b text-center cursor-pointer"
                onClick={() => handleSort("opportunityStage")}
              >
                Stage{getSortIndicator("opportunityStage")}
              </th>
              <th
                className="py-2 border-b text-center cursor-pointer"
                onClick={() => handleSort("createdAt")}
              >
                Created At{getSortIndicator("createdAt")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredOpportunities.length > 0 ? (
              filteredOpportunities.map((opp) => (
                <tr key={opp._id} className="hover:bg-gray-50">
                  <td className="py-2 text-center border-b">{opp.opportunityCode || "-"}</td>
                  <td className="py-2 text-center border-b">{opp.opportunityName || "-"}</td>
                  <td className="py-2 text-center border-b">{opp.account || "-"}</td>
                  <td className="py-2 text-center border-b">{opp.opportunityStage || "-"}</td>
                  <td className="py-2 text-center border-b">{formatDate(opp.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="py-4 text-center text-gray-500">
                  No opportunities found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OpportunityStatusTable;