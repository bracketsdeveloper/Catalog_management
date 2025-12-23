"use client";

import React, { useState, useEffect } from "react";

export default function CreateTicketModal({
  onClose,
  onSubmit,
  opportunities = [],
  users = [],
  initialData = {},
  isSuperAdmin,
  currentUser,
  isEditing = false,
}) {
  // --- Form state initialization ---
  const [formData, setFormData] = useState({
    _id: initialData._id || null,
    ticketName: initialData.ticketName || "",
    taskDescription: initialData.taskDescription || "", // New field
    opportunityId:
      initialData.opportunityId?._id || initialData.opportunityId || null,
    opportunitySearch:
      initialData.opportunityCode ||
      (initialData.opportunityId
        ? `${initialData.opportunityId.opportunityCode} - ${initialData.opportunityId.opportunityName}`
        : ""),
    assignedTo:
      initialData.assignedTo?.map(user => user._id) ||
      (isSuperAdmin ? [] : currentUser?._id ? [currentUser._id] : []), // Changed to array
    assignedToSearch: initialData.assignedTo
      ? initialData.assignedTo.map(user => `${user.name} (${user.email})`).join(", ")
      : isSuperAdmin
      ? ""
      : currentUser
      ? `${currentUser.name} (${currentUser.email})`
      : "",
    schedule: initialData.schedule || "None",
    fromDate: initialData.fromDate
      ? new Date(new Date(initialData.fromDate).getTime() + 5.5 * 3600 * 1000)
          .toISOString()
          .slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    toDate: initialData.toDate
      ? new Date(new Date(initialData.toDate).getTime() + 5.5 * 3600 * 1000)
          .toISOString()
          .slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    toBeClosedBy: initialData.toBeClosedBy
      ? new Date(
          new Date(initialData.toBeClosedBy).getTime() + 5.5 * 3600 * 1000
        )
          .toISOString()
          .slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    completedOn: initialData.completedOn || "Not Done",
    completionRemarks: initialData.completionRemarks || "", // New field
    selectedDates: initialData.selectedDates
      ? [
          ...new Set(
            initialData.selectedDates.map((d) =>
              new Date(new Date(d).getTime() + 5.5 * 3600 * 1000)
                .toISOString()
                .split("T")[0]
            )
          ),
        ]
      : [],
    reopened: initialData.reopened || false,
    reopenDescription: initialData.reopenDescription || "", // New field
  });

  // --- Dropdown visibility state ---
  const [showOpportunitySuggestions, setShowOpportunitySuggestions] =
    useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(
    initialData.assignedTo?.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email
    })) || (isSuperAdmin ? [] : currentUser ? [{
      _id: currentUser._id,
      name: currentUser.name,
      email: currentUser.email
    }] : [])
  );

  // --- Filtered lists ---
  const safeOpportunities = Array.isArray(opportunities)
    ? opportunities
    : [];
  const filteredOpportunities = safeOpportunities.filter((opp) =>
    `${opp.opportunityCode || ""} - ${opp.opportunityName || ""}`
      .toLowerCase()
      .includes(formData.opportunitySearch.toLowerCase())
  );

  const filteredUsers = Array.isArray(users)
    ? users.filter((user) =>
        `${user.name || ""} (${user.email || ""})`
          .toLowerCase()
          .includes(formData.assignedToSearch.toLowerCase())
      )
    : [];

  // --- Generate dates based on schedule ---
  const generateDates = (schedule, fromDate, toDate) => {
    if (!schedule || schedule === "None") return [];
    const dates = [];
    let current = new Date(fromDate);
    const end = new Date(toDate);
    current.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    switch (schedule) {
      case "Daily":
        while (current <= end) {
          dates.push(current.toISOString().split("T")[0]);
          current.setDate(current.getDate() + 1);
        }
        break;
      case "Weekly":
        while (current <= end) {
          dates.push(current.toISOString().split("T")[0]);
          current.setDate(current.getDate() + 7);
        }
        break;
      case "Monthly":
        while (current <= end) {
          dates.push(current.toISOString().split("T")[0]);
          current.setMonth(current.getMonth() + 1);
        }
        break;
      case "AlternateDays":
        while (current <= end) {
          dates.push(current.toISOString().split("T")[0]);
          current.setDate(current.getDate() + 2);
        }
        break;
      case "SelectedDates":
        return formData.selectedDates;
      default:
        return [];
    }

    return [...new Set(dates)];
  };

  // --- Re-generate dates when schedule, fromDate, toDate change ---
  useEffect(() => {
    if (formData.schedule !== "SelectedDates" && !isEditing) {
      const newDates = generateDates(
        formData.schedule,
        formData.fromDate,
        formData.toDate
      );
      setFormData((prev) => ({ ...prev, selectedDates: newDates }));
    }
  }, [formData.schedule, formData.fromDate, formData.toDate, isEditing]);

  // --- Handle any input change ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      
      if (name === "schedule" && !isEditing) {
        updated.selectedDates = generateDates(
          value,
          prev.fromDate,
          prev.toDate
        );
      }
      
      // Only clear opportunityId if search is completely cleared
      if (name === "opportunitySearch" && value === "") {
        updated.opportunityId = null;
      }
      
      return updated;
    });
  
    if (name === "opportunitySearch") {
      setShowOpportunitySuggestions(!!value && safeOpportunities.length > 0);
    }
    if (name === "assignedToSearch") {
      setShowUserSuggestions(true);
    }
  };

  // --- Pick an opportunity ---
  const handleOpportunitySuggestionClick = (opp) => {
    setFormData((prev) => ({
      ...prev,
      opportunityId: opp._id,
      opportunitySearch: `${opp.opportunityCode} - ${opp.opportunityName}`,
    }));
    setShowOpportunitySuggestions(false);
  };

  // --- Pick a user ---
  const handleUserSuggestionClick = (user) => {
    if (!selectedUsers.some(u => u._id === user._id)) {
      const newSelectedUsers = [...selectedUsers, {
        _id: user._id,
        name: user.name,
        email: user.email
      }];
      setSelectedUsers(newSelectedUsers);
      setFormData(prev => ({
        ...prev,
        assignedTo: newSelectedUsers.map(u => u._id),
        assignedToSearch: newSelectedUsers.map(u => `${u.name} (${u.email})`).join(", ")
      }));
    }
    setShowUserSuggestions(false);
  };

  // --- Remove a selected user ---
  const removeSelectedUser = (userId) => {
    const newSelectedUsers = selectedUsers.filter(user => user._id !== userId);
    setSelectedUsers(newSelectedUsers);
    setFormData(prev => ({
      ...prev,
      assignedTo: newSelectedUsers.map(u => u._id),
      assignedToSearch: newSelectedUsers.map(u => `${u.name} (${u.email})`).join(", ")
    }));
  };

  // --- Submit form ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Determine opportunityId and opportunityCode
    let opportunityId = formData.opportunityId;
    let opportunityCode = formData.opportunitySearch || "";
    
    // If opportunitySearch is empty, set both to null/empty
    if (formData.opportunitySearch === "") {
      opportunityId = null;
      opportunityCode = "";
    }

    // Prepare base payload
    const base = {
      ticketName: formData.ticketName,
      taskDescription: formData.taskDescription,
      opportunityId: opportunityId,
      opportunityCode: opportunityCode, // Send the code explicitly
      assignedTo: formData.assignedTo || [],
      schedule: formData.schedule,
      fromDate:
        formData.schedule !== "None"
          ? new Date(new Date(formData.fromDate).getTime() - 5.5 * 3600 * 1000).toISOString()
          : null,
      toDate:
        formData.schedule !== "None"
          ? new Date(new Date(formData.toDate).getTime() - 5.5 * 3600 * 1000).toISOString()
          : null,
      completedOn: formData.completedOn,
      completionRemarks: formData.completionRemarks,
      reopened: formData.reopened,
      reopenDescription: formData.reopenDescription,
    };

    if (isEditing && formData._id) {
      // Single-update for existing ticket
      await onSubmit(
        {
          ...base,
          _id: formData._id,
          toBeClosedBy: new Date(
            new Date(formData.toBeClosedBy).getTime() - 5.5 * 3600 * 1000
          ).toISOString(),
          selectedDates: formData.selectedDates.map((d) =>
            new Date(new Date(d).getTime() - 5.5 * 3600 * 1000).toISOString()
          ),
        },
        true
      );
    } else if (formData.schedule === "None") {
      // Single ticket if no schedule
      await onSubmit(
        {
          ...base,
          toBeClosedBy: new Date(
            new Date(formData.toBeClosedBy).getTime() - 5.5 * 3600 * 1000
          ).toISOString(),
          selectedDates: [],
        },
        false
      );
    } else {
      // Multi-ticket creation
      const uniqueDates = [...new Set(formData.selectedDates)];
      const tasks = uniqueDates.map((date) => ({
        ...base,
        toBeClosedBy: new Date(new Date(date).getTime() - 5.5 * 3600 * 1000).toISOString(),
        selectedDates: [new Date(new Date(date).getTime() - 5.5 * 3600 * 1000).toISOString()],
      }));
      await onSubmit(tasks, false);
    }

    onClose();
  };

  // --- Human‐readable schedule summary ---
  const getScheduleSummary = () => {
    if (formData.schedule === "None" || formData.selectedDates.length === 0) {
      return "No dates generated.";
    }
    const start = new Date(formData.selectedDates[0]).toLocaleDateString();
    const end = new Date(
      formData.selectedDates[formData.selectedDates.length - 1]
    ).toLocaleDateString();
    const pattern =
      formData.schedule === "SelectedDates"
        ? "on selected dates"
        : `repeats ${formData.schedule.toLowerCase()}`;

    return `From ${start} to ${end} ${pattern}.`;
  };

  // --- Render ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">
          {isEditing ? "Edit Ticket" : "Create Ticket"}
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Ticket Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium">Ticket Name *</label>
            <input
              type="text"
              name="ticketName"
              value={formData.ticketName}
              onChange={handleChange}
              required
              className="w-full border p-2 rounded h-10"
            />
          </div>

          {/* Task Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium">Task Description</label>
            <textarea
              name="taskDescription"
              value={formData.taskDescription}
              onChange={handleChange}
              rows="3"
              className="w-full border p-2 rounded"
              placeholder="Describe the task details..."
            />
          </div>

          {/* Opportunity Search */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium">OPP #</label>
            <input
              type="text"
              name="opportunitySearch"
              value={formData.opportunitySearch}
              onChange={handleChange}
              onFocus={() =>
                setShowOpportunitySuggestions(
                  formData.opportunitySearch.length > 0 &&
                    safeOpportunities.length > 0
                )
              }
              onBlur={() =>
                setTimeout(() => setShowOpportunitySuggestions(false), 200)
              }
              placeholder="Type to search opportunities..."
              className="w-full border p-2 rounded h-10"
            />
            {showOpportunitySuggestions && filteredOpportunities.length > 0 && (
              <div className="absolute z-10 w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto">
                {filteredOpportunities.map((opp) => (
                  <div
                    key={opp._id}
                    onMouseDown={() => handleOpportunitySuggestionClick(opp)}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    {opp.opportunityCode} - {opp.opportunityName}
                  </div>
                ))}
              </div>
            )}
            {showOpportunitySuggestions &&
              filteredOpportunities.length === 0 && (
                <div className="absolute z-10 w-full bg-white border rounded mt-1 p-2 text-sm text-gray-500">
                  No opportunities found
                </div>
              )}
          </div>

          {/* Assign To (Multiple Users) */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium">Assign To *</label>
            <input
              type="text"
              name="assignedToSearch"
              value={formData.assignedToSearch}
              onChange={handleChange}
              onFocus={() => users.length > 0 && setShowUserSuggestions(true)}
              onBlur={() =>
                setTimeout(() => setShowUserSuggestions(false), 200)
              }
              placeholder="Type to search users..."
              className="w-full border p-2 rounded h-10"
              disabled={!isSuperAdmin && selectedUsers.some(u => u._id === currentUser?._id)}
            />
            {showUserSuggestions && filteredUsers.length > 0 && (
              <div className="absolute z-10 w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user._id}
                    onMouseDown={() => handleUserSuggestionClick(user)}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    {user.name} ({user.email})
                  </div>
                ))}
              </div>
            )}
            {showUserSuggestions && filteredUsers.length === 0 && (
              <div className="absolute z-10 w-full bg-white border rounded mt-1 p-2 text-sm text-gray-500">
                No users found
              </div>
            )}
            
            {/* Selected Users Display */}
            {selectedUsers.length > 0 && (
              <div className="mt-2">
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      <span>{user.name}</span>
                      <button
                        type="button"
                        onClick={() => removeSelectedUser(user._id)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="mb-4">
            <label className="block text-sm font-medium">Schedule</label>
            <select
              name="schedule"
              value={formData.schedule}
              onChange={handleChange}
              className="w-full border p-2 rounded h-10"
            >
              <option value="None">None</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="AlternateDays">Alternate Days</option>
              <option value="SelectedDates">Selected Dates</option>
            </select>
          </div>

          {/* From & To for repeating schedules */}
          {formData.schedule !== "None" && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium">From Date</label>
                <input
                  type="datetime-local"
                  name="fromDate"
                  value={formData.fromDate}
                  onChange={handleChange}
                  className="w-full border p-2 rounded h-10"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium">To Date</label>
                <input
                  type="datetime-local"
                  name="toDate"
                  value={formData.toDate}
                  onChange={handleChange}
                  className="w-full border p-2 rounded h-10"
                />
              </div>
            </>
          )}

          {/* Single due date if no schedule */}
          {formData.schedule === "None" && (
            <div className="mb-4">
              <label className="block text-sm font-medium">To Be Closed By *</label>
              <input
                type="datetime-local"
                name="toBeClosedBy"
                value={formData.toBeClosedBy}
                onChange={handleChange}
                required
                className="w-full border p-2 rounded h-10"
              />
            </div>
          )}

          {/* Completed status */}
          <div className="mb-4">
            <label className="block text-sm font-medium">Completed On</label>
            <select
              name="completedOn"
              value={formData.completedOn}
              onChange={handleChange}
              className="w-full border p-2 rounded h-10"
            >
              <option value="Not Done">Not Done</option>
              <option value="Done">Done</option>
            </select>
          </div>

          {/* Completion Remarks (only shown when marking as Done) */}
          {formData.completedOn === "Done" && (
            <div className="mb-4">
              <label className="block text-sm font-medium">Completion Remarks</label>
              <textarea
                name="completionRemarks"
                value={formData.completionRemarks}
                onChange={handleChange}
                rows="2"
                className="w-full border p-2 rounded"
                placeholder="Add remarks about completion..."
              />
            </div>
          )}

          {/* Reopened toggle and description for super-admins */}
          {isSuperAdmin && isEditing && (
            <>
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  name="reopened"
                  checked={formData.reopened}
                  onChange={handleChange}
                  className="h-4 w-4 mr-2"
                />
                <label className="text-sm">Mark as Reopened</label>
              </div>
              {formData.reopened && (
                <div className="mb-4">
                  <label className="block text-sm font-medium">Reopen Description</label>
                  <textarea
                    name="reopenDescription"
                    value={formData.reopenDescription}
                    onChange={handleChange}
                    rows="2"
                    className="w-full border p-2 rounded"
                    placeholder="Reason for reopening..."
                  />
                </div>
              )}
            </>
          )}

          {/* Selected Dates picker */}
          {formData.schedule === "SelectedDates" && (
            <div className="mb-4">
              <label className="block text-sm font-medium">
                Select Dates
              </label>
              <input
                type="date"
                onChange={(e) => {
                  const d = e.target.value;
                  if (!formData.selectedDates.includes(d)) {
                    setFormData((prev) => ({
                      ...prev,
                      selectedDates: [...new Set([...prev.selectedDates, d])].sort(),
                    }));
                  }
                  e.target.value = "";
                }}
                className="w-full border p-2 rounded h-10"
              />
              <div className="mt-2 max-h-20 overflow-y-auto">
                {formData.selectedDates.length > 0 ? (
                  formData.selectedDates.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1">
                      <span>{new Date(d).toLocaleDateString()}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => {
                            const arr = [...prev.selectedDates];
                            arr.splice(i, 1);
                            return { ...prev, selectedDates: arr };
                          })
                        }
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No dates selected.</p>
                )}
              </div>
            </div>
          )}

          {/* Summary of generated dates */}
          {formData.schedule !== "None" && (
            <div className="mb-4">
              <h4 className="text-sm font-medium">Generated Dates</h4>
              <div className="border p-2 rounded max-h-20 overflow-y-auto text-sm">
                {getScheduleSummary()}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded"
            >
              {isEditing ? "Update" : "Create"}
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