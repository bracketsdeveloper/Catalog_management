// src/components/common/StatCard.jsx
export function StatCard({ label, value, sub }) {
    return (
      <div className="rounded border p-3 bg-white">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    );
  }
  