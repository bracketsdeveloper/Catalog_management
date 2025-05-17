// client/src/components/samples/SampleTable.jsx
"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";

export default function SampleTable({
  samples,
  sortField,
  sortOrder,
  toggleSort,
  onEdit
}) {
  const [preview, setPreview] = useState(null);

  // per-column header filters
  const [headerFilters, setHeaderFilters] = useState({
    sampleInDate: "",
    sampleReferenceCode: "",
    productId: "",
    productName: "",
    category: "",
    subCategory: "",
    brandName: "",
    sampleRate: "",
    qty: "",
    returnable: ""
  });
  const handleFilterChange = (field, val) =>
    setHeaderFilters((h) => ({ ...h, [field]: val }));

  // apply header filters
  const filtered = useMemo(() => {
    return samples.filter((s) => {
      return Object.entries(headerFilters).every(([field, filterVal]) => {
        if (!filterVal) return true;
        const cell =
          field === "sampleInDate"
            ? format(new Date(s.sampleInDate), "dd/MM/yyyy")
            : (s[field] ?? "").toString();
        return cell.toLowerCase().includes(filterVal.toLowerCase());
      });
    });
  }, [samples, headerFilters]);

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
      <div className="overflow-auto border rounded">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50">
            <tr>
              {[
                { label: "Date", field: "sampleInDate" },
                { label: "Picture", field: null },
                { label: "Ref Code", field: "sampleReferenceCode" },
                { label: "Product ID", field: "productId" },
                { label: "Name", field: "productName" },
                { label: "Category", field: "category" },
                { label: "SubCat", field: "subCategory" },
                { label: "Brand", field: "brandName" },
                { label: "Rate", field: "sampleRate" },
                { label: "Qty", field: "qty" },
                { label: "Returnable", field: "returnable" }
              ].map(({ label, field }) => (
                <th
                  key={label}
                  onClick={() => field && toggleSort(field)}
                  className={`px-4 py-2 text-left font-medium text-gray-500 uppercase select-none cursor-pointer ${
                    !field ? "" : "hover:bg-gray-100"
                  }`}
                >
                  {label}
                  {field && sortField === field && (
                    <span>{sortOrder === "asc" ? " ▲" : " ▼"}</span>
                  )}
                </th>
              ))}
              <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
            <tr className="bg-gray-100">
              {[
                "sampleInDate",
                null,
                "sampleReferenceCode",
                "productId",
                "productName",
                "category",
                "subCategory",
                "brandName",
                "sampleRate",
                "qty",
                "returnable"
              ].map((field, idx) => (
                <td key={idx} className="px-4 py-1">
                  {field ? (
                    <input
                      type="text"
                      placeholder="Filter…"
                      value={headerFilters[field]}
                      onChange={(e) =>
                        handleFilterChange(field, e.target.value)
                      }
                      className="w-full p-1 text-xs border rounded"
                    />
                  ) : (
                    <div />
                  )}
                </td>
              ))}
              <td className="px-4 py-1"></td>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.map((s) => (
              <tr key={`${s._id}-${s.sampleReferenceCode}`}>
                <td className="px-4 py-2">
                  {format(new Date(s.sampleInDate), "dd/MM/yyyy")}
                </td>
                <td className="px-4 py-2">
                  {s.productPicture ? (
                    <img
                      src={s.productPicture}
                      alt={s.productName || s.productId}
                      className="h-12 w-12 object-contain border cursor-pointer"
                      onClick={() => setPreview(s.productPicture)}
                    />
                  ) : (
                    <div className="h-12 w-12 flex items-center justify-center border text-gray-400 text-xs">
                      No Img
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">{s.sampleReferenceCode}</td>
                <td className="px-4 py-2">{s.productId}</td>
                <td className="px-4 py-2">{s.productName}</td>
                <td className="px-4 py-2">{s.category}</td>
                <td className="px-4 py-2">{s.subCategory}</td>
                <td className="px-4 py-2">{s.brandName}</td>
                <td className="px-4 py-2">{s.sampleRate}</td>
                <td className="px-4 py-2">{s.qty}</td>
                <td className="px-4 py-2">
                  {s.returnable}
                  {s.returnable === "Returnable" && ` (${s.returnableDays} d)`}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => onEdit(s)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}

            {!sorted.length && (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  No samples found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------- image light-box */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative">
            <button
              onClick={() => setPreview(null)}
              className="absolute top-2 right-2 text-white bg-gray-800 bg-opacity-50 rounded-full p-1 hover:bg-opacity-75"
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
