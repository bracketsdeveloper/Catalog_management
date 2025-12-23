import React, { useState } from "react";
import ReopenTicketModal from "./ReopenTicketModal";

function TicketsTable({ tasks, formatDate, handleSort, sortConfig, onReopen, onDelete, onReopenTicket, isSuperAdmin, filter: propFilter, setFilter: propSetFilter, dateFilter: propDateFilter, setDateFilter: propSetDateFilter, users = [] }) {
  const [localFilter, setLocalFilter] = useState("open");
  const [localDateFilter, setLocalDateFilter] = useState("");
  const [assignedByFilter, setAssignedByFilter] = useState("all");
  const [assignedToFilter, setAssignedToFilter] = useState("all");

  const filter = propFilter !== undefined ? propFilter : localFilter;
  const setFilter = propSetFilter || setLocalFilter;
  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter;
  const setDateFilter = propSetDateFilter || setLocalDateFilter;

  const [showReopenModal, setShowReopenModal] = useState(null);

  console.log("TicketsTable props:", { propFilter, propSetFilter, propDateFilter, propSetDateFilter });

  const headers = [
    { key: "taskRef", label: "Task #" },
    { key: "ticketName", label: "Ticket Name" },
    { key: "taskDescription", label: "Description" }, // New column
    { key: "opportunityCode", label: "OPP #" },
    { key: "assignedBy", label: "Assigned By" },
    { key: "assignedTo", label: "Assigned To" },
    { key: "toBeClosedBy", label: "To Be Closed By" },
    { key: "schedule", label: "Schedule" },
    { key: "completedOn", label: "Status" },
    { key: "actions", label: "Actions" },
  ];

  const now = new Date();

  // Calculate counts for each filter category
  const openTicketsCount = tasks.filter((task) => {
    const taskDate = new Date(task.toBeClosedBy);
    return taskDate > now && task.completedOn === "Not Done" && !task.reopened;
  }).length;

  const closedTicketsCount = tasks.filter((task) => task.completedOn === "Done").length;

  const reopenedTicketsCount = tasks.filter((task) => task.reopened === true).length;

  const incompleteTasksCount = tasks.filter((task) => {
    const taskDate = new Date(task.toBeClosedBy);
    return taskDate < now && task.completedOn === "Not Done";
  }).length;

  const allTicketsCount = tasks.length;

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

    let filteredTasks = tasks.filter((task) => {
      const taskDate = new Date(task.toBeClosedBy);
      const isPastDue = taskDate < now;
      const isNotDone = task.completedOn === "Not Done";

      switch (filter) {
        case "open":
          return taskDate > now && isNotDone && !task.reopened;
        case "closed":
          return task.completedOn === "Done";
        case "reopened":
          return task.reopened === true;
        case "incomplete":
          return isPastDue && isNotDone;
        default:
          return true;
      }
    });

    if (isSuperAdmin && assignedByFilter !== "all") {
      filteredTasks = filteredTasks.filter((task) => task.assignedBy?._id === assignedByFilter);
    }

    if (isSuperAdmin && assignedToFilter !== "all") {
      filteredTasks = filteredTasks.filter((task) => 
        task.assignedTo?.some(user => user._id === assignedToFilter)
      );
    }

    if (dateFilter) {
      filteredTasks = filteredTasks.filter((task) => {
        const dates = task.schedule === "SelectedDates" ? task.selectedDates : [task.toBeClosedBy];
        return dates.some((date) => {
          const taskDate = new Date(date);
          taskDate.setHours(0, 0, 0, 0);
          switch (dateFilter) {
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
    }

    return filteredTasks;
  };

  const getScheduleSummary = (task) => {
    if (task.schedule === "None" || !task.selectedDates?.length) return task.schedule;
    const startDate = new Date(task.selectedDates[0]).toLocaleDateString();
    const endDate = new Date(task.selectedDates[task.selectedDates.length - 1]).toLocaleDateString();
    return `${startDate} to ${endDate} (${task.schedule})`;
  };

  const getAssignedUsersDisplay = (task) => {
    if (!task.assignedTo || task.assignedTo.length === 0) return "-";
    if (task.assignedTo.length === 1) return task.assignedTo[0]?.name || "-";
    return `${task.assignedTo[0]?.name} + ${task.assignedTo.length - 1} more`;
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1">
        <button
          className={`px-2 py-1 rounded-md text-sm ${filter === "open" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
          onClick={() => setFilter("open")}
        >
          Open Tickets ({openTicketsCount})
        </button>
        <button
          className={`px-2 py-1 rounded-md text-sm ${filter === "closed" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
          onClick={() => setFilter("closed")}
        >
          Closed Tickets ({closedTicketsCount})
        </button>
        <button
          className={`px-2 py-1 rounded-md text-sm ${filter === "reopened" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
          onClick={() => setFilter("reopened")}
        >
          Re-Opened ({reopenedTicketsCount})
        </button>
        <button
          className={`px-2 py-1 rounded-md text-sm ${filter === "incomplete" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
          onClick={() => setFilter("incomplete")}
        >
          Incomplete Tasks ({incompleteTasksCount})
        </button>
        <button
          className={`px-2 py-1 rounded-md text-sm ${filter === "" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
          onClick={() => setFilter("")}
        >
          All Tickets ({allTicketsCount})
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {isSuperAdmin && (
          <>
            <div className="flex items-center">
              <label className="mr-1 font-medium text-sm">Assigned By:</label>
              <select
                value={assignedByFilter}
                onChange={(e) => setAssignedByFilter(e.target.value)}
                className="border p-1 rounded text-sm w-32"
              >
                <option value="all">All Users</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <label className="mr-1 font-medium text-sm">Assigned To:</label>
              <select
                value={assignedToFilter}
                onChange={(e) => setAssignedToFilter(e.target.value)}
                className="border p-1 rounded text-sm w-32"
              >
                <option value="all">All Users</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="flex items-center">
          <label className="mr-1 font-medium text-sm">Filter by Date:</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border p-1 rounded text-sm w-32"
          >
            <option value="">All Dates</option>
            <option value="today">Today</option>
            <option value="thisWeek">This Week</option>
            <option value="thisMonth">This Month</option>
            <option value="thisYear">This Year</option>
          </select>
        </div>
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
          {filteredTasks.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="border p-2 text-center">
                No tasks found
              </td>
            </tr>
          ) : (
            filteredTasks.map((task) => {
              const taskDate = new Date(task.toBeClosedBy);
              const isPastDue = taskDate < now;
              const isNotDone = task.completedOn === "Not Done";
              const showReopenButton = isPastDue && isNotDone && filter !== "reopened";

              return (
                <tr
                  key={task._id}
                  className={task.completedOn === "Done" ? "bg-green-100" : ""}
                >
                  <td className="border text-center">{task.taskRef || "-"}</td>
                  <td className="border text-center">{task.ticketName || "-"}</td>
                  <td className="border text-center" title={task.taskDescription}>
                    {task.taskDescription ? 
                      (task.taskDescription.length > 30 ? 
                        `${task.taskDescription.substring(0, 30)}...` : 
                        task.taskDescription) 
                      : "-"}
                  </td>
                  <td className="border text-center">{task.opportunityCode || "-"}</td>
                  <td className="border text-center">{task.assignedBy?.name || "-"}</td>
                  <td className="border text-center" title={task.assignedTo?.map(u => u.name).join(", ")}>
                    {getAssignedUsersDisplay(task)}
                  </td>
                  <td className="border text-center">{formatDate(task.toBeClosedBy)}</td>
                  <td className="border text-center">{getScheduleSummary(task)}</td>
                  <td className="border text-center">
                    {task.reopened ? (
                      <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-xs">
                        Re-Opened
                      </span>
                    ) : (
                      task.completedOn || "-"
                    )}
                  </td>
                  <td className="border text-center">
                    {showReopenButton ? (
                      <button
                        onClick={() => setShowReopenModal(task)}
                        className="bg-green-600 text-white text-xs px-3 py-0 rounded"
                      >
                        Re-Open
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => onReopen(task)}
                          className="bg-blue-600 text-white text-xs px-3 py-0 rounded mr-2"
                        >
                          Edit
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => onDelete(task._id)}
                            className="bg-red-600 text-white px-3 py-0 rounded"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {showReopenModal && (
        <ReopenTicketModal
          task={showReopenModal}
          onClose={() => setShowReopenModal(null)}
          onSubmit={(taskId, newClosingDate) => {
            onReopenTicket(taskId, newClosingDate);
            setShowReopenModal(null);
          }}
        />
      )}
    </div>
  );
}

export default TicketsTable;