// client/src/pages/ManagePotentialClients.jsx
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import SearchBar from "../components/manageopportunities/SearchBar.jsx";
import FilterPanel from "../components/potentialclientsList/FilterPanel.jsx";
import ToggleButtons from "../components/potentialclientsList/ToggleButtons.jsx";
import PotentialClientTable from "../components/potentialclientsList/PotentialClientTable.jsx";
import AddPotentialClientModal from "../components/followup/AddPotentialClientModal.jsx";
import BulkUploadPopup from "../components/potentialclientsList/bulkUploadcli.js";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ManagePotentialClients() {
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";

  // top‐level state
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

  // modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // fetch from server whenever tab/searchTerm changes
  const fetchData = async () => {
    try {
      const qs = q =>
        `?filter=${q}&searchTerm=${encodeURIComponent(searchTerm)}`;
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const [myRes, teamRes, allRes] = await Promise.all([
        axios.get(`${BACKEND}/api/admin/potential-clients${qs("my")}`, { headers }),
        axios.get(`${BACKEND}/api/admin/potential-clients${qs("team")}`, { headers }),
        isSuperAdmin
          ? axios.get(`${BACKEND}/api/admin/potential-clients${qs("all")}`, { headers })
          : Promise.resolve({ data: [] })
      ]);
      setData({ my: myRes.data, team: teamRes.data, all: allRes.data });
    } catch (err) {
      console.error("Error fetching potential clients:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, searchTerm, isSuperAdmin]);

  // apply additional field filters client-side
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
    <div className="p-6 bg-white min-h-screen">
      {/* Top controls: search + add/bulk */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <div className="flex space-x-2">
          <button
            onClick={() => { setEditing(null); setShowAddModal(true); }}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm"
          >
            + Add Potential Client
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="bg-[#Ff8045] text-white px-4 py-2 rounded text-sm"
          >
            Bulk Upload
          </button>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <AddPotentialClientModal
          pc={editing}
          onClose={() => {
            setShowAddModal(false);
            setEditing(null);
            fetchData();
          }}
        />
      )}

      {/* Bulk upload popup */}
      {showBulkModal && (
        <BulkUploadPopup
          visible={showBulkModal}
          onClose={() => setShowBulkModal(false)}
        />
      )}

      {/* Filter toggle */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowFilters(f => !f)}
          className="px-3 py-1 border rounded text-sm"
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>

        {/* My / Team / All toggles */}
        <ToggleButtons
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSuperAdmin={isSuperAdmin}
        />
      </div>

      {/* Field‐level filters */}
      {showFilters && (
        <FilterPanel
          filterVals={filterVals}
          setFilterVals={setFilterVals}
        />
      )}

      {/* Data table with header search + sort */}
      <PotentialClientTable
        data={displayed}
        onEdit={pc => {
          setEditing(pc);
          setShowAddModal(true);
        }}
        onDelete={fetchData}
      />
    </div>
  );
}
