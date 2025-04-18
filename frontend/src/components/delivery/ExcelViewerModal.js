"use client";

import React from "react";
import * as XLSX from "xlsx";

export default function ExcelViewerModal({ row, onClose }) {
  const data = row.excelData || [];

  /* export again */
  const exportAgain = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ExcelData");
    XLSX.writeFile(wb, row.excelFileName || "data.xlsx");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-full max-w-3xl relative text-xs">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
        >
          ×
        </button>
        <h2 className="text-lg font-bold mb-4 text-purple-700">
          {row.excelFileName}
        </h2>

        {data.length ? (
          <div className="overflow-auto max-h-96 border">
            <table className="w-full table-auto">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  {Object.keys(data[0]).map((k) => (
                    <th key={k} className="border px-2 py-1">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((r, idx) => (
                  <tr key={idx}>
                    {Object.keys(data[0]).map((k) => (
                      <td key={k} className="border px-2 py-1">
                        {r[k]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No Excel data stored.</p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={exportAgain}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
          >
            Export to Excel
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
