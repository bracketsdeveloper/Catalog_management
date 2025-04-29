
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { TrashIcon } from '@heroicons/react/24/solid'; // or `/outline` for outlined style

/* ───────────────── Header Filters ───────────────── */
function HeaderFilters({ headerFilters, onFilterChange }) {
  const columns = [
    { key: "jobSheetCreatedDate", label: "Job Sheet Created Date" },
    { key: "jobSheetNumber", label: "Job Sheet Number" },
    { key: "clientCompanyName", label: "Client Company Name" },
    { key: "eventName", label: "Event Name" },
    { key: "product", label: "Product" },
    { key: "size", label: "Size" },
    { key: "qtyRequired", label: "Qty Required" },
    { key: "qtyOrdered", label: "Qty Ordered" },
    { key: "sourcingFrom", label: "Sourced From" },
    { key: "deliveryDateTime", label: "Delivery Date" },
    { key: "vendorContactNumber", label: "Vendor Contact Number" },
    { key: "orderConfirmedDate", label: "Order Confirmed Date" },
    { key: "expectedReceiveDate", label: "Expected Receive Date" },
    { key: "schedulePickUp", label: "Schedule Pick Up" },
    { key: "remarks", label: "Remarks" },
    { key: "status", label: "Status" }
  ];

  return (
    <tr className="bg-gray-100">
      {columns.map((c) => (
        <th key={c.key} className="p-1 border border-gray-300">
          <input
            className="w-full p-1 text-xs border rounded"
            placeholder={`Filter ${c.label}`}
            value={headerFilters[c.key] || ""}
            onChange={(e) => onFilterChange(c.key, e.target.value)}
            type="text"
          />
        </th>
      ))}
      <th className="p-1 border border-gray-300">Actions</th>
    </tr>
  );
}

/* ───────────────── Follow-Up Modal ───────────────── */
function FollowUpModal({ followUps, onUpdate, onClose }) {
  const [local, setLocal] = useState(followUps || []);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const add = () => {
    if (!date.trim() || !note.trim()) return;
    setLocal((p) => [
      ...p,
      { updatedAt: new Date(), followUpDate: date, note, done: false, updatedBy: "admin" }
    ]);
    setDate("");
    setNote("");
  };

  const remove = (i) =>
    setLocal((p) => {
      const u = [...p];
      u.splice(i, 1);
      return u;
    });

  const markDone = (i) =>
    setLocal((p) => {
      const u = [...p];
      u[i].done = true;
      return u;
    });

  const close = () => {
    onUpdate(local);
    onClose();
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-purple-700">Manage Follow Ups</h3>
          <button onClick={close} className="text-2xl">
            &times;
          </button>
        </div>

        <div className="mb-4 space-y-2">
          <label className="text-sm font-bold">Add New Follow Up:</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="p-1 border rounded text-sm"
            />
            <input
              type="text"
              placeholder="Enter note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="p-1 border rounded text-sm flex-grow"
            />
            <button onClick={add} className="bg-blue-600 text-white px-2 py-1 rounded text-sm">
              Add
            </button>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto border p-2 mb-4">
          {local.length === 0 && <p className="text-sm text-gray-600">No follow ups.</p>}
          {local.map((fu, i) => {
            const overdue = !fu.done && fu.followUpDate < today;
            return (
              <div
                key={i}
                className={`flex justify-between items-center text-xs border-b py-1 ${
                  overdue ? "bg-red-200" : ""
                }`}
              >
                <span>
                  {fu.followUpDate} – {fu.note} {fu.done && "(Done)"}
                </span>
                <div className="flex gap-2">
                  {!fu.done && (
                    <button
                      onClick={() => markDone(i)}
                      className="bg-green-600 text-white px-2 py-0.5 rounded text-xs"
                    >
                      Done
                    </button>
                  )}
                  <button onClick={() => remove(i)} className="text-red-600 text-xs">
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button onClick={close} className="bg-green-700 text-white px-4 py-1.5 rounded text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Edit Modal ───────────────── */
const statusOptions = ["", "pending", "received", "alert"];

function EditPurchaseModal({ purchase, onClose, onSave }) {
  const [data, setData] = useState({ ...purchase });
  const [fuModal, setFuModal] = useState(false);

  const change = (f, v) => setData((p) => ({ ...p, [f]: v }));
  const save = () => {
    if (data.status === "received") {
      if (!window.confirm("Marked RECEIVED. Save changes?")) return;
    }
    onSave(data);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white p-6 rounded w-full max-w-3xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-purple-700">Edit Open Purchase</h2>
            <button onClick={onClose} className="text-2xl">
              &times;
            </button>
          </div>

          <form className="space-y-4 text-sm">
            {/* Row 1 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-bold">Job Sheet Number:</label> {data.jobSheetNumber}
              </div>
              <div>
                <label className="font-bold">Job Sheet Date:</label>{" "}
                {new Date(data.jobSheetCreatedDate).toLocaleDateString()}
              </div>
              <div>
                <label className="font-bold">Client Company Name:</label> {data.clientCompanyName}
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-bold">Event Name:</label> {data.eventName}
              </div>
              <div>
                <label className="font-bold">Product:</label> {data.product}
              </div>
              <div>
                <label className="font-bold">Size:</label> {data.size || "N/A"}
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-bold">Sourced From:</label> {data.sourcingFrom}
              </div>
              <div>
                <label className="font-bold">Delivery Date:</label>{" "}
                {data.deliveryDateTime ? new Date(data.deliveryDateTime).toLocaleDateString() : "N/A"}
              </div>
              <div>
                <label className="font-bold">Qty Required:</label> {data.qtyRequired}
              </div>
            </div>

            {/* Editable Row 4 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold">Qty Ordered:</label>
                <input
                  type="number"
                  value={data.qtyOrdered || ""}
                  onChange={(e) => change("qtyOrdered", parseInt(e.target.value) || 0)}
                  className="w-full border p-1"
                />
              </div>
              <div>
                <label className="font-bold">Vendor Contact Number:</label>
                <input
                  type="text"
                  value={data.vendorContactNumber || ""}
                  onChange={(e) => change("vendorContactNumber", e.target.value)}
                  className="w-full border p-1"
                />
              </div>
            </div>

            {/* Editable Row 5 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold">Remarks:</label>
                <input
                  type="text"
                  value={data.remarks || ""}
                  onChange={(e) => change("remarks", e.target.value)}
                  className="w-full border p-1"
                />
              </div>
              <div>
                <label className="font-bold">Order Confirmed Date:</label>
                <input
                  type="date"
                  value={data.orderConfirmedDate ? data.orderConfirmedDate.substring(0, 10) : ""}
                  onChange={(e) => change("orderConfirmedDate", e.target.value)}
                  className="w-full border p-1"
                />
              </div>
            </div>

            {/* Editable Row 6 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-bold">Expected Receive Date:</label>
                <input
                  type="date"
                  value={data.expectedReceiveDate ? data.expectedReceiveDate.substring(0, 10) : ""}
                  onChange={(e) => change("expectedReceiveDate", e.target.value)}
                  className="w-full border p-1"
                />
              </div>
              <div>
                <label className="font-bold">Schedule Pick Up:</label>
                <input
                  type="datetime-local"
                  value={data.schedulePickUp ? data.schedulePickUp.substring(0, 16) : ""}
                  onChange={(e) => change("schedulePickUp", e.target.value)}
                  className="w-full border p-1"
                />
              </div>
              <div>
                <label className="font-bold">Status:</label>
                <select
                  value={data.status}
                  onChange={(e) => change("status", e.target.value)}
                  className="w-full border p-1"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s === "" ? "Empty" : s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setFuModal(true)}
                className="bg-blue-600 text-white px-2 py-1 rounded text-sm"
              >
                View Follow Ups
              </button>
            </div>
          </form>

          <div className="flex justify-end gap-4 mt-6">
            <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100">
              Cancel
            </button>
            <button onClick={save} className="px-4 py-2 bg-green-700 text-white rounded">
              Save
            </button>
          </div>
        </div>
      </div>

      {fuModal && (
        <FollowUpModal
          followUps={data.followUp}
          onUpdate={(f) => change("followUp", f)}
          onClose={() => setFuModal(false)}
        />
      )}
    </>
  );
}

/* ───────────────── Main Component ───────────────── */
export default function OpenPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [currentEdit, setCurrentEdit] = useState(null);
  const [viewFuModal, setViewFuModal] = useState(false);
  const [viewFuId, setViewFuId] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ key: "deliveryDateTime", direction: "asc" });
  const [perms, setPerms] = useState([]);

  useEffect(() => {
    const str = localStorage.getItem("permissions");
    if (str) {
      try {
        setPerms(JSON.parse(str));
      } catch (_) {}
    }
  }, []);
  const canEdit = perms.includes("write-purchase");


  //sorceby logic
const handleSourcedByChange = async (e, id) => {
  const selectedSourcedBy = e.target.value;
  
  const token = localStorage.getItem('token'); // Or sessionStorage, wherever you saved after login

  try {
    await axios.put(
      `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${id}`,
      { sourcedBy: selectedSourcedBy },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setPurchases((prevPurchases) =>
      prevPurchases.map((purchase) =>
        purchase._id === id
          ? { ...purchase, sourcedBy: selectedSourcedBy }
          : purchase
      )
    );
  } catch (error) {
    console.error("Error updating sourcedBy:", error);
    alert("Failed to update sourcedBy!");
  }
};

const handleSourcedByDelete = async (id) => {
  const token = localStorage.getItem("token");

  try {
    await axios.put(
           `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${id}`,
      { sourcedBy: "" }, // Clear the sourcedBy field
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setPurchases((prevPurchases) =>
      prevPurchases.map((purchase) =>
        purchase._id === id ? { ...purchase, sourcedBy: "" } : purchase
      )
    );
  } catch (error) {
    console.error("Error deleting sourcedBy:", error);
    alert("Failed to delete sourcedBy");
  }
};



  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const url = `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases?sortKey=${sort.key}&sortDirection=${sort.direction}`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setPurchases(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchPurchases();
  }, [sort]);

  const globalFiltered = purchases.filter((p) => {
    const s = search.toLowerCase();
    return (
      (p.jobSheetNumber || "").toLowerCase().includes(s) ||
      (p.clientCompanyName || "").toLowerCase().includes(s) ||
      (p.eventName || "").toLowerCase().includes(s) ||
      (p.product || "").toLowerCase().includes(s) ||
      (p.size || "").toLowerCase().includes(s) ||
      (p.sourcingFrom || "").toLowerCase().includes(s) ||
      (p.vendorContactNumber || "").toLowerCase().includes(s)
    );
  });

  const headerFiltered = globalFiltered.filter((r) => {
    const keys = [
      "jobSheetCreatedDate",
      "jobSheetNumber",
      "clientCompanyName",
      "eventName",
      "product",
      "size",
      "qtyRequired",
      "qtyOrdered",
      "sourcingFrom",
      "deliveryDateTime",
      "vendorContactNumber",
      "orderConfirmedDate",
      "expectedReceiveDate",
      "schedulePickUp",
      "remarks",
      "status"
    ];
    return keys.every((k) => {
      if (!filters[k]) return true;
      let v = "";
      if (r[k]) {
        if (k.includes("Date") || k === "schedulePickUp" || k === "deliveryDateTime") {
          v = new Date(r[k]).toLocaleDateString();
        } else {
          v = String(r[k]);
        }
      }
      return v.toLowerCase().includes(filters[k].toLowerCase());
    });
  });

  const groupFilter = (recs) => {
    const g = {};
    recs.forEach((r) => {
      const k = r.jobSheetNumber;
      (g[k] = g[k] || []).push(r);
    });
    const out = [];
    Object.values(g).forEach((arr) => {
      if (!arr.every((a) => a.status === "received")) out.push(...arr);
    });
    return out;
  };

  const filterNA = (recs) => {
    const g = {};
    recs.forEach((r) => {
      const k = `${r.jobSheetNumber}_${r.product}`;
      (g[k] = g[k] || []).push(r);
    });
    const out = [];
    Object.values(g).forEach((arr) => {
      const hasReal = arr.some((a) => a.size && a.size.toLowerCase() !== "n/a");
      if (hasReal) {
        out.push(...arr.filter((a) => a.size && a.size.toLowerCase() !== "n/a"));
      } else {
        out.push(...arr);
      }
    });
    return out;
  };

  const rows = filterNA(groupFilter(headerFiltered));

  const changeFilter = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

  const sortBy = (k) =>
    setSort((p) => ({ key: k, direction: p.key === k && p.direction === "asc" ? "desc" : "asc" }));

  const openEdit = (p) => {
    if (!canEdit) return alert("No permission.");
    setCurrentEdit(p);
    setEditModal(true);
  };

  const saveEdit = async (u) => {
    try {
      const token = localStorage.getItem("token");
      const tmp = u._id && u._id.startsWith("temp_");
      const body = { ...u };
      if (tmp || u.isTemporary) delete body._id;

      if (!tmp && !u.isTemporary) {
        await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${u._id}`,
          body,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`,
          body,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      await fetchPurchases();
      setEditModal(false);
      setCurrentEdit(null);
      alert("Saved.");
    } catch (err) {
      console.error(err);
      alert("Error saving.");
    }
  };

  const deletePurchase = async (p) => {
    if (!canEdit) return alert("No permission.");
    if (p.isTemporary || (p._id && p._id.startsWith("temp_"))) return;
    if (!window.confirm("Delete this purchase?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases/${p._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPurchases((prev) => prev.filter((x) => x._id !== p._id));
      alert("Deleted.");
    } catch (err) {
      console.error(err);
      alert("Error deleting.");
    }
  };

  if (loading)
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-purple-700 mb-4">Open Purchases</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );

  return (
    <div className="p-6">
      {!canEdit && (
        <div className="mb-4 p-2 bg-red-200 text-red-800 border border-red-400 rounded">
          You don't have permission to edit purchase records.
        </div>
      )}

      <h1 className="text-2xl font-bold text-purple-700 mb-4">Open Purchases</h1>

      <input
        className="w-full p-2 border rounded mb-4"
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        type="text"
      />

      <table className="min-w-full border-collapse border border-gray-300 text-xs">
        <thead className="bg-gray-50">
          <tr>
            {[
              { k: "jobSheetCreatedDate", l: "Job Sheet Created Date" },
              { k: "jobSheetNumber", l: "Job Sheet Number" },
              { k: "clientCompanyName", l: "Client Company Name" },
              { k: "eventName", l: "Event Name" },
              { k: "product", l: "Product" },
              { k: "size", l: "Size" },
              { k: "qtyRequired", l: "Qty Required" },
              { k: "qtyOrdered", l: "Qty Ordered" },
              { k: "sourcingBy", l: "Sourced By" },
              { k: "sourcingFrom", l: "Sourced From" },
              { k: "deliveryDateTime", l: "Delivery Date" },
              { k: "vendorContactNumber", l: "Vendor Contact Number" },
              { k: "orderConfirmedDate", l: "Order Confirmed Date" },
              { k: "expectedReceiveDate", l: "Expected Receive Date" },
              { k: "schedulePickUp", l: "Schedule Pick Up" }
            ].map(({ k, l }) => (
              <th key={k} onClick={() => sortBy(k)} className="p-2 border cursor-pointer">
                {l} {sort.key === k ? (sort.direction === "asc" ? "↑" : "↓") : ""}
              </th>
            ))}
            <th className="p-2 border">Follow Up</th>
            <th onClick={() => sortBy("remarks")} className="p-2 border cursor-pointer">
              Remarks {sort.key === "remarks" ? (sort.direction === "asc" ? "↑" : "↓") : ""}
            </th>
            <th onClick={() => sortBy("status")} className="p-2 border cursor-pointer">
              Status {sort.key === "status" ? (sort.direction === "asc" ? "↑" : "↓") : ""}
            </th>
            <th className="p-2 border">Actions</th>
          </tr>
          <HeaderFilters headerFilters={filters} onFilterChange={changeFilter} />
        </thead>

        <tbody>
          {rows.map((p) => {
            const latest =
              p.followUp && p.followUp.length
                ? p.followUp.reduce((l, fu) => (new Date(fu.updatedAt) > new Date(l.updatedAt) ? fu : l))
                : null;

            return (
              <tr
                key={p._id || `${p.jobSheetNumber}_${p.product}_${p.size || ""}`}
                className={
                  p.status === "alert"
                    ? "bg-red-300"
                    : p.status === "pending"
                    ? "bg-orange-300"
                    : p.status === "received"
                    ? "bg-green-300"
                    : ""
                }
              >
                <td className="p-2 border">{new Date(p.jobSheetCreatedDate).toLocaleDateString()}</td>
                <td className="p-2 border">{p.jobSheetNumber}</td>
                <td className="p-2 border">{p.clientCompanyName}</td>
                <td className="p-2 border">{p.eventName}</td>
                <td className="p-2 border">{p.product}</td>
                <td className="p-2 border">{p.size || "N/A"}</td>
                <td className="p-2 border">{p.qtyRequired}</td>
                <td className="p-2 border">{p.qtyOrdered}</td>
                 <td className="p-2 border">
                    {p.sourcedBy ? (
                      <div className="flex justify-between">
                       <div>
                      <span className="text-sm font-medium text-gray-700">{p.sourcedBy}</span>
                        </div>
                        <div>
                       <button
                        onClick={() => handleSourcedByDelete(p._id)}
                        className="text-red-600 text-sm underline"
                      >
                        <TrashIcon className="h-4 w-4" />
                        </button>
                        </div>
                    </div>
                    ) : (
                      <select
                        name="sourcedBy"
                        value={p.sourcedBy}
                        onChange={(e) => handleSourcedByChange(e, p._id)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="">Select</option>
                        <option value="Mohan">Mohan</option>
                        <option value="Neeraj">Neeraj</option>
                        <option value="Sathya">Sathya</option>
                        <option value="Vijaylakshmi">Vijaylakshmi</option>
                      </select>
                    )}

                  </td>

                <td className="p-2 border">{p.sourcingFrom}</td>
                <td className="p-2 border">
                  {p.deliveryDateTime ? new Date(p.deliveryDateTime).toLocaleDateString() : ""}
                </td>
                <td className="p-2 border">{p.vendorContactNumber}</td>
                <td className="p-2 border">
                  {p.orderConfirmedDate ? new Date(p.orderConfirmedDate).toLocaleDateString() : ""}
                </td>
                <td className="p-2 border">
                  {p.expectedReceiveDate ? new Date(p.expectedReceiveDate).toLocaleDateString() : ""}
                </td>
                <td className="p-2 border">
                  {p.schedulePickUp ? new Date(p.schedulePickUp).toLocaleString() : ""}
                </td>
                <td className="p-2 border">
                  {latest ? (
                    <button
                      className="text-blue-600 underline"
                      onClick={() => {
                        setViewFuId(p._id);
                        setViewFuModal(true);
                      }}
                    >
                      {latest.note} ({latest.followUpDate}
                      {latest.done ? ", Done" : ""})
                    </button>
                  ) : (
                    "No follow-ups"
                  )}
                </td>
                <td className="p-2 border">{p.remarks}</td>
                <td className="p-2 border">{p.status}</td>
                <td className="p-2 border space-y-1">
                  <button
                    className="bg-blue-700 text-white w-full rounded py-0.5 text-[10px]"
                    disabled={!canEdit || p.status === "received"}
                    title={
                      !canEdit
                        ? "No permission"
                        : p.status === "received"
                        ? "Cannot edit received"
                        : ""
                    }
                    onClick={() => openEdit(p)}
                  >
                    Edit
                  </button>
                  {!p.isTemporary && !(p._id || "").startsWith("temp_") && (
                    <button
                      className="bg-red-700 text-white w-full rounded py-0.5 text-[10px]"
                      disabled={!canEdit}
                      onClick={() => deletePurchase(p)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editModal && currentEdit && (
        <EditPurchaseModal
          purchase={currentEdit}
          onClose={() => setEditModal(false)}
          onSave={saveEdit}
        />
      )}

      {viewFuModal && viewFuId && (
        <FollowUpModal
          followUps={purchases.find((x) => x._id === viewFuId)?.followUp || []}
          onUpdate={(f) =>
            setPurchases((prev) => prev.map((x) => (x._id === viewFuId ? { ...x, followUp: f } : x)))
          }
          onClose={() => {
            setViewFuModal(false);
            setViewFuId(null);
          }}
        />
      )}
    </div>
  );
}
