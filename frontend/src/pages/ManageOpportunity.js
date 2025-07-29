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

function SkeletonLoader() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-gray-700 border-b border-gray-200">
        <thead className="bg-gray-50 border-b text-gray-500 uppercase sticky top-0 z-10">
          <tr>
            {[
              "Opportunity Code",
              "Created Date",
              "Account",
              "Company Contact",
              "Opportunity Name",
              "Owner",
              "Value",
              "Closure Date",
              "Stage",
              "Status",
              "Latest Action",
              "Action",
            ].map((header) => (
              <th key={header} className="py-2 px-3 text-left">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="border-b">
              {[...Array(12)].map((_, cellIndex) => (
                <td key={cellIndex} className="py-2 px-3">
                  <div className="animate-pulse bg-gray-200 h-4 w-full rounded"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManageOpportunity() {
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  const canExportCRM = permissions.includes("crm-export");
  const canViewAllOpp = permissions.includes("viewallopp");
  const [activeTab, setActiveTab] = useState(
    isSuperAdmin || canViewAllOpp ? "all-opportunities" : "my-opportunities"
  );
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOpportunities, setTotalOpportunities] = useState(0);

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
      setLoading(true);
      setError(null);
      try {
        const params = {
          filter: activeTab === "my-opportunities" ? "my" : activeTab === "team-opportunities" ? "team" : undefined,
          searchTerm: searchTerm || undefined,
          page: currentPage,
          limit: 100,
          opportunityStage: filterCriteria.opportunityStage !== "All" ? filterCriteria.opportunityStage : undefined,
          closureFromDate: filterCriteria.closureFromDate || undefined,
          closureToDate: filterCriteria.closureToDate || undefined,
          createdFilter: filterCriteria.createdFilter !== "All" ? filterCriteria.createdFilter : undefined,
        };
        const res = await axios.get(`${BACKEND_URL}/api/admin/opportunities-pages`, {
          headers: getAuthHeaders(),
          params,
          timeout: 30000, // Added to prevent 504
        });
        setOpportunities(res.data.opportunities);
        setTotalPages(res.data.totalPages);
        setTotalOpportunities(res.data.totalOpportunities);
      } catch (error) {
        console.error("Error fetching opportunities:", error);
        setError("Failed to fetch opportunities");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, searchTerm, filterCriteria, currentPage, isSuperAdmin, canViewAllOpp]);

  useEffect(() => {
    if (opportunities.length > 0) {
      fetchLatestActions(opportunities.map((op) => op._id));
    } else {
      setLatestActions({});
    }
  }, [opportunities]);

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

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return opportunities;
    const sorted = [...opportunities].sort((a, b) => {
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
  }, [opportunities, sortConfig]);

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
      setOpportunities((prev) =>
        prev.map((op) => (op._id === draggableId ? { ...op, ...updatedOpportunity } : op))
      );
    } catch (err) {
      console.error("Error updating stage/status:", err);
    }
  };

  const exportToExcel = async () => {
    try {
      const params = {
        filter: activeTab === "my-opportunities" ? "my" : activeTab === "team-opportunities" ? "team" : undefined,
        searchTerm: searchTerm || undefined,
        opportunityStage: filterCriteria.opportunityStage !== "All" ? filterCriteria.opportunityStage : undefined,
        closureFromDate: filterCriteria.closureFromDate || undefined,
        closureToDate: filterCriteria.closureToDate || undefined,
        createdFilter: filterCriteria.createdFilter !== "All" ? filterCriteria.createdFilter : undefined,
      };
      const res = await axios.get(`${BACKEND_URL}/api/admin/opportunities-export`, {
        headers: getAuthHeaders(),
        params,
        timeout: 60000, // Increased timeout for larger data
      });
      const exportData = res.data.opportunities.map((op) => {
        const latestAction = latestActions[op._id] || {};
        return {
          opportunityCode: op.opportunityCode,
          createdDate: formatCreatedDate(op.createdAt),
          account: op.account,
          opportunityName: op.opportunityName,
          OpportunityDetails: op.opportunityDetail,
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
      XLSX.writeFile(wb, "OpportunitiesData.xlsx");
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Excel export failed");
    }
  };

  const renderPagination = () => (
    <div className="flex justify-center items-center mt-4 space-x-2">
      <button
        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        disabled={currentPage === 1 || loading}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Previous
      </button>
      <span>
        Page {currentPage} of {totalPages} (Total: {totalOpportunities})
      </span>
      <button
        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages || loading}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-800 p-4">
      <Breadcrumb />
      <div className="flex items-center justify-between mb-4">
        <OpportunityTabs
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setCurrentPage(1); // Reset to first page on tab change
          }}
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
          <SearchBar
            searchTerm={searchTerm}
            setSearchTerm={(term) => {
              setSearchTerm(term);
              setCurrentPage(1); // Reset to first page on search
            }}
          />
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="border border-gray-300 bg-white rounded px-3 py-1 text-sm font-medium hover:bg-gray-100"
          >
            {showFilter ? "Hide Filters" : "Add Filter"}
          </button>
          <ToggleButtons viewMode={viewMode} setViewMode={setViewMode} />
          {(isSuperAdmin || canExportCRM) && (
            <button
              onClick={exportToExcel}
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
            setCurrentPage(1); // Reset to first page on filter change
          }}
          setShowFilter={setShowFilter}
          stages={stages}
        />
      )}
      <div className="border-t border-gray-200 mt-4">
        {loading ? (
          <SkeletonLoader />
        ) : error ? (
          <div className="p-4 text-red-600">{error}</div>
        ) : viewMode === "list" ? (
          <>
            <OpportunityTable
              data={sortedData}
              formatClosureDate={formatClosureDate}
              formatCreatedDate={formatCreatedDate}
              handleSort={handleSort}
              sortConfig={sortConfig}
              latestActions={latestActions}
            />
            {renderPagination()}
          </>
        ) : (
          <>
            <KanbanView
              data={sortedData}
              stages={stages}
              formatClosureDate={formatClosureDate}
              handleDragEnd={handleDragEnd}
            />
            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
}

export default ManageOpportunity;