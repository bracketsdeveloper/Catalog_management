import React, { useState, useEffect } from "react";
import axios from "axios";

const ACTIONS = ["Call", "Msg", "Mail", "Meet", "Assign to CRM"];

export default function AddEventModal({ ev, onClose }) {
  const isEdit = Boolean(ev);

  const [allPCs, setAllPCs]       = useState([]);
  const [pcSugs, setPCSugs]       = useState([]);
  const [users, setUsers]         = useState([]);
  const [userSugs, setUserSugs]   = useState([]);
  const [potentialClient, setPC]  = useState("");
  const [potentialClientName, setName] = useState("");
  const [clientName, setClientName]    = useState("");
  const [schedules, setSchedules]      = useState([]);

  // load data
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/potential-clients`, {
      headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` }
    }).then(r=>setAllPCs(r.data));
    axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/users?all=true`, {
      headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` }
    }).then(r=>setUsers(r.data));
  }, []);

  // init form
  useEffect(() => {
    if (isEdit && allPCs.length) {
      const pcObj = allPCs.find(pc=>pc._id === ev.potentialClient);
      setPC(ev.potentialClient);
      setName(ev.potentialClientName);
      setClientName(pcObj?.contacts?.[0]?.clientName || "");
      setSchedules(ev.schedules.map(s=>({
        scheduledOn:    s.scheduledOn ? new Date(s.scheduledOn).toISOString().slice(0,10) : "",
        action:         s.action || "",
        assignedTo:     s.assignedTo?._id || s.assignedTo||"",
        assignedToName: s.assignedTo?.name || "",
        discussion:     s.discussion ? new Date(s.discussion).toISOString().slice(0,16) : "",
        status:         s.status || "",
        reschedule:     s.reschedule ? new Date(s.reschedule).toISOString().slice(0,16) : "",
        remarks:        s.remarks || ""
      })));
    } else {
      setName(""); setPC(""); setClientName(""); setSchedules([]);
    }
  }, [ev, allPCs, isEdit]);

  const addRow = () => {
    setSchedules([...schedules, {
      scheduledOn:    new Date().toISOString().slice(0,10),
      action:         "",
      assignedTo:     "",
      assignedToName: "",
      discussion:     "",
      status:         "",
      reschedule:     "",
      remarks:        ""
    }]);
  };

  const updateRow = (i, field, val) => {
    const a = [...schedules];
    a[i][field] = val;
    // auto-mark not done if discussion in past and status blank
    if (field==="discussion" && a[i].status==="" && new Date(val) < new Date()) {
      a[i].status = "Not done";
    }
    setSchedules(a);
  };

  const removeRow = i => setSchedules(schedules.filter((_,j)=>j!==i));

  // PC suggestions
  const onPCChange = txt => {
    setName(txt); setClientName(""); setPC("");
    setPCSugs(allPCs.filter(pc=>pc.companyName.toLowerCase().includes(txt.toLowerCase())));
  };
  const pickPC = pc => {
    setPC(pc._id);
    setName(pc.companyName);
    setClientName(pc.contacts?.[0]?.clientName || "");
    setPCSugs([]);
  };

  // User suggestions
  const onUserType = (i, txt) => {
    updateRow(i,"assignedToName",txt);
    setUserSugs(users.filter(u=>u.name.toLowerCase().includes(txt.toLowerCase())));
  };
  const pickUser = (i,u) => {
    updateRow(i,"assignedTo",u._id);
    updateRow(i,"assignedToName",u.name);
    setUserSugs([]);
  };

  // submit
  const handleSubmit = async () => {
    // clean out empty assignedTo & assignedToName
    const cleanedSchedules = schedules.map(s=>{
      const c = { ...s };
      delete c.assignedToName;
      if (!c.assignedTo) delete c.assignedTo;
      return c;
    });

    const payload = { schedules: cleanedSchedules };
    if (potentialClient) payload.potentialClient = potentialClient;

    const cfg = { headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` } };
    try {
      if (isEdit) {
        await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/events/${ev._id}`,
          payload, cfg
        );
      } else {
        await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/events`,
          payload, cfg
        );
      }
      onClose();
    } catch (err) {
      console.error("Error saving event:", err.response?.data||err);
      alert("Failed to save event");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl p-6 rounded shadow-lg overflow-auto max-h-full">
        <h2 className="text-lg font-bold mb-4">{isEdit?"Edit":"Add"} Event</h2>

        {/* Company */}
        <div className="mb-4 relative">
          <label className="block text-sm font-medium mb-1">
            Potential Company Name
          </label>
          <input
            value={potentialClientName}
            onChange={e=>onPCChange(e.target.value)}
            className="border rounded w-full p-2 text-sm"
          />
          {pcSugs.length>0 && (
            <ul className="absolute bg-white border mt-1 max-h-32 overflow-auto w-full text-sm z-10">
              {pcSugs.map(pc=>(
                <li
                  key={pc._id}
                  onClick={()=>pickPC(pc)}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                >{pc.companyName}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Client Name */}
        {clientName && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Client Name</label>
            <div className="p-2 border rounded bg-gray-50 text-sm">
              {clientName}
            </div>
          </div>
        )}

        {/* Add Schedule */}
        <div className="mb-2">
          <button
            onClick={addRow}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
          >+ Add Schedule</button>
        </div>

        {/* Schedule Rows */}
        {schedules.map((s,i)=>(
          <div
            key={i}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm"
          >
            <div>
              <label className="block text-sm font-medium mb-1">
                Scheduled On
              </label>
              <input
                type="date"
                value={s.scheduledOn}
                onChange={e=>updateRow(i,"scheduledOn",e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Action
              </label>
              <select
                value={s.action}
                onChange={e=>updateRow(i,"action",e.target.value)}
                className="border rounded p-2 w-full"
              >
                <option value="">Select Action</option>
                {ACTIONS.map(a=>(
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {s.action==="Assign to CRM" && (
              <div className="relative md:col-span-3">
                <label className="block text-sm font-medium mb-1">
                  Assign to CRM
                </label>
                <input
                  value={s.assignedToName}
                  onChange={e=>onUserType(i,e.target.value)}
                  className="border rounded w-full p-2 text-sm"
                />
                {userSugs.length>0 && (
                  <ul className="absolute bg-white border mt-1 max-h-32 overflow-auto w-full z-10 text-sm">
                    {userSugs.map(u=>(
                      <li
                        key={u._id}
                        onClick={()=>pickUser(i,u)}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                      >{u.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">
                Discussion
              </label>
              <input
                type="datetime-local"
                value={s.discussion}
                onChange={e=>updateRow(i,"discussion",e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Status
              </label>
              <select
                value={s.status}
                onChange={e=>updateRow(i,"status",e.target.value)}
                className="border rounded p-2 w-full"
              >
                <option value="">Select Status</option>
                <option value="Done">Done</option>
                <option value="Not done">Not done</option>
              </select>
            </div>

            {s.status==="Not done" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Reschedule
                </label>
                <input
                  type="datetime-local"
                  value={s.reschedule}
                  onChange={e=>updateRow(i,"reschedule",e.target.value)}
                  className="border rounded p-2 w-full"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">
                Remarks
              </label>
              <input
                placeholder="Remarks"
                value={s.remarks}
                onChange={e=>updateRow(i,"remarks",e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>

            <div className="flex items-center justify-center">
              <button
                className="text-red-600 text-xl"
                onClick={()=>removeRow(i)}
              >&times;</button>
            </div>
          </div>
        ))}

        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm"
          >Cancel</button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm"
          >{isEdit?"Update":"Save"}</button>
        </div>
      </div>
    </div>
  );
}
