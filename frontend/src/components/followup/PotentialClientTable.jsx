import React from "react";
import axios from "axios";

export default function PotentialClientTable({ data, onEdit, onDelete }) {
  const handleDelete = async id => {
    if (!window.confirm("Really delete this company?")) return;
    await axios.delete(
      `${process.env.REACT_APP_BACKEND_URL}/api/admin/potential-clients/${id}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );
    onDelete();
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-gray-700 border">
        <thead className="bg-gray-50">
          <tr>
            {[
              "Company",
              "# Contacts",
              "Assigned To",
              "Created By",
              "Created At",
              "Actions",
            ].map(h => (
              <th key={h} className="px-3 py-2 border text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(pc => {
            // get unique assigned-to names
            const assignedNames = [
              ...new Set(
                pc.contacts
                  .map(c => c.assignedTo?.name || "")
                  .filter(n => n)
              ),
            ].join(", ");

            return (
              <tr key={pc._id} className="hover:bg-gray-50">
                <td className="px-3 py-2 border">{pc.companyName}</td>
                <td className="px-3 py-2 border">{pc.contacts.length}</td>
                <td className="px-3 py-2 border">{assignedNames || "—"}</td>
                <td className="px-3 py-2 border">
                  {pc.createdBy?.name || "—"}
                </td>
                <td className="px-3 py-2 border">
                  {new Date(pc.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 border space-x-2">
                  <button
                    onClick={() => onEdit(pc)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(pc._id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
