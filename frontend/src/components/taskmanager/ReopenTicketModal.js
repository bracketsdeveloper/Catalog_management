import React, { useState } from "react";

function ReopenTicketModal({ task, onClose, onSubmit }) {
  const [newClosingDate, setNewClosingDate] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(task._id, newClosingDate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Reopen Ticket: {task.taskRef}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium">Ticket Name</label>
            <input
              type="text"
              value={task.ticketName}
              disabled
              className="w-full border p-2 rounded bg-gray-100"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium">OPP #</label>
            <input
              type="text"
              value={task.opportunityCode || "-"}
              disabled
              className="w-full border p-2 rounded bg-gray-100"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium">New Closing Date</label>
            <input
              type="datetime-local"
              value={newClosingDate}
              onChange={(e) => setNewClosingDate(e.target.value)}
              required
              className="w-full border p-2 rounded"
            />
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Note: This ticket will be marked as <span className="font-medium text-yellow-800">Re-Opened</span> upon submission.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded"
            >
              Reopen
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

export default ReopenTicketModal;