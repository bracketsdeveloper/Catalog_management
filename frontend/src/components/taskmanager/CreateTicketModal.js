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
  function formatDateForInput(dateString) {
    if (!dateString) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function convertToUTC(dateTimeLocal) {
    if (!dateTimeLocal) return null;
    const localDate = new Date(dateTimeLocal);
    return localDate.toISOString();
  }

  const [formData, setFormData] = useState({
    _id: initialData._id || null,
    ticketName: initialData.ticketName || "",
    taskDescription: initialData.taskDescription || "",
    opportunityId:
      initialData.opportunityId?._id || initialData.opportunityId || null,
    opportunitySearch:
      initialData.opportunityCode ||
      (initialData.opportunityId
        ? `${initialData.opportunityId.opportunityCode} - ${initialData.opportunityId.opportunityName}`
        : ""),
    assignedTo:
      initialData.assignedTo?.map(user => user._id) ||
      (currentUser?._id ? [currentUser._id] : []),
    assignedToSearch: initialData.assignedTo
      ? initialData.assignedTo.map(user => `${user.name} (${user.email})`).join(", ")
      : currentUser
      ? `${currentUser.name} (${currentUser.email})`
      : "",
    schedule: initialData.schedule || "None",
    fromDate: formatDateForInput(initialData.fromDate),
    toDate: formatDateForInput(initialData.toDate),
    toBeClosedBy: formatDateForInput(initialData.toBeClosedBy),
    completedOn: initialData.completedOn || "Not Done",
    completionRemarks: initialData.completionRemarks || "",
    selectedDates: initialData.selectedDates || [],
    reopened: initialData.reopened || false,
    reopenDescription: initialData.reopenDescription || "",
  });

  const [showOpportunitySuggestions, setShowOpportunitySuggestions] =
    useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(
    initialData.assignedTo?.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email
    })) || (currentUser ? [{
      _id: currentUser._id,
      name: currentUser.name,
      email: currentUser.email
    }] : [])
  );

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

  const generateDates = (schedule, fromDateLocal, toDateLocal) => {
    if (!schedule || schedule === "None") return [];
    if (!fromDateLocal || !toDateLocal) return [];
    
    const from = new Date(fromDateLocal);
    const to = new Date(toDateLocal);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return [];
    
    const dates = [];
    let current = new Date(from);
    
    current.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

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

  const handleOpportunitySuggestionClick = (opp) => {
    setFormData((prev) => ({
      ...prev,
      opportunityId: opp._id,
      opportunitySearch: `${opp.opportunityCode} - ${opp.opportunityName}`,
    }));
    setShowOpportunitySuggestions(false);
  };

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
        assignedToSearch: ""
      }));
    }
    setShowUserSuggestions(false);
  };

  const removeSelectedUser = (userId) => {
    const newSelectedUsers = selectedUsers.filter(user => user._id !== userId);
    setSelectedUsers(newSelectedUsers);
    setFormData(prev => ({
      ...prev,
      assignedTo: newSelectedUsers.map(u => u._id),
      assignedToSearch: ""
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let opportunityId = formData.opportunityId;
    let opportunityCode = formData.opportunitySearch || "";
    
    if (formData.opportunitySearch === "") {
      opportunityId = null;
      opportunityCode = "";
    }

    const base = {
      ticketName: formData.ticketName,
      taskDescription: formData.taskDescription,
      opportunityId: opportunityId,
      opportunityCode: opportunityCode,
      assignedTo: formData.assignedTo || [],
      schedule: formData.schedule,
      fromDate: formData.schedule !== "None" ? convertToUTC(formData.fromDate) : null,
      toDate: formData.schedule !== "None" ? convertToUTC(formData.toDate) : null,
      completedOn: formData.completedOn,
      completionRemarks: formData.completionRemarks,
      reopened: formData.reopened,
      reopenDescription: formData.reopenDescription,
    };

    if (isEditing && formData._id) {
      await onSubmit(
        {
          ...base,
          _id: formData._id,
          toBeClosedBy: convertToUTC(formData.toBeClosedBy),
          selectedDates: formData.selectedDates.map(date => {
            const dateOnly = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
            const timePart = new Date(formData.toBeClosedBy);
            const hours = timePart.getHours();
            const minutes = timePart.getMinutes();
            const combinedDate = new Date(dateOnly);
            combinedDate.setHours(hours, minutes, 0, 0);
            return combinedDate.toISOString();
          }),
        },
        true
      );
    } else if (formData.schedule === "None") {
      await onSubmit(
        {
          ...base,
          toBeClosedBy: convertToUTC(formData.toBeClosedBy),
          selectedDates: [],
        },
        false
      );
    } else {
      const uniqueDates = [...new Set(formData.selectedDates)];
      const tasks = uniqueDates.map((date) => {
        const dateOnly = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
        const timePart = new Date(formData.toBeClosedBy);
        const hours = timePart.getHours();
        const minutes = timePart.getMinutes();
        
        const combinedDate = new Date(dateOnly);
        combinedDate.setHours(hours, minutes, 0, 0);
        
        return {
          ...base,
          toBeClosedBy: combinedDate.toISOString(),
          selectedDates: [combinedDate.toISOString()],
        };
      });
      await onSubmit(tasks, false);
    }

    onClose();
  };

  const getScheduleSummary = () => {
    if (formData.schedule === "None" || formData.selectedDates.length === 0) {
      return "No dates generated.";
    }
    
    const startDateStr = formData.selectedDates[0];
    const endDateStr = formData.selectedDates[formData.selectedDates.length - 1];
    
    const start = new Date(startDateStr).toLocaleDateString();
    const end = new Date(endDateStr).toLocaleDateString();
    const pattern =
      formData.schedule === "SelectedDates"
        ? "on selected dates"
        : `repeats ${formData.schedule.toLowerCase()}`;

    return `From ${start} to ${end} ${pattern}. (${formData.selectedDates.length} occurrence${formData.selectedDates.length > 1 ? 's' : ''})`;
  };

  const getCurrentLocalTime = () => {
    return new Date().toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getEnteredTime = (dateTimeLocal) => {
    if (!dateTimeLocal) return '';
    const d = new Date(dateTimeLocal);
    return d.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

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

          {/* Assign To (Multiple Users) - Now visible to all users */}
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
                <label className="block text-sm font-medium">From Date & Time</label>
                <input
                  type="datetime-local"
                  name="fromDate"
                  value={formData.fromDate}
                  onChange={handleChange}
                  className="w-full border p-2 rounded h-10"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {getEnteredTime(formData.fromDate)} | Current time: {getCurrentLocalTime()}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium">To Date & Time</label>
                <input
                  type="datetime-local"
                  name="toDate"
                  value={formData.toDate}
                  onChange={handleChange}
                  className="w-full border p-2 rounded h-10"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {getEnteredTime(formData.toDate)}
                </p>
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
              <p className="text-xs text-gray-500 mt-1">
                Selected: {getEnteredTime(formData.toBeClosedBy)} | Current time: {getCurrentLocalTime()}
              </p>
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
              {formData.completedOn === "Pending Confirmation" && (
                <option value="Pending Confirmation">Pending Confirmation</option>
              )}
            </select>
          </div>

          {/* Completion Remarks (only shown when marking as Done) */}
          {(formData.completedOn === "Done" || formData.completedOn === "Pending Confirmation") && (
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
                  if (d && !formData.selectedDates.includes(d)) {
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
              <div className="border p-2 rounded max-h-20 overflow-y-auto text-sm bg-gray-50">
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