import React from "react";

export default function FilterPanel({ filterCriteria, handleFilterChange, setShowFilter, stages }) {
  const handleResetFilters = () => {
    handleFilterChange({
      target: {
        name: "opportunityStage",
        value: "All",
      },
    });
    handleFilterChange({
      target: {
        name: "closureFromDate",
        value: "",
      },
    });
    handleFilterChange({
      target: {
        name: "closureToDate",
        value: "",
      },
    });
    handleFilterChange({
      target: {
        name: "createdFilter",
        value: "All",
      },
    });
    setShowFilter(false);
  };

  // Validate date inputs to ensure closureToDate is not before closureFromDate
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    if (name === "closureToDate" && filterCriteria.closureFromDate) {
      const fromDate = new Date(filterCriteria.closureFromDate);
      const toDate = new Date(value);
      if (toDate < fromDate) {
        alert("Closure To Date cannot be before Closure From Date");
        return;
      }
    }
    handleFilterChange(e);
  };

  return (
    <div className="bg-white border border-gray-300 rounded p-4 mb-4 shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Opportunity Stage Filter */}
        <div>
          <label
            htmlFor="opportunityStage"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Opportunity Stage
          </label>
          <select
            id="opportunityStage"
            name="opportunityStage"
            value={filterCriteria.opportunityStage}
            onChange={handleFilterChange}
            className="border rounded w-full px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Select opportunity stage"
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
          <label
            htmlFor="closureFromDate"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Closure Date From
          </label>
          <input
            id="closureFromDate"
            type="date"
            name="closureFromDate"
            value={filterCriteria.closureFromDate}
            onChange={handleDateChange}
            className="border rounded w-full px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Select closure date from"
          />
        </div>
        {/* Closure Date To */}
        <div>
          <label
            htmlFor="closureToDate"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Closure Date To
          </label>
          <input
            id="closureToDate"
            type="date"
            name="closureToDate"
            value={filterCriteria.closureToDate}
            onChange={handleDateChange}
            className="border rounded w-full px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Select closure date to"
          />
        </div>
        {/* Created Filter */}
        <div>
          <label
            htmlFor="createdFilter"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Created Filter
          </label>
          <select
            id="createdFilter"
            name="createdFilter"
            value={filterCriteria.createdFilter}
            onChange={handleFilterChange}
            className="border rounded w-full px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Select created filter"
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
      <div className="mt-4 flex justify-end space-x-2">
        <button
          onClick={handleResetFilters}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
        >
          Reset Filters
        </button>
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