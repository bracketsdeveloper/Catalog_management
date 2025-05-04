import React from "react";
import axios from "axios";

export default function EventTable({ data, onEdit, onDelete }) {
  // Flatten one row per schedule
  const rows = data.flatMap(ev =>
    ev.schedules.map(s => ({
      eventId:             ev._id,
      potentialClientName: ev.potentialClientName,
      scheduledOn:         new Date(s.scheduledOn).toLocaleDateString(),
      action:              s.action,
      assignedTo:          s.assignedTo?.name || "—",
      discussion:          new Date(s.discussion).toLocaleString(),
      status:              s.status,
      reschedule:          s.reschedule ? new Date(s.reschedule).toLocaleString() : "",
      remarks:             s.remarks,
      createdBy:           ev.createdBy?.name || "—",
      createdAt:           new Date(ev.createdAt).toLocaleString()
    }))
  );

  const handleDelete = async id => {
    if (!window.confirm("Really delete this event?")) return;
    await axios.delete(
      `${process.env.REACT_APP_BACKEND_URL}/api/admin/events/${id}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );
    onDelete();
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-gray-700 border">
        <thead className="bg-gray-50">
          <tr>
            {[
              "Client",
              "Scheduled On",
              "Action",
              "Assigned To",
              "Discussion",
              "Status",
              "Reschedule",
              "Remarks",
              "Created By",
              "Created At",
              "Actions"
            ].map(h => (
              <th key={h} className="px-3 py-2 border text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-3 py-2 border">{r.potentialClientName}</td>
              <td className="px-3 py-2 border">{r.scheduledOn}</td>
              <td className="px-3 py-2 border">{r.action}</td>
              <td className="px-3 py-2 border">{r.assignedTo}</td>
              <td className="px-3 py-2 border">{r.discussion}</td>
              <td className="px-3 py-2 border">{r.status}</td>
              <td className="px-3 py-2 border">{r.reschedule}</td>
              <td className="px-3 py-2 border">{r.remarks}</td>
              <td className="px-3 py-2 border">{r.createdBy}</td>
              <td className="px-3 py-2 border">{r.createdAt}</td>
              <td className="px-3 py-2 border space-x-2">
                <button
                  onClick={() => onEdit(data.find(ev => ev._id === r.eventId))}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(r.eventId)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
