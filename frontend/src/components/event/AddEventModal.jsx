import React, { useState, useEffect } from "react";
import axios from "axios";

const ACTIONS = ["Call", "Mail", "Meet", "Msg", "Assign to"];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 6 }, (_, i) => String(i * 10).padStart(2, "0"));
const AMPM = ["AM", "PM"];

export default function AddEventModal({ ev, onClose, isSuperAdmin }) {
  const isEdit = Boolean(ev?._id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [companySugs, setCompanySugs] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSugs, setUserSugs] = useState([]);
  const [company, setCompany] = useState({ id: "", type: "" });
  const [companyName, setCompanyName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientNameSuggestions, setClientNameSuggestions] = useState([]);
  const [schedules, setSchedules] = useState([]);

  // Load companies and users
  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/search-companies`, { headers })
      .then((r) => setCompanies(r.data));
    axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/users?all=true`, { headers })
      .then((r) => setUsers(r.data));
  }, []);

  // Initialize schedules
  useEffect(() => {
    if (isEdit && companies.length) {
      const companyObj = companies.find((c) => c._id === ev.potentialClient);
      setCompany({ id: ev.potentialClient || "", type: companyObj?.type || "" });
      setCompanyName(ev.potentialClientName || "");
      setClientName(companyObj?.clients?.[0]?.name || companyObj?.clients?.[0]?.clientName || "");
      setClientNameSuggestions(companyObj?.clients || []);
      setSchedules(
        ev.schedules.map((s) => {
          const so = s.scheduledOn ? new Date(s.scheduledOn) : {};
          const rs = s.reschedule ? new Date(s.reschedule) : {};
          const formatDate = (dt) =>
            dt instanceof Date && !isNaN(dt)
              ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
                  dt.getDate()
                ).padStart(2, "0")}`
              : "";
          const formatHour = (dt) =>
            dt instanceof Date && !isNaN(dt)
              ? String(dt.getHours() % 12 || 12).padStart(2, "0")
              : "";
          const formatMinute = (dt) =>
            dt instanceof Date && !isNaN(dt) ? String(dt.getMinutes()).padStart(2, "0") : "";
          const formatAmpm = (dt) =>
            dt instanceof Date && !isNaN(dt) ? (dt.getHours() >= 12 ? "PM" : "AM") : "AM";
          return {
            scheduledDate: formatDate(so),
            scheduledHour: formatHour(so),
            scheduledMinute: formatMinute(so),
            scheduledAmpm: formatAmpm(so),
            action: s.action || "",
            assignedTo: s.assignedTo?._id || "",
            assignedToName: s.assignedTo?.name || "",
            discussion: s.discussion || "",
            status: s.status || "",
            rescheduleDate: formatDate(rs),
            rescheduleHour: formatHour(rs),
            rescheduleMinute: formatMinute(rs),
            rescheduleAmpm: formatAmpm(rs),
            remarks: s.remarks || "",
          };
        })
      );
    } else {
      setCompanyName(ev?.potentialClientName || "");
      setCompany({ id: ev?.potentialClient || "", type: "" });
      setClientName("");
      setClientNameSuggestions([]);
      setSchedules(
        ev?.schedules?.length
          ? ev.schedules.map((s) => ({
              scheduledDate: s.scheduledDate || "",
              scheduledHour: s.scheduledHour || "09",
              scheduledMinute: s.scheduledMinute || "00",
              scheduledAmpm: s.scheduledAmpm || "AM",
              action: s.action || "",
              assignedTo: s.assignedTo || "",
              assignedToName: s.assignedToName || "",
              discussion: s.discussion || "",
              status: s.status || "",
              rescheduleDate: s.rescheduleDate || "",
              rescheduleHour: s.rescheduleHour || "",
              rescheduleMinute: s.rescheduleMinute || "",
              rescheduleAmpm: s.rescheduleAmpm || "AM",
              remarks: s.remarks || "",
            }))
          : [
              {
                scheduledDate: "",
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
            ]
      );
      setCompanySugs(companies);
    }
  }, [ev, companies, isEdit]);

  // Add a blank row
  const addRow = () => {
    setSchedules((prev) => [
      ...prev,
      {
        scheduledDate: "",
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
    ]);
  };

  const updateRow = (i, field, val) =>
    setSchedules((prev) => {
      const arr = [...prev];
      arr[i] = { ...arr[i], [field]: val };
      if (
        field === "discussion" &&
        !arr[i].status &&
        arr[i].scheduledDate &&
        arr[i].scheduledHour &&
        arr[i].scheduledMinute &&
        arr[i].scheduledAmpm &&
        new Date(arr[i].scheduledDate + "T" + convertTo24hr(arr[i]) + ":00") < new Date()
      ) {
        arr[i].status = "Not done";
      }
      return arr;
    });

  const removeRow = (i) => setSchedules((prev) => prev.filter((_, j) => j !== i));

  const onCompanyNameChange = (txt) => {
    setCompanyName(txt);
    setCompany({ id: "", type: "" });
    setClientName("");
    setClientNameSuggestions([]);
    if (txt === "") {
      setCompanySugs(companies);
    } else if (txt.length >= 2) {
      axios
        .get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/search-companies?query=${encodeURIComponent(txt)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((res) => setCompanySugs(res.data))
        .catch((err) => {
          console.error("Error fetching company suggestions:", err);
          setCompanySugs([]);
        });
    } else {
      setCompanySugs([]);
    }
  };

  const pickCompany = (c) => {
    setCompany({ id: c._id, type: c.type });
    setCompanyName(`${c.name} (${c.type})`);
    setClientName("");
    const clients =
      c.clients?.map((client) => ({
        name: client.clientName || client.name,
        contact: client.contactNumber || client.mobile,
      })) || [];
    setClientNameSuggestions(clients);
    setCompanySugs([]);
  };

  const onClientNameChange = (txt) => {
    setClientName(txt);
    const companyObj = companies.find((c) => c._id === company.id && c.type === company.type);
    if (companyObj) {
      const clients = companyObj.clients
        .filter((client) =>
          (client.clientName || client.name).toLowerCase().includes(txt.toLowerCase())
        )
        .map((client) => ({
          name: client.clientName || client.name,
        }));
      setClientNameSuggestions(clients);
    }
  };

  const pickClientName = (client) => {
    setClientName(client.name);
    setClientNameSuggestions([]);
  };

  const onUserType = (i, txt) => {
    updateRow(i, "assignedToName", txt);
    setUserSugs(users.filter((u) => u.name.toLowerCase().includes(txt.toLowerCase())));
  };

  const pickUser = (i, u) => {
    updateRow(i, "assignedTo", u._id);
    updateRow(i, "assignedToName", u.name);
    setUserSugs([]);
  };

  // Convert 12h parts to HH:mm
  const convertTo24hr = (row) => {
    let h = parseInt(row.scheduledHour, 10);
    if (row.scheduledAmpm === "PM" && h < 12) h += 12;
    if (row.scheduledAmpm === "AM" && h === 12) h = 0;
    return String(h).padStart(2, "0") + ":" + row.scheduledMinute;
  };

  const convertReschedule = (row) => {
    let h = parseInt(row.rescheduleHour, 10);
    if (row.rescheduleAmpm === "PM" && h < 12) h += 12;
    if (row.rescheduleAmpm === "AM" && h === 12) h = 0;
    return String(h).padStart(2, "0") + ":" + row.rescheduleMinute;
  };

  // Submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const cleaned = schedules.map((s) => {
      const sch = {};
      if (s.scheduledDate && s.scheduledHour && s.scheduledMinute && s.scheduledAmpm) {
        sch.scheduledOn = new Date(`${s.scheduledDate}T${convertTo24hr(s)}:00`).toISOString();
      }
      if (s.action) sch.action = s.action;
      if (s.assignedTo) sch.assignedTo = s.assignedTo;
      if (s.discussion) sch.discussion = s.discussion;
      if (s.status) sch.status = s.status;
      if (s.rescheduleDate && s.rescheduleHour && s.rescheduleMinute && s.rescheduleAmpm) {
        sch.reschedule = new Date(
          `${s.rescheduleDate}T${convertReschedule(s)}:00`
        ).toISOString();
      }
      if (s.remarks) sch.remarks = s.remarks;
      return sch;
    });

    const payload = { schedules: cleaned };
    if (company.id) payload.potentialClient = company.id;

    const cfg = {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
        <h2 className="text-lg font-bold mb-4">{isEdit ? "Edit" : "Add"} Event</h2>

        {/* Company Name */}
        <div className="mb-4 relative">
          <label className="block text-sm font-medium mb-1">Company Name</label>
          <input
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            className="border rounded w-full p-2 text-sm bg-white"
            placeholder="Type to search companies..."
          />
          {companySugs.length > 0 && (
            <ul className="absolute bg-white border mt-1 max-h-32 overflow-auto w-full text-sm z-50">
              {companySugs.map((sug) => (
                <li
                  key={sug._id}
                  onClick={() => pickCompany(sug)}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                >
                  {`${sug.name} (${sug.type})`}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Client Name */}
        <div className="mb-4 relative">
          <label className="block text-sm font-medium mb-1">Client Name</label>
          <input
            value={clientName}
            onChange={(e) => onClientNameChange(e.target.value)}
            className="border rounded w-full p-2 text-sm bg-white"
            placeholder="Type or select a client name"
          />
          {clientNameSuggestions.length > 0 && (
            <ul className="absolute bg-white border mt-1 max-h-32 overflow-auto w-full text-sm z-50">
              {clientNameSuggestions.map((client, index) => (
                <li
                  key={index}
                  onClick={() => pickClientName(client)}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                >
                  {client.name}
                </li>
              ))}
            </ul>
          )}
        </div>

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
              <label className="block text-sm font-medium mb-1">Scheduled On</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <input
                    type="date"
                    value={s.scheduledDate}
                    onChange={(e) => updateRow(i, "scheduledDate", e.target.value)}
                    className="border rounded p-2 w-full bg-white"
                  />
                </div>
                <div className="flex space-x-1">
                  <select
                    value={s.scheduledHour}
                    onChange={(e) => updateRow(i, "scheduledHour", e.target.value)}
                    className="border rounded p-2 flex-1 bg-white"
                  >
                    <option value="">HH</option>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <select
                    value={s.scheduledMinute}
                    onChange={(e) => updateRow(i, "scheduledMinute", e.target.value)}
                    className="border rounded p-2 flex-1 bg-white"
                  >
                    <option value="">MM</option>
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={s.scheduledAmpm}
                    onChange={(e) => updateRow(i, "scheduledAmpm", e.target.value)}
                    className="border rounded p-2 w-16 bg-white"
                  >
                    {AMPM.map((ap) => (
                      <option key={ap} value={ap}>
                        {ap}
                      </option>
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
                onChange={(e) => updateRow(i, "action", e.target.value)}
                className="border rounded p-2 w-full bg-white"
              >
                <option value="">Select Action</option>
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Assign to */}
            {s.action === "Assign to" && (
              <div className="relative md:col-span-3">
                <label className="block text-sm font-medium mb-1">Assign to</label>
                <input
                  value={s.assignedToName}
                  onChange={(e) => onUserType(i, e.target.value)}
                  className="border rounded w-full p-2 text-sm bg-white"
                />
                {userSugs.length > 0 && (
                  <ul className="absolute bg-white border mt-1 max-h-32 overflow-auto w-full z-10 text-sm">
                    {userSugs.map((u) => (
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
                onChange={(e) => updateRow(i, "discussion", e.target.value)}
                className="border rounded p-2 w-full bg-white"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={s.status}
                onChange={(e) => updateRow(i, "status", e.target.value)}
                className="border rounded p-2 w-full bg-white"
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
                      onChange={(e) => updateRow(i, "rescheduleDate", e.target.value)}
                      className="border rounded p-2 w-full bg-white"
                    />
                  </div>
                  <div className="flex space-x-1">
                    <select
                      value={s.rescheduleHour}
                      onChange={(e) => updateRow(i, "rescheduleHour", e.target.value)}
                      className="border rounded p-2 flex-1 bg-white"
                    >
                      <option value="">HH</option>
                      {HOURS.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <select
                      value={s.rescheduleMinute}
                      onChange={(e) => updateRow(i, "rescheduleMinute", e.target.value)}
                      className="border rounded p-2 flex-1 bg-white"
                    >
                      <option value="">MM</option>
                      {MINUTES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      value={s.rescheduleAmpm}
                      onChange={(e) => updateRow(i, "rescheduleAmpm", e.target.value)}
                      className="border rounded p-2 w-16 bg-white"
                    >
                      {AMPM.map((ap) => (
                        <option key={ap} value={ap}>
                          {ap}
                        </option>
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
                onChange={(e) => updateRow(i, "remarks", e.target.value)}
                className="border rounded p-2 w-full bg-white"
              />
            </div>

            {/* Remove */}
            <div className="flex items-center justify-center">
              <button className="text-red-600 text-xl" onClick={() => removeRow(i)}>
                ×
              </button>
            </div>
          </div>
        ))}

        {/* Cancel / Save */}
        <div className="flex justify-end space-x-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-4 py-2 bg-green-600 text-white rounded text-sm ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isEdit ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}