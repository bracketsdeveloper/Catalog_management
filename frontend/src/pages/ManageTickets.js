"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import TicketsTable from "../components/taskmanager/TicketsTable";
import CreateTicketModal from "../components/taskmanager/CreateTicketModal";
import SearchBar from "../components/taskmanager/SearchBar";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

export default function ManageTicketsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "" });
  const [filter, setFilter] = useState(() => localStorage.getItem("taskFilter") || "open");
  const [dateFilter, setDateFilter] = useState(() => localStorage.getItem("taskDateFilter") || "");
  const [editingUser, setEditingUser] = useState(null);
  const [updatedRole, setUpdatedRole] = useState("");
  const [updatedSuperAdmin, setUpdatedSuperAdmin] = useState(false);
  const [updatedHandles, setUpdatedHandles] = useState([]);
  const handleOptions = ["CRM", "PURCHASE", "PRODUCTION", "SALES"];
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    localStorage.setItem("taskFilter", filter);
  }, [filter]);

  useEffect(() => {
    localStorage.setItem("taskDateFilter", dateFilter);
  }, [dateFilter]);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  // Fetch current user
  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/admin/users`, { headers: getAuthHeaders() })
      .then((res) => {
        setCurrentUser(res.data);
        setIsSuperAdmin(res.data.isSuperAdmin === true);
      })
      .catch((err) => console.error("Error fetching current user:", err));
  }, []);

  // Fetch users list - Use the tasks/users endpoint which is accessible to all authenticated users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Try the tasks/users endpoint first (available to all authenticated users)
        const response = await axios.get(`${BACKEND_URL}/api/admin/tasks/users`, { 
          headers: getAuthHeaders() 
        });
        setUsers(response.data || []);
      } catch (error) {
        console.error("Error fetching users from tasks endpoint:", error);
        
        // Fallback: Try to get users based on user role
        try {
          // If superadmin, get all users
          if (isSuperAdmin) {
            const adminResponse = await axios.get(`${BACKEND_URL}/api/admin/users?all=true`, {
              headers: getAuthHeaders()
            });
            setUsers(adminResponse.data || []);
          } else {
            // For non-superadmins, at least include themselves
            if (currentUser) {
              setUsers([currentUser]);
            }
          }
        } catch (fallbackError) {
          console.error("Error in fallback user fetch:", fallbackError);
          setUsers([]);
        }
      }
    };

    fetchUsers();
  }, [isSuperAdmin, currentUser]);

  // Fetch tasks whenever searchTerm changes
  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/tasks`, {
        headers: getAuthHeaders(),
        params: { searchTerm },
      });
      setTasks(res.data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [searchTerm]);

  // Sorting logic
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "";
    }
    setSortConfig({ key, direction });
  };

  const sortedTasks = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return tasks;
    const sorted = [...tasks].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (["toBeClosedBy", "assignedOn"].includes(sortConfig.key)) {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal > bVal) return 1;
      if (aVal < bVal) return -1;
      return 0;
    });
    return sortConfig.direction === "desc" ? sorted.reverse() : sorted;
  }, [tasks, sortConfig]);

  // Create or update a ticket
  const handleCreateTicket = async (ticketData, isEditing) => {
    try {
      if (isEditing && ticketData._id) {
        const updateData = { ...ticketData };
        delete updateData._id;
        await axios.put(`${BACKEND_URL}/api/admin/tasks/${ticketData._id}`, updateData, {
          headers: getAuthHeaders(),
        });
      } else {
        const createData = Array.isArray(ticketData)
          ? ticketData.map((task) => {
              const newTask = { ...task };
              delete newTask._id;
              return newTask;
            })
          : (() => {
              const newTask = { ...ticketData };
              delete newTask._id;
              return newTask;
            })();
        await axios.post(`${BACKEND_URL}/api/admin/tasks`, createData, {
          headers: getAuthHeaders(),
        });
      }
      fetchTasks();
      setShowCreateModal(null);
    } catch (error) {
      console.error("Error handling ticket:", error);
      alert(`Error: ${error.response?.data?.message || "Failed to save ticket"}`);
    }
  };

  // Delete a ticket
  const handleDeleteTicket = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/admin/tasks/${taskId}`, {
        headers: getAuthHeaders(),
      });
      fetchTasks();
    } catch (error) {
      console.error("Error deleting ticket:", error);
      alert(`Error: ${error.response?.data?.message || "Failed to delete ticket"}`);
    }
  };

  // Reopen a ticket
  const handleReopen = async (taskId, newClosingDate, reopenDescription) => {
    try {
      const task = tasks.find((t) => t._id === taskId);
      if (!task) throw new Error("Task not found");
      const updateData = {
        ...task,
        toBeClosedBy: newClosingDate,
        reopened: true,
        reopenDescription: reopenDescription || "",
        completedOn: "Not Done",
      };
      delete updateData._id;
      await axios.put(`${BACKEND_URL}/api/admin/tasks/${taskId}`, updateData, {
        headers: getAuthHeaders(),
      });
      fetchTasks();
    } catch (error) {
      console.error("Error reopening ticket:", error);
      alert(`Error: ${error.response?.data?.message || "Failed to reopen ticket"}`);
    }
  };

  // Confirm task completion
  const handleConfirmTask = async (taskId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/admin/tasks/${taskId}/confirm`, {}, {
        headers: getAuthHeaders(),
      });
      fetchTasks();
    } catch (error) {
      console.error("Error confirming task:", error);
      alert(`Error: ${error.response?.data?.message || "Failed to confirm task"}`);
    }
  };

  // Reject task completion
  const handleRejectTask = async (taskId, rejectionReason) => {
    try {
      await axios.post(`${BACKEND_URL}/api/admin/tasks/${taskId}/reject`, { rejectionReason }, {
        headers: getAuthHeaders(),
      });
      fetchTasks();
    } catch (error) {
      console.error("Error rejecting task:", error);
      alert(`Error: ${error.response?.data?.message || "Failed to reject task"}`);
    }
  };

  // Add reply to task
  const handleAddReply = async (taskId, message) => {
    try {
      console.log('Adding reply - Task ID:', taskId, 'Message:', message);
      const response = await axios.post(
        `${BACKEND_URL}/api/admin/tasks/${taskId}/reply`,
        { message }, 
        { 
          headers: getAuthHeaders(),
          timeout: 10000
        }
      );
      console.log('Reply added successfully:', response.data);
      fetchTasks();
      return response.data;
    } catch (error) {
      console.error("Error adding reply:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || "Failed to add reply";
      alert(`Error: ${errorMessage}`);
      throw error;
    }
  };

  // Update user role/handles - Only for superadmins
  const handleUpdateUser = async (userId) => {
    if (!isSuperAdmin) {
      alert("Only superadmins can update user roles and permissions.");
      return;
    }

    try {
      await axios.put(
        `${BACKEND_URL}/api/admin/users/${userId}/role`,
        { role: updatedRole },
        { headers: getAuthHeaders() }
      );

      await axios.put(
        `${BACKEND_URL}/api/admin/users/${userId}/superadmin`,
        { isSuperAdmin: updatedSuperAdmin },
        { headers: getAuthHeaders() }
      );

      await axios.put(
        `${BACKEND_URL}/api/admin/users/${userId}/handles`,
        { handles: updatedHandles },
        { headers: getAuthHeaders() }
      );

      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId
            ? {
                ...u,
                role: updatedRole,
                isSuperAdmin: updatedSuperAdmin,
                handles: updatedHandles,
              }
            : u
        )
      );
      setEditingUser(null);
      alert("User updated successfully!");
    } catch (err) {
      console.error("Error updating user:", err.response || err.message);
      alert("Failed to update user. Please try again.");
    }
  };

  const openEditModal = (user) => {
    if (!isSuperAdmin) {
      alert("Only superadmins can edit user roles and permissions.");
      return;
    }
    
    setEditingUser(user._id);
    setUpdatedRole(user.role);
    setUpdatedSuperAdmin(user.isSuperAdmin);
    setUpdatedHandles(Array.isArray(user.handles) ? user.handles : []);
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setUpdatedRole("");
    setUpdatedSuperAdmin(false);
    setUpdatedHandles([]);
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-GB");
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 px-6 py-8 sm:px-10 md:px-16 lg:px-20">
      <h1 className="text-3xl font-semibold mb-6 text-indigo-700">Manage Tickets</h1>
      <div className="flex flex-col gap-6">
        {/* Tickets Section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-medium text-gray-700">Tickets</h2>
            <button
              onClick={() => setShowCreateModal({})}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Create Ticket
            </button>
          </div>
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <TicketsTable
            tasks={sortedTasks}
            formatDate={formatDate}
            handleSort={handleSort}
            sortConfig={sortConfig}
            onReopen={(task) => setShowCreateModal({ ...task, isEditing: true })}
            onDelete={handleDeleteTicket}
            onReopenTicket={handleReopen}
            onConfirmTask={handleConfirmTask}
            onRejectTask={handleRejectTask}
            onAddReply={handleAddReply}
            isSuperAdmin={isSuperAdmin}
            currentUser={currentUser}
            filter={filter}
            setFilter={setFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            users={users}
            onEditUser={openEditModal}
          />
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(null)}
          onSubmit={handleCreateTicket}
          users={users}
          initialData={showCreateModal}
          isSuperAdmin={isSuperAdmin}
          currentUser={currentUser}
          isEditing={showCreateModal.isEditing || false}
        />
      )}

      {/* Edit User Modal - Only for superadmins */}
      {editingUser && isSuperAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-[#Ff8045]">Edit User</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={updatedRole}
                onChange={(e) => setUpdatedRole(e.target.value)}
                className="w-full bg-white border border-purple-300 text-gray-900 rounded-lg px-2 py-1"
              >
                <option value="GENERAL">DEACTIVATE</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">SuperAdmin</label>
              <select
                value={updatedSuperAdmin}
                onChange={(e) => setUpdatedSuperAdmin(e.target.value === "true")}
                className="w-full bg-white	border border-purple-300 text-gray-900 rounded-lg px-2 py-1"
              >
                <option value={false}>No</option>
                <option value={true}>Yes</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Handles</label>
              <select
                multiple
                value={updatedHandles}
                onChange={(e) =>
                  setUpdatedHandles(Array.from(e.target.selectedOptions, (o) => o.value))
                }
                className="w-full bg-white border border-purple-300 text-gray-900 rounded-lg px-2 py-1 max-h-32"
              >
                {handleOptions.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Hold Ctrl (Cmd on Mac) to select multiple options
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeEditModal}
                className="bg-gray-300 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateUser(editingUser)}
                className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}