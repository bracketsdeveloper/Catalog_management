import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import axios from "axios";
import AddEventModal from "../components/event/AddEventModal.jsx";
import "../styles/fullcalendar.css";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function CalendarPage() {
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const [entries, setEntries] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [currentUserId, setCurrentUser] = useState(null);
  const [filterUserId, setFilterUserId] = useState(null);
  const [editingEvent, setEditing] = useState(null);

  // 1) Fetch current user ID, set default filter
  useEffect(() => {
    const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
    axios
      .get(`${BACKEND}/api/admin/users`, cfg)
      .then((res) => {
        const me = res.data._id;
        setCurrentUser(me);
        setFilterUserId(isSuperAdmin ? "all" : me);
      })
      .catch(console.error);
  }, [isSuperAdmin]);

  // 2) Fetch all users for super-admin
  useEffect(() => {
    if (!isSuperAdmin) return;
    const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
    axios
      .get(`${BACKEND}/api/admin/users?all=true`, cfg)
      .then((res) => setUsersList(res.data))
      .catch(console.error);
  }, [isSuperAdmin]);

  // 3) Fetch & flatten events
  useEffect(() => {
    const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
    axios
      .get(`${BACKEND}/api/admin/eventscal`, cfg)
      .then((res) => {
        const flat = res.data.flatMap((ev) =>
          ev.schedules.map((sch) => {
            if (!sch.scheduledOn) {
              console.warn("Schedule missing scheduledOn:", sch);
              return null;
            }
            const dateOnly = new Date(sch.scheduledOn).toISOString().slice(0, 10);
            const isOverdue = new Date(sch.scheduledOn) < new Date() && !sch.status;
            return {
              ev,
              sch,
              dateKey: new Date(sch.scheduledOn).toDateString(),
              eventObj: {
                title: `${sch.action}: ${ev.companyName} (${ev.companyType})`,
                date: dateOnly,
                backgroundColor: isOverdue ? "red" : undefined,
                borderColor: isOverdue ? "red" : undefined,
                extendedProps: { ev, sch },
              },
            };
          }).filter(Boolean)
        );
        setEntries(flat);
      })
      .catch(console.error);
  }, []);

  // 4) Apply user filter
  useEffect(() => {
    if (!filterUserId) return;
    setFiltered(
      entries.filter(({ ev, sch }) => {
        if (isSuperAdmin && filterUserId === "all") return true;
        if (ev.createdBy?._id === filterUserId) return true;
        if (sch.assignedTo?._id === filterUserId) return true;
        return false;
      })
    );
  }, [entries, filterUserId, isSuperAdmin]);

  // 5) Date click → open AddEventModal with pre-filled date
  const handleDateClick = ({ date }) => {
    // Format date locally in YYYY-MM-DD
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    setEditing({
      company: "",
      companyType: "",
      companyName: "",
      schedules: [
        {
          scheduledDate: dateStr,
          scheduledHour: "09",
          scheduledMinute: "00",
          scheduledAmpm: "AM",
          action: "",
          assignedTo: "",
          assignedToName: "",
          discussion: "",
          status: "",
          rescheduleDate: "",
          rescheduleHour: "",
          rescheduleMinute: "",
          rescheduleAmpm: "AM",
          remarks: "",
        },
      ],
    });
  };

  // 6) Event click → open edit
  const handleEventClick = ({ event }) => {
    setEditing(event.extendedProps.ev);
  };

  // 7) After edit/close, re-fetch events
  const refresh = () => {
    setEditing(null);
    const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
    axios
      .get(`${BACKEND}/api/admin/eventscal`, cfg)
      .then((res) => {
        const flat = res.data.flatMap((ev) =>
          ev.schedules.map((sch) => {
            if (!sch.scheduledOn) {
              console.warn("Schedule missing scheduledOn:", sch);
              return null;
            }
            const dateOnly = new Date(sch.scheduledOn).toISOString().slice(0, 10);
            const isOverdue = new Date(sch.scheduledOn) < new Date() && !sch.status;
            return {
              ev,
              sch,
              dateKey: new Date(sch.scheduledOn).toDateString(),
              eventObj: {
                title: `${sch.action}: ${ev.companyName} (${ev.companyType})`,
                date: dateOnly,
                backgroundColor: isOverdue ? "red" : undefined,
                borderColor: isOverdue ? "red" : undefined,
                extendedProps: { ev, sch },
              },
            };
          }).filter(Boolean)
        );
        setEntries(flat);
      })
      .catch(console.error);
  };

  // 8) Render "+ Schedule" button in each day cell
  const dayCellContent = ({ date, view }) => {
    return (
      <div className="fc-daygrid-day-top">
        <span className="fc-daygrid-day-number">{date.getDate()}</span>
        <button
          className="fc-add-schedule-btn"
          onClick={() => handleDateClick({ date })}
          title="Add Schedule"
        >
          +
        </button>
      </div>
    );
  };

  return (
    <div className="calendar-fullscreen">
      {isSuperAdmin && (
        <div className="p-4">
          <label className="mr-2 font-medium">Filter by user:</label>
          <select
            className="border p-2 rounded"
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
          >
            <option value="all">All users</option>
            {usersList.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        height="100vh"
        events={filtered.map((s) => s.eventObj)}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        dayCellContent={dayCellContent}
      />

      {editingEvent && (
        <AddEventModal
          ev={editingEvent}
          isSuperAdmin={isSuperAdmin}
          onClose={refresh}
        />
      )}
    </div>
  );
}