// frontend/pages/AssignDestinations.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  DragDropContext,
  Droppable,
  Draggable
} from "react-beautiful-dnd";

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png"
});

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

// Color palette for priorities
const priorityColors = {
  1: "#FF2D55",
  2: "#FFA500",
  3: "#00FF00",
  4: "#007AFF",
  5: "#800080",
  6: "#FF69B4"
};

const createCustomIcon = (priority) =>
  L.divIcon({
    html: `<div style="
      background-color: ${priorityColors[priority] || "#000"};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:12px;
      color:white;
    ">${priority}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });

export default function AssignDestinations() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [newDestination, setNewDestination] = useState({
    name: "",
    latitude: "",
    longitude: "",
    priority: 1
  });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]);
  const [editingIndex, setEditingIndex] = useState(null);

  const activeDestinations = useMemo(
    () => destinations.filter((d) => !d.reached),
    [destinations]
  );
  const completedDestinations = useMemo(
    () => destinations.filter((d) => d.reached),
    [destinations]
  );

  // Fetch users
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const { data } = await axios.get(
          `${BACKEND_URL}/api/admin/users`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUsers(data);
        if (data.length) setSelectedUser(data[0]._id);
      } catch (e) {
        setError(`Failed to fetch users: ${e.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch destinations when user changes
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
              .get(
                `${BACKEND_URL}/api/admin/destinations/users/${u._id}/destinations`,
                { headers: { Authorization: `Bearer ${token}` } }
              )
              .then((r) =>
                r.data.destinations.map((d) => ({
                  ...d,
                  userId: u._id,
                  userName: u.name
                }))
              )
          );
          fetched = (await Promise.all(reqs)).flat();
        } else {
          const { data } = await axios.get(
            `${BACKEND_URL}/api/admin/destinations/users/${selectedUser}/destinations`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const userName =
            users.find((u) => u._id === selectedUser)?.name || "";
          fetched = data.destinations.map((d) => ({
            ...d,
            userId: selectedUser,
            userName
          }));
        }
        setDestinations(fetched);
        if (fetched.length)
          setMapCenter([fetched[0].latitude, fetched[0].longitude]);
        setError(null);
      } catch (e) {
        setError(
          e.response?.status === 404
            ? "No destinations found."
            : `Failed to fetch destinations: ${e.message}`
        );
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
        const res = await axios.get(
          `${BACKEND_URL}/api/admin/destinations/places/autocomplete`,
          {
            params: { input: newDestination.name },
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuggestions(res.data.suggestions || []);
      } catch (err) {
        console.error("Suggestion fetch error:", err);
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [newDestination.name]);

  // When user clicks a suggestion, fetch details
  const handleSuggestionClick = async (sug) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/destinations/places/details`,
        {
          params: { placeId: sug.placeId },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const { coords } = res.data;
      setNewDestination({
        name: sug.description,
        latitude: coords.latitude,
        longitude: coords.longitude,
        priority: newDestination.priority
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
      [name]: name === "priority" ? parseInt(value) : value
    }));
  };

  const handleAddOrUpdateDestination = () => {
    if (
      !newDestination.name ||
      !newDestination.latitude ||
      !newDestination.longitude
    ) {
      setError("Name and coordinates are required");
      return;
    }
    const parsed = {
      ...newDestination,
      latitude: parseFloat(newDestination.latitude),
      longitude: parseFloat(newDestination.longitude),
      reached: false
    };
    if (editingIndex !== null) {
      setDestinations((d) =>
        d.map((item, i) => (i === editingIndex ? { ...item, ...parsed } : item))
      );
      setEditingIndex(null);
    } else {
      setDestinations((d) => [...d, parsed]);
    }
    setNewDestination({ name: "", latitude: "", longitude: "", priority: 1 });
    setError(null);
  };

  const handleEditDestination = (idx) => {
    const dest = activeDestinations[idx];
    setNewDestination({
      name: dest.name,
      latitude: dest.latitude,
      longitude: dest.longitude,
      priority: dest.priority
    });
    const fullIdx = destinations.findIndex(
      (d) =>
        d.name === dest.name &&
        d.latitude === dest.latitude &&
        d.longitude === dest.longitude &&
        d.priority === dest.priority &&
        !d.reached
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
        priority: d.priority
      }));
      await axios.post(
        `${BACKEND_URL}/api/admin/users/${selectedUser}/destinations`,
        { destinations: payload },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setError(null);
      alert("Saved successfully");
    } catch (e) {
      setError(`Save failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const center = useMemo(() => {
    return destinations.length
      ? [destinations[0].latitude, destinations[0].longitude]
      : mapCenter;
  }, [destinations, mapCenter]);

  return (
    <div className="flex h-screen p-6 flex-col gap-4">
      <div className="flex gap-4 flex-1">
        {/* Assign Destinations (left) */}
        <div className="w-1/2 bg-white p-4 rounded shadow flex flex-col">
          <h2 className="text-xl font-bold mb-4">Assign Destinations</h2>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="p-2 border rounded mb-4"
            disabled={loading}
          >
            <option value="">Select User</option>
            <option value="all">All Users</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                name="name"
                value={newDestination.name}
                onChange={handleInputChange}
                placeholder="Search address..."
                className="p-2 border rounded w-full"
                disabled={loading}
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-50 bg-white border rounded w-full mt-1 max-h-40 overflow-y-auto">
                  {suggestions.map((sug, idx) => (
                    <li
                      key={idx}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleSuggestionClick(sug)}
                    >
                      {sug.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <input
              type="number"
              name="latitude"
              value={newDestination.latitude}
              onChange={handleInputChange}
              placeholder="Lat"
              className="p-2 border rounded w-24"
              disabled={loading}
            />
            <input
              type="number"
              name="longitude"
              value={newDestination.longitude}
              onChange={handleInputChange}
              placeholder="Lng"
              className="p-2 border rounded w-24"
              disabled={loading}
            />
            <select
              name="priority"
              value={newDestination.priority}
              onChange={handleInputChange}
              className="p-2 border rounded w-20"
              disabled={loading}
            >
              {[1, 2, 3, 4, 5, 6].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddOrUpdateDestination}
              className="p-2 bg-blue-600 text-white rounded"
              disabled={loading}
            >
              {editingIndex !== null ? "Update" : "Add"}
            </button>
          </div>

          <div className="overflow-y-auto max-h-56 mb-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="destinations">
                {(prov) => (
                  <table
                    className="w-full border-collapse"
                    {...prov.droppableProps}
                    ref={prov.innerRef}
                  >
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="border p-2">☰</th>
                        <th className="border p-2">Pri</th>
                        <th className="border p-2">Name</th>
                        <th className="border p-2">Coords</th>
                        <th className="border p-2">Edit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDestinations.map((dest, idx) => (
                        <Draggable
                          key={`${dest.name}-${idx}`}
                          draggableId={`dest-${idx}`}
                          index={idx}
                        >
                          {(p) => (
                            <tr
                              ref={p.innerRef}
                              {...p.draggableProps}
                              {...p.dragHandleProps}
                            >
                              <td className="border p-2">☰</td>
                              <td className="border p-2">{dest.priority}</td>
                              <td className="border p-2">{dest.name}</td>
                              <td className="border p-2">
                                {dest.latitude.toFixed(4)},{" "}
                                {dest.longitude.toFixed(4)}
                              </td>
                              <td className="border p-2">
                                <button
                                  onClick={() => handleEditDestination(idx)}
                                  className="px-2 py-1 bg-yellow-500 text-white rounded"
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

          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded self-start"
            disabled={
              loading || activeDestinations.length === 0 || !selectedUser
            }
          >
            Save
          </button>
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>

        {/* Completed Destinations (right) */}
        {completedDestinations.length > 0 && (
          <div className="w-1/2 bg-white p-4 rounded shadow flex flex-col">
            <h2 className="text-xl font-bold mb-4">
              Completed Destinations
            </h2>
            <div className="overflow-y-auto max-h-56">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="border p-2">User</th>
                    <th className="border p-2">Name</th>
                    <th className="border p-2">Pri</th>
                    <th className="border p-2">Coords</th>
                    <th className="border p-2">Reached at</th>
                  </tr>
                </thead>
                <tbody>
                  {completedDestinations.map((dest, idx) => (
                    <tr key={`${dest.name}-${idx}`} className="border-b">
                      <td className="p-2 border">{dest.userName}</td>
                      <td className="p-2 border">{dest.name}</td>
                      <td className="p-2 border">{dest.priority}</td>
                      <td className="p-2 border">
                        {dest.latitude.toFixed(4)}, {dest.longitude.toFixed(4)}
                      </td>
                      <td className="p-2 border">
                        {new Date(dest.reachedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Map below */}
      <div className="flex-1">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {destinations.map((dest, i) => (
            <Marker
              key={i}
              position={[dest.latitude, dest.longitude]}
              icon={createCustomIcon(dest.priority)}
            >
              <Popup>
                {dest.userName && <p><b>{dest.userName}</b></p>}
                <p><b>{dest.name}</b> (Pri: {dest.priority})</p>
                <p>Status: {dest.reached ? "Reached" : "Active"}</p>
                {dest.reached && (
                  <p>Reached at: {new Date(dest.reachedAt).toLocaleString()}</p>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
