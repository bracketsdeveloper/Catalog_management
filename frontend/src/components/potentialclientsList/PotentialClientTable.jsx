// client/src/components/managepotentialclients/PotentialClientTable.jsx
import React from "react";

export default function PotentialClientTable({ data }) {
  if (!data.length) {
    return <div className="italic text-gray-600">No records found.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-gray-700 border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 border">Company</th>
            <th className="px-3 py-2 border">Client(s)</th>
            <th className="px-3 py-2 border">Designation(s)</th>
            <th className="px-3 py-2 border">Source(s)</th>
            <th className="px-3 py-2 border">Mobile(s)</th>
            <th className="px-3 py-2 border">Email(s)</th>
            <th className="px-3 py-2 border">Location(s)</th>
            <th className="px-3 py-2 border">Assigned To</th>
            <th className="px-3 py-2 border">Created By</th>
            <th className="px-3 py-2 border">Created At</th>
          </tr>
        </thead>
        <tbody>
          {data.map((pc) => {
            const clients      = pc.contacts.map(c => c.clientName).join(", ");
            const designations = pc.contacts.map(c => c.designation).join(", ");
            const sources      = pc.contacts.map(c => c.source).join(", ");
            const mobiles      = pc.contacts.map(c => c.mobile).join(", ");
            const emails       = pc.contacts.map(c => c.email).join(", ");
            const locations    = pc.contacts.map(c => c.location).join(", ");
            const assigned     = [
              ...new Set(
                pc.contacts
                  .map(c => c.assignedTo?.name || "")
                  .filter(n => n)
              )
            ].join(", ");
            return (
              <tr key={pc._id} className="hover:bg-gray-50">
                <td className="px-3 py-2 border">{pc.companyName}</td>
                <td className="px-3 py-2 border">{clients}</td>
                <td className="px-3 py-2 border">{designations}</td>
                <td className="px-3 py-2 border">{sources}</td>
                <td className="px-3 py-2 border">{mobiles}</td>
                <td className="px-3 py-2 border">{emails}</td>
                <td className="px-3 py-2 border">{locations}</td>
                <td className="px-3 py-2 border">{assigned || "—"}</td>
                <td className="px-3 py-2 border">{pc.createdBy?.name || "—"}</td>
                <td className="px-3 py-2 border">
                  {new Date(pc.createdAt).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
