import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

// --- Helper: Click Outside Hook ---
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

// --- Component: Sort Indicator ---
function SortIndicator({ sortConfig, field }) {
  if (sortConfig.key !== field) return null;
  return sortConfig.direction === "asc" ? " ▲" : " ▼";
}

// --- Component: Column Filter ---
function ColumnFilter({ columnKey, options, selectedOptions, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const ref = useRef();

  useOnClickOutside(ref, () => setIsOpen(false));

  const filteredOptions = options.filter((opt) =>
    String(opt).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (opt) => {
    const newSelected = selectedOptions.includes(opt)
      ? selectedOptions.filter((o) => o !== opt)
      : [...selectedOptions, opt];
    onChange(columnKey, newSelected);
  };

  const handleSelectAll = () => {
    if (selectedOptions.length === options.length) {
      onChange(columnKey, []);
    } else {
      onChange(columnKey, options);
    }
  };

  // If activeFilters is empty/undefined for this key, it usually means "all selected" in logic,
  // but for UI state we might want to show all checked.
  // We'll handle this mapping in the parent or here. 
  // Parent passes `selectedOptions` which should be the list of allowed values.

  const isAllSelected = selectedOptions.length === options.length;

  return (
    <div className="relative inline-block ml-2" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-1 rounded hover:bg-gray-200 ${!isAllSelected && selectedOptions.length > 0
            ? "text-blue-600 font-bold"
            : "text-gray-400"
          }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-300 shadow-xl rounded z-50 text-left font-normal normal-case">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate =
                      selectedOptions.length > 0 &&
                      selectedOptions.length < options.length;
                  }
                }}
                onChange={handleSelectAll}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold">Select All</span>
            </label>
            <hr className="my-1 border-gray-100" />
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => (
                <label
                  key={idx}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(opt)}
                    onChange={() => toggleOption(opt)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm truncate" title={opt}>
                    {opt || "(Empty)"}
                  </span>
                </label>
              ))
            ) : (
              <div className="text-xs text-gray-500 text-center py-2">No matches</div>
            )}
          </div>
          <div className="p-2 border-t bg-gray-50 flex justify-end bg-white">
            <button
              onClick={() => onChange(columnKey, [])} // Logic: empty means select all/clear filter? 
              // Wait, if I pass [], logic says "show all". So this "Clear" effectively resets filter.
              className="text-xs text-red-600 hover:underline mr-3"
            >
              Clear
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-blue-600 hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// --- Component: Table Row ---
function OpportunityTableRow({ oppty, formatClosureDate, formatCreatedDate, latestActions }) {
  const latestAction = latestActions[oppty._id] || {};
  return (
    <tr className="border-b hover:bg-blue-50 transition-colors">
      <td className="py-2 px-3 text-blue-600 font-medium whitespace-nowrap">{oppty.opportunityCode}</td>
      <td className="py-2 px-3 whitespace-nowrap">{formatCreatedDate(oppty.createdAt)}</td>
      <td className="py-2 px-3 text-blue-500 font-medium">{oppty.account}</td>
      <td className="py-2 px-3">{oppty.contact || "-"}</td>
      <td className="py-2 px-3 min-w-[150px]">{oppty.opportunityName}</td>
      <td className="py-2 px-3 text-blue-500 font-medium">{oppty.opportunityOwner}</td>
      <td className="py-2 px-3 whitespace-nowrap">{oppty.opportunityValue?.toLocaleString()}</td>
      <td className="py-2 px-3 whitespace-nowrap">{formatClosureDate(oppty.closureDate)}</td>
      <td className="py-2 px-3">
        <span className={`px-2 py-1 rounded text-xs font-semibold
          ${oppty.opportunityStage === 'Won' ? 'bg-green-100 text-green-800' :
            oppty.opportunityStage === 'Lost' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'}`}>
          {oppty.opportunityStage}
        </span>
      </td>
      <td className="py-2 px-3">{oppty.opportunityStatus || "-"}</td>
      <td className="py-2 px-3 text-xs w-64">
        {latestAction.action ? (
          <div className="line-clamp-2" title={`${latestAction.action} by ${latestAction.performedBy?.name || "N/A"}`}>
            <span className="font-semibold">{latestAction.action}</span>
            {latestAction.field && <span className="text-gray-500"> ({latestAction.field})</span>}
            <span className="text-gray-400"> by </span>
            <span>{latestAction.performedBy?.name || "N/A"}</span>
          </div>
        ) : (
          <span className="text-gray-400 italic">No action</span>
        )}
      </td>
      <td className="py-2 px-3">
        <Link
          to={`/admin-dashboard/create-opportunity/${oppty._id}`}
          className="text-white bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1 rounded shadow-sm transition-all"
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
  const [activeFilters, setActiveFilters] = useState({});

  // 1. Extract Unique Values for Columns
  const filterOptions = useMemo(() => {
    const options = {
      account: new Set(),
      opportunityOwner: new Set(),
      opportunityStage: new Set(),
      opportunityStatus: new Set(),
      // Add more if needed
    };

    data.forEach((item) => {
      if (item.account) options.account.add(item.account);
      if (item.opportunityOwner) options.opportunityOwner.add(item.opportunityOwner);
      if (item.opportunityStage) options.opportunityStage.add(item.opportunityStage);
      if (item.opportunityStatus) options.opportunityStatus.add(item.opportunityStatus || "N/A");
    });

    return {
      account: Array.from(options.account).sort(),
      opportunityOwner: Array.from(options.opportunityOwner).sort(),
      opportunityStage: Array.from(options.opportunityStage).sort(),
      opportunityStatus: Array.from(options.opportunityStatus).sort(),
    };
  }, [data]);

  const handleFilterChange = (key, selectedValues) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: selectedValues,
    }));
  };

  // 3. Apply Filters
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      for (const [key, selectedOptions] of Object.entries(activeFilters)) {
        // If filter is empty, it means "All" in this logic if we pass explicit []. 
        // Wait, if we pass [], we want to clear.
        // Let's adopt: 
        // - undefined or empty array = "Show All"
        // - populated array = "Show Only These"

        if (!selectedOptions || selectedOptions.length === 0) continue;

        const allOpts = filterOptions[key];
        // Optimization: if all options selected, it's also "Show All"
        if (allOpts && selectedOptions.length === allOpts.length) continue;

        const itemValue = item[key] || "N/A";
        if (!selectedOptions.includes(itemValue)) {
          return false;
        }
      }
      return true;
    });
  }, [data, activeFilters, filterOptions]);

  // Helper to get current selection for a column
  const getSelectedOptions = (key) => activeFilters[key] || filterOptions[key] || [];

  const renderHeader = (label, sortKey, filterKey) => {
    const opts = filterOptions[filterKey];
    const isSortable = !!sortKey;

    return (
      <th className="py-3 px-3 text-left font-semibold text-gray-600 bg-gray-50 sticky top-0 z-20 shadow-sm border-b border-gray-200 whitespace-nowrap">
        <div className="flex items-center justify-between gap-1">
          <div
            onClick={() => isSortable && handleSort(sortKey)}
            className={`flex items-center ${isSortable ? 'cursor-pointer hover:text-blue-600' : ''} ${sortConfig.key === sortKey ? 'text-blue-600' : ''}`}
          >
            {label}
            {isSortable && <SortIndicator sortConfig={sortConfig} field={sortKey} />}
          </div>
          {filterKey && opts && opts.length > 0 && (
            <ColumnFilter
              columnKey={filterKey}
              options={opts}
              selectedOptions={getSelectedOptions(filterKey)}
              onChange={handleFilterChange}
            />
          )}
        </div>
      </th>
    );
  };

  if (!data?.length) {
    return (
      <div className="p-8 text-center text-gray-500 border rounded-lg bg-gray-50 mt-4">
        <p className="text-lg font-medium">No opportunities found.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg shadow-sm bg-white overflow-hidden flex flex-col h-[70vh]">
      <div className="overflow-x-auto overflow-y-auto flex-1 relative">
        <table className="min-w-full text-sm text-gray-700 border-collapse">
          <thead className="bg-gray-50 uppercase text-xs z-20">
            <tr>
              {renderHeader("Opportunity Code", "opportunityCode", null)}
              {renderHeader("Created Date", "createdAt", null)}
              {renderHeader("Account", "account", "account")}
              {renderHeader("Company Contact", null, null)}
              {renderHeader("Opportunity Name", "opportunityName", null)}
              {renderHeader("Owner", "opportunityOwner", "opportunityOwner")}
              {renderHeader("Value", "opportunityValue", null)}
              {renderHeader("Closure Date", "closureDate", null)}
              {renderHeader("Stage", "opportunityStage", "opportunityStage")}
              {renderHeader("Status", "opportunityStatus", "opportunityStatus")}
              <th className="py-3 px-3 text-left font-semibold text-gray-600 bg-gray-50 sticky top-0 z-20 shadow-sm border-b border-gray-200">
                Latest Action
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-600 bg-gray-50 sticky top-0 z-20 shadow-sm border-b border-gray-200">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.map((oppty) => (
              <OpportunityTableRow
                key={oppty._id || oppty.opportunityCode}
                oppty={oppty}
                formatClosureDate={formatClosureDate}
                formatCreatedDate={formatCreatedDate}
                latestActions={latestActions}
              />
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="12" className="text-center py-6 text-gray-500">
                  No matches found for the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-50 border-t p-2 text-xs text-gray-500 text-right">
        Showing {filteredData.length} of {data.length} on this page
      </div>
    </div>
  );
}