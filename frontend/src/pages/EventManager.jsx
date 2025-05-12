// client/src/pages/EventManager.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import ToggleButtons          from "../components/potentialclientsList/ToggleButtons.jsx";
import EventTable             from "../components/event/EventTable.jsx";
import AddEventModal          from "../components/event/AddEventModal.jsx";
import FullScheduleModal      from "../components/event/FullScheduleModal.jsx";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function EventManager() {
  // determine if superadmin
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";

  // which “tab” is active: my / team / all
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? "all" : "my");

  // store fetched events by filter
  const [data, setData] = useState({
    my:   [],
    team: [],
    all:  []
  });

  // add/edit modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing,     setEditing]       = useState(null);

  // full-schedule view modal state
  const [showSchedModal, setShowSchedModal] = useState(false);
  const [schedToView,    setSchedToView]    = useState([]);

  // fetch events for all three tabs in parallel
  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const qs = (q) => `?filter=${q}`;

      const [myRes, teamRes, allRes] = await Promise.all([
        axios.get(`${BACKEND}/api/admin/events${qs("my")}`,   { headers }),
        axios.get(`${BACKEND}/api/admin/events${qs("team")}`, { headers }),
        isSuperAdmin
          ? axios.get(`${BACKEND}/api/admin/events${qs("all")}`, { headers })
          : Promise.resolve({ data: [] })
      ]);

      setData({
        my:   myRes.data,
        team: teamRes.data,
        all:  allRes.data
      });
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  // re-fetch whenever the active tab changes (or on mount)
  useEffect(() => {
    fetchData();
  }, [activeTab, isSuperAdmin]);

  // show the full-schedule popup
  const handleViewFull = (schedules) => {
    setSchedToView(schedules);
    setShowSchedModal(true);
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Top bar: Add Event and My/Team/All toggles */}
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

      {/* Add / Edit Modal */}
      {showAddModal && (
        <AddEventModal
          ev={editing}
          onClose={() => {
            setShowAddModal(false);
            setEditing(null);
            fetchData();
          }}
        />
      )}

      {/* Events table showing only the selected tab’s data */}
      <EventTable
        data={data[activeTab]}
        onEdit={(e) => { setEditing(e); setShowAddModal(true); }}
        onDelete={fetchData}
        onViewFull={handleViewFull}
      />

      {/* Full schedule modal */}
      {showSchedModal && (
        <FullScheduleModal
          schedules={schedToView}
          onClose={() => setShowSchedModal(false)}
        />
      )}
    </div>
  );
}
