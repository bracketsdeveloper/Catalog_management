import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

function TaskCalendar({ isSuperAdmin, onDateClick, onEventClick, onRefresh }) {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [filterUserId, setFilterUserId] = useState(isSuperAdmin ? "all" : null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/admin/users`, { headers: getAuthHeaders() })
      .then((res) => {
        const me = res.data._id;
        setCurrentUserId(me);
        if (!isSuperAdmin) setFilterUserId(me);
      })
      .catch((err) => console.error("Error fetching current user:", err));
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    axios
      .get(`${BACKEND_URL}/api/admin/users?all=true`, { headers: getAuthHeaders() })
      .then((res) => setUsersList(res.data))
      .catch((err) => console.error("Error fetching users:", err));
  }, [isSuperAdmin]);

  const fetchCalendarEvents = () => {
    axios
      .get(`${BACKEND_URL}/api/admin/tasks/calendar`, { headers: getAuthHeaders() })
      .then((res) => {
        console.log("TaskCalendar events fetched:", res.data);
        // Adjust the date by adding one day to account for the UTC to IST shift
        const normalizedEvents = res.data.map((event) => {
          const eventDate = new Date(event.date);
          eventDate.setDate(eventDate.getDate() + 1); // Add one day
          return {
            ...event,
            date: eventDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
          };
        });
        setCalendarEvents(normalizedEvents);
      })
      .catch((err) => {
        console.error("Error fetching calendar events:", err);
        setCalendarEvents([]);
      });
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  const filteredEvents = calendarEvents.filter((event) => {
    if (isSuperAdmin && filterUserId === "all") return true;
    return (
      event.extendedProps.task.createdBy?._id === filterUserId ||
      event.extendedProps.task.assignedTo?._id === filterUserId
    );
  });

  const refresh = () => {
    fetchCalendarEvents();
    onRefresh();
  };

  const dayCellContent = ({ date }) => {
    return (
      <div className="fc-daygrid-day-top">
        <span className="fc-daygrid-day-number">{date.getDate()}</span>
        <button
          className="fc-add-schedule-btn"
          onClick={() => onDateClick({ date })}
          title="Add Task"
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
            value={filterUserId || ""}
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
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        height="80vh"
        events={filteredEvents}
        dateClick={onDateClick}
        eventClick={(info) => onEventClick({ event: { ...info.event, extendedProps: { task: { ...info.event.extendedProps.task, isEditing: true } } }  })}
        dayCellContent={dayCellContent}
        editable={isSuperAdmin}
        selectable={isSuperAdmin}
      />
    </div>
  );
}

export default TaskCalendar;