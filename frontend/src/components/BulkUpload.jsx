import React from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";

export default function BulkUpload({
  csvData,
  setCsvData,
  loading,
  processBulkUpload,
  handleDownloadTemplate,
}) {
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    multiple: false,
    onDrop: async ([file]) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        setCsvData(jsonData);
      };
      reader.readAsArrayBuffer(file);
    },
  });

  return (
    <div>
      {csvData.length > 0 && (
        <div className="border border-gray-600 p-4 rounded mb-4">
          <p className="mb-2">
            Ready to upload {csvData.length} products from your spreadsheet
          </p>
          <button
            onClick={processBulkUpload}
            disabled={loading}
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Processing Bulk..." : "Confirm Bulk Upload"}
          </button>
        </div>
      )}
      <div className="mb-6 p-4 border border-dashed border-gray-500 rounded">
        <div {...getRootProps()} className="cursor-pointer p-4">
          <input {...getInputProps()} />
          <p>Drag & drop CSV or Excel file here, or click to browse</p>
        </div>
      </div>
      <div className="relative inline-block text-left">
        <button
          onClick={handleDownloadTemplate}
          className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600"
        >
          Download Template
        </button>
      </div>
    </div>
  );
}
