import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import SearchBar from "../components/taskmanager/SearchBar";
import ToggleViewButtons from "../components/taskmanager/ToggleViewButtons";
import OpportunityStatusTable from "../components/taskmanager/OpportunityStatusTable";
import TicketsTable from "../components/taskmanager/TicketsTable";
import CreateTicketModal from "../components/taskmanager/CreateTicketModal";
import TaskCalendar from "../components/taskmanager/TaskCalendar";
import "../styles/fullcalendar.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

function TaskManager() {
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const [viewMode, setViewMode] = useState("calendar");
  const [subView, setSubView] = useState("opportunity");
  const [searchTerm, setSearchTerm] = useState("");
  const [opportunities, setOpportunities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "" });

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchOpportunities = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/tasks/opportunities`, {
        headers: getAuthHeaders(),
        params: { searchTerm },
      });
      console.log("Opportunities fetched:", res.data);
      setOpportunities(res.data || []);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      setOpportunities([]);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/tasks`, {
        headers: getAuthHeaders(),
        params: { searchTerm },
      });
      console.log("Tasks fetched:", res.data);
      setTasks(res.data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const endpoint = isSuperAdmin ? `${BACKEND_URL}/api/admin/users?all=true` : `${BACKEND_URL}/api/admin/users`;
      const res = await axios.get(endpoint, { headers: getAuthHeaders() });
      console.log("Users fetched:", res.data);
      setUsers(isSuperAdmin ? res.data : [res.data]);
      if (!isSuperAdmin) setCurrentUser(res.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  };

  const fetchCurrentUser = async () => {
    if (isSuperAdmin) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/users`, { headers: getAuthHeaders() });
      console.log("Current user fetched:", res.data);
      setCurrentUser(res.data);
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  useEffect(() => {
    fetchOpportunities();
    fetchTasks();
    fetchUsers();
    fetchCurrentUser();
  }, [searchTerm]);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return tasks;
    const sorted = [...tasks].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === "toBeClosedBy" || sortConfig.key === "assignedOn" || sortConfig.key === "fromDate" || sortConfig.key === "toDate") {
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
    if (!window.confirm("Are you sure you want to delete this ticket? All related scheduled tickets will be deleted.")) {
      return;
    }
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

  const handleDateClick = ({ date }) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    setShowCreateModal({ toBeClosedBy: dateStr + "T09:00", fromDate: dateStr + "T09:00" });
  };

  const handleEventClick = ({ event }) => {
    setShowCreateModal({ ...event.extendedProps.task, isEditing: event.extendedProps.task.isEditing || true });
  };

  const handleRefresh = () => {
    fetchTasks();
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-GB");
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 p-6">
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-purple-700">
        Task Management
      </h1>
      <div className="flex flex-col gap-4">
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <div className="flex flex-col gap-2">
          <ToggleViewButtons viewMode={viewMode} setViewMode={setViewMode} />
          {viewMode === "list" && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setSubView("opportunity")}
                className={`px-4 py-2 rounded text-sm ${subView === "opportunity" ? "bg-purple-600 text-white" : "bg-gray-200"}`}
              >
                Opportunity Status
              </button>
              <button
                onClick={() => setSubView("tickets")}
                className={`px-4 py-2 rounded text-sm ${subView === "tickets" ? "bg-purple-600 text-white" : "bg-gray-200"}`}
              >
                Tickets Management
              </button>
            </div>
          )}
        </div>
        {viewMode === "list" && subView === "opportunity" && (
          <OpportunityStatusTable
            opportunities={opportunities}
            formatDate={formatDate}
            handleSort={handleSort}
            sortConfig={sortConfig}
          />
        )}
        {viewMode === "list" && subView === "tickets" && (
          <div>
            <button
              onClick={() => setShowCreateModal({})}
              className="bg-green-500 text-white px-4 py-2 rounded mb-4"
            >
              Generate Ticket
            </button>
            <TicketsTable
              tasks={sortedData}
              formatDate={formatDate}
              handleSort={handleSort}
              sortConfig={sortConfig}
              onReopen={(task) => setShowCreateModal({ ...task, isEditing: true })}
              onDelete={handleDeleteTicket}
              isSuperAdmin={isSuperAdmin}
            />
          </div>
        )}
        {viewMode === "calendar" && (
          <TaskCalendar
            isSuperAdmin={isSuperAdmin}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            onRefresh={handleRefresh}
          />
        )}
      </div>
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(null)}
          onSubmit={handleCreateTicket}
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

export default TaskManager;