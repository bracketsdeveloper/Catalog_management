import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Breadcrumb from "../components/manageopportunities/Breadcrumb";
import OpportunityTabs from "../components/manageopportunities/OpportunityTabs";
import SearchBar from "../components/manageopportunities/SearchBar";
import ToggleButtons from "../components/manageopportunities/ToggleButtons";
import FilterPanel from "../components/manageopportunities/FilterPanel";
import OpportunityTable from "../components/manageopportunities/OpportunityTable";
import KanbanView from "../components/manageopportunities/KanbanView";
import * as XLSX from "xlsx";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

function formatClosureDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB");
}

function ManageOpportunity() {
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  const canExportCRM = permissions.includes("crm-export");
  const canViewAllOpp = permissions.includes("viewallopp");
  const [activeTab, setActiveTab] = useState(
    isSuperAdmin || canViewAllOpp ? "all-opportunities" : "my-opportunities"
  );
  const [opportunities, setOpportunities] = useState({ my: [], team: [], all: [] });
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState({
    opportunityStage: "All",
    closureFromDate: "",
    closureToDate: "",
    createdFilter: "All",
  });
  const [viewMode, setViewMode] = useState("list");
  const [logs, setLogs] = useState({ show: false, data: [], loading: false });
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "" });
  const [latestActions, setLatestActions] = useState({});

  const stages = [
    "Lead",
    "Qualified",
    "Proposal Sent",
    "Negotiation",
    "Commit",
    "Won/Lost/Discontinued",
  ];

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "";
    }
    setSortConfig({ key, direction });
  };

  const formatCreatedDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const requests = [
          axios.get(
            `${BACKEND_URL}/api/admin/opportunities?filter=my${
              searchTerm ? `&searchTerm=${encodeURIComponent(searchTerm)}` : ""
            }`,
            { headers: getAuthHeaders() }
          ),
          axios.get(
            `${BACKEND_URL}/api/admin/opportunities?filter=team${
              searchTerm ? `&searchTerm=${encodeURIComponent(searchTerm)}` : ""
            }`,
            { headers: getAuthHeaders() }
          ),
        ];
        if (isSuperAdmin || canViewAllOpp) {
          requests.push(
            axios.get(
              `${BACKEND_URL}/api/admin/opportunities${
                searchTerm ? `?searchTerm=${encodeURIComponent(searchTerm)}` : ""
              }`,
              { headers: getAuthHeaders() }
            )
          );
        }
        const [myRes, teamRes, allRes] = await Promise.all(requests);
        setOpportunities({
          my: myRes.data || [],
          team: teamRes.data || [],
          all: isSuperAdmin || canViewAllOpp ? allRes?.data || [] : [],
        });
      } catch (error) {
        console.error("Error fetching opportunities:", error);
      }
    };
    fetchData();
  }, [activeTab, isSuperAdmin, canViewAllOpp, searchTerm]);

  useEffect(() => {
    const activeData = getActiveData();
    if (activeData.length > 0) {
      fetchLatestActions(activeData.map((op) => op._id));
    } else {
      setLatestActions({});
    }
  }, [opportunities, activeTab]);

  const fetchLatestActions = async (opportunityIds) => {
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/admin/opportunities/logs/latest`,
        { opportunityIds },
        { headers: getAuthHeaders() }
      );
      setLatestActions(res.data);
    } catch (err) {
      console.error("Error fetching latest actions:", err);
      setLatestActions({});
    }
  };

  const fetchAllLogs = async () => {
    try {
      setLogs((prev) => ({ ...prev, loading: true }));
      const res = await axios.get(`${BACKEND_URL}/api/admin/opportunities/logs`, {
        headers: getAuthHeaders(),
      });
      setLogs((prev) => ({ ...prev, data: res.data.logs || [] }));
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLogs((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleLogsToggle = (show) => {
    setLogs((prev) => ({ ...prev, show }));
    if (show) fetchAllLogs();
  };

  const getActiveData = () => {
    switch (activeTab) {
      case "my-opportunities":
        return opportunities.my;
      case "team-opportunities":
        return opportunities.team;
      case "all-opportunities":
        return opportunities.all;
      default:
        return [];
    }
  };

  const getFilteredData = () => {
    let data = [...getActiveData()];
    if (filterCriteria.opportunityStage !== "All") {
      data = data.filter((op) => op.opportunityStage === filterCriteria.opportunityStage);
    }
    if (filterCriteria.closureFromDate) {
      const from = new Date(filterCriteria.closureFromDate);
      data = data.filter((op) => new Date(op.closureDate) >= from);
    }
    if (filterCriteria.closureToDate) {
      const to = new Date(filterCriteria.closureToDate);
      data = data.filter((op) => new Date(op.closureDate) <= to);
    }
    if (filterCriteria.createdFilter !== "All") {
      const now = new Date();
      let start, end;
      switch (filterCriteria.createdFilter) {
        case "Today":
          start = new Date(now.setHours(0, 0, 0, 0));
          end = new Date(start);
          end.setDate(end.getDate() + 1);
          break;
        case "Yesterday":
          end = new Date(now.setHours(0, 0, 0, 0));
          start = new Date(end);
          start.setDate(start.getDate() - 1);
          break;
        case "This Week":
          start = new Date(now.setDate(now.getDate() - now.getDay()));
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setDate(start.getDate() + 7);
          break;
        case "Last Week":
          end = new Date(now.setDate(now.getDate() - now.getDay()));
          end.setHours(0, 0, 0, 0);
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
  };

  const filteredData = getFilteredData();
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === "closureDate" || sortConfig.key === "createdAt") {
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
  }, [filteredData, sortConfig]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    let updatePayload = {};
    if (["Won", "Lost", "Discontinued"].includes(destination.droppableId)) {
      updatePayload = {
        opportunityStage: "Won/Lost/Discontinued",
        opportunityStatus: destination.droppableId,
      };
    } else {
      updatePayload = { opportunityStage: destination.droppableId };
    }
    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/admin/opportunities/${draggableId}`,
        updatePayload,
        { headers: getAuthHeaders() }
      );
      const updatedOpportunity = response.data.opportunity;
      setOpportunities((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          updated[key] = updated[key].map((op) =>
            op._id === draggableId ? { ...op, ...updatedOpportunity } : op
          );
        });
        return updated;
      });
    } catch (err) {
      console.error("Error updating stage/status:", err);
    }
  };

  const exportToExcel = (data, fileName = "OpportunitiesData.xlsx") => {
    const exportData = data.map((op) => {
      const latestAction = latestActions[op._id] || {};
      return {
        opportunityCode: op.opportunityCode,
        createdDate: formatCreatedDate(op.createdAt),
        account: op.account,
        opportunityName: op.opportunityName,
        OpportunityDetails : op.opportunityDetail,
        opportunityOwner: op.opportunityOwner,
        opportunityValue: op.opportunityValue,
        closureDate: formatClosureDate(op.closureDate),
        opportunityStage: op.opportunityStage,
        opportunityStatus: op.opportunityStatus,
        latestAction: latestAction.action
          ? `${latestAction.action}${latestAction.field ? ` (${latestAction.field})` : ""} by ${
              latestAction.performedBy?.name || "N/A"
            } at ${
              latestAction.performedAt
                ? new Date(latestAction.performedAt).toLocaleString()
                : "Unknown date"
            }`
          : "No action recorded",
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Opportunities");
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 p-4">
      <Breadcrumb />
      <div className="flex items-center justify-between mb-4">
        <OpportunityTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSuperAdmin={isSuperAdmin}
          canViewAllOpp={canViewAllOpp}
        />
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              className="bg-[#66C3D0] text-white px-4 py-2 rounded"
              onMouseEnter={() => handleLogsToggle(true)}
              onMouseLeave={() => handleLogsToggle(false)}
            >
              Logs
            </button>
            {logs.show && (
              <div
                className="absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto bg-white border border-gray-300 rounded shadow-md z-50 p-2"
                onMouseEnter={() => handleLogsToggle(true)}
                onMouseLeave={() => handleLogsToggle(false)}
              >
                {logs.loading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : logs.data.length > 0 ? (
                  logs.data.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-2 mb-2 border-b last:border-b-0 text-sm text-gray-700"
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            log.action === "create"
                              ? "bg-green-300"
                              : log.action === "update"
                              ? "bg-orange-300"
                              : log.action === "delete"
                              ? "bg-red-300"
                              : "bg-gray-500"
                          }`}
                        ></span>
                        <span className="font-semibold capitalize">{log.action}</span>
                        {log.field && (
                          <span className="text-xs text-gray-400 ml-2">{log.field}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.performedAt).toLocaleString()} | Opportunity:{" "}
                        {log.opportunityName || "N/A"}
                      </div>
                      {log.oldValue !== undefined && (
                        <div className="mt-1 text-xs">
                          <strong>Old:</strong> {JSON.stringify(log.oldValue)}
                        </div>
                      )}
                      {log.newValue !== undefined && (
                        <div className="text-xs">
                          <strong>New:</strong> {JSON.stringify(log.newValue)}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-2">No logs found</div>
                )}
              </div>
            )}
          </div>
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="border border-gray-300 bg-white rounded px-3 py-1 text-sm font-medium hover:bg-gray-100"
          >
            {showFilter ? "Hide Filters" : "Add Filter"}
          </button>
          <ToggleButtons viewMode={viewMode} setViewMode={setViewMode} />
          {(isSuperAdmin || canExportCRM) && (
            <button
              onClick={() => exportToExcel(sortedData)}
              className="border border-green-500 text-green-700 bg-white rounded px-3 py-1 text-sm font-medium hover:bg-green-50"
            >
              Export to Excel
            </button>
          )}
          <Link
            to="/admin-dashboard/create-opportunity"
            className="bg-[#Ff8045] text-white rounded-md p-2 focus:outline-none"
            aria-label="Create new opportunity"
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
      {showFilter && (
        <FilterPanel
          filterCriteria={filterCriteria}
          handleFilterChange={(e) => {
            const { name, value } = e.target;
            setFilterCriteria((prev) => ({ ...prev, [name]: value }));
          }}
          setShowFilter={setShowFilter}
          stages={stages}
        />
      )}
      <div className="border-t border-gray-200 mt-4">
        {viewMode === "list" ? (
          <OpportunityTable
            data={sortedData}
            formatClosureDate={formatClosureDate}
            formatCreatedDate={formatCreatedDate}
            handleSort={handleSort}
            sortConfig={sortConfig}
            latestActions={latestActions}
          />
        ) : (
          <KanbanView
            data={sortedData}
            stages={stages}
            formatClosureDate={formatClosureDate}
            handleDragEnd={handleDragEnd}
          />
        )}
      </div>
    </div>
  );
}

export default ManageOpportunity;