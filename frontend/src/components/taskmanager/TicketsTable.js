import React, { useState } from "react";
import ReopenTicketModal from "./ReopenTicketModal";

function TicketsTable({ 
  tasks, 
  formatDate, 
  handleSort, 
  sortConfig, 
  onReopen, 
  onDelete, 
  onReopenTicket, 
  onAddReply, 
  onConfirmTask,
  onMarkAsCompleted,
  isSuperAdmin, 
  filter: propFilter, 
  setFilter: propSetFilter, 
  dateFilter: propDateFilter, 
  setDateFilter: propSetDateFilter, 
  users = [],
  currentUser 
}) {
  const [localFilter, setLocalFilter] = useState("open");
  const [localDateFilter, setLocalDateFilter] = useState("");
  const [assignedByFilter, setAssignedByFilter] = useState("all");
  const [assignedToFilter, setAssignedToFilter] = useState("all");
  const [replyMessage, setReplyMessage] = useState("");
  const [activeReplyTaskId, setActiveReplyTaskId] = useState(null);
  const [showReplySection, setShowReplySection] = useState({});

  const filter = propFilter !== undefined ? propFilter : localFilter;
  const setFilter = propSetFilter || setLocalFilter;
  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter;
  const setDateFilter = propSetDateFilter || setLocalDateFilter;

  const [showReopenModal, setShowReopenModal] = useState(null);

  const headers = [
    { key: "taskRef", label: "Task #" },
    { key: "ticketName", label: "Ticket Name" },
    { key: "taskDescription", label: "Description" },
    { key: "opportunityCode", label: "OPP #" },
    { key: "assignedBy", label: "Assigned By" },
    { key: "assignedTo", label: "Assigned To" },
    { key: "createdAt", label: "Created Date" },
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

  const pendingTicketsCount = tasks.filter((task) => task.completedOn === "Pending").length;

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
        case "pending":
          return task.completedOn === "Pending";
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

  const canReply = (task) => {
    if (!currentUser || !currentUser._id) {
      console.log("No current user or user ID");
      return false;
    }
    
    const currentUserId = currentUser._id.toString();
    
    // Debug: Check what's in the task object
    console.log("Task debug:", {
      taskId: task._id,
      taskTicketName: task.ticketName,
      currentUserId,
      assignedToRaw: task.assignedTo,
      assignedToLength: task.assignedTo?.length,
      assignedToUsers: task.assignedTo?.map(u => ({
        id: u._id,
        idString: u._id?.toString(),
        name: u.name
      })),
      createdById: task.createdBy?._id?.toString(),
      assignedById: task.assignedBy?._id?.toString(),
      isSuperAdmin
    });
    
    // Check if current user is assigned to the task
    // Handle both populated user objects and raw user IDs
    const isAssigned = task.assignedTo?.some(user => {
      // If user is an object with _id field
      if (user && user._id) {
        return user._id.toString() === currentUserId;
      }
      // If user is just an ID string
      else if (typeof user === 'string') {
        return user === currentUserId;
      }
      return false;
    });
    
    // Check if current user is the creator
    const isCreator = task.createdBy?._id?.toString() === currentUserId || 
                     task.createdBy?.toString() === currentUserId;
    
    // Check if current user is the assigner
    const isAssigner = task.assignedBy?._id?.toString() === currentUserId || 
                      task.assignedBy?.toString() === currentUserId;
    
    const canReplyResult = isAssigned || isCreator || isAssigner || isSuperAdmin;
    
    console.log("canReply result:", {
      isAssigned,
      isCreator,
      isAssigner,
      canReplyResult
    });
    
    return canReplyResult;
  };

  const canMarkAsCompleted = (task) => {
    if (!currentUser || !currentUser._id) return false;
    
    const currentUserId = currentUser._id.toString();
    const isAssigned = task.assignedTo?.some(user => {
      if (user && user._id) {
        return user._id.toString() === currentUserId;
      } else if (typeof user === 'string') {
        return user === currentUserId;
      }
      return false;
    });
    
    return task.completedOn === "Not Done" && (isAssigned || isSuperAdmin);
  };

  const canConfirm = (task) => {
    if (!currentUser || !currentUser._id) return false;
    
    const currentUserId = currentUser._id.toString();
    const isCreator = task.createdBy?._id?.toString() === currentUserId || 
                     task.createdBy?.toString() === currentUserId;
    const isAssigner = task.assignedBy?._id?.toString() === currentUserId || 
                      task.assignedBy?.toString() === currentUserId;
    
    return task.completedOn === "Pending" && (isCreator || isAssigner || isSuperAdmin);
  };

  const filteredTasks = getFilteredTasks();

  const handleReplySubmit = (taskId) => {
    if (replyMessage.trim() === "") {
      alert("Please enter a reply message");
      return;
    }
    onAddReply(taskId, replyMessage);
    setReplyMessage("");
    setActiveReplyTaskId(null);
  };

  const toggleReplySection = (taskId) => {
    setShowReplySection(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
    if (!showReplySection[taskId]) {
      setActiveReplyTaskId(taskId);
    } else {
      setActiveReplyTaskId(null);
    }
  };

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
          className={`px-2 py-1 rounded-md text-sm ${filter === "pending" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
          onClick={() => setFilter("pending")}
        >
          Pending Confirmation ({pendingTicketsCount})
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
              const taskCanReply = canReply(task);
              const taskCanMarkAsCompleted = canMarkAsCompleted(task);
              const taskCanConfirm = canConfirm(task);

              // Debug: Check why canReply might be false
              if (!taskCanReply && task.assignedTo?.length > 0) {
                console.log("Task SHOULD have reply button but doesn't:", {
                  taskId: task._id,
                  taskName: task.ticketName,
                  currentUserId: currentUser?._id,
                  assignedTo: task.assignedTo,
                  canReplyResult: taskCanReply
                });
              }

              return (
                <React.Fragment key={task._id}>
                  <tr
                    className={task.completedOn === "Done" ? "bg-green-100" : task.completedOn === "Pending" ? "bg-yellow-100" : ""}
                  >
                    <td className="border text-center">{task.taskRef || "-"}</td>
                    <td className="border text-center">{task.ticketName || "-"}</td>
                    <td className="border text-center">
                      <div>
                        <div title={task.taskDescription}>
                          {task.taskDescription ? 
                            (task.taskDescription.length > 30 ? 
                              `${task.taskDescription.substring(0, 30)}...` : 
                              task.taskDescription) 
                            : "-"}
                        </div>
                        {taskCanReply && (
                          <button
                            onClick={() => toggleReplySection(task._id)}
                            className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            {showReplySection[task._id] ? "Hide Reply" : "Reply"}
                          </button>
                        )}
                        {/* Debug: Show why canReply is false */}
                        {!taskCanReply && (
                          <div className="text-xs text-gray-400 mt-1">
                            {!currentUser ? "No user" : 
                             !task.assignedTo?.length ? "No assigned users" : 
                             "You are not assigned to this task"}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border text-center">{task.opportunityCode || "-"}</td>
                    <td className="border text-center">{task.assignedBy?.name || "-"}</td>
                    <td className="border text-center" title={task.assignedTo?.map(u => u.name).join(", ")}>
                      {getAssignedUsersDisplay(task)}
                    </td>
                    <td className="border text-center">{formatDate(task.createdAt)}</td>
                    <td className="border text-center">{formatDate(task.toBeClosedBy)}</td>
                    <td className="border text-center">{getScheduleSummary(task)}</td>
                    <td className="border text-center">
                      {task.reopened ? (
                        <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-xs">
                          Re-Opened
                        </span>
                      ) : task.completedOn === "Pending" ? (
                        <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-xs">
                          Pending
                        </span>
                      ) : (
                        task.completedOn || "-"
                      )}
                    </td>
                    <td className="border text-center">
                      <div className="flex flex-col gap-1">
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
                              className="bg-blue-600 text-white text-xs px-3 py-0 rounded"
                            >
                              Edit
                            </button>
                            {taskCanMarkAsCompleted && (
                              <button
                                onClick={() => onMarkAsCompleted(task._id)}
                                className="bg-green-600 text-white text-xs px-3 py-0 rounded"
                              >
                                Mark Completed
                              </button>
                            )}
                            {taskCanConfirm && (
                              <button
                                onClick={() => onConfirmTask(task._id)}
                                className="bg-green-700 text-white text-xs px-3 py-0 rounded"
                              >
                                Confirm
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button
                                onClick={() => onDelete(task._id)}
                                className="bg-red-600 text-white text-xs px-3 py-0 rounded"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Reply Section */}
                  {showReplySection[task._id] && (
                    <tr>
                      <td colSpan={headers.length} className="border p-2 bg-gray-50">
                        <div className="mb-3">
                          <h4 className="font-medium text-sm mb-2">Add Reply</h4>
                          <div className="flex gap-2">
                            <textarea
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              placeholder="Type your reply here..."
                              rows="3"
                              className="flex-1 border p-2 rounded text-sm"
                            />
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => handleReplySubmit(task._id)}
                                className="bg-indigo-600 text-white px-4 py-2 rounded text-sm"
                              >
                                Send Reply
                              </button>
                              <button
                                onClick={() => toggleReplySection(task._id)}
                                className="bg-gray-400 text-white px-4 py-2 rounded text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Previous Replies */}
                        {task.replies && task.replies.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="font-medium text-sm mb-2">Previous Replies ({task.replies.length}):</div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {task.replies.map((reply, index) => (
                                <div key={index} className="p-2 bg-white border rounded">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="font-medium">{reply.user?.name}</span>
                                      <span className="text-gray-500 text-xs ml-2">
                                        {formatDate(reply.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-1 text-sm">{reply.message}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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