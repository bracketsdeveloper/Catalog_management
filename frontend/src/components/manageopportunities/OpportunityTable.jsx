import React from "react";
import { Link } from "react-router-dom";

function SortIndicator({ sortConfig, field }) {
  if (sortConfig.key !== field) return null;
  if (sortConfig.direction === "asc") return " ▲";
  if (sortConfig.direction === "desc") return " ▼";
  return null;
}

function OpportunityTableRow({ oppty, formatClosureDate, formatCreatedDate, latestActions }) {
  const latestAction = latestActions[oppty._id] || {};
  return (
    <tr className="border-b hover:bg-blue-50">
      <td className="py-2 px-3 text-blue-600 font-medium">{oppty.opportunityCode}</td>
      <td className="py-2 px-3">{formatCreatedDate(oppty.createdAt)}</td>
      <td className="py-2 px-3 text-blue-500 font-medium">{oppty.account}</td>
      <td className="py-2 px-3">{oppty.contact || "-"}</td>
      <td className="py-2 px-3">{oppty.opportunityName}</td>
      <td className="py-2 px-3 text-blue-500 font-medium">{oppty.opportunityOwner}</td>
      <td className="py-2 px-3">{oppty.opportunityValue?.toLocaleString()}</td>
      <td className="py-2 px-3">{formatClosureDate(oppty.closureDate)}</td>
      <td className="py-2 px-3">{oppty.opportunityStage}</td>
      <td className="py-2 px-3">{oppty.opportunityStatus || "-"}</td>
      <td className="py-2 px-3">
        {latestAction.action
          ? `${latestAction.action}${latestAction.field ? ` (${latestAction.field})` : ""} by ${
              latestAction.performedBy?.name || "N/A"
            } at ${
              latestAction.performedAt
                ? new Date(latestAction.performedAt).toLocaleString()
                : "Unknown date"
            }`
          : "No action recorded"}
      </td>
      <td className="py-2 px-3">
        <Link
          to={`/admin-dashboard/create-opportunity/${oppty._id}`}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          View
        </Link>
      </td>
    </tr>
  );
}

export default function OpportunityTable({
  data,
  formatClosureDate,
  formatCreatedDate,
  handleSort,
  sortConfig,
  latestActions,
}) {
  if (!data?.length) {
    return (
      <div className="p-4 text-sm text-gray-600 italic">No opportunities found.</div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-gray-700 border-b border-gray-200">
        <thead className="bg-gray-50 border-b text-gray-500 uppercase sticky top-0 z-10">
          <tr>
            <th
              onClick={() => handleSort("opportunityCode")}
              className="py-2 px-3 text-left cursor-pointer"
            >
              Opportunity Code<SortIndicator sortConfig={sortConfig} field="opportunityCode" />
            </th>
            <th
              onClick={() => handleSort("createdAt")}
              className="py-2 px-3 text-left cursor-pointer"
            >
              Created Date<SortIndicator sortConfig={sortConfig} field="createdAt" />
            </th>
            <th
              onClick={() => handleSort("account")}
              className="py-2 px-3 text-left cursor-pointer"
            >
              Account<SortIndicator sortConfig={sortConfig} field="account" />
            </th>
            <th className="py-2 px-3 text-left">Company Contact</th>
            <th
              onClick={() => handleSort("opportunityName")}
              className="py-2 px-3 text-left cursor-pointer"
            >
              Opportunity Name<SortIndicator sortConfig={sortConfig} field="opportunityName" />
            </th>
            <th
              onClick={() => handleSort("opportunityOwner")}
              className="py-2 px-3 text-left cursor-pointer"
            >
              Owner<SortIndicator sortConfig={sortConfig} field="opportunityOwner" />
            </th>
            <th
              onClick={() => handleSort("opportunityValue")}
              className="py-2 px-3 text-left cursor-pointer"
            >
              Value<SortIndicator sortConfig={sortConfig} field="opportunityValue" />
            </th>
            <th
              onClick={() => handleSort("closureDate")}
              className="py-2 px-3 text-left cursor-pointer"
            >
              Closure Date<SortIndicator sortConfig={sortConfig} field="closureDate" />
            </th>
            <th
              onClick={() => handleSort("opportunityStage")}
              className="py-2 px-3 text-left cursor-pointer"
            >
              Stage<SortIndicator sortConfig={sortConfig} field="opportunityStage" />
            </th>
            <th
              onClick={() => handleSort("opportunityStatus")}
              className="py-2 px-3 text-left cursor-pointer"
            >
              Status<SortIndicator sortConfig={sortConfig} field="opportunityStatus" />
            </th>
            <th className="py-2 px-3 text-left">Latest Action</th>
            <th className="py-2 px-3 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((oppty) => (
            <OpportunityTableRow
              key={oppty._id || oppty.opportunityCode}
              oppty={oppty}
              formatClosureDate={formatClosureDate}
              formatCreatedDate={formatCreatedDate}
              latestActions={latestActions}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}