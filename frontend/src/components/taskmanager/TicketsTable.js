import React, { useState } from "react";
import ReopenTicketModal from "./ReopenTicketModal";
import TaskReplyModal from "./TaskReplyModal";
import TaskDetailModal from "./TaskDetailModal";

function TicketsTable({ 
  tasks, 
  formatDate, 
  handleSort, 
  sortConfig, 
  onReopen, 
  onDelete, 
  onReopenTicket, 
  onConfirmTask,
  onRejectTask,
  onAddReply, // This should be defined
  isSuperAdmin, 
  currentUser,
  filter: propFilter, 
  setFilter: propSetFilter, 
  dateFilter: propDateFilter, 
  setDateFilter: propSetDateFilter, 
  users = [] 
}) {
  // Debug log to check if onAddReply is received
  console.log('TicketsTable received onAddReply:', typeof onAddReply, onAddReply);

  const [localFilter, setLocalFilter] = useState("open");
  const [localDateFilter, setLocalDateFilter] = useState("");
  const [assignedByFilter, setAssignedByFilter] = useState("all");
  const [assignedToFilter, setAssignedToFilter] = useState("all");

  const filter = propFilter !== undefined ? propFilter : localFilter;
  const setFilter = propSetFilter || setLocalFilter;
  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter;
  const setDateFilter = propSetDateFilter || setLocalDateFilter;

  const [showReopenModal, setShowReopenModal] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const currentUserId = currentUser?._id || localStorage.getItem("userId");

  const headers = [
    { key: "taskRef", label: "Task #" },
    { key: "ticketName", label: "Ticket Name" },
    { key: "taskDescription", label: "Description" },
    { key: "opportunityCode", label: "OPP #" },
    { key: "createdBy", label: "Created By" },
    { key: "createdAt", label: "Created On" },
    { key: "assignedTo", label: "Assigned To" },
    { key: "toBeClosedBy", label: "To Be Closed By" },
    { key: "schedule", label: "Schedule" },
    { key: "completedOn", label: "Status" },
    { key: "actions", label: "Actions" },
  ];

  const now = new Date();

  const openTicketsCount = tasks.filter((task) => {
    const taskDate = new Date(task.toBeClosedBy);
    return taskDate > now && task.completedOn === "Not Done" && !task.reopened;
  }).length;

  const closedTicketsCount = tasks.filter((task) => task.completedOn === "Done").length;

  const pendingTicketsCount = tasks.filter((task) => task.completedOn === "Pending Confirmation").length;

  const reopenedTicketsCount = tasks.filter((task) => task.reopened === true).length;

  const incompleteTasksCount = tasks.filter((task) => {
    const taskDate = new Date(task.toBeClosedBy);
    return taskDate < now && task.completedOn === "Not Done";
  }).length;

  const allTicketsCount = tasks.length;

  const isCreator = (task) => {
    return task.createdBy?._id === currentUserId || task.createdBy === currentUserId;
  };

  const isAssigned = (task) => {
    return task.assignedTo?.some(user => 
      user._id === currentUserId || user === currentUserId
    );
  };

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
        case "pending":
          return task.completedOn === "Pending Confirmation";
        case "reopened":
          return task.reopened === true;
        case "incomplete":
          return isPastDue && isNotDone;
        default:
          return true;
      }
    });

    if (isSuperAdmin && assignedByFilter !== "all") {
      filteredTasks = filteredTasks.filter((task) => task.createdBy?._id === assignedByFilter);
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

  const handleRejectSubmit = () => {
    if (showRejectModal) {
      onRejectTask(showRejectModal._id, rejectionReason);
      setShowRejectModal(null);
      setRejectionReason("");
    }
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1">
        <button
          className={`px-2 py-1 rounded-md text-sm ${filter === "open" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
          onClick={() => setFilter("open")}
        >
          Open ({openTicketsCount})
        </button>
        <button
          className={`px-2 py-1 rounded-md text-sm ${filter === "pending" ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-700"}`}
          onClick={() => setFilter("pending")}
        >
          Pending ({pendingTicketsCount})
        </button>
        <button
          className={`px-2 py-1 rounded-md text-sm ${filter === "closed" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
          onClick={() => setFilter("closed")}
        >
          Closed ({closedTicketsCount})
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
          Incomplete ({incompleteTasksCount})
        </button>
        <button
          className={`px-2 py-1 rounded-md text-sm ${filter === "" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
          onClick={() => setFilter("")}
        >
          All ({allTicketsCount})
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {isSuperAdmin && (
          <>
            <div className="flex items-center">
              <label className="mr-1 font-medium text-sm">Created By:</label>
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
              const isPending = task.completedOn === "Pending Confirmation";
              const showReopenButton = isPastDue && isNotDone && filter !== "reopened";
              const canConfirm = isPending && (isCreator(task) || isSuperAdmin);
              const hasReplies = task.replies && task.replies.length > 0;

              return (
                <tr
                  key={task._id}
                  className={
                    task.completedOn === "Done" 
                      ? "bg-green-100" 
                      : isPending 
                      ? "bg-orange-100" 
                      : ""
                  }
                >
                  <td className="border text-center">
                    <button
                      onClick={() => setShowDetailModal(task)}
                      className="text-blue-600 hover:underline"
                    >
                      {task.taskRef || "-"}
                    </button>
                  </td>
                  <td className="border text-center">{task.ticketName || "-"}</td>
                  <td className="border text-center" title={task.taskDescription}>
                    {task.taskDescription ? 
                      (task.taskDescription.length > 30 ? 
                        `${task.taskDescription.substring(0, 30)}...` : 
                        task.taskDescription) 
                      : "-"}
                  </td>
                  <td className="border text-center">{task.opportunityCode || "-"}</td>
                  <td className="border text-center">{task.createdBy?.name || "-"}</td>
                  <td className="border text-center">{formatDate(task.createdAt)}</td>
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
                    ) : isPending ? (
                      <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-xs">
                        Pending
                      </span>
                    ) : task.completedOn === "Done" ? (
                      <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs">
                        Done
                      </span>
                    ) : (
                      <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs">
                        {task.completedOn || "-"}
                      </span>
                    )}
                    {hasReplies && (
                      <span className="ml-1 bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs">
                        💬{task.replies.length}
                      </span>
                    )}
                  </td>
                  <td className="border text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {/* Reply button - for assigned users and creator */}
                      {(isAssigned(task) || isCreator(task) || isSuperAdmin) && (
                        <button
                          onClick={() => setShowReplyModal(task)}
                          className="bg-blue-500 text-white text-xs px-2 py-1 rounded"
                          title="Reply"
                        >
                          💬
                        </button>
                      )}
                      
                      {/* Confirm/Reject buttons - only for creator when pending */}
                      {canConfirm && (
                        <>
                          <button
                            onClick={() => onConfirmTask(task._id)}
                            className="bg-green-600 text-white text-xs px-2 py-1 rounded"
                            title="Confirm Completion"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setShowRejectModal(task)}
                            className="bg-red-500 text-white text-xs px-2 py-1 rounded"
                            title="Reject Completion"
                          >
                            ✗
                          </button>
                        </>
                      )}
                      
                      {/* Reopen button */}
                      {showReopenButton ? (
                        <button
                          onClick={() => setShowReopenModal(task)}
                          className="bg-green-600 text-white text-xs px-2 py-1 rounded"
                        >
                          Re-Open
                        </button>
                      ) : (
                        <>
                           (
                            <button
                              onClick={() => onReopen(task)}
                              className="bg-blue-600 text-white text-xs px-2 py-1 rounded"
                            >
                              Edit
                            </button>
                          )
                          
                          {/* Delete button - only for creator and super admin */}
                          {(isCreator(task) || isSuperAdmin) && (
                            <button
                              onClick={() => onDelete(task._id)}
                              className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
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
          onSubmit={(taskId, newClosingDate, reopenDescription) => {
            onReopenTicket(taskId, newClosingDate, reopenDescription);
            setShowReopenModal(null);
          }}
        />
      )}

      {showReplyModal && (
        <TaskReplyModal
          task={showReplyModal}
          onClose={() => setShowReplyModal(null)}
          onSubmit={async (taskId, message) => {
            try {
              console.log('Submitting reply for task:', taskId);
              if (onAddReply && typeof onAddReply === 'function') {
                await onAddReply(taskId, message);
                setShowReplyModal(null);
              } else {
                console.error('onAddReply is not a function:', onAddReply);
                alert('Reply functionality is not available. Please check the console for details.');
              }
            } catch (error) {
              console.error('Error submitting reply:', error);
              alert(`Failed to add reply: ${error.message}`);
            }
          }}
          currentUserId={currentUserId}
        />
      )}

      {showDetailModal && (
        <TaskDetailModal
          task={showDetailModal}
          onClose={() => setShowDetailModal(null)}
          formatDate={formatDate}
          currentUserId={currentUserId}
        />
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Reject Completion</h2>
            <p className="text-sm text-gray-600 mb-4">
              Task: {showRejectModal.ticketName}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium">Reason for Rejection</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows="3"
                className="w-full border p-2 rounded"
                placeholder="Explain why the task completion is being rejected..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRejectSubmit}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason("");
                }}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketsTable;