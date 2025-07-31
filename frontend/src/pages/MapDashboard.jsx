import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  GoogleMap,
  LoadScript,
  Marker,
  Polyline,
} from '@react-google-maps/api';

export default function MapDashboard() {
  const BACKEND = process.env.REACT_APP_BACKEND_URL;
  const GMAP_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [mode, setMode] = useState('live'); // 'live' or 'history'
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [liveLoc, setLiveLoc] = useState(null);
  const [history, setHistory] = useState([]);

  // fetch users list
  useEffect(() => {
    axios.get(`${BACKEND}/api/admin/tracking/users`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(r => {
      setUsers(r.data.users);
      if (r.data.users.length) setSelectedUser(r.data.users[0]._id);
    })
    .catch(console.error);
  }, []);

  // fetch live or history whenever user/mode/date changes
  useEffect(() => {
    if (!selectedUser) return;

    if (mode === 'live') {
      axios.get(`${BACKEND}/api/admin/tracking/user/${selectedUser}/live-location`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(r => { setLiveLoc(r.data.location); })
      .catch(_=> setLiveLoc(null));
    } else {
      axios.get(`${BACKEND}/api/admin/tracking/user/${selectedUser}/location-history`, {
        params: { date },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(r => { setHistory(r.data.history); })
      .catch(_=> setHistory([]));
    }
  }, [selectedUser, mode, date]);

  const center = liveLoc
    ? { lat: liveLoc.latitude, lng: liveLoc.longitude }
    : history.length
      ? { lat: history[0].latitude, lng: history[0].longitude }
      : { lat: 0, lng: 0 };

  return (
    <div style={{ display:'flex', height:'100vh' }}>
      <div style={{ flex:1 }}>
        <LoadScript googleMapsApiKey={GMAP_KEY}>
          <GoogleMap
            mapContainerStyle={{ width:'100%', height:'100%' }}
            center={center}
            zoom={ mode === 'live' ? 15 : 13 }
          >
            {mode === 'live' && liveLoc && (
              <Marker
                position={{ lat: liveLoc.latitude, lng: liveLoc.longitude }}
                label={liveLoc.placeName || ''}
              />
            )}
            {mode === 'history' && history.length > 0 && (
              <>
                <Polyline
                  path={history.map(p => ({ lat:p.latitude, lng:p.longitude }))}
                  options={{ strokeColor:'#FF8045', strokeWeight:4 }}
                />
                {history.map((p,i) => (
                  <Marker key={i}
                    position={{lat:p.latitude,lng:p.longitude}}
                    label={`${new Date(p.timestamp).toLocaleTimeString()}`}
                  />
                ))}
              </>
            )}
          </GoogleMap>
        </LoadScript>
      </div>

      <aside style={{ width:300, padding:16, boxSizing:'border-box' }}>
        <h2>Map Dashboard</h2>

        <label>User:</label>
        <select
          value={selectedUser}
          onChange={e => setSelectedUser(e.target.value)}
          style={{ width:'100%', marginBottom:8 }}
        >
          {users.map(u=>
            <option key={u._id} value={u._id}>{u.name}</option>
          )}
        </select>

        <label>Mode:</label>
        <select
          value={mode}
          onChange={e=>setMode(e.target.value)}
          style={{ width:'100%', marginBottom:8 }}
        >
          <option value="live">Live Location</option>
          <option value="history">Location History</option>
        </select>

        {mode === 'history' && (
          <>
            <label>Date:</label>
            <input
              type="date"
              value={date}
              onChange={e=>setDate(e.target.value)}
              style={{ width:'100%', marginBottom:16 }}
            />

            <h3>History Points</h3>
            <div style={{ maxHeight:300, overflowY:'auto' }}>
              {history.length === 0
                ? <p>No data</p>
                : history.map((p,i)=>(
                    <div key={i} style={{ marginBottom:4 }}>
                      <strong>{new Date(p.timestamp).toLocaleTimeString()}</strong><br/>
                      {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}<br/>
                      {p.placeName}
                    </div>
                  ))
              }
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
