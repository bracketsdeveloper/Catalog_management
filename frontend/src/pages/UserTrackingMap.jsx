// frontend/pages/UserTrackingMap.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

// Fix Leaflet icon URLs
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const userColors = [
  "#007AFF", // Blue
  "#FF2D55", // Red
  "#00FF00", // Green
  "#FFA500", // Orange
  "#800080", // Purple
  "#00FFFF", // Cyan
  "#FF69B4", // Pink
  "#A52A2A", // Brown
];

const createCustomIcon = (color) =>
  L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });

function MapCenterUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

export default function UserTrackingMap() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [mode, setMode] = useState("live");
  const [locations, setLocations] = useState([]);
  const [userStatus, setUserStatus] = useState({});
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialCenter, setInitialCenter] = useState([20.5937, 78.9629]);
  const [expandedUsers, setExpandedUsers] = useState({});

  // Toggle history details
  const toggleExpand = (uid) =>
    setExpandedUsers((prev) => ({ ...prev, [uid]: !prev[uid] }));

  // Haversine for distance (km)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Fetch users + initial live
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const { data: usersData } = await axios.get(
          `${BACKEND_URL}/api/admin/users`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUsers(usersData);
        if (usersData.length) {
          const firstId = usersData[0]._id;
          setSelectedUser(firstId);
          const { data: locRes } = await axios.get(
            `${BACKEND_URL}/api/admin/tracking/${firstId}/locations`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (locRes.locs[0]) {
            setInitialCenter([
              locRes.locs[0].latitude,
              locRes.locs[0].longitude,
            ]);
          }
        }
      } catch (e) {
        setError(`Failed to fetch users: ${e.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch locations on change
  useEffect(() => {
    if (!selectedUser) return;
    setLoading(true);
    (async () => {
      try {
        const token = localStorage.getItem("token");
        let url =
          selectedUser === "all"
            ? `${BACKEND_URL}/api/admin/tracking/all/locations`
            : `${BACKEND_URL}/api/admin/tracking/${selectedUser}/locations`;
        if (mode === "history") {
          url += `${url.includes("?") ? "&" : "?"}date=${selectedDate}`;
        }
        const { data } = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLocations(data.locs || []);
        setUserStatus(data.userStatus || {});
        setError(null);
      } catch (e) {
        setError(
          e.response?.status === 404
            ? "No locations found."
            : `Failed to fetch locations: ${e.message}`
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedUser, mode, selectedDate]);

  // Compute map center
  const center = useMemo(() => {
    return locations.length
      ? [locations[0].latitude, locations[0].longitude]
      : initialCenter;
  }, [locations, initialCenter]);

  // Group & dedupe history
  const locationsByUser = useMemo(() => {
    if (selectedUser !== "all") {
      if (mode === "history") {
        const grouped = [];
        let cur = null;
        locations.forEach((loc) => {
          if (
            cur &&
            cur.latitude === loc.latitude &&
            cur.longitude === loc.longitude &&
            cur.placeName === loc.placeName
          ) {
            cur.endTime = loc.timestamp;
          } else {
            if (cur) grouped.push(cur);
            cur = { ...loc, endTime: loc.timestamp };
          }
        });
        if (cur) grouped.push(cur);
        return { [selectedUser]: grouped };
      }
      return { [selectedUser]: locations };
    }
    const byUser = {};
    locations.forEach((loc) => {
      const uid = loc.user?._id?.toString() || "unknown";
      byUser[uid] = byUser[uid] || [];
      byUser[uid].push(loc);
    });
    if (mode === "history") {
      Object.keys(byUser).forEach((uid) => {
        const arr = byUser[uid];
        const grouped = [];
        let cur = null;
        arr.forEach((loc) => {
          if (
            cur &&
            cur.latitude === loc.latitude &&
            cur.longitude === loc.longitude &&
            cur.placeName === loc.placeName
          ) {
            cur.endTime = loc.timestamp;
          } else {
            if (cur) grouped.push(cur);
            cur = { ...loc, endTime: loc.timestamp };
          }
        });
        if (cur) grouped.push(cur);
        byUser[uid] = grouped;
      });
    }
    return byUser;
  }, [locations, selectedUser, mode]);

  const userColorMap = useMemo(() => {
    const m = {};
    users.forEach((u, i) => {
      m[u._id] = userColors[i % userColors.length];
    });
    return m;
  }, [users]);

  return (
    <div className="flex h-screen p-6">
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={initialCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapCenterUpdater center={center} />

          {Object.entries(locationsByUser).map(([uid, locs]) =>
            locs.map((loc, idx) => {
              const name =
                loc.user?.name ||
                users.find((u) => u._id === uid)?.name ||
                "Unknown";
              return (
                <Marker
                  key={`${uid}-${idx}`}
                  position={[loc.latitude, loc.longitude]}
                  icon={createCustomIcon(userColorMap[uid] || "#000")}
                >
                  {/* Permanent label */}
                  <Tooltip permanent direction="top" offset={[0, -15]}>
                    {name}
                  </Tooltip>
                  <Popup>
                    <div>
                      <p>
                        <b>{name}</b>
                      </p>
                      <p>Place: {loc.placeName || "Unknown"}</p>
                      {mode === "history" && loc.endTime ? (
                        <p>
                          <b>Time:</b>{" "}
                          {new Date(loc.timestamp).toLocaleTimeString()} to{" "}
                          {new Date(loc.endTime).toLocaleTimeString()}
                        </p>
                      ) : (
                        <p>
                          <b>Time:</b>{" "}
                          {new Date(loc.timestamp).toLocaleString()}
                        </p>
                      )}
                      {mode === "live" && (
                        <p>
                          <b>Status:</b>{" "}
                          <span
                            className={
                              userStatus[uid]?.isOnline
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {userStatus[uid]?.isOnline
                              ? "Online"
                              : "Offline"}
                          </span>
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })
          )}

          {mode === "history" &&
            Object.entries(locationsByUser).map(
              ([uid, locs]) =>
                locs.length > 1 && (
                  <Polyline
                    key={uid}
                    positions={locs.map((l) => [l.latitude, l.longitude])}
                    color={userColorMap[uid] || "#000"}
                  />
                )
            )}
        </MapContainer>

        {/* Controls */}
        <div className="absolute top-4 left-4 z-[1000] flex gap-2 bg-white p-2 rounded shadow">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="p-2 border rounded"
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
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="p-2 border rounded"
            disabled={loading}
          >
            <option value="live">Live Location</option>
            <option value="history">Location History</option>
          </select>
          {mode === "history" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border rounded"
              max={new Date().toISOString().slice(0, 10)}
              disabled={loading}
            />
          )}
        </div>
      </div>

      {/* Sidebar (History) */}
      {mode === "history" && (
        <div className="w-80 bg-white p-4 border-l overflow-y-auto">
          <h2 className="text-lg font-bold mb-4">
            Travel History: {selectedDate}
          </h2>

          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : (
            Object.entries(locationsByUser).map(([uid, locs]) => {
              const userObj =
                users.find((u) => u._id === uid) || locs[0]?.user || {};
              const name = userObj.name || "Unknown";

              // compute total distance
              let total = 0;
              for (let i = 1; i < locs.length; i++) {
                total += calculateDistance(
                  locs[i - 1].latitude,
                  locs[i - 1].longitude,
                  locs[i].latitude,
                  locs[i].longitude
                );
              }

              const expanded = !!expandedUsers[uid];

              return (
                <div key={uid} className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3
                      className="text-md font-semibold"
                      style={{ color: userColorMap[uid] || "#000" }}
                    >
                      {name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{total.toFixed(2)} km</span>
                      <button
                        onClick={() => toggleExpand(uid)}
                        className="focus:outline-none"
                      >
                        {expanded ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="pl-4 border-l">
                      {locs.map((loc, idx) => (
                        <div key={idx} className="mb-3 p-2 border-b">
                          <p>
                            <b>Place:</b> {loc.placeName || "Unknown"}
                          </p>
                          {loc.endTime ? (
                            <p>
                              <b>Time:</b>{" "}
                              {new Date(loc.timestamp).toLocaleTimeString()} to{" "}
                              {new Date(loc.endTime).toLocaleTimeString()}
                            </p>
                          ) : (
                            <p>
                              <b>Time:</b>{" "}
                              {new Date(loc.timestamp).toLocaleString()}
                            </p>
                          )}
                          <p>
                            <b>Coords:</b> {loc.latitude.toFixed(4)},{" "}
                            {loc.longitude.toFixed(4)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
