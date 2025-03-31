import React from "react";

export default function FilterPanel({ filterCriteria, handleFilterChange, setShowFilter, stages }) {
  return (
    <div className="bg-white border border-gray-300 rounded p-4 mb-4 shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Opportunity Stage Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Opportunity Stage
          </label>
          <select
            name="opportunityStage"
            value={filterCriteria.opportunityStage}
            onChange={handleFilterChange}
            className="border rounded w-full px-2 py-1 text-sm"
          >
            <option value="All">All</option>
            {stages.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </div>
        {/* Closure Date From */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Closure Date From
          </label>
          <input
            type="date"
            name="closureFromDate"
            value={filterCriteria.closureFromDate}
            onChange={handleFilterChange}
            className="border rounded w-full px-2 py-1 text-sm"
          />
        </div>
        {/* Closure Date To */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Closure Date To
          </label>
          <input
            type="date"
            name="closureToDate"
            value={filterCriteria.closureToDate}
            onChange={handleFilterChange}
            className="border rounded w-full px-2 py-1 text-sm"
          />
        </div>
        {/* Created Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Created Filter
          </label>
          <select
            name="createdFilter"
            value={filterCriteria.createdFilter}
            onChange={handleFilterChange}
            className="border rounded w-full px-2 py-1 text-sm"
          >
            <option value="All">All</option>
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="This Week">This Week</option>
            <option value="Last Week">Last Week</option>
            <option value="This Month">This Month</option>
            <option value="Last Month">Last Month</option>
            <option value="This Year">This Year</option>
            <option value="Last Year">Last Year</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setShowFilter(false)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
        >
          Apply Filter
        </button>
      </div>
    </div>
  );
}
