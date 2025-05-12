import React from "react";

export default function FullScheduleModal({ schedules, onClose }) {
  // helper to format a datetime in 12-hour with am/pm
  const fmt = dt =>
    new Date(dt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-start justify-center p-6 z-50">
      <div className="bg-white w-full max-w-xl max-h-[80vh] overflow-auto rounded shadow-lg">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-lg font-semibold">Full Schedule</h3>
          <button onClick={onClose} className="text-2xl font-bold leading-none">
            &times;
          </button>
        </div>
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 border">Scheduled On</th>
              <th className="px-3 py-2 border">Action</th>
              <th className="px-3 py-2 border">Discussion</th>
              <th className="px-3 py-2 border">Status</th>
              <th className="px-3 py-2 border">Reschedule</th>
              <th className="px-3 py-2 border">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((sch, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {/* Scheduled On formatted */}
                <td className="px-3 py-2 border">
                  {sch.scheduledOn ? fmt(sch.scheduledOn) : "—"}
                </td>

                <td className="px-3 py-2 border">{sch.action || "—"}</td>

                <td className="px-3 py-2 border">
                  {sch.discussion
                    ? fmt(sch.discussion)
                    : "—"}
                </td>

                <td className="px-3 py-2 border">{sch.status || "—"}</td>

                {/* Reschedule formatted */}
                <td className="px-3 py-2 border">
                  {sch.reschedule
                    ? fmt(sch.reschedule)
                    : "—"}
                </td>

                <td className="px-3 py-2 border">{sch.remarks || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
