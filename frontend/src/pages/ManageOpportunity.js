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

// ADDED FOR EXCEL EXPORT
import * as XLSX from "xlsx";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

function formatClosureDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB");
}

function getDotColor(action) {
  switch (action) {
    case "create":
      return "bg-green-300";
    case "update":
      return "bg-orange-300";
    case "delete":
      return "bg-red-300";
    default:
      return "bg-gray-500";
  }
}

// ADDED FOR EXCEL EXPORT
function exportToExcel(data, fileName = "OpportunitiesData.xlsx") {
  // Convert each opportunity into a flat JSON object for your spreadsheet
  const exportData = data.map((opportunity) => ({
    opportunityCode: opportunity.opportunityCode,
    opportunityName: opportunity.opportunityName,
    account: opportunity.account,
    contact: opportunity.contact,
    opportunityType: opportunity.opportunityType,
    opportunityStage: opportunity.opportunityStage,
    opportunityStatus: opportunity.opportunityStatus,
    opportunityDetail: opportunity.opportunityDetail,
    opportunityValue: opportunity.opportunityValue,
    currency: opportunity.currency,
    leadSource: opportunity.leadSource,
    closureDate: formatClosureDate(opportunity.closureDate),
    closureProbability: opportunity.closureProbability,
    grossProfit: opportunity.grossProfit,
    opportunityPriority: opportunity.opportunityPriority,
    isRecurring: opportunity.isRecurring,
    dealRegistrationNumber: opportunity.dealRegistrationNumber,
    freeTextField: opportunity.freeTextField,
    opportunityOwner: opportunity.opportunityOwner,
    isActive: opportunity.isActive,
    createdBy: opportunity.createdBy,
    createdAt: opportunity.createdAt,
    // ...Add or remove fields as needed.
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Opportunities");
  XLSX.writeFile(workbook, fileName);
}

export default function ManageOpportunity() {
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const [activeTab, setActiveTab] = useState(
    isSuperAdmin ? "all-opportunities" : "my-opportunities"
  );

  const [opportunities, setOpportunities] = useState({
    my: [],
    team: [],
    all: [],
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState({
    opportunityStage: "All",
    closureFromDate: "",
    closureToDate: "",
    createdFilter: "All",
  });

  const [viewMode, setViewMode] = useState("list");
  const [logs, setLogs] = useState({
    show: false,
    data: [],
    loading: false,
  });

  const stages = [
    "Lead",
    "Qualified",
    "Proposal Sent",
    "Negotiation",
    "Commit",
    "Won/Lost/Discontinued",
  ];

  // Fetch data based on active tab
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

        if (isSuperAdmin) {
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
        console.log("API Responses:", { myRes, teamRes, allRes });

        setOpportunities((prev) => ({
          ...prev,
          my: myRes.data || [],
          team: teamRes.data || [],
          all: isSuperAdmin ? allRes?.data || [] : [],
        }));
      } catch (error) {
        console.error("Error fetching opportunities:", error);
      }
    };

    fetchData();
  }, [activeTab, isSuperAdmin, searchTerm]);

  // Fetch logs when dropdown is shown
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

  // Filter the data based on filterCriteria (no local search)
  const getFilteredData = () => {
    let data = [...getActiveData()];

    // Stage filter
    if (filterCriteria.opportunityStage && filterCriteria.opportunityStage !== "All") {
      data = data.filter((op) => op.opportunityStage === filterCriteria.opportunityStage);
    }

    // Date range filter
    if (filterCriteria.closureFromDate) {
      const fromDate = new Date(filterCriteria.closureFromDate);
      data = data.filter((op) => new Date(op.closureDate) >= fromDate);
    }
    if (filterCriteria.closureToDate) {
      const toDate = new Date(filterCriteria.closureToDate);
      data = data.filter((op) => new Date(op.closureDate) <= toDate);
    }

    // Created time period filter
    if (filterCriteria.createdFilter && filterCriteria.createdFilter !== "All") {
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

  // Updated drag handler that uses the server's returned updated opportunity.
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    // Determine update payload based on destination.
    let updatePayload = {};
    if (["Won", "Lost", "Discontinued"].includes(destination.droppableId)) {
      updatePayload = {
        opportunityStage: "Won/Lost/Discontinued",
        opportunityStatus: destination.droppableId,
      };
    } else {
      updatePayload = { opportunityStage: destination.droppableId };
    }

    console.log("Updating card", draggableId, "with payload", updatePayload);

    try {
      // Perform the API request and get the updated opportunity from the server.
      const response = await axios.put(
        `${BACKEND_URL}/api/admin/opportunities/${draggableId}`,
        updatePayload,
        { headers: getAuthHeaders() }
      );

      const updatedOpportunity = response.data.opportunity;
      if (!updatedOpportunity) {
        console.error("No updated opportunity returned from server");
        return;
      }

      // Update the local state using the returned updated opportunity object.
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
          {/* Logs dropdown */}
          <div className="relative">
            <button
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
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
                          className={`inline-block w-2 h-2 rounded-full ${getDotColor(
                            log.action
                          )}`}
                        ></span>
                        <span className="font-semibold capitalize">
                          {log.action}
                        </span>
                        {log.field && (
                          <span className="text-xs text-gray-400 ml-2">
                            {log.field}
                          </span>
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
                  <div className="text-center text-gray-500 py-2">
                    No logs found
                  </div>
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

          {/* ADDED FOR EXCEL EXPORT */}
          <button
            onClick={() => exportToExcel(getFilteredData())}
            className="border border-green-500 text-green-700 bg-white rounded px-3 py-1 text-sm font-medium hover:bg-green-50"
          >
            Export to Excel
          </button>

          <Link
            to="/admin-dashboard/create-opportunity"
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-md p-2 focus:outline-none"
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
