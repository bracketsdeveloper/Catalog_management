// client/src/components/event/AddEventModal.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const ACTIONS = ["Call", "Msg", "Mail", "Meet", "Assign to CRM"];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const AMPM = ["AM", "PM"];

function splitTo12h(dtString) {
  const dt = new Date(dtString);
  const monthDay = dt.toISOString().slice(0, 10);
  let hr = dt.getHours();
  const mm = String(dt.getMinutes()).padStart(2, "0");
  const ampm = hr >= 12 ? "PM" : "AM";
  hr = hr % 12 || 12;
  return {
    date: monthDay,
    hour: String(hr).padStart(2, "0"),
    minute: mm,
    ampm
  };
}

export default function AddEventModal({ ev, onClose, isSuperAdmin }) {
  const isEdit = Boolean(ev);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [allPCs, setAllPCs] = useState([]);
  const [pcSugs, setPCSugs] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSugs, setUserSugs] = useState([]);
  const [potentialClient, setPC] = useState("");
  const [potentialClientName, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [schedules, setSchedules] = useState([]);

  // Load PCs & users
  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    // Add ?all=true for superadmins to bypass isolation
    const pcEndpoint = `${process.env.REACT_APP_BACKEND_URL}/api/admin/potential-clients${isSuperAdmin ? "?all=true" : ""}`;
    
    axios.get(pcEndpoint, { headers }).then(r => setAllPCs(r.data));

    axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/users?all=true`, { headers }).then(r => setUsers(r.data));
  }, [isSuperAdmin]);

  // Init when editing
  useEffect(() => {
    if (isEdit && allPCs.length) {
      const pcObj = allPCs.find(pc => pc._id === ev.potentialClient);
      setPC(ev.potentialClient);
      setName(ev.potentialClientName);
      setClientName(pcObj?.contacts?.[0]?.clientName || "");

      setSchedules(ev.schedules.map(s => {
        const so = s.scheduledOn ? splitTo12h(s.scheduledOn) : {};
        const rs = s.reschedule ? splitTo12h(s.reschedule) : {};
        return {
          scheduledDate: so.date || "",
          scheduledHour: so.hour || "",
          scheduledMinute: so.minute || "",
          scheduledAmpm: so.ampm || "AM",
          action: s.action || "",
          assignedTo: s.assignedTo?._id || "",
          assignedToName: s.assignedTo?.name || "",
          discussion: s.discussion || "",
          status: s.status || "",
          rescheduleDate: rs.date || "",
          rescheduleHour: rs.hour || "",
          rescheduleMinute: rs.minute || "",
          rescheduleAmpm: rs.ampm || "AM",
          remarks: s.remarks || ""
        };
      }));
    } else {
      setName(""); setPC(""); setClientName(""); setSchedules([]);
      // For superadmins, show all potential clients initially
      if (isSuperAdmin) {
        setPCSugs(allPCs);
      }
    }
  }, [ev, allPCs, isEdit, isSuperAdmin]);

  // Add a blank row
  const addRow = () => {
    const now = new Date();
    const { date, hour, minute, ampm } = splitTo12h(now.toISOString());
    setSchedules(prev => [
      ...prev,
      {
        scheduledDate: date,
        scheduledHour: hour,
        scheduledMinute: minute,
        scheduledAmpm: ampm,
        action: "",
        assignedTo: "",
        assignedToName: "",
        discussion: "",
        status: "",
        rescheduleDate: "",
        rescheduleHour: "",
        rescheduleMinute: "",
        rescheduleAmpm: "AM",
        remarks: ""
      }
    ]);
  };

  const updateRow = (i, field, val) =>
    setSchedules(prev => {
      const arr = [...prev];
      arr[i] = { ...arr[i], [field]: val };
      // auto-mark Not done if discussion in past
      if (
        field === "discussion" &&
        !arr[i].status &&
        new Date(arr[i].scheduledDate + "T" + convertTo24hr(arr[i]) + ":00") < new Date(val)
      ) {
        arr[i].status = "Not done";
      }
      return arr;
    });

  const removeRow = i =>
    setSchedules(prev => prev.filter((_, j) => j !== i));

  const onPCChange = txt => {
    setName(txt); setClientName(""); setPC("");
    // For superadmins, show all PCs if input is empty, else filter
    if (isSuperAdmin && txt === "") {
      setPCSugs(allPCs);
    } else {
      setPCSugs(
        allPCs.filter(pc =>
          pc.companyName.toLowerCase().includes(txt.toLowerCase())
        )
      );
    }
  };

  const pickPC = pc => {
    setPC(pc._id);
    setName(pc.companyName);
    setClientName(pc.contacts?.[0]?.clientName || "");
    setPCSugs([]);
  };

  const onUserType = (i, txt) => {
    updateRow(i, "assignedToName", txt);
    setUserSugs(users.filter(u =>
      u.name.toLowerCase().includes(txt.toLowerCase())
    ));
  };

  const pickUser = (i, u) => {
    updateRow(i, "assignedTo", u._id);
    updateRow(i, "assignedToName", u.name);
    setUserSugs([]);
  };

  // Convert our 12h parts to HH:mm
  const convertTo24hr = row => {
    let h = parseInt(row.scheduledHour, 10);
    if (row.scheduledAmpm === "PM" && h < 12) h += 12;
    if (row.scheduledAmpm === "AM" && h === 12) h = 0;
    return String(h).padStart(2, "0") + ":" + row.scheduledMinute;
  };

  const convertReschedule = row => {
    let h = parseInt(row.rescheduleHour, 10);
    if (row.rescheduleAmpm === "PM" && h < 12) h += 12;
    if (row.rescheduleAmpm === "AM" && h === 12) h = 0;
    return String(h).padStart(2, "0") + ":" + row.rescheduleMinute;
  };

  // Submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const cleaned = schedules.map(s => {
      const sch = {};
      if (s.scheduledDate) {
        sch.scheduledOn = new Date(
          `${s.scheduledDate}T${convertTo24hr(s)}:00`
        );
      }
      if (s.action) sch.action = s.action;
      if (s.assignedTo) sch.assignedTo = s.assignedTo;
      if (s.discussion) sch.discussion = s.discussion;
      if (s.status) sch.status = s.status;
      if (s.rescheduleDate) {
        sch.reschedule = new Date(
          `${s.rescheduleDate}T${convertReschedule(s)}:00`
        );
      }
      if (s.remarks) sch.remarks = s.remarks;
      return sch;
    });

    const payload = { schedules: cleaned };
    if (potentialClient) payload.potentialClient = potentialClient;

    const cfg = {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    };
    try {
      if (isEdit) {
        await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/events/${ev._id}`,
          payload,
          cfg
        );
      } else {
        await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/events`,
          payload,
          cfg
        );
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save event");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-3xl p-6 rounded shadow-lg overflow-auto max-h-full">
        <h2 className="text-lg font-bold mb-4">
          {isEdit ? "Edit" : "Add"} Event
        </h2>

        {/* Potential Company */}
        <div className="mb-4 relative">
          <label className="block text-sm font-medium mb-1">
            Potential Company Name
          </label>
          <input
            value={potentialClientName}
            onChange={e => onPCChange(e.target.value)}
            className="border rounded w-full p-2 text-sm"
          />
          {pcSugs.length > 0 && (
            <ul className="absolute bg-white border mt-1 max-h-32 overflow-auto w-full text-sm z-10">
              {pcSugs.map(pc => (
                <li
                  key={pc._id}
                  onClick={() => pickPC(pc)}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                >
                  {pc.companyName}
                </li>
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
          >
            + Add Schedule
          </button>
        </div>

        {/* Schedule Rows */}
        {schedules.map((s, i) => (
          <div
            key={i}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm relative"
          >
            {/* Scheduled On */}
            <div className="relative z-20">
              <label className="block text-sm font-medium mb-1">
                Scheduled On
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <input
                    type="date"
                    value={s.scheduledDate}
                    onChange={e => updateRow(i, "scheduledDate", e.target.value)}
                    className="border rounded p-2 w-full"
                  />
                </div>
                <div className="flex space-x-1">
                  <select
                    value={s.scheduledHour}
                    onChange={e => updateRow(i, "scheduledHour", e.target.value)}
                    className="border rounded p-2 flex-1"
                  >
                    <option value="">HH</option>
                    {HOURS.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <select
                    value={s.scheduledMinute}
                    onChange={e => updateRow(i, "scheduledMinute", e.target.value)}
                    className="border rounded p-2 flex-1"
                  >
                    <option value="">MM</option>
                    {MINUTES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={s.scheduledAmpm}
                    onChange={e => updateRow(i, "scheduledAmpm", e.target.value)}
                    className="border rounded p-2 w-16"
                  >
                    {AMPM.map(ap => (
                      <option key={ap} value={ap}>{ap}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Action */}
            <div>
              <label className="block text-sm font-medium mb-1">Action</label>
              <select
                value={s.action}
                onChange={e => updateRow(i, "action", e.target.value)}
                className="border rounded p-2 w-full"
              >
                <option value="">Select Action</option>
                {ACTIONS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Assign to CRM */}
            {s.action === "Assign to CRM" && (
              <div className="relative md:col-span-3">
                <label className="block text-sm font-medium mb-1">Assign to CRM</label>
                <input
                  value={s.assignedToName}
                  onChange={e => onUserType(i, e.target.value)}
                  className="border rounded w-full p-2 text-sm"
                />
                {userSugs.length > 0 && (
                  <ul className="absolute bg-white border mt-1 max-h-32 overflow-auto w-full z-10 text-sm">
                    {userSugs.map(u => (
                      <li
                        key={u._id}
                        onClick={() => pickUser(i, u)}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                      >
                        {u.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Discussion */}
            <div>
              <label className="block text-sm font-medium mb-1">Discussion</label>
              <input
                type="text"
                value={s.discussion}
                onChange={e => updateRow(i, "discussion", e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={s.status}
                onChange={e => updateRow(i, "status", e.target.value)}
                className="border rounded p-2 w-full"
              >
                <option value="">Select Status</option>
                <option value="Done">Done</option>
                <option value="Not done">Not done</option>
              </select>
            </div>

            {/* Reschedule */}
            {s.status === "Not done" && (
              <div className="relative z-20">
                <label className="block text-sm font-medium mb-1">Reschedule</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <input
                      type="date"
                      value={s.rescheduleDate}
                      onChange={e => updateRow(i, "rescheduleDate", e.target.value)}
                      className="border rounded p-2 w-full"
                    />
                  </div>
                  <div className="flex space-x-1">
                    <select
                      value={s.rescheduleHour}
                      onChange={e => updateRow(i, "rescheduleHour", e.target.value)}
                      className="border rounded p-2 flex-1"
                    >
                      <option value="">HH</option>
                      {HOURS.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <select
                      value={s.rescheduleMinute}
                      onChange={e => updateRow(i, "rescheduleMinute", e.target.value)}
                      className="border rounded p-2 flex-1"
                    >
                      <option value="">MM</option>
                      {MINUTES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={s.rescheduleAmpm}
                      onChange={e => updateRow(i, "rescheduleAmpm", e.target.value)}
                      className="border rounded p-2 w-16"
                    >
                      {AMPM.map(ap => (
                        <option key={ap} value={ap}>{ap}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium mb-1">Remarks</label>
              <input
                placeholder="Remarks"
                value={s.remarks}
                onChange={e => updateRow(i, "remarks", e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>

            {/* Remove */}
            <div className="flex items-center justify-center">
              <button
                className="text-red-600 text-xl"
                onClick={() => removeRow(i)}
              >
                ×
              </button>
            </div>
          </div>
        ))}

        {/* Cancel / Save */}
        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-4 py-2 bg-green-600 text-white rounded text-sm ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isEdit ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}