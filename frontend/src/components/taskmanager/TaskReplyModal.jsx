import React, { useState } from "react";

function TaskReplyModal({ task, onClose, onSubmit, currentUserId }) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSubmit(task._id, message.trim());
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-GB");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">
          Reply to Task: {task.taskRef}
        </h2>
        
        {/* Task Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="font-medium">{task.ticketName}</p>
          {task.taskDescription && (
            <p className="text-sm text-gray-600 mt-1">{task.taskDescription}</p>
          )}
          <div className="text-xs text-gray-500 mt-2">
            <span>Created by: {task.createdBy?.name || "-"}</span>
            <span className="mx-2">|</span>
            <span>Due: {formatDate(task.toBeClosedBy)}</span>
          </div>
        </div>

        {/* Existing Replies */}
        {task.replies && task.replies.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Previous Replies ({task.replies.length})</h3>
            <div className="max-h-60 overflow-y-auto border rounded p-2 space-y-3">
              {task.replies.map((reply, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded ${
                    reply.createdBy?._id === currentUserId 
                      ? "bg-blue-50 ml-4" 
                      : "bg-gray-100 mr-4"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm">
                      {reply.createdBy?.name || "Unknown"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(reply.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm">{reply.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Reply Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Your Reply</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="4"
              className="w-full border p-2 rounded"
              placeholder="Type your reply here..."
              required
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              type="submit"
              disabled={!message.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
              Send Reply
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskReplyModal;