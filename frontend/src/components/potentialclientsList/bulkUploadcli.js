import React, { useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";


const BulkUploadPopup = ({ visible, onClose }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
 const BACKEND = process.env.REACT_APP_BACKEND_URL;


//  const DownloadTemplateButton = () => {
  const handleDownload = () => {
    const sampleData = [
      {
        companyName: "Acme Corp",
        clientName: "Alice Smith",
        designation: "Manager",
        source: "Website",
        mobile: "9876543210",
        email: "alice@acmecorp.com",
        location: "New York",
      },
      {
        companyName: "Acme Corp",
        clientName: "Bob Martin",
        designation: "CTO",
        source: "Referral",
        mobile: "9876540000",
        email: "bob@acmecorp.com",
        location: "New York",
      },
      {
        companyName: "Beta Inc",
        clientName: "Carla Jones",
        designation: "Director",
        source: "Event",
        mobile: "9123456789",
        email: "carla@betainc.com",
        location: "San Francisco",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    XLSX.writeFile(workbook, "PotentialClientsTemplate.xlsx");
  };
// }

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("token");

    try {
      setLoading(true);
      const res = await axios.post(`${BACKEND}/api/admin/upload-potential-clients`, formData, {
         headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(res);
      alert("Upload successful");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-96 relative">
        <button
          className="absolute top-2 right-3 text-4xl"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-lg font-bold mb-4">Upload Potential Clients</h2>
        <input type="file" accept=".xlsx" onChange={handleFileChange} />
        <button
          className="bg-blue-600 text-white mt-4 px-4 py-2 rounded"
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
       <button 
       onClick={handleDownload}
       className="text-blue-700 mt-4 px-4 py-2 rounded"
       >
         download Sample
       </button>
      </div>
    </div>
  );
};

export default BulkUploadPopup;
