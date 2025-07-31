import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  GoogleMap, 
  LoadScript, 
  Marker 
} from '@react-google-maps/api';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function ManageDestinations() {
  const BACKEND = process.env.REACT_APP_BACKEND_URL;
  const GMAP_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  // users & selected user
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  // typed text for place autocomplete
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  // the list of { name, latitude, longitude, priority }
  const [dests, setDests] = useState([]);
  // currently picked place to show on map before add
  const [preview, setPreview] = useState(null);

  // fetch user list once
  useEffect(() => {
    axios.get(`${BACKEND}/api/admin/users`)
      .then(r => setUsers(r.data.users || []))
      .catch(() => setUsers([]));
  }, []);

  // whenever userId changes, load that user’s destinations
  useEffect(() => {
    if (!userId) return setDests([]);
    axios.get(`${BACKEND}/api/admin/users/${userId}/destinations`)
      .then(r => {
        setDests(
          (r.data.destinations || []).map((d,i) => ({
            ...d,
            priority: i
          }))
        );
      })
      .catch(() => setDests([]));
  }, [userId]);

  // autocomplete on search change
  useEffect(() => {
    if (search.length < 2) return setSuggestions([]);
    const ctl = new AbortController();
    axios.get(
      `${BACKEND}/api/admin/places/autocomplete?q=${encodeURIComponent(search)}`,
      { signal: ctl.signal }
    )
      .then(r => setSuggestions(r.data.predictions||[]))
      .catch(() => {})
    ;
    return () => ctl.abort();
  }, [search]);

  // when you pick a suggestion
  const pickSuggestion = async place => {
    setSearch('');
    setSuggestions([]);
    const pid = place.place_id;
    const { data } = await axios.get(
      `${BACKEND}/api/admin/places/details?place_id=${pid}`
    );
    const info = data.result;
    const loc = info.geometry.location;
    setPreview({
      name: info.formatted_address || info.name,
      latitude: loc.lat,
      longitude: loc.lng
    });
  };

  // add the previewed place into dests list
  const addDestination = () => {
    if (!preview) return;
    setDests(ds => [
      ...ds,
      { ...preview, priority: ds.length }
    ]);
    setPreview(null);
  };

  // reorder handler
  const onDragEnd = result => {
    if (!result.destination) return;
    const src = result.source.index;
    const dst = result.destination.index;
    const arr = Array.from(dests);
    const [moved] = arr.splice(src,1);
    arr.splice(dst,0,moved);
    // reassign priorities
    setDests(arr.map((d,i)=>({ ...d, priority:i })));
  };

  // save back to server
  const saveAll = () => {
    if (!userId) return alert('Select a user first');
    axios.post(
      `${BACKEND}/api/admin/users/${userId}/destinations`,
      { destinations: dests },
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
    )
      .then(() => alert('Saved!'))
      .catch(e => alert('Save failed: '+ e.message));
  };

  // map center = first dest or preview or default
  const center = preview
    ? { lat: preview.latitude, lng: preview.longitude }
    : dests.length
      ? { lat: dests[0].latitude, lng: dests[0].longitude }
      : { lat: 0, lng: 0 };

  return (
    <div style={{ display:'flex', height:'100vh' }}>
      <aside style={{ width:300, padding:20, borderRight:'1px solid #ddd' }}>
        <h2>Assign Destinations</h2>

        <label>User:</label>
        <select
          style={{ width:'100%', marginBottom:10 }}
          value={userId}
          onChange={e=>setUserId(e.target.value)}
        >
          <option value=''>— select user —</option>
          {users.map(u=>(
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>

        <label>New Destination:</label>
        <input
          style={{ width:'100%', padding:5 }}
          value={search}
          placeholder="Type a place..."
          onChange={e=>setSearch(e.target.value)}
        />
        <ul style={{ listStyle:'none', padding:0, margin:0, maxHeight:120, overflow:'auto' }}>
          {suggestions.map(s=>(
            <li
              key={s.place_id}
              style={{ padding:5, cursor:'pointer', borderBottom:'1px solid #eee' }}
              onClick={()=>pickSuggestion(s)}
            >
              {s.description}
            </li>
          ))}
        </ul>
        {preview && (
          <>
            <button onClick={addDestination} style={{ margin:'10px 0' }}>
              ➕ Add “{preview.name}”
            </button>
          </>
        )}

        <h3>Current List</h3>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="dest-list">
            {provided=>(
              <ul
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{ padding:0, listStyle:'none' }}
              >
                {dests.map((d,i)=>(
                  <Draggable key={i} draggableId={`d-${i}`} index={i}>
                    {prov=>(
                      <li
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        style={{
                          padding:'8px 4px',
                          borderBottom:'1px solid #eee',
                          background:'#fafafa',
                          marginBottom:4,
                          ...prov.draggableProps.style
                        }}
                      >
                        <span style={{ marginRight:8, fontWeight:'bold' }}>
                          {i+1}.
                        </span>
                        {d.name}
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>

        <button onClick={saveAll} style={{ marginTop:20 }}>
          💾 Save All
        </button>
      </aside>

      <main style={{ flex:1 }}>
        <LoadScript googleMapsApiKey={GMAP_KEY}>
          <GoogleMap
            mapContainerStyle={{ width:'100%', height:'100%' }}
            center={center}
            zoom={ preview || dests.length ? 14 : 2 }
          >
            {(preview ? [preview] : dests).map((d,i)=>(
              <Marker
                key={i}
                position={{ lat: d.latitude, lng: d.longitude }}
                label={(d.priority+1).toString()}
              />
            ))}
          </GoogleMap>
        </LoadScript>
      </main>
    </div>
  );
}
