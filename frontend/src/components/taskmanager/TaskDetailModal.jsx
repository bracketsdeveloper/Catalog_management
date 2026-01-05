import React from "react";

function TaskDetailModal({ task, onClose, formatDate, currentUserId }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-bold">
            Task Details: {task.taskRef}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
        
        {/* Task Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Ticket Name</label>
            <p className="font-medium">{task.ticketName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <p>
              {task.reopened ? (
                <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-sm">
                  Re-Opened
                </span>
              ) : task.completedOn === "Pending Confirmation" ? (
                <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-sm">
                  Pending Confirmation
                </span>
              ) : task.completedOn === "Done" ? (
                <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-sm">
                  Done
                </span>
              ) : (
                <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm">
                  {task.completedOn}
                </span>
              )}
            </p>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-500">Description</label>
            <p>{task.taskDescription || "No description provided"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">OPP #</label>
            <p>{task.opportunityCode || "-"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Schedule</label>
            <p>{task.schedule}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Created By</label>
            <p>{task.createdBy?.name || "-"} ({task.createdBy?.email || "-"})</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Created On</label>
            <p>{formatDate(task.createdAt)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Assigned To</label>
            <p>
              {task.assignedTo?.map(u => u.name).join(", ") || "-"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Due Date</label>
            <p>{formatDate(task.toBeClosedBy)}</p>
          </div>
          
          {task.completedOn === "Done" && task.confirmedBy && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-500">Confirmed By</label>
                <p>{task.confirmedBy?.name || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Confirmed At</label>
                <p>{formatDate(task.confirmedAt)}</p>
              </div>
            </>
          )}
          
          {task.completionRemarks && (
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-500">Completion Remarks</label>
              <p>{task.completionRemarks}</p>
            </div>
          )}
          
          {task.reopened && task.reopenDescription && (
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-500">Reopen Reason</label>
              <p>{task.reopenDescription}</p>
            </div>
          )}
        </div>

        {/* Replies Section */}
        <div className="border-t pt-4">
          <h3 className="text-md font-medium mb-3">
            Replies ({task.replies?.length || 0})
          </h3>
          
          {task.replies && task.replies.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {task.replies.map((reply, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded ${
                    reply.createdBy?._id === currentUserId 
                      ? "bg-blue-50 ml-8 border-l-4 border-blue-400" 
                      : "bg-gray-100 mr-8 border-l-4 border-gray-400"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm">
                      {reply.createdBy?.name || "Unknown"}
                      {reply.createdBy?._id === currentUserId && (
                        <span className="text-blue-600 ml-1">(You)</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(reply.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No replies yet.</p>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailModal;