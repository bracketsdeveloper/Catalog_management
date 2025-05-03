import React, { useState, useEffect } from "react";
import axios from "axios";
import AddEventModal from "../components/event/AddEventModal.jsx";
import EventTable     from "../components/event/EventTable.jsx";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function EventManager() {
  const [events, setEvents]   = useState([]);
  const [showModal, setShow]  = useState(false);
  const [editing, setEditing] = useState(null);

  const fetch = () =>
    axios
      .get(`${BACKEND}/api/admin/events`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(r => setEvents(r.data));

      useEffect(() => {
            fetch();
          }, []);

  return (
    <div className="p-6">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setEditing(null); setShow(true); }}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          + Add Event
        </button>
      </div>

      {showModal && (
        <AddEventModal
          ev={editing}
          onClose={() => { setShow(false); setEditing(null); fetch(); }}
        />
      )}

      <EventTable
        data={events}
        onEdit={e => { setEditing(e); setShow(true); }}
        onDelete={fetch}
      />
    </div>
  );
}
