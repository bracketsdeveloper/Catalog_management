// frontend/pages/AssignDestinations.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const priorityColors = {
  1: "#EF4444", // Red
  2: "#F59E0B", // Amber
  3: "#10B981", // Green
  4: "#3B82F6", // Blue
  5: "#8B5CF6", // Purple
  6: "#EC4899", // Pink
};

const createCustomIcon = (priority) =>
  L.divIcon({
    html: `<div style="
      background-color: ${priorityColors[priority] || "#000"};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">${priority}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

export default function AssignDestinations() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [newDestination, setNewDestination] = useState({
    name: "",
    latitude: "",
    longitude: "",
    priority: 1,
    date: new Date(),
  });
  const [filterType, setFilterType] = useState("all");
  const [filterFromDate, setFilterFromDate] = useState(null);
  const [filterToDate, setFilterToDate] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]);
  const [editingIndex, setEditingIndex] = useState(null);

  const activeDestinations = useMemo(() => destinations.filter((d) => !d.reached), [destinations]);
  const completedDestinations = useMemo(() => destinations.filter((d) => d.reached), [destinations]);

  const filteredActiveDestinations = useMemo(() => {
    return activeDestinations.filter((dest) => {
      const d = new Date(dest.date);
      switch (filterType) {
        case "today":
          return isWithinInterval(d, { start: startOfDay(new Date()), end: endOfDay(new Date()) });
        case "thisWeek":
          return isWithinInterval(d, { start: startOfWeek(new Date()), end: endOfWeek(new Date()) });
        case "thisMonth":
          return isWithinInterval(d, { start: startOfMonth(new Date()), end: endOfMonth(new Date()) });
        case "range":
          if (filterFromDate && filterToDate) {
            return isWithinInterval(d, { start: startOfDay(filterFromDate), end: endOfDay(filterToDate) });
          }
          return true;
        default:
          return true;
      }
    });
  }, [activeDestinations, filterType, filterFromDate, filterToDate]);

  // Fetch users
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const { data } = await axios.get(`${BACKEND_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(data);
        if (data.length) setSelectedUser(data[0]._id);
      } catch (e) {
        setError(`Failed to fetch users: ${e.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch destinations
  useEffect(() => {
    if (!selectedUser) return;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        let fetched = [];
        if (selectedUser === "all") {
          const reqs = users.map((u) =>
            axios
              .get(`${BACKEND_URL}/api/admin/destinations/users/${u._id}/destinations`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              .then((r) =>
                r.data.destinations.map((d) => ({
                  ...d,
                  userId: u._id,
                  userName: u.name,
                }))
              )
          );
          fetched = (await Promise.all(reqs)).flat();
        } else {
          const { data } = await axios.get(
            `${BACKEND_URL}/api/admin/destinations/users/${selectedUser}/destinations`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const userName = users.find((u) => u._id === selectedUser)?.name || "";
          fetched = data.destinations.map((d) => ({
            ...d,
            userId: selectedUser,
            userName,
          }));
        }
        setDestinations(fetched);
        if (fetched.length) setMapCenter([fetched[0].latitude, fetched[0].longitude]);
        setError(null);
      } catch (e) {
        setError(e.response?.status === 404 ? "No destinations found." : `Failed to fetch destinations: ${e.message}`);
        setDestinations([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedUser, users]);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (!newDestination.name) {
      setSuggestions([]);
      return;
    }
    const handler = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/destinations/places/autocomplete`, {
          params: { input: newDestination.name },
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuggestions(res.data.suggestions || []);
      } catch (err) {
        console.error("Suggestion fetch error:", err);
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [newDestination.name]);

  const handleSuggestionClick = async (sug) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/destinations/places/details`, {
        params: { placeId: sug.placeId },
        headers: { Authorization: `Bearer ${token}` },
      });
      const { coords } = res.data;
      setNewDestination({
        ...newDestination,
        name: sug.description,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setSuggestions([]);
    } catch (err) {
      console.error("Details fetch error:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDestination((p) => ({
      ...p,
      [name]: name === "priority" ? parseInt(value) : value,
    }));
  };

  const handleAddOrUpdateDestination = () => {
    if (!newDestination.name || !newDestination.latitude || !newDestination.longitude || !newDestination.date) {
      setError("Name, coordinates, and date are required");
      return;
    }
    const parsed = {
      ...newDestination,
      latitude: parseFloat(newDestination.latitude),
      longitude: parseFloat(newDestination.longitude),
      reached: false,
    };
    if (editingIndex !== null) {
      setDestinations((d) => d.map((item, i) => (i === editingIndex ? { ...item, ...parsed } : item)));
      setEditingIndex(null);
    } else {
      setDestinations((d) => [...d, parsed]);
    }
    setNewDestination({ name: "", latitude: "", longitude: "", priority: 1, date: new Date() });
    setError(null);
  };

  const handleEditDestination = (idx) => {
    const dest = activeDestinations[idx];
    setNewDestination({
      name: dest.name,
      latitude: dest.latitude,
      longitude: dest.longitude,
      priority: dest.priority,
      date: new Date(dest.date),
    });
    const fullIdx = destinations.findIndex(
      (d) => d.name === dest.name && d.latitude === dest.latitude && d.longitude === dest.longitude && d.priority === dest.priority && !d.reached
    );
    setEditingIndex(fullIdx);
  };

  const handleDragEnd = (res) => {
    if (!res.destination) return;
    const reordered = Array.from(activeDestinations);
    const [m] = reordered.splice(res.source.index, 1);
    reordered.splice(res.destination.index, 0, m);
    const updatedActive = reordered.map((d, i) => ({ ...d, priority: i + 1 }));
    setDestinations([...updatedActive, ...completedDestinations]);
  };

  const handleSubmit = async () => {
    if (!selectedUser || activeDestinations.length === 0) {
      setError("Select a user and have at least one destination");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = activeDestinations.map((d) => ({
        name: d.name,
        latitude: d.latitude,
        longitude: d.longitude,
        priority: d.priority,
        date: d.date,
      }));
      await axios.post(`${BACKEND_URL}/api/admin/destinations/users/${selectedUser}/destinations`, { destinations: payload }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setError(null);
      alert("Saved successfully");
    } catch (e) {
      setError(`Save failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const center = useMemo(() => {
    return destinations.length ? [destinations[0].latitude, destinations[0].longitude] : mapCenter;
  }, [destinations, mapCenter]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Destination Dashboard</h1>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            disabled={loading || activeDestinations.length === 0 || !selectedUser}
          >
            {loading ? "Saving..." : "Save Destinations"}
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assign Destinations Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Assign Destinations</h2>

            {/* User Selection */}
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="p-2 border rounded-md w-full mb-4 bg-white text-gray-800 disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Select User</option>
              <option value="all">All Users</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>

            {/* Destination Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  value={newDestination.name}
                  onChange={handleInputChange}
                  placeholder="Search address..."
                  className="p-2 border rounded-md w-full bg-white text-gray-800 disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                {suggestions.length > 0 && (
                  <ul className="absolute z-50 bg-white border rounded-md w-full mt-1 max-h-40 overflow-y-auto shadow-lg">
                    {suggestions.map((sug, idx) => (
                      <li
                        key={idx}
                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleSuggestionClick(sug)}
                      >
                        {sug.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  name="latitude"
                  value={newDestination.latitude}
                  onChange={handleInputChange}
                  placeholder="Latitude"
                  className="p-2 border rounded-md bg-white text-gray-800 disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <input
                  type="number"
                  name="longitude"
                  value={newDestination.longitude}
                  onChange={handleInputChange}
                  placeholder="Longitude"
                  className="p-2 border rounded-md bg-white text-gray-800 disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              <select
                name="priority"
                value={newDestination.priority}
                onChange={handleInputChange}
                className="p-2 border rounded-md bg-white text-gray-800 disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {[1, 2, 3, 4, 5, 6].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <DatePicker
                selected={newDestination.date}
                onChange={(date) => setNewDestination((p) => ({ ...p, date }))}
                className="p-2 border rounded-md w-full bg-white text-gray-800 disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                dateFormat="yyyy-MM-dd"
              />
              <button
                onClick={handleAddOrUpdateDestination}
                className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                disabled={loading}
              >
                {editingIndex !== null ? "Update" : "Add"}
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-4 items-center">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="p-2 border rounded-md w-40 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="range">From-To</option>
              </select>
              {filterType === "range" && (
                <div className="flex gap-2">
                  <DatePicker
                    selected={filterFromDate}
                    onChange={(date) => setFilterFromDate(date)}
                    placeholderText="From Date"
                    className="p-2 border rounded-md w-40 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
                    dateFormat="yyyy-MM-dd"
                  />
                  <DatePicker
                    selected={filterToDate}
                    onChange={(date) => setFilterToDate(date)}
                    placeholderText="To Date"
                    className="p-2 border rounded-md w-40 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
                    dateFormat="yyyy-MM-dd"
                  />
                </div>
              )}
            </div>

            {/* Active Destinations Table */}
            <div className="max-h-80 overflow-y-auto">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="destinations">
                  {(prov) => (
                    <table className="w-full border-collapse" {...prov.droppableProps} ref={prov.innerRef}>
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="p-2 border text-left text-sm font-semibold text-gray-700">☰</th>
                          <th className="p-2 border text-left text-sm font-semibold text-gray-700">Priority</th>
                          <th className="p-2 border text-left text-sm font-semibold text-gray-700">Name</th>
                          <th className="p-2 border text-left text-sm font-semibold text-gray-700">Date</th>
                          <th className="p-2 border text-left text-sm font-semibold text-gray-700">Coordinates</th>
                          <th className="p-2 border text-left text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActiveDestinations.map((dest, idx) => (
                          <Draggable key={`${dest.name}-${dest.date}-${idx}`} draggableId={`dest-${idx}`} index={idx}>
                            {(p) => (
                              <tr ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}>
                                <td className="p-2 border text-gray-600">☰</td>
                                <td className="p-2 border">
                                  <span
                                    className="inline-block w-6 h-6 rounded-full text-center text-white font-bold"
                                    style={{ backgroundColor: priorityColors[dest.priority] }}
                                  >
                                    {dest.priority}
                                  </span>
                                </td>
                                <td className="p-2 border text-gray-600">{dest.name}</td>
                                <td className="p-2 border text-gray-600">{new Date(dest.date).toLocaleDateString()}</td>
                                <td className="p-2 border text-gray-600">
                                  {dest.latitude.toFixed(4)}, {dest.longitude.toFixed(4)}
                                </td>
                                <td className="p-2 border">
                                  <button
                                    onClick={() =>
                                      handleEditDestination(
                                        activeDestinations.findIndex((d) => d.name === dest.name && d.date === dest.date)
                                      )
                                    }
                                    className="px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                                    disabled={loading}
                                  >
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            )}
                          </Draggable>
                        ))}
                        {prov.placeholder}
                      </tbody>
                    </table>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
          </div>

          {/* Completed Destinations Card */}
          {completedDestinations.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Completed Destinations</h2>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="p-2 border text-left text-sm font-semibold text-gray-700">User</th>
                      <th className="p-2 border text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="p-2 border text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="p-2 border text-left text-sm font-semibold text-gray-700">Priority</th>
                      <th className="p-2 border text-left text-sm font-semibold text-gray-700">Coordinates</th>
                      <th className="p-2 border text-left text-sm font-semibold text-gray-700">Reached At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedDestinations.map((dest, idx) => (
                      <tr key={`${dest.name}-${dest.date}-${idx}`}>
                        <td className="p-2 border text-gray-600">{dest.userName}</td>
                        <td className="p-2 border text-gray-600">{dest.name}</td>
                        <td className="p-2 border text-gray-600">{new Date(dest.date).toLocaleDateString()}</td>
                        <td className="p-2 border">
                          <span
                            className="inline-block w-6 h-6 rounded-full text-center text-white font-bold"
                            style={{ backgroundColor: priorityColors[dest.priority] }}
                          >
                            {dest.priority}
                          </span>
                        </td>
                        <td className="p-2 border text-gray-600">
                          {dest.latitude.toFixed(4)}, {dest.longitude.toFixed(4)}
                        </td>
                        <td className="p-2 border text-gray-600">{new Date(dest.reachedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}