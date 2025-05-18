// client/src/components/potentialclientsList/PotentialClientTable.jsx
"use client";

import React, { useState, useMemo } from "react";

export default function PotentialClientTable({ data, onEdit, onDelete }) {
  // define columns
  const columns = [
    { label: "Company", field: "companyName" },
    { label: "Client(s)", field: "clientName" },
    { label: "Designation(s)", field: "designation" },
    { label: "Source(s)", field: "source" },
    { label: "Mobile(s)", field: "mobile" },
    { label: "Email(s)", field: "email" },
    { label: "Location(s)", field: "location" },
    { label: "Assigned To", field: "assignedTo" },
    { label: "Created By", field: "createdBy" },
    { label: "Created At", field: "createdAt" },
    { label: "Edit", field: null },
    { label: "Delete", field: null }
  ];

  // header filters
  const [filters, setFilters] = useState(
    columns.reduce((acc, col) => {
      if (col.field) acc[col.field] = "";
      return acc;
    }, {})
  );
  const handleFilter = (field, val) =>
    setFilters(f => ({ ...f, [field]: val }));

  // sorting
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const toggleSort = field => {
    setSortField(f => {
      if (f === field) {
        setSortOrder(o => (o === "asc" ? "desc" : "asc"));
        return f;
      } else {
        setSortOrder("asc");
        return field;
      }
    });
  };

  // prepare rows: flatten contacts
  const rows = useMemo(() => {
    return data.map(pc => {
      const clients = pc.contacts.map(c => c.clientName).join(", ");
      const designations = pc.contacts.map(c => c.designation).join(", ");
      const sources = pc.contacts.map(c => c.source).join(", ");
      const mobiles = pc.contacts.map(c => c.mobile).join(", ");
      const emails = pc.contacts.map(c => c.email).join(", ");
      const locations = pc.contacts.map(c => c.location).join(", ");
      const assigned = [
        ...new Set(pc.contacts.map(c => c.assignedTo?.name).filter(Boolean))
      ].join(", ");
      const createdBy = pc.createdBy?.name || "";
      const createdAt = pc.createdAt
        ? new Date(pc.createdAt).toLocaleString()
        : "";
      return {
        _id: pc._id,
        companyName: pc.companyName,
        clientName: clients,
        designation: designations,
        source: sources,
        mobile: mobiles,
        email: emails,
        location: locations,
        assignedTo: assigned,
        createdBy,
        createdAt
      };
    });
  }, [data]);

  // apply header filters
  const filtered = useMemo(() => {
    return rows.filter(r =>
      Object.entries(filters).every(([field, fVal]) => {
        if (!fVal) return true;
        const cell = (r[field] ?? "").toLowerCase();
        return cell.includes(fVal.toLowerCase());
      })
    );
  }, [rows, filters]);

  // apply sorting
  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortOrder]);

  if (!data.length) {
    return <div className="italic text-gray-600">No records found.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs text-gray-700 border">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(col => (
              <th
                key={col.label}
                onClick={() => col.field && toggleSort(col.field)}
                className={`px-2 py-1 border select-none ${
                  col.field ? "cursor-pointer hover:bg-gray-100" : ""
                }`}
                style={{ minWidth: "80px", maxWidth: "120px" }}
              >
                {col.label}
                {col.field && sortField === col.field && (
                  <span>{sortOrder === "asc" ? " ▲" : " ▼"}</span>
                )}
              </th>
            ))}
          </tr>
          <tr className="bg-gray-100">
            {columns.map(col => (
              <td key={col.label} className="px-2 py-1" style={{ minWidth: "80px", maxWidth: "120px" }}>
                {col.field ? (
                  <input
                    type="text"
                    placeholder="Filter…"
                    value={filters[col.field]}
                    onChange={e => handleFilter(col.field, e.target.value)}
                    className="w-full p-0.5 text-xs border rounded"
                  />
                ) : null}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r._id} className="hover:bg-gray-50">
              {columns.map(col => {
                if (col.field === null && col.label === "Edit") {
                  return (
                    <td key="edit" className="px-2 py-1 border text-center" style={{ minWidth: "80px", maxWidth: "120px" }}>
                      <button
                        onClick={() => onEdit(r)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Edit
                      </button>
                    </td>
                  );
                }
                if (col.field === null && col.label === "Delete") {
                  return (
                    <td key="del" className="px-2 py-1 border text-center" style={{ minWidth: "80px", maxWidth: "120px" }}>
                      <button
                        onClick={() => onDelete()}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  );
                }
                return (
                  <td
                    key={col.field}
                    className="px-2 py-1 border relative"
                    style={{ minWidth: "80px", maxWidth: "120px", height: "40px" }}
                  >
                    <div
                      className="line-clamp-2 overflow-hidden text-ellipsis hover:line-clamp-none hover:whitespace-normal hover:bg-gray-100 hover:max-w-xs hover:px-2 hover:py-1 hover:border hover:rounded hover:shadow-md"
                      title={r[col.field] || "—"}
                    >
                      {r[col.field] || "—"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
