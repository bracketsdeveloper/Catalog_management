// client/src/pages/CalendarPage.jsx
import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import axios from "axios";
import AddEventModal from "../components/event/AddEventModal.jsx";
import "../styles/fullcalendar.css";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function CalendarPage() {
  const [entries, setEntries]         = useState([]);       // flattened { ev, sch, dateKey, eventObj }
  const [showTable, setShowTable]     = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);    // <— setter now matches
  const [dayEntries, setDayEntries]   = useState([]);
  const [editingEvent, setEditing]    = useState(null);

  // Fetch and flatten events
  useEffect(() => {
    axios
      .get(`${BACKEND}/api/admin/events`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(res => {
        const flat = res.data.flatMap(ev =>
          ev.schedules.map(sch => {
            const dateOnly = sch.scheduledOn?.slice(0, 10);
            return {
              ev,
              sch,
              dateKey: new Date(sch.scheduledOn).toDateString(),
              eventObj: {
                title: `${sch.action}: ${ev.potentialClientName}`,
                date: dateOnly,
                extendedProps: { ev, sch }
              }
            };
          })
        );
        setEntries(flat);
      })
      .catch(console.error);
  }, []);

  // Click on a day (grid background)
  const handleDateClick = ({ date }) => {
    const key = new Date(date).toDateString();
    const todays = entries.filter(e => e.dateKey === key);
    setSelectedDate(date);
    setDayEntries(todays);
    setShowTable(true);
  };

  // Click on an event bubble
  const handleEventClick = ({ event }) => {
    setEditing(event.extendedProps.ev);
  };

  // Refresh all entries after editing
  const refresh = () => {
    setShowTable(false);
    setEditing(null);
    axios
      .get(`${BACKEND}/api/admin/events`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(res => {
        const flat = res.data.flatMap(ev =>
          ev.schedules.map(sch => {
            const dateOnly = sch.scheduledOn?.slice(0, 10);
            return {
              ev,
              sch,
              dateKey: new Date(sch.scheduledOn).toDateString(),
              eventObj: {
                title: `${sch.action}: ${ev.potentialClientName}`,
                date: dateOnly,
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
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: ""
        }}
        height="100vh"
        events={entries.map(e => e.eventObj)}
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
                    <td>
                      {sch.discussion
                        ? new Date(sch.discussion).toLocaleString()
                        : "—"}
                    </td>
                    <td>{sch.status || "—"}</td>
                    <td>
                      {sch.reschedule
                        ? new Date(sch.reschedule).toLocaleString()
                        : "—"}
                    </td>
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

      {editingEvent && (
        <AddEventModal ev={editingEvent} onClose={refresh} />
      )}
    </div>
  );
}
