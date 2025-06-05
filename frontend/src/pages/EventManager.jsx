// client/src/pages/EventManager.jsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import ToggleButtons from "../components/potentialclientsList/ToggleButtons.jsx";
import EventTable from "../components/event/EventTable.jsx";
import AddEventModal from "../components/event/AddEventModal.jsx";
import FullScheduleModal from "../components/event/FullScheduleModal.jsx";
const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function EventManager() {
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? "all" : "my");
  const [data, setData] = useState({ my: [], team: [], all: [] });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showSchedModal, setShowSchedModal] = useState(false);
  const [schedToView, setSchedToView] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // header sort & filter state
  const [sort, setSort] = useState({ field: "", dir: "asc" });
  const toggleSort = (field) => {
    setSort(s => ({
      field,
      dir: s.field === field && s.dir === "asc" ? "desc" : "asc"
    }));
  };
  const [headerFilters, setHeaderFilters] = useState({
    client: "",
    scheduledOn: "",
    action: "",
    discussion: "",
    status: ""
  });
  const handleHeaderFilter = (field, val) =>
    setHeaderFilters(h => ({ ...h, [field]: val }));

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const qs = f => `?filter=${f}`;
      const [myRes, teamRes, allRes] = await Promise.all([
        axios.get(`${BACKEND}/api/admin/events${qs("my")}`, { headers }),
        axios.get(`${BACKEND}/api/admin/events${qs("team")}`, { headers }),
        isSuperAdmin
          ? axios.get(`${BACKEND}/api/admin/events${qs("all")}`, { headers })
          : Promise.resolve({ data: [] })
      ]);
      setData({ my: myRes.data, team: teamRes.data, all: allRes.data });
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, isSuperAdmin]);

  const handleViewFull = schedules => {
    setSchedToView(schedules);
    setShowSchedModal(true);
  };

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return data[activeTab];
    return data[activeTab].filter(event => {
      const query = searchQuery.toLowerCase();
      return (
        (event.potentialClientName || "").toLowerCase().includes(query) ||
        (event.latest?.action || "").toLowerCase().includes(query) ||
        (event.latest?.status || "").toLowerCase().includes(query) ||
        (event.latest?.discussion || "").toLowerCase().includes(query)
      );
    });
  }, [data, activeTab, searchQuery]);

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
        <button
          onClick={() => { setEditing(null); setShowAddModal(true); }}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm"
        >
          + Add Event
        </button>
        <ToggleButtons
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSuperAdmin={isSuperAdmin}
        />
      </div>

      {/* New search bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      {showAddModal && (
        <AddEventModal
          ev={editing}
          isSuperAdmin={isSuperAdmin}
          onClose={() => {
            setShowAddModal(false);
            setEditing(null);
            fetchData();
          }}
        />
      )}

      <EventTable
        data={filteredData}
        onEdit={e => { setEditing(e); setShowAddModal(true); }}
        onDelete={fetchData}
        onViewFull={handleViewFull}
        sortField={sort.field}
        sortOrder={sort.dir}
        toggleSort={toggleSort}
        headerFilters={headerFilters}
        onHeaderFilter={handleHeaderFilter}
      />

      {showSchedModal && (
        <FullScheduleModal
          schedules={schedToView}
          onClose={() => setShowSchedModal(false)}
        />
      )}
    </div>
  );
}
