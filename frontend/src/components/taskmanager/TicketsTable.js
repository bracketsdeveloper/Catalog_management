import React, { useState } from "react";

function TicketsTable({ tasks, formatDate, handleSort, sortConfig, onReopen, isSuperAdmin }) {
  console.log("TicketsTable received tasks:", tasks);
  const [filter, setFilter] = useState("today");

  const headers = [
    { key: "taskRef", label: "Task #" },
    { key: "ticketName", label: "Ticket Name" },
    { key: "opportunityCode", label: "OPP #" },
    { key: "assignedBy", label: "Assigned By" },
    { key: "assignedTo", label: "Assigned To" },
    { key: "toBeClosedBy", label: "To Be Closed By" },
    { key: "schedule", label: "Schedule" },
    { key: "completedOn", label: "Status" },
    { key: "actions", label: "Actions" },
  ];

  const getFilteredTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const endOfYear = new Date(today.getFullYear(), 11, 31);

    return tasks.filter((task) => {
      const dates = task.schedule === "SelectedDates" ? task.selectedDates : [task.toBeClosedBy];
      return dates.some((date) => {
        const taskDate = new Date(date);
        taskDate.setHours(0, 0, 0, 0);
        switch (filter) {
          case "today":
            return taskDate.getTime() === today.getTime();
          case "thisWeek":
            return taskDate >= startOfWeek && taskDate <= endOfWeek;
          case "thisMonth":
            return taskDate >= startOfMonth && taskDate <= endOfMonth;
          case "thisYear":
            return taskDate >= startOfYear && taskDate <= endOfYear;
          default:
            return true;
        }
      });
    });
  };

  const handleEdit = (task) => {
    onReopen(task);
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL || "http://localhost:5000"}/api/admin/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      window.location.reload();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const getScheduleSummary = (task) => {
    if (task.schedule === "None" || !task.selectedDates?.length) return task.schedule;
    const startDate = new Date(task.selectedDates[0]).toLocaleDateString();
    const endDate = new Date(task.selectedDates[task.selectedDates.length - 1]).toLocaleDateString();
    return `${startDate} to ${endDate} (${task.schedule})`;
  };

  return (
    <div>
      <div className="mb-4">
        <label className="mr-2 font-medium">Filter by:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="today">Today</option>
          <option value="thisWeek">This Week</option>
          <option value="thisMonth">This Month</option>
          <option value="thisYear">This Year</option>
        </select>
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
        <tr>
          {headers.map((h) => (
            <th
              key={h.key}
              onClick={h.key !== "actions" ? () => handleSort(h.key) : undefined}
              className={`border p-2 text-left ${h.key !== "actions" ? "cursor-pointer" : ""}`}
            >
              {h.label} {sortConfig.key === h.key ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {getFilteredTasks().length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="border p-2 text-center">
              No tasks found
            </td>
          </tr>
        ) : (
          getFilteredTasks().map((task) => (
            <tr key={task._id}>
              <td className="border text-center">{task.taskRef || "-"}</td>
              <td className="border text-center">{task.ticketName || "-"}</td>
              <td className="border text-center">{task.opportunityCode || "-"}</td>
              <td className="border text-center">{task.assignedBy?.name || "-"}</td>
              <td className="border text-center">{task.assignedTo?.name || "-"}</td>
              <td className="border text-center">{formatDate(task.toBeClosedBy)}</td>
              <td className="border text-center">{getScheduleSummary(task)}</td>
              <td className="border text-center">{task.completedOn || "-"}</td>
              <td className="border text-center">
                <button
                  onClick={() => handleEdit(task)}
                  className="bg-blue-600 text-white text-xs px-3 py-0 rounded mr-2"
                >
                  Edit
                </button>
                {isSuperAdmin && (
                  <button
                    onClick={() => handleDelete(task._id)}
                    className="bg-red-600 text-white px-3 py-0 rounded"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
}

export default TicketsTable;