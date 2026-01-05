import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import SearchBar from "../components/taskmanager/SearchBar";
import OpportunityStatusTable from "../components/taskmanager/OpportunityStatusTable";
import TicketsTable from "../components/taskmanager/TicketsTable";
import CreateTicketModal from "../components/taskmanager/CreateTicketModal";
import CalendarPage from "./CalendarPage";
import "../styles/fullcalendar.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function TaskManagementPage() {
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const userId = localStorage.getItem("userId"); // Get userId from localStorage
  const [searchTerm, setSearchTerm] = useState("");
  const [opportunities, setOpportunities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "" });
  const [opportunityFilter, setOpportunityFilter] = useState(isSuperAdmin ? "all" : "my");
  const [selectedUser, setSelectedUser] = useState("all");

  const [filter, setFilter] = useState(() => localStorage.getItem("taskFilter") || "open");
  const [dateFilter, setDateFilter] = useState(() => localStorage.getItem("taskDateFilter") || "");

  useEffect(() => {
    localStorage.setItem("taskFilter", filter);
  }, [filter]);

  useEffect(() => {
    localStorage.setItem("taskDateFilter", dateFilter);
  }, [dateFilter]);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  useEffect(() => {
    // Fetch current user with their ID
    axios
      .get(`${BACKEND_URL}/api/admin/users`, { headers: getAuthHeaders() })
      .then((res) => {
        setCurrentUser(res.data);
        // Store userId in localStorage if not already there
        if (res.data._id && !localStorage.getItem("userId")) {
          localStorage.setItem("userId", res.data._id);
        }
      })
      .catch((err) => console.error("Error fetching current user:", err));
  }, []);

  useEffect(() => {
    const endpoint = isSuperAdmin ? `${BACKEND_URL}/api/admin/users?all=true` : `${BACKEND_URL}/api/admin/users`;
    axios
      .get(endpoint, { headers: getAuthHeaders() })
      .then((res) => {
        const usersData = isSuperAdmin ? res.data : [res.data];
        setUsers(usersData);
      })
      .catch((err) => console.error("Error fetching users:", err));
  }, [isSuperAdmin]);

  const fetchOpportunities = async () => {
    try {
      const params = { searchTerm };
      if (!isSuperAdmin) {
        params.filter = opportunityFilter;
      } else if (selectedUser !== "all") {
        params.filter = "my";
        params.userName = users.find((u) => u._id === selectedUser)?.name;
      }
      const res = await axios.get(`${BACKEND_URL}/api/admin/opportunities`, {
        headers: getAuthHeaders(),
        params,
      });
      setOpportunities(res.data || []);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      setOpportunities([]);
    }
  };

  const fetchTasks = async () => {
    try {
      const endpoint = isSuperAdmin 
        ? `${BACKEND_URL}/api/admin/tasks` 
        : `${BACKEND_URL}/api/admin/tasks/my-tasks`;
      
      const res = await axios.get(endpoint, {
        headers: getAuthHeaders(),
        params: { searchTerm },
      });
      console.log("Fetched tasks:", res.data); // Debug log
      setTasks(res.data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    }
  };

  useEffect(() => {
    fetchOpportunities();
    fetchTasks();
  }, [searchTerm, opportunityFilter, selectedUser, users]);

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
      if (["toBeClosedBy", "assignedOn", "createdAt"].includes(sortConfig.key)) {
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

  const handleReopen = async (taskId, newClosingDate) => {
    try {
      const task = tasks.find((t) => t._id === taskId);
      if (!task) throw new Error("Task not found");
      const updateData = {
        ...task,
        toBeClosedBy: newClosingDate,
        reopened: true,
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

  const handleAddReply = async (taskId, message) => {
    try {
      await axios.post(`${BACKEND_URL}/api/admin/tasks/${taskId}/reply`, {
        message
      }, {
        headers: getAuthHeaders(),
      });
      fetchTasks();
    } catch (error) {
      console.error("Error adding reply:", error);
      alert(`Error: ${error.response?.data?.message || "Failed to add reply"}`);
    }
  };

  const handleConfirmTask = async (taskId) => {
    try {
      await axios.put(`${BACKEND_URL}/api/admin/tasks/${taskId}/confirm`, {}, {
        headers: getAuthHeaders(),
      });
      fetchTasks();
    } catch (error) {
      console.error("Error confirming task:", error);
      alert(`Error: ${error.response?.data?.message || "Failed to confirm task"}`);
    }
  };

  const handleMarkAsCompleted = async (taskId) => {
    try {
      await axios.put(`${BACKEND_URL}/api/admin/tasks/${taskId}/complete`, {
        completionRemarks: "Marked as completed by user"
      }, {
        headers: getAuthHeaders(),
      });
      fetchTasks();
    } catch (error) {
      console.error("Error marking task as completed:", error);
      alert(`Error: ${error.response?.data?.message || "Failed to mark task as completed"}`);
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-GB");
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 px-6 py-8 sm:px-10 md:px-16 lg:px-20">
      <h1 className="text-3xl font-semibold mb-6 text-indigo-700">Dashboard</h1>
      <div className="flex flex-col gap-6">
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <div className="flex gap-6">
          <div className="w-[55%] bg-white rounded-lg shadow-md p-4">
            <CalendarPage />
          </div>
          <div className="w-[45%] flex flex-col gap-6 h-[calc(150vh-120px)]">
            <div className="flex-1 max-h-[50%] bg-white rounded-lg shadow-md p-4 overflow-y-auto">
              <h2 className="text-lg font-medium mb-2 text-gray-700">Opportunities</h2>
              <OpportunityStatusTable
                opportunities={opportunities}
                formatDate={formatDate}
                handleSort={handleSort}
                sortConfig={sortConfig}
                isSuperAdmin={isSuperAdmin}
                setOpportunityFilter={setOpportunityFilter}
                setSelectedUser={setSelectedUser}
                users={users}
              />
            </div>
            <div className="flex-1 max-h-[50%] bg-white rounded-lg shadow-md p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-medium text-gray-700">Tickets</h2>
                <button
                  onClick={() => setShowCreateModal({})}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Create Ticket
                </button>
              </div>
              <TicketsTable
                tasks={sortedTasks}
                formatDate={formatDate}
                handleSort={handleSort}
                sortConfig={sortConfig}
                onReopen={(task) => setShowCreateModal({ ...task, isEditing: true })}
                onDelete={handleDeleteTicket}
                onReopenTicket={handleReopen}
                onAddReply={handleAddReply}
                onConfirmTask={handleConfirmTask}
                onMarkAsCompleted={handleMarkAsCompleted}
                isSuperAdmin={isSuperAdmin}
                filter={filter}
                setFilter={setFilter}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                users={users}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>
      </div>
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(null)}
          onSubmit={handleCreateTicket}
          onAddReply={handleAddReply}
          opportunities={opportunities}
          users={users}
          initialData={showCreateModal}
          isSuperAdmin={isSuperAdmin}
          currentUser={currentUser}
          isEditing={showCreateModal.isEditing || false}
        />
      )}
    </div>
  );
}

export default TaskManagementPage;