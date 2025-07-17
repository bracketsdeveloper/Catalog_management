"use client";

import React, { useState, useMemo } from "react";
import { format, differenceInCalendarDays } from "date-fns";

export default function SampleOutTable({
  data,
  sortField,
  sortOrder,
  toggleSort,
  onEdit
}) {
  const [preview, setPreview] = useState(null);

  // define columns
  const columns = [
    { label: "Out Date", field: "sampleOutDate", isDate: true },
    { label: "Company", field: "clientCompanyName" },
    { label: "Client", field: "clientName" },
    { label: "Sent By", field: "sentByName" },
    { label: "Sample Ref", field: "sampleReferenceCode" },
    { label: "Picture", field: null },
    { label: "Product", field: "productName" },
    { label: "Brand", field: "brand" },
    { label: "Qty", field: "qty" },
    { label: "Color", field: "color" },
    { label: "Status", field: "sampleOutStatus" },
    { label: "Received Back", field: "receivedBack" },
    { label: "Returned To Vendor", field: "returned" }, // Added returned field
    { label: "Out Since (d)", field: "outSince" },
    { label: "Actions", field: null }
  ];

  // header filters state
  const [headerFilters, setHeaderFilters] = useState(
    columns.reduce((acc, col) => {
      if (col.field) acc[col.field] = "";
      return acc;
    }, {})
  );
  const handleFilterChange = (field, val) =>
    setHeaderFilters((h) => ({ ...h, [field]: val }));

  // compute "out since" days
  const computeOutSince = (r) =>
    r.receivedBack ? 0 : differenceInCalendarDays(new Date(), new Date(r.sampleOutDate));

  // apply header filters
  const filtered = useMemo(() => {
    return data.filter((r) =>
      Object.entries(headerFilters).every(([field, fVal]) => {
        if (!fVal) return true;
        let cell;
        if (field === "sampleOutDate") {
          cell = format(new Date(r.sampleOutDate), "dd/MM/yyyy");
        } else if (field === "receivedBack") {
          cell = r.receivedBack ? "Yes" : "No";
        } else if (field === "returned") {
          cell = r.returned ? "Yes" : "No"; // Added returned filter
        } else if (field === "outSince") {
          cell = computeOutSince(r).toString();
        } else {
          cell = (r[field] ?? "").toString();
        }
        return cell.toLowerCase().includes(fVal.toLowerCase());
      })
    );
  }, [data, headerFilters]);

  // apply sorting
  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case "sampleOutDate":
          av = new Date(a.sampleOutDate).getTime();
          bv = new Date(b.sampleOutDate).getTime();
          break;
        case "receivedBack":
          av = a.receivedBack ? 1 : 0;
          bv = b.receivedBack ? 1 : 0;
          break;
        case "returned":
          av = a.returned ? 1 : 0; // Added returned sort
          bv = b.receivedBack ? 1 : 0;
          break;
        case "outSince":
          av = computeOutSince(a);
          bv = computeOutSince(b);
          break;
        default:
          av = a[sortField] ?? "";
          bv = b[sortField] ?? "";
      }
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortOrder]);

  return (
    <>
      <div className="overflow-auto border rounded">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.label}
                  onClick={() => col.field && toggleSort(col.field)}
                  className={`px-3 py-2 text-left font-medium text-gray-600 uppercase select-none ${
                    col.field ? "cursor-pointer hover:bg-gray-100" : ""
                  }`}
                >
                  {col.label}
                  {col.field && sortField === col.field && (
                    <span>{sortOrder === "asc" ? " ▲" : " ▼"}</span>
                  )}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-100">
              {columns.map((col) => (
                <td key={col.label} className="px-3 py-1">
                  {col.field ? (
                    <input
                      type="text"
                      placeholder="Filter…"
                      value={headerFilters[col.field]}
                      onChange={(e) =>
                        handleFilterChange(col.field, e.target.value)
                      }
                      className="w-full p-1 border rounded text-xs"
                    />
                  ) : (
                    <div />
                  )}
                </td>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.map((r) => (
              <tr key={r._id}>
                {columns.map((col) => {
                  if (col.field === "sampleOutDate") {
                    return (
                      <td key="date" className="px-3 py-2">
                        {format(new Date(r.sampleOutDate), "dd/MM/yyyy")}
                      </td>
                    );
                  }
                  if (col.field === null && col.label === "Picture") {
                    return (
                      <td key="pic" className="px-3 py-2">
                        {r.productPicture ? (
                          <img
                            src={r.productPicture}
                            alt=""
                            className="h-10 w-10 object-contain cursor-pointer"
                            onClick={() => setPreview(r.productPicture)}
                          />
                        ) : (
                          <div className="h-10 w-10 border flex items-center justify-center text-xs">
                            No
                          </div>
                        )}
                      </td>
                    );
                  }
                  if (col.field === null && col.label === "Actions") {
                    return (
                      <td key="act" className="px-3 py-2">
                        <button
                          onClick={() => onEdit(r)}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                      </td>
                    );
                  }
                  if (col.field === "receivedBack") {
                    return (
                      <td key="rb" className="px-3 py-2">
                        {r.receivedBack ? "Yes" : "No"}
                      </td>
                    );
                  }
                  if (col.field === "returned") {
                    return (
                      <td key="rt" className="px-3 py-2">
                        {r.returned ? "Yes" : "No"} 
                      </td>
                    );
                  }
                  if (col.field === "outSince") {
                    return (
                      <td key="os" className="px-3 py-2">
                        {computeOutSince(r)}
                      </td>
                    );
                  }
                  return (
                    <td key={col.field} className="px-3 py-2">
                      {r[col.field]}
                    </td>
                  );
                })}
              </tr>
            ))}

            {!sorted.length && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center text-gray-500"
                >
                  No records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* image light-box */}
      {preview && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="relative">
            <button
              onClick={() => setPreview(null)}
              className="absolute top-2 right-2 text-white text-xl"
            >
              ×
            </button>
            <img
              src={preview}
              alt="Preview"
              className="max-h-[80vh] max-w-[90vw] object-contain rounded"
            />
          </div>
        </div>
      )}
    </>
  );
}