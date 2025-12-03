import React from 'react';

const FiltersBar = ({ children, title, onClear, showClear = true }) => {
  const handleClear = () => {
    // This would typically come from parent component
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      {(title || showClear) && (
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          {title && (
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          )}
          {showClear && (
            <button
              onClick={handleClear}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Filters Content */}
      <div className="p-4">
        {children ? (
          children
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Default filter fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Search..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Optional: Advanced filters toggle */}
      {React.Children.count(children) > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Advanced Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default FiltersBar;