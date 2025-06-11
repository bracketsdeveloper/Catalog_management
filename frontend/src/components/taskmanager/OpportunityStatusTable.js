import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

function OpportunityStatusTable({ opportunities, formatDate, handleSort, sortConfig }) {
  console.log("OpportunityStatusTable received opportunities:", opportunities);
  const [latestLogs, setLatestLogs] = useState({});

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  useEffect(() => {
    if (opportunities.length === 0) return;

    const opportunityIds = opportunities.map((opp) => opp._id);
    axios
      .post(
        `${BACKEND_URL}/api/admin/opportunities/logs/latest`,
        { opportunityIds },
        { headers: getAuthHeaders() }
      )
      .then((res) => {
        console.log("Latest logs fetched:", res.data);
        setLatestLogs(res.data);
      })
      .catch((err) => {
        console.error("Error fetching latest logs:", err);
        setLatestLogs({});
      });
  }, [opportunities]);

  const headers = [
    { key: "opportunityCode", label: "Opp #" },
    { key: "account", label: "Company Name" },
    { key: "opportunityName", label: "Event Name" },
    { key: "opportunityStage", label: "Stage" },
    { key: "lastWorkedOn", label: "Last Worked On" },
  ];

  const getLogMessage = (log) => {
    if (!log || !log.performedBy) return "-";
    const username = log.performedBy.name || "Unknown";
    const field = log.field || "unknown field";
    const newValue = log.newValue !== undefined ? JSON.stringify(log.newValue) : "unknown value";
    const dateTime = formatDate(log.performedAt);
    return `${username} updated on ${dateTime}`;
  };

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {headers.map((h) => (
            <th
              key={h.key}
              onClick={() => handleSort(h.key)}
              className="border p-2 cursor-pointer text-left"
            >
              {h.label} {sortConfig.key === h.key ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {opportunities.length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="border p-2 text-center">
              No opportunities found
            </td>
          </tr>
        ) : (
          opportunities.map((opp) => {
            const latestLog = latestLogs[opp._id] || {};
            return (
              <tr key={opp._id}>
                <td className="border p-2">{opp.opportunityCode || "-"}</td>
                <td className="border p-2">{opp.account || "-"}</td>
                <td className="border p-2">{opp.opportunityName || "-"}</td>
                <td className="border p-2">{opp.opportunityStage || "-"}</td>
                <td className="border p-2">
                  {latestLog.performedBy ? getLogMessage(latestLog) : formatDate(opp.createdAt)}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

export default OpportunityStatusTable;