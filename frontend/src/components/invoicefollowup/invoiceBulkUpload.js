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
        // Basic Info
        vendorName: "John Doe",
        vendorCompany: "ABC Pvt Ltd",
        brandDealing: "Electronics",
        location: "Mumbai",
        postalCode: "400001",
        reliability: "reliable",
        
        // Contact Persons (JSON array)
        clients: JSON.stringify([
          { name: "Raj Sharma", contactNumber: "9876543210" },
          { name: "Priya Patel", contactNumber: "9123456789" }
        ]),
        
        // GST Numbers (JSON array)
        gstNumbers: JSON.stringify([
          { gst: "22AAAAA0000A1Z5", label: "Head Office", isPrimary: true },
          { gst: "33BBBBB0000B2Z6", label: "Branch Office", isPrimary: false }
        ]),
        
        // Bank Accounts (JSON array)
        bankAccounts: JSON.stringify([
          {
            bankName: "HDFC Bank",
            accountNumber: "12345678901234",
            ifscCode: "HDFC0000123",
            accountHolder: "John Doe",
            branch: "Mumbai Main",
            isPrimary: true
          },
          {
            bankName: "ICICI Bank",
            accountNumber: "98765432109876",
            ifscCode: "ICIC0000456",
            accountHolder: "ABC Pvt Ltd",
            branch: "Mumbai West",
            isPrimary: false
          }
        ]),
        
        // Legacy fields (optional - for backward compatibility)
        gst: "22AAAAA0000A1Z5",
        bankName: "HDFC Bank",
        accountNumber: "12345678901234",
        ifscCode: "HDFC0000123"
      },
      {
        // Example with minimal data
        vendorName: "Sunita Verma",
        vendorCompany: "XYZ Traders",
        brandDealing: "Textiles",
        location: "Delhi",
        postalCode: "110001",
        reliability: "non-reliable",
        
        clients: JSON.stringify([
          { name: "Sunita Verma", contactNumber: "8765432109" }
        ]),
        
        gstNumbers: JSON.stringify([
          { gst: "07CCCCC0000C3Z7", isPrimary: true }
        ]),
        
        bankAccounts: JSON.stringify([
          {
            bankName: "SBI",
            accountNumber: "56789012345678",
            ifscCode: "SBIN0000123",
            isPrimary: true
          }
        ])
      }
    ];

    // Create worksheet with column order
    const worksheet = XLSX.utils.json_to_sheet(sampleData, {
      header: [
        'vendorName',
        'vendorCompany', 
        'brandDealing',
        'location',
        'postalCode',
        'reliability',
        'clients',
        'gstNumbers',
        'bankAccounts',
        // Legacy fields
        'gst',
        'bankName', 
        'accountNumber',
        'ifscCode'
      ]
    });

    // Set column widths for better readability
    const colWidths = [
      { wch: 15 }, // vendorName
      { wch: 15 }, // vendorCompany
      { wch: 15 }, // brandDealing
      { wch: 12 }, // location
      { wch: 10 }, // postalCode
      { wch: 12 }, // reliability
      { wch: 30 }, // clients
      { wch: 30 }, // gstNumbers
      { wch: 40 }, // bankAccounts
      { wch: 20 }, // gst
      { wch: 15 }, // bankName
      { wch: 20 }, // accountNumber
      { wch: 12 }, // ifscCode
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors");

    // Add instructions sheet
    const instructions = [
      ['FIELD', 'DESCRIPTION', 'REQUIRED', 'FORMAT/EXAMPLE'],
      ['vendorName', 'Name of the vendor/contact person', 'Yes', 'John Doe'],
      ['vendorCompany', 'Company name', 'No', 'ABC Pvt Ltd'],
      ['brandDealing', 'What brands they deal with', 'No', 'Electronics, Textiles'],
      ['location', 'City/Location', 'No', 'Mumbai'],
      ['postalCode', '6-digit postal code', 'No', '400001'],
      ['reliability', 'Vendor reliability', 'No', 'reliable OR non-reliable'],
      ['clients', 'Contact persons as JSON array', 'No', '[{"name":"Raj Sharma","contactNumber":"9876543210"}]'],
      ['gstNumbers', 'GST numbers as JSON array', 'No', '[{"gst":"22AAAAA0000A1Z5","label":"Head Office","isPrimary":true}]'],
      ['bankAccounts', 'Bank accounts as JSON array', 'No', '[{"bankName":"HDFC","accountNumber":"12345678901234","ifscCode":"HDFC0000123","isPrimary":true}]'],
      ['', '', '', ''],
      ['LEGACY FIELDS (Optional - for backward compatibility)'],
      ['gst', 'Single GST number', 'No', '22AAAAA0000A1Z5'],
      ['bankName', 'Single bank name', 'No', 'HDFC Bank'],
      ['accountNumber', 'Single account number', 'No', '12345678901234'],
      ['ifscCode', 'Single IFSC code', 'No', 'HDFC0000123'],
      ['', '', '', ''],
      ['IMPORTANT NOTES:'],
      ['1. For multiple contacts/GSTs/banks, use JSON arrays in clients/gstNumbers/bankAccounts'],
      ['2. Set "isPrimary": true for primary GST and bank account'],
      ['3. Postal code must be exactly 6 digits if provided'],
      ['4. Reliability defaults to "non-reliable" if not specified'],
      ['5. Legacy fields are optional and will be converted to new format automatically']
    ];

    const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
    
    // Set column widths for instructions
    instructionSheet['!cols'] = [
      { wch: 15 }, { wch: 50 }, { wch: 10 }, { wch: 40 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "vendor-bulk-upload-template.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl p-6 relative">
        <h2 className="text-xl font-semibold text-center mb-4">
          Vendor Bulk Upload {mode && `(${mode})`}
        </h2>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Upload Instructions:</h3>
          <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
            <li>Download the template below for the correct format</li>
            <li>Multiple contacts, GSTs, and bank accounts should be provided as JSON arrays</li>
            <li>Mark primary entries with "isPrimary": true</li>
            <li>Check the Instructions sheet in the template for detailed guidelines</li>
          </ul>
        </div>

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
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Download Template
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