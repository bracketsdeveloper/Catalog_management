import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/* Small helpers */
const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString() : "";
const nz = (s) => (s ? s : "");

const TYPES = {
  PUBLIC: "PUBLIC",
  RESTRICTED: "RESTRICTED",
};

export default function HolidaysPage() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token = localStorage.getItem("token");

  const [activeType, setActiveType] = useState(TYPES.PUBLIC);
  const [holidays, setHolidays] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ date: "", name: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const fetchList = async (type = activeType) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/holidays?type=${type}`,
        { headers: authHeader }
      );
      setHolidays(res.data.holidays || []);
    } catch (e) {
      console.error(e);
      setHolidays([]);
      alert("Failed to fetch holidays");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(activeType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return holidays;
    return holidays.filter((h) => {
      const hay = [
        h.name,
        fmtDate(h.date),
        h?.createdBy?.name,
        h?.createdBy?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [holidays, searchTerm]);

  const openAdd = () => {
    setEditId(null);
    setForm({ date: "", name: "" });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (h) => {
    setEditId(h._id);
    setForm({ date: fmtDate(h.date), name: h.name });
    setError("");
    setModalOpen(true);
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this holiday?")) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/admin/holidays/${id}`, {
        headers: authHeader,
      });
      fetchList();
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    }
  };

  const onSave = async () => {
    try {
      setSaving(true);
      setError("");
      const payload = { name: form.name.trim(), date: form.date };

      if (!payload.name) {
        setError("Holiday name is required");
        setSaving(false);
        return;
      }
      if (!payload.date || isNaN(new Date(payload.date).getTime())) {
        setError("Valid date is required");
        setSaving(false);
        return;
      }

      if (!editId) {
        await axios.post(
          `${BACKEND_URL}/api/admin/holidays`,
          { ...payload, type: activeType },
          { headers: authHeader }
        );
      } else {
        await axios.put(
          `${BACKEND_URL}/api/admin/holidays/${editId}`,
          payload,
          { headers: authHeader }
        );
      }
      setModalOpen(false);
      fetchList();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 409
          ? "Entry already exists for that date"
          : "Save failed");
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto text-sm">
      {/* Top toggles */}
      <div className="flex items-center gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded ${activeType === TYPES.PUBLIC ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveType(TYPES.PUBLIC)}
        >
          Holidays
        </button>
        <button
          className={`px-4 py-2 rounded ${activeType === TYPES.RESTRICTED ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveType(TYPES.RESTRICTED)}
        >
          Restricted Holidays
        </button>

        <div className="ml-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Search by name, date, creator"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <button onClick={openAdd} className="bg-orange-500 text-white px-3 py-1 rounded">
            Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-2 text-left">Date</th>
              <th className="border p-2 text-left">Holiday Name</th>
              <th className="border p-2 text-left">Created By</th>
              <th className="border p-2 text-left">Created At</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3 text-center" colSpan={5}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="p-3 text-center" colSpan={5}>No records</td></tr>
            ) : (
              filtered.map((h) => (
                <tr key={h._id} className="hover:bg-gray-50">
                  <td className="border p-2">{fmtDate(h.date)}</td>
                  <td className="border p-2">{h.name}</td>
                  <td className="border p-2">
                    {nz(h?.createdBy?.name) || "-"}
                    {h?.createdBy?.email ? ` (${h.createdBy.email})` : ""}
                  </td>
                  <td className="border p-2">{fmtDateTime(h.createdAt)}</td>
                  <td className="border p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(h)}
                        className="px-3 py-1 bg-blue-600 text-white rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(h._id)}
                        className="px-3 py-1 bg-red-600 text-white rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                {editId ? "Edit" : "Add"} {activeType === TYPES.PUBLIC ? "Holiday" : "Restricted Holiday"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-xl leading-none">×</button>
            </div>

            {error ? (
              <div className="bg-red-100 text-red-700 p-2 rounded mb-3">{error}</div>
            ) : null}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="w-full border rounded px-2 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Holiday Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Independence Day"
                  className="w-full border rounded px-2 py-2"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="border px-4 py-2 rounded">
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className={`px-4 py-2 text-white rounded ${saving ? "bg-blue-400" : "bg-blue-600"}`}
              >
                {saving ? "Saving..." : editId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
