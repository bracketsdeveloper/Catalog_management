import React, { useState, useEffect } from "react";

function CreateTicketModal({ onClose, onSubmit, opportunities = [], users = [], initialData = {}, isSuperAdmin, currentUser, isEditing = false }) {
  const [formData, setFormData] = useState({
    _id: initialData._id || null,
    ticketName: initialData.ticketName || "",
    opportunityId: initialData.opportunityId?._id || initialData.opportunityId || null,
    opportunitySearch: initialData.opportunityCode || (initialData.opportunityId ? `${initialData.opportunityId.opportunityCode} - ${initialData.opportunityId.opportunityName}` : ""),
    assignedTo: initialData.assignedTo?._id || (isSuperAdmin ? "" : currentUser?._id || ""),
    assignedToSearch: initialData.assignedTo
      ? `${initialData.assignedTo.name} (${initialData.assignedTo.email})`
      : isSuperAdmin
      ? ""
      : currentUser
      ? `${currentUser.name} (${currentUser.email})`
      : "",
    fromDate: initialData.fromDate ? new Date(new Date(initialData.fromDate).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    toDate: initialData.toDate ? new Date(new Date(initialData.toDate).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    toBeClosedBy: initialData.toBeClosedBy ? new Date(new Date(initialData.toBeClosedBy).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    completedOn: initialData.completedOn || "Not Done",
    schedule: initialData.schedule || "None",
    selectedDates: initialData.selectedDates ? [...new Set(initialData.selectedDates.map((d) => new Date(new Date(d).getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0]))] : [],
  });
  const [showOpportunitySuggestions, setShowOpportunitySuggestions] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);

  const filteredOpportunities = opportunities.length
    ? opportunities.filter((opp) =>
        `${opp.opportunityCode} - ${opp.opportunityName}`
          .toLowerCase()
          .includes(formData.opportunitySearch.toLowerCase())
      )
    : [];

  const filteredUsers = users.length
    ? users.filter((user) =>
        `${user.name} (${user.email})`.toLowerCase().includes(formData.assignedToSearch.toLowerCase())
      )
    : [];

  const generateDates = (schedule, fromDate, toDate) => {
    if (!schedule || !fromDate || !toDate || schedule === "None") return [];
    const dates = [];
    let current = new Date(fromDate);
    const endDate = new Date(toDate);
    current.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    switch (schedule) {
      case "Daily":
        while (current <= endDate) {
          dates.push(current.toISOString().split("T")[0]);
          current.setDate(current.getDate() + 1);
        }
        break;
      case "Weekly":
        while (current <= endDate) {
          dates.push(current.toISOString().split("T")[0]);
          current.setDate(current.getDate() + 7);
        }
        break;
      case "Monthly":
        const yearEnd = new Date(current.getFullYear(), 11, 31);
        const maxDate = endDate < yearEnd ? endDate : yearEnd;
        while (current <= maxDate) {
          dates.push(current.toISOString().split("T")[0]);
          current.setMonth(current.getMonth() + 1);
        }
        break;
      case "AlternateDays":
        while (current <= endDate) {
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
      const newDates = generateDates(formData.schedule, formData.fromDate, formData.toDate);
      setFormData((prev) => ({ ...prev, selectedDates: [...new Set(newDates)] }));
    }
  }, [formData.schedule, formData.fromDate, formData.toDate, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };
      if (name === "schedule" && !isEditing) {
        newFormData.selectedDates = generateDates(value, prev.fromDate, prev.toDate);
      }
      if (name === "opportunitySearch" && !value) {
        newFormData.opportunityId = null;
      }
      return newFormData;
    });
    if (name === "opportunitySearch") {
      setShowOpportunitySuggestions(value.length > 0 && opportunities.length > 0);
    } else if (name === "assignedToSearch") {
      setShowUserSuggestions(value.length > 0 && users.length > 0);
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
    setFormData((prev) => ({
      ...prev,
      assignedTo: user._id,
      assignedToSearch: `${user.name} (${user.email})`,
    }));
    setShowUserSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const baseData = {
        ticketName: formData.ticketName,
        opportunityId: formData.opportunityId || null,
        assignedTo: formData.assignedTo || null,
        completedOn: formData.completedOn,
        schedule: formData.schedule,
        fromDate: formData.fromDate && formData.schedule !== "None" ? new Date(new Date(formData.fromDate).getTime() - 5.5 * 60 * 60 * 1000).toISOString() : null,
        toDate: formData.toDate && formData.schedule !== "None" ? new Date(new Date(formData.toDate).getTime() - 5.5 * 60 * 60 * 1000).toISOString() : null,
      };

      if (isEditing && formData._id) {
        await onSubmit({
          ...baseData,
          _id: formData._id,
          toBeClosedBy: new Date(new Date(formData.toBeClosedBy).getTime() - 5.5 * 60 * 60 * 1000).toISOString(),
          selectedDates: formData.selectedDates.map((d) => new Date(new Date(d).getTime() - 5.5 * 60 * 60 * 1000).toISOString()),
        }, true);
      } else if (formData.schedule === "None") {
        await onSubmit({
          ...baseData,
          toBeClosedBy: new Date(new Date(formData.toBeClosedBy).getTime() - 5.5 * 60 * 60 * 1000).toISOString(),
          selectedDates: [],
        }, false);
      } else {
        const uniqueDates = [...new Set(formData.selectedDates)];
        const tasks = uniqueDates.map((date) => ({
          ...baseData,
          toBeClosedBy: new Date(new Date(date).getTime() - 5.5 * 60 * 60 * 1000).toISOString(),
          selectedDates: [new Date(new Date(date).getTime() - 5.5 * 60 * 60 * 1000).toISOString()],
        }));
        await onSubmit(tasks, false);
      }
      onClose();
    } catch (error) {
      console.error("Error submitting ticket:", error);
      alert(`Error: ${error.response?.data?.message || "Failed to save ticket"}`);
    }
  };

  const getScheduleSummary = () => {
    if (formData.schedule === "None" || formData.selectedDates.length === 0) return "No dates generated.";
    const startDate = new Date(formData.selectedDates[0]).toLocaleDateString();
    const endDate = new Date(formData.selectedDates[formData.selectedDates.length - 1]).toLocaleDateString();
    const repeatPattern = formData.schedule === "SelectedDates" ? "on selected dates" : `repeats ${formData.schedule.toLowerCase()}`;
    return `From ${startDate} to ${endDate} ${repeatPattern}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">{isEditing ? "Edit Ticket" : "Create Ticket"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium">Ticket Name</label>
            <input
              type="text"
              name="ticketName"
              value={formData.ticketName}
              onChange={handleChange}
              required
              className="w-full border p-2 rounded h-10"
            />
          </div>
          <div className="mb-4 relative">
            <label className="block text-sm font-medium">OPP #</label>
            <input
              type="text"
              name="opportunitySearch"
              value={formData.opportunitySearch}
              onChange={handleChange}
              onFocus={() => setShowOpportunitySuggestions(formData.opportunitySearch.length > 0 && opportunities.length > 0)}
              onBlur={() => setTimeout(() => setShowOpportunitySuggestions(false), 200)}
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
          </div>
          <div className="mb-4 relative">
            <label className="block text-sm font-medium">Assign To</label>
            <input
              type="text"
              name="assignedToSearch"
              value={formData.assignedToSearch}
              onChange={handleChange}
              onFocus={() => setShowUserSuggestions(formData.assignedToSearch.length > 0 && users.length > 0)}
              onBlur={() => setTimeout(() => setShowUserSuggestions(false), 200)}
              placeholder="Type to search users..."
              className="w-full border p-2 rounded h-10"
              disabled={!isSuperAdmin && formData.assignedTo === currentUser?._id}
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
          </div>
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
          {formData.schedule === "None" && (
            <div className="mb-4">
              <label className="block text-sm font-medium">To Be Closed By</label>
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
          {formData.schedule === "SelectedDates" && (
            <div className="mb-4">
              <label className="block text-sm font-medium">Select Dates</label>
              <input
                type="date"
                onChange={(e) => {
                  const newDate = e.target.value;
                  if (!formData.selectedDates.includes(newDate)) {
                    setFormData((prev) => ({
                      ...prev,
                      selectedDates: [...new Set([...prev.selectedDates, newDate])].sort(),
                    }));
                  }
                  e.target.value = "";
                }}
                className="w-full border p-2 rounded h-10"
              />
              <div className="mt-2 max-h-20 overflow-y-auto">
                {formData.selectedDates.length > 0 ? (
                  formData.selectedDates.map((date, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm mt-1">
                      <span>{new Date(date).toLocaleDateString()}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => {
                            const newDates = [...prev.selectedDates];
                            newDates.splice(index, 1);
                            return { ...prev, selectedDates: newDates };
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
          {formData.schedule !== "None" && (
            <div className="mb-4">
              <h4 className="block text-sm font-medium">Generated Dates</h4>
              <div id="generated-dates" className="max-h-20 overflow-y-auto border p-2 rounded">
                <div className="text-sm">{getScheduleSummary()}</div>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded">
              {isEditing ? "Update" : "Create"}
            </button>
            <button type="button" onClick={onClose} className="bg-gray-400 text-white px-4 py-2 rounded">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTicketModal;