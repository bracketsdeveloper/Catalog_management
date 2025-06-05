import React, { useMemo } from "react";
import axios from "axios";

export default function EventTable({
  data,
  onEdit,
  onDelete,
  onViewFull,
  sortField,
  sortOrder,
  toggleSort,
  headerFilters,
  onHeaderFilter,
}) {
  // Build rows with latest schedule
  const rows = useMemo(() => {
    return data.map((ev) => {
      const latest = [...(ev.schedules || [])]
        .sort((a, b) => new Date(b.scheduledOn) - new Date(a.scheduledOn))[0] || {};
      return { ...ev, latest };
    });
  }, [data]);

  // Apply header filters
  const filtered = useMemo(() => {
    return rows.filter((ev) => {
      const f = headerFilters;
      const client = (ev.companyName || "").toLowerCase();
      const sched = ev.latest.scheduledOn
        ? new Date(ev.latest.scheduledOn).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }).toLowerCase()
        : "";
      const action = (ev.latest.action || "").toLowerCase();
      const disc = ev.latest.discussion || "";
      const status = (ev.latest.status || "").toLowerCase();

      if (f.client && !client.includes(f.client.toLowerCase())) return false;
      if (f.scheduledOn && !sched.includes(f.scheduledOn.toLowerCase())) return false;
      if (f.action && !action.includes(f.action.toLowerCase())) return false;
      if (f.discussion && !disc.toLowerCase().includes(f.discussion.toLowerCase())) return false;
      if (f.status && !status.includes(f.status.toLowerCase())) return false;
      return true;
    });
  }, [rows, headerFilters]);

  // Apply sorting
  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case "client":
          av = a.companyName || "";
          bv = b.companyName || "";
          break;
        case "scheduledOn":
          av = a.latest.scheduledOn ? new Date(a.latest.scheduledOn) : 0;
          bv = b.latest.scheduledOn ? new Date(b.latest.scheduledOn) : 0;
          break;
        case "action":
          av = a.latest.action || "";
          bv = b.latest.action || "";
          break;
        case "discussion":
          av = a.latest.discussion || "";
          bv = b.latest.discussion || "";
          break;
        case "status":
          av = a.latest.status || "";
          bv = b.latest.status || "";
          break;
        default:
          av = "";
          bv = "";
      }
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortOrder]);

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/admin/events/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      onDelete();
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event");
    }
  };

  if (!rows.length) {
    return <div className="italic text-gray-600">No events found.</div>;
  }

  const headers = [
    { label: "Client Company", field: "client" },
    { label: "Scheduled On", field: "scheduledOn" },
    { label: "Latest Action", field: "action" },
    { label: "Latest Discussion", field: "discussion" },
    { label: "Latest Status", field: "status" },
    { label: "Edit", field: null },
    { label: "View Full", field: null },
    { label: "Delete", field: null },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-gray-700 border">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h) => (
              <th
                key={h.label}
                onClick={() => h.field && toggleSort(h.field)}
                className={`px-3 py-2 border select-none ${
                  h.field ? "cursor-pointer hover:bg-gray-100" : ""
                }`}
              >
                {h.label}
                {h.field && sortField === h.field && (
                  <span>{sortOrder === "asc" ? " ▲" : " ▼"}</span>
                )}
              </th>
            ))}
          </tr>
          <tr className="bg-gray-100">
            {headers.map((h) => (
              <td key={h.label} className="px-3 py-1">
                {h.field ? (
                  <input
                    type="text"
                    placeholder="Filter…"
                    value={headerFilters[h.field]}
                    onChange={(e) => onHeaderFilter(h.field, e.target.value)}
                    className="w-full p-1 text-xs border rounded"
                  />
                ) : null}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((ev) => (
            <tr key={ev._id} className="hover:bg-gray-50">
              <td className="px-3 py-2 border">
                {ev.companyName ? `${ev.companyName} (${ev.companyType})` : "—"}
              </td>
              <td className="px-3 py-2 border">
                {ev.latest.scheduledOn
                  ? new Date(ev.latest.scheduledOn).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "—"}
              </td>
              <td className="px-3 py-2 border">{ev.latest.action || "—"}</td>
              <td className="px-3 py-2 border">{ev.latest.discussion || "—"}</td>
              <td className="px-3 py-2 border">{ev.latest.status || "—"}</td>
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
              <td className="px-3 py-2 border text-center">
                <button
                  onClick={() => handleDelete(ev._id)}
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