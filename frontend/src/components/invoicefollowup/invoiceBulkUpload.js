import React, { useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

export default function VendorUploader({ mode, vendor, onClose, onSuccess, BACKEND_URL }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus("");
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus("Please select a file.");
      return;
    }

    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setStatus("Uploading...");
      await axios.post(`${BACKEND_URL}/api/admin/upload-vendors`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      setStatus("Upload successful!");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const msg = err.response?.data?.message || "Upload failed.";
      setStatus(`Error: ${msg}`);
    }
  };

  const handleSampleDownload = () => {
    const sampleData = [
      {
        vendorName: "John Doe",
        vendorCompany: "ABC Pvt Ltd",
        brandDealing: "BrandX",
        location: "Mumbai",
        clients: JSON.stringify([
          { name: "Client A", contactNumber: "1234567890" },
          { name: "Client B", contactNumber: "0987654321" },
        ]),
        gst: "22AAAAA0000A1Z5",
        bankName: "HDFC Bank",
        accountNumber: "123456789012",
        ifscCode: "HDFC0000123",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample-vendor-upload.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6 relative">
        <h2 className="text-xl font-semibold text-center mb-4">
          Vendor Bulk Upload {mode && `(${mode})`}
        </h2>

        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
        />

        <div className="flex justify-between items-center mb-4">
          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Upload Excel
          </button>

          <button
            onClick={handleSampleDownload}
            className="text-blue-600 hover:underline"
          >
            Download Sample Format
          </button>
        </div>

        {status && (
          <div className={`text-sm mb-3 ${status.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
            {status}
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-red-600 text-4xl"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
