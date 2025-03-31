import React from "react";
import { Link } from "react-router-dom";

function OpportunityTableRow({ oppty, formatClosureDate }) {
  return (
    <tr className="border-b hover:bg-blue-50">
      <td className="py-2 px-3 text-blue-600 font-medium">
        {oppty.opportunityCode}
      </td>
      <td className="py-2 px-3 text-blue-500 font-medium">
        {oppty.account}
      </td>
      <td className="py-2 px-3">{oppty.opportunityName}</td>
      <td className="py-2 px-3">
        {oppty.opportunityValue?.toLocaleString()}
      </td>
      <td className="py-2 px-3">{formatClosureDate(oppty.closureDate)}</td>
      <td className="py-2 px-3">{oppty.opportunityStage}</td>
      <td className="py-2 px-3">
        {new Date(oppty.createdAt).toLocaleDateString("en-GB")}
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

export default function OpportunityTable({ data, formatClosureDate }) {
  if (!data?.length) {
    return (
      <div className="p-4 text-sm text-gray-600 italic">
        No opportunities found.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-gray-700 border-b border-gray-200">
        <thead className="bg-gray-50 border-b text-gray-500 uppercase">
          <tr>
            <th className="py-2 px-3 text-left">Opportunity Code</th>
            <th className="py-2 px-3 text-left">Account</th>
            <th className="py-2 px-3 text-left">Opportunity Name</th>
            <th className="py-2 px-3 text-left">Opportunity Value</th>
            <th className="py-2 px-3 text-left">Closure Date</th>
            <th className="py-2 px-3 text-left">Opportunity Stage</th>
            <th className="py-2 px-3 text-left">Created On</th>
            <th className="py-2 px-3 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((oppty) => (
            <OpportunityTableRow
              key={oppty._id || oppty.opportunityCode}
              oppty={oppty}
              formatClosureDate={formatClosureDate}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
