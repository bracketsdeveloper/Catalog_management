import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Breadcrumb from "../components/manageopportunities/Breadcrumb";
import OpportunityTabs from "../components/manageopportunities/OpportunityTabs";
import SearchBar from "../components/manageopportunities/SearchBar";
import ToggleButtons from "../components/manageopportunities/ToggleButtons";
import FilterPanel from "../components/manageopportunities/FilterPanel";
import OpportunityTable from "../components/manageopportunities/OpportunityTable";
import KanbanView from "../components/manageopportunities/KanbanView";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

// Helper: return auth headers
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

// Helper: Format closure date as dd/mm/yyyy
function formatClosureDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB");
}

// For color-coding logs by action
function getDotColor(action) {
  switch (action) {
    case "create":
      return "bg-green-500";
    case "update":
      return "bg-orange-500";
    case "delete":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

export default function ManageOpportunity() {
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const [activeTab, setActiveTab] = useState(
    isSuperAdmin ? "all-opportunities" : "my-opportunities"
  );

  const [myOpportunities, setMyOpportunities] = useState([]);
  const [teamOpportunities, setTeamOpportunities] = useState([]);
  const [allOpportunities, setAllOpportunities] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState({
    opportunityStage: "All",
    closureFromDate: "",
    closureToDate: "",
    createdFilter: "All",
  });
  const [viewMode, setViewMode] = useState("list");

  // Logs dropdown state
  const [showLogsDropdown, setShowLogsDropdown] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [allLogs, setAllLogs] = useState([]);

  // Define stages for Kanban view & filtering
  const stages = [
    "Lead",
    "Qualified",
    "Proposal Sent",
    "Negotiation",
    "Commit",
    "Won/Lost/Discontinued",
  ];

  // -----------------------------
  // Fetch opportunities on mount
  // -----------------------------
  useEffect(() => {
    fetchMyOpportunities();
    fetchTeamOpportunities();
    if (isSuperAdmin) {
      fetchAllOpportunities();
    }
  }, [isSuperAdmin]);

  async function fetchMyOpportunities() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/opportunities?filter=my`, {
        headers: getAuthHeaders(),
      });
      setMyOpportunities(res.data || []);
    } catch (error) {
      console.error("Error fetching my opportunities:", error);
    }
  }

  async function fetchTeamOpportunities() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/opportunities?filter=team`, {
        headers: getAuthHeaders(),
      });
      setTeamOpportunities(res.data || []);
    } catch (error) {
      console.error("Error fetching team opportunities:", error);
    }
  }

  async function fetchAllOpportunities() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/opportunities`, {
        headers: getAuthHeaders(),
      });
      setAllOpportunities(res.data || []);
    } catch (error) {
      console.error("Error fetching all opportunities:", error);
    }
  }

  // ----------------------------
  // Fetch all logs (aggregated)
  // ----------------------------
  async function fetchAllLogs() {
    try {
      setLogsLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/admin/opportunities/logs`, {
        headers: getAuthHeaders(),
      });
      setAllLogs(res.data.logs || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLogsLoading(false);
    }
  }

  const handleLogsMouseEnter = () => {
    setShowLogsDropdown(true);
    fetchAllLogs();
  };

  const handleLogsMouseLeave = () => {
    setShowLogsDropdown(false);
  };

  // Helper: return all opportunities based on active tab
  function getAllData() {
    if (activeTab === "my-opportunities") return myOpportunities;
    if (activeTab === "team-opportunities") return teamOpportunities;
    if (activeTab === "all-opportunities") return allOpportunities;
    return [];
  }

  // -----------------------------------
  // Filter data based on search & forms
  // -----------------------------------
  function getFilteredData() {
    const lowerTerm = searchTerm.toLowerCase();
    let data = getAllData();

    // Search filter
    data = data.filter((op) => {
      const combined = [
        op.opportunityCode,
        op.account,
        op.opportunityName,
        op.opportunityStage,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return combined.includes(lowerTerm);
    });

    // Opportunity Stage filter (if not "All")
    if (filterCriteria.opportunityStage && filterCriteria.opportunityStage !== "All") {
      data = data.filter((op) => op.opportunityStage === filterCriteria.opportunityStage);
    }

    // Closure From/To
    if (filterCriteria.closureFromDate) {
      const fromDate = new Date(filterCriteria.closureFromDate);
      data = data.filter((op) => new Date(op.closureDate) >= fromDate);
    }
    if (filterCriteria.closureToDate) {
      const toDate = new Date(filterCriteria.closureToDate);
      data = data.filter((op) => new Date(op.closureDate) <= toDate);
    }

    // Created Filter
    if (filterCriteria.createdFilter && filterCriteria.createdFilter !== "All") {
      const now = new Date();
      let start, end;
      switch (filterCriteria.createdFilter) {
        case "Today":
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = new Date(start);
          end.setDate(end.getDate() + 1);
          break;
        case "Yesterday":
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          start = new Date(end);
          start.setDate(start.getDate() - 1);
          break;
        case "This Week":
          start = new Date(now);
          start.setDate(now.getDate() - now.getDay());
          end = new Date(start);
          end.setDate(end.getDate() + 7);
          break;
        case "Last Week":
          end = new Date(now);
          end.setDate(now.getDate() - now.getDay());
          start = new Date(end);
          start.setDate(start.getDate() - 7);
          break;
        case "This Month":
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case "Last Month":
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          end = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "This Year":
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear() + 1, 0, 1);
          break;
        case "Last Year":
          start = new Date(now.getFullYear() - 1, 0, 1);
          end = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          break;
      }
      if (start && end) {
        data = data.filter((op) => {
          const created = new Date(op.createdAt);
          return created >= start && created < end;
        });
      }
    }

    return data;
  }

  // Handle filter panel changes
  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilterCriteria((prev) => ({ ...prev, [name]: value }));
  }

  // Render filter panel
  function renderFilterPanel() {
    return (
      <FilterPanel
        filterCriteria={filterCriteria}
        handleFilterChange={handleFilterChange}
        setShowFilter={setShowFilter}
        stages={stages}
      />
    );
  }

  // Kanban drag end
  async function handleDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const newStage = destination.droppableId;
    try {
      await axios.put(
        `${BACKEND_URL}/api/admin/opportunities/${draggableId}`,
        { opportunityStage: newStage },
        { headers: getAuthHeaders() }
      );
      // Refresh data after drag
      if (activeTab === "my-opportunities") {
        fetchMyOpportunities();
      } else if (activeTab === "team-opportunities") {
        fetchTeamOpportunities();
      } else if (activeTab === "all-opportunities") {
        fetchAllOpportunities();
      }
    } catch (err) {
      console.error("Error updating stage:", err);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 p-4">
      <Breadcrumb />

      <div className="flex items-center justify-between mb-4">
        <OpportunityTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSuperAdmin={isSuperAdmin}
        />

        <div className="flex items-center space-x-2">
          {/* Single Logs button with hover dropdown */}
          <div
            className="relative"
            onMouseEnter={handleLogsMouseEnter}
            onMouseLeave={handleLogsMouseLeave}
          >
            <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
              Logs
            </button>
            {showLogsDropdown && (
              <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto bg-white border border-gray-300 rounded shadow-md z-50 p-2">
                {logsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : allLogs.length > 0 ? (
                  allLogs.map((log, idx) => {
                    const dotColor = getDotColor(log.action);
                    return (
                      <div
                        key={idx}
                        className="p-2 mb-2 border-b last:border-b-0 text-sm text-gray-700"
                      >
                        {/* Action + Dot + Field */}
                        <div className="flex items-center space-x-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`}></span>
                          <span className="font-semibold capitalize">{log.action}</span>
                          {log.field && (
                            <span className="text-xs text-gray-400 ml-2">
                              {log.field}
                            </span>
                          )}
                        </div>

                        {/* Date/Time + OpportunityName */}
                        <div className="text-xs text-gray-500">
                          {new Date(log.performedAt).toLocaleString()} 
                          {" | "}
                          Opportunity: {log.opportunityName || "N/A"}
                        </div>

                        {/* If you store performedBy as an ObjectId, you'll need to populate or store user name differently */}
                        {/* Old/New Values */}
                        {log.oldValue !== undefined && (
                          <div className="mt-1 text-xs">
                            <strong>Old:</strong>{" "}
                            {typeof log.oldValue === "object"
                              ? JSON.stringify(log.oldValue)
                              : String(log.oldValue)}
                          </div>
                        )}
                        {log.newValue !== undefined && (
                          <div className="text-xs">
                            <strong>New:</strong>{" "}
                            {typeof log.newValue === "object"
                              ? JSON.stringify(log.newValue)
                              : String(log.newValue)}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 py-2">No logs found</div>
                )}
              </div>
            )}
          </div>

          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <button
            onClick={() => setShowFilter((prev) => !prev)}
            className="border border-gray-300 bg-white rounded px-3 py-1 text-sm font-medium hover:bg-gray-100"
          >
            Add Filter
          </button>

          <ToggleButtons viewMode={viewMode} setViewMode={setViewMode} />

          <Link
            to="/admin-dashboard/create-opportunity"
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-md p-2 focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 inline-block"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>
      </div>

      {showFilter && renderFilterPanel()}

      <div className="border-t border-gray-300 mt-4">
        {viewMode === "list" ? (
          <OpportunityTable data={getFilteredData()} formatClosureDate={formatClosureDate} />
        ) : (
          <KanbanView
            data={getFilteredData()}
            stages={stages}
            formatClosureDate={formatClosureDate}
            handleDragEnd={handleDragEnd}
          />
        )}
      </div>
    </div>
  );
}
