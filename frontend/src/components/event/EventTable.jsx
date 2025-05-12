// client/src/components/event/EventTable.jsx
import React from "react";

export default function EventTable({ data, onEdit, onDelete, onViewFull }) {
  if (!data.length) {
    return <div className="italic text-gray-600">No events found.</div>;
  }

  // For each event, pick its most recent schedule entry
  const rows = data.map(ev => {
    const latest = [...(ev.schedules || [])]
      .sort((a, b) => new Date(b.scheduledOn) - new Date(a.scheduledOn))[0] || {};
    return { ...ev, latest };
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-gray-700 border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 border">Client Company</th>
            <th className="px-3 py-2 border">Scheduled On</th>
            <th className="px-3 py-2 border">Latest Action</th>
            <th className="px-3 py-2 border">Latest Discussion</th>
            <th className="px-3 py-2 border">Latest Status</th>
            <th className="px-3 py-2 border">Edit</th>
            <th className="px-3 py-2 border">View Full</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(ev => (
            <tr key={ev._id} className="hover:bg-gray-50">
              <td className="px-3 py-2 border">
                {ev.potentialClientName || "—"}
              </td>

              {/* Scheduled On formatted with date + time in 12-hour AM/PM */}
              <td className="px-3 py-2 border">
                {ev.latest.scheduledOn
                  ? new Date(ev.latest.scheduledOn).toLocaleString("en-US", {
                      month: "short",    // e.g. "Jan"
                      day: "numeric",    // e.g. "5"
                      year: "numeric",   // e.g. "2025"
                      hour: "numeric",   // e.g. "4"
                      minute: "2-digit", // e.g. "04"
                      hour12: true       // AM/PM
                    })
                  : "—"}
              </td>

              <td className="px-3 py-2 border">
                {ev.latest.action || "—"}
              </td>
              <td className="px-3 py-2 border">
                {ev.latest.discussion
                  ? new Date(ev.latest.discussion).toLocaleString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true
                    })
                  : "—"}
              </td>
              <td className="px-3 py-2 border">
                {ev.latest.status || "—"}
              </td>
              <td className="px-3 py-2 border text-center">
                <button
                  onClick={() => onEdit(ev)}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </button>
              </td>
              <td className="px-3 py-2 border text-center">
                <button
                  onClick={() => onViewFull(ev.schedules || [])}
                  className="text-indigo-600 hover:underline"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
