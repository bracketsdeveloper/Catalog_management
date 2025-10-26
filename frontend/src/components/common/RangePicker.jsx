// src/components/common/RangePicker.jsx
export default function RangePicker({ value, onChange, showCustom, custom, setCustom }) {
    return (
      <div className="flex gap-2 items-center">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="last-1m">Last 1 month</option>
          <option value="last-3m">Last 3 months</option>
          <option value="last-6m">Last 6 months</option>
          <option value="last-1y">Last 1 year</option>
          <option value="custom">Select Date Range</option>
        </select>
        {value === "custom" && showCustom !== false && (
          <>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={custom.from || ""}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
            />
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={custom.to || ""}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
            />
          </>
        )}
      </div>
    );
  }
  