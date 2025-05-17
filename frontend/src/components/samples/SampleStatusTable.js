// client/src/components/samples/SampleStatusTable.jsx
"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";

export default function SampleStatusTable({
  samples,
  outs,
  sortField,
  sortOrder,
  toggleSort
}) {
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // group outs by reference
  const mapByRef = useMemo(() => {
    return outs.reduce((acc, o) => {
      acc[o.sampleReferenceCode] = acc[o.sampleReferenceCode] || [];
      acc[o.sampleReferenceCode].push(o);
      return acc;
    }, {});
  }, [outs]);

  // define columns
  const columns = [
    { label: "Ref Code", field: "sampleReferenceCode" },
    { label: "Prod Code", field: "productId" },
    { label: "In Date", field: "sampleInDate", isDate: true },
    { label: "Picture", field: null },
    { label: "Name", field: "productName" },
    { label: "Category", field: "category" },
    { label: "Sub Cat", field: "subCategory" },
    { label: "Brand", field: "brandName" },
    { label: "Specs", field: "productDetails" },
    { label: "Color", field: "color" },
    { label: "Vendor/Client", field: "fromVendorClient" },
    { label: "Rate", field: "sampleRate" },
    { label: "On-Hand Qty", field: "onHand" },
    { label: "Returnable", field: "returnable" },
    { label: "Days", field: "returnableDays" }
  ];

  // build base rows
  const baseRows = useMemo(() => {
    return samples.map(s => {
      const list     = mapByRef[s.sampleReferenceCode] || [];
      const totalOut = list.reduce((sum,o) => sum + Number(o.qty), 0);
      const totalRet = list.reduce((sum,o) => sum + Number(o.qtyReceivedBack), 0);
      return {
        ...s,
        onHand: s.qty - totalOut + totalRet
      };
    });
  }, [samples, mapByRef]);

  // header filters state
  const [headerFilters, setHeaderFilters] = useState(
    columns.reduce((acc, col) => {
      if (col.field) acc[col.field] = "";
      return acc;
    }, {})
  );
  const handleFilterChange = (field, val) =>
    setHeaderFilters(h => ({ ...h, [field]: val }));

  // apply header filters
  const filtered = useMemo(() => {
    return baseRows.filter(r =>
      Object.entries(headerFilters).every(([field, fVal]) => {
        if (!fVal) return true;
        let cell;
        if (field === "sampleReferenceCode") {
          cell = r[field];
        } else if (field === "sampleInDate") {
          cell = format(new Date(r.sampleInDate), "dd/MM/yyyy");
        } else {
          cell = (r[field] ?? "").toString();
        }
        return cell.toLowerCase().includes(fVal.toLowerCase());
      })
    );
  }, [baseRows, headerFilters]);

  // apply sorting
  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      let av, bv;
      if (sortField === "sampleInDate") {
        av = new Date(a.sampleInDate).getTime();
        bv = new Date(b.sampleInDate).getTime();
      } else {
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
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative">
            <button
              className="absolute top-2 right-2 text-white text-2xl"
              onClick={() => setLightboxSrc(null)}
            >
              &times;
            </button>
            <img
              src={lightboxSrc}
              alt="Preview"
              className="max-h-[80vh] max-w-[90vw] object-contain rounded"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(col => (
                <th
                  key={col.label}
                  onClick={() => col.field && toggleSort(col.field)}
                  className={`px-2 py-1 text-left font-medium text-gray-500 uppercase select-none ${
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
              {columns.map(col => (
                <td key={col.label} className="px-2 py-1">
                  {col.field ? (
                    <input
                      type="text"
                      placeholder="Filter…"
                      value={headerFilters[col.field]}
                      onChange={e =>
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
            {sorted.map(r => (
              <tr key={r.sampleReferenceCode} className="hover:bg-gray-50">
                {columns.map(col => {
                  if (col.field === "sampleInDate") {
                    return (
                      <td key="date" className="px-2 py-1">
                        {format(new Date(r.sampleInDate), "dd/MM/yyyy")}
                      </td>
                    );
                  }
                  if (!col.field && col.label === "Picture") {
                    return (
                      <td key="pic" className="px-2 py-1">
                        {r.productPicture ? (
                          <img
                            src={r.productPicture}
                            alt=""
                            className="h-10 w-10 object-contain cursor-pointer"
                            onClick={() => setLightboxSrc(r.productPicture)}
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                    );
                  }
                  return (
                    <td key={col.field} className="px-2 py-1 whitespace-nowrap">
                      {r[col.field] ?? "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!sorted.length && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-2 py-6 text-center text-gray-500"
                >
                  No records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
