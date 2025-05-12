// client/src/pages/CalendarPage.jsx
import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import axios from "axios";
import AddEventModal from "../components/event/AddEventModal.jsx";
import "../styles/fullcalendar.css";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function CalendarPage() {
  // read once from storage
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";

  const [entries, setEntries]           = useState([]);  // flattened ev/sch
  const [filtered, setFiltered]         = useState([]);  // after user‐filter
  const [usersList, setUsersList]       = useState([]);  // for super-admin dropdown
  const [currentUserId, setCurrentUser] = useState(null);
  const [filterUserId, setFilterUserId] = useState(null);

  const [showTable, setShowTable]       = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayEntries, setDayEntries]     = useState([]);

  const [editingEvent, setEditing]      = useState(null);

  // 1) Fetch my user ID, then default filterUserId
  useEffect(() => {
    const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
    axios.get(`${BACKEND}/api/admin/users`, cfg)
      .then(res => {
        const me = res.data._id;
        setCurrentUser(me);
        setFilterUserId(isSuperAdmin ? "all" : me);
      })
      .catch(console.error);
  }, [isSuperAdmin]);

  // 2) If super-admin, fetch all users via your ?all=true route
  useEffect(() => {
    if (!isSuperAdmin) return;
    const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
    axios.get(`${BACKEND}/api/admin/users?all=true`, cfg)
      .then(res => setUsersList(res.data))
      .catch(console.error);
  }, [isSuperAdmin]);

  // 3) Fetch & flatten events
  useEffect(() => {
    const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
    axios.get(`${BACKEND}/api/admin/eventscal`, cfg)
      .then(res => {
        const flat = res.data.flatMap(ev =>
          ev.schedules.map(sch => {
            const dateOnly = sch.scheduledOn.slice(0,10);
            // check overdue + status empty
            const isOverdue = new Date(sch.scheduledOn) < new Date() && !sch.status;
            return {
              ev,
              sch,
              dateKey: new Date(sch.scheduledOn).toDateString(),
              eventObj: {
                title: `${sch.action}: ${ev.potentialClientName}`,
                date: dateOnly,
                backgroundColor: isOverdue ? "red" : undefined,
                borderColor: isOverdue ? "red" : undefined,
                extendedProps: { ev, sch }
              }
            };
          })
        );
        setEntries(flat);
      })
      .catch(console.error);
  }, []);

  // 4) Apply user filter whenever entries/filterUserId change
  useEffect(() => {
    if (!filterUserId) return;
    setFiltered(
      entries.filter(({ ev, sch }) => {
        if (isSuperAdmin && filterUserId === "all") return true;
        if (ev.createdBy?._id === filterUserId)   return true;
        if (sch.assignedTo?._id === filterUserId) return true;
        return false;
      })
    );
  }, [entries, filterUserId, isSuperAdmin]);

  // 5) Day click → show table
  const handleDateClick = ({ date }) => {
    const key = date.toDateString();
    setSelectedDate(date);
    setDayEntries(filtered.filter(e => e.dateKey === key));
    setShowTable(true);
  };

  // 6) Event click → open edit
  const handleEventClick = ({ event }) => {
    setEditing(event.extendedProps.ev);
  };

  // 7) After edit/close, re-fetch events
  const refresh = () => {
    setShowTable(false);
    setEditing(null);
    const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
    axios.get(`${BACKEND}/api/admin/events`, cfg)
      .then(res => {
        const flat = res.data.flatMap(ev =>
          ev.schedules.map(sch => {
            const dateOnly = sch.scheduledOn.slice(0,10);
            const isOverdue = new Date(sch.scheduledOn) < new Date() && !sch.status;
            return {
              ev,
              sch,
              dateKey: new Date(sch.scheduledOn).toDateString(),
              eventObj: {
                title: `${sch.action}: ${ev.potentialClientName}`,
                date: dateOnly,
                backgroundColor: isOverdue ? "red" : undefined,
                borderColor: isOverdue ? "red" : undefined,
                extendedProps: { ev, sch }
              }
            };
          })
        );
        setEntries(flat);
      })
      .catch(console.error);
  };

  return (
    <div className="calendar-fullscreen">
      {/* super-admin filter */}
      {isSuperAdmin && (
        <div className="p-4">
          <label className="mr-2 font-medium">Filter by user:</label>
          <select
            className="border p-2 rounded"
            value={filterUserId}
            onChange={e => setFilterUserId(e.target.value)}
          >
            <option value="all">All users</option>
            {usersList.map(u => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}

      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        height="100vh"
        events={filtered.map(e => e.eventObj)}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
      />

      {showTable && (
        <div className="fc-modal">
          <div className="fc-modal-content">
            <div className="fc-modal-header">
              <h2>Events on {selectedDate.toLocaleDateString()}</h2>
              <button className="fc-close" onClick={() => setShowTable(false)}>
                &times;
              </button>
            </div>
            <table className="fc-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Discussion</th>
                  <th>Status</th>
                  <th>Reschedule</th>
                  <th>Remarks</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {dayEntries.map(({ ev, sch }, i) => (
                  <tr key={i}>
                    <td>{sch.action}</td>
                    <td>{sch.discussion ? new Date(sch.discussion).toLocaleString() : "—"}</td>
                    <td>{sch.status || "—"}</td>
                    <td>{sch.reschedule ? new Date(sch.reschedule).toLocaleString() : "—"}</td>
                    <td>{sch.remarks || "—"}</td>
                    <td>
                      <button
                        className="fc-edit-btn"
                        onClick={() => setEditing(ev)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingEvent && <AddEventModal ev={editingEvent} onClose={refresh} />}
    </div>
  );
}
