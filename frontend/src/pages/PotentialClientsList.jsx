// client/src/pages/ManagePotentialClients.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import FilterPanel     from "../components/potentialclientsList/FilterPanel.jsx";
import ToggleButtons   from "../components/potentialclientsList/ToggleButtons.jsx";
import PotentialClientTable from "../components/potentialclientsList/PotentialClientTable.jsx";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ManagePotentialClients() {
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? "all" : "my");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterVals, setFilterVals] = useState({
    companyName: "",
    clientName: "",
    designation: "",
    source: "",
    mobile: "",
    email: "",
    location: ""
  });
  const [data, setData] = useState({ my: [], team: [], all: [] });

  const fetchData = async () => {
    try {
      const qs = q => `?filter=${q}&searchTerm=${encodeURIComponent(searchTerm)}`;
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const [myRes, teamRes, allRes] = await Promise.all([
        axios.get(`${BACKEND}/api/admin/potential-clients${qs("my")}`, { headers }),
        axios.get(`${BACKEND}/api/admin/potential-clients${qs("team")}`, { headers }),
        isSuperAdmin
          ? axios.get(`${BACKEND}/api/admin/potential-clients${qs("all")}`, { headers })
          : Promise.resolve({ data: [] })
      ]);
      setData({
        my: myRes.data,
        team: teamRes.data,
        all: allRes.data
      });
    } catch (err) {
      console.error("Error fetching potential clients:", err);
    }
  };

  // ❌ This was causing the error because fetchData() returns a Promise.
  // useEffect(fetchData, [activeTab, searchTerm, isSuperAdmin]);

  // ✅ Wrap in a function so nothing is returned
  useEffect(() => {
    fetchData();
  }, [activeTab, searchTerm, isSuperAdmin]);

  // Client-side filtering
  const applyFilters = list =>
    list.filter(pc => {
      return (
        (!filterVals.companyName ||
          pc.companyName.toLowerCase().includes(filterVals.companyName.toLowerCase())) &&
        (!filterVals.clientName ||
          pc.contacts.some(c =>
            c.clientName.toLowerCase().includes(filterVals.clientName.toLowerCase())
          )) &&
        (!filterVals.designation ||
          pc.contacts.some(c =>
            c.designation.toLowerCase().includes(filterVals.designation.toLowerCase())
          )) &&
        (!filterVals.source ||
          pc.contacts.some(c =>
            c.source.toLowerCase().includes(filterVals.source.toLowerCase())
          )) &&
        (!filterVals.mobile ||
          pc.contacts.some(c =>
            c.mobile.toLowerCase().includes(filterVals.mobile.toLowerCase())
          )) &&
        (!filterVals.email ||
          pc.contacts.some(c =>
            c.email.toLowerCase().includes(filterVals.email.toLowerCase())
          )) &&
        (!filterVals.location ||
          pc.contacts.some(c =>
            c.location.toLowerCase().includes(filterVals.location.toLowerCase())
          ))
      );
    });

  const displayed = applyFilters(data[activeTab]);

  return (
    <div className="p-6">
      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
        <input
          type="text"
          placeholder="Search potential clients..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border p-2 rounded flex-grow text-sm"
        />
        <button
          onClick={() => setShowFilters(f => !f)}
          className="ml-2 px-3 py-1 border rounded text-sm"
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {showFilters && (
        <FilterPanel
          filterVals={filterVals}
          setFilterVals={setFilterVals}
        />
      )}

      {/* Toggle Tabs */}
      <div className="my-4">
        <ToggleButtons
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSuperAdmin={isSuperAdmin}
        />
      </div>

      {/* Table */}
      <PotentialClientTable data={displayed} />
    </div>
  );
}
