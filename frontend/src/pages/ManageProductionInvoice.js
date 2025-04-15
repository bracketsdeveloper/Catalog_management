// pages/ProductionJobSheetInvoice.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import ProductionJobSheetInvoiceTable from "../components/productionjobsheet/ProductionJobSheetInvoiceTable";
import ProductionJobSheetInvoiceModal from "../components/productionjobsheet/ProductionJobSheetInvoiceModal";

const ProductionJobSheetInvoice = () => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token = localStorage.getItem("token");

  const [data, setData] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // Default sortConfig: sort by orderConfirmationDate ascending.
  const [sortConfig, setSortConfig] = useState({ key: "orderConfirmationDate", direction: "asc" });
  // New state to track current tab: "open" or "closed"
  const [activeTab, setActiveTab] = useState("open");
  // Load user permissions.
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    const permsStr = localStorage.getItem("permissions");
    if (permsStr) {
      try {
        setPermissions(JSON.parse(permsStr));
      } catch (err) {
        console.error("Error parsing permissions:", err);
      }
    }
  }, []);
  // Determine if user has "write-production" permission.
  const canEdit = permissions.includes("write-production");

  const fetchInvoices = async () => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/productionjobsheetinvoice/aggregated`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(res.data);
    } catch (error) {
      console.error("Error fetching production job sheet invoices", error);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleActionClick = (invoice) => {
    if (!canEdit) {
      alert("You don't have permission to edit production job sheet invoices.");
      return;
    }
    setSelectedInvoice(invoice);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedInvoice(null);
    fetchInvoices();
  };

  const handleSortChange = (key) => {
    if (sortConfig.key === key) {
      setSortConfig({ key, direction: sortConfig.direction === "asc" ? "desc" : "asc" });
    } else {
      setSortConfig({ key, direction: "asc" });
    }
  };

  // Global search filtering on all fields in the invoice object.
  const filteredData = data.filter((invoice) => {
    const str = JSON.stringify(invoice).toLowerCase();
    return str.includes(searchTerm.toLowerCase());
  });

  // Filter further based on the activeTab.
  const filteredByTab = filteredData.filter((invoice) => {
    const received = invoice.vendorInvoiceReceived?.toLowerCase() || "no";
    if (activeTab === "open") {
      return received === "no";
    } else if (activeTab === "closed") {
      return received === "yes";
    }
    return true;
  });

  const sortedData = [...filteredByTab].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    // Treat "orderConfirmationDate" as a date field.
    if (sortConfig.key === "orderConfirmationDate") {
      aVal = aVal ? new Date(aVal) : new Date(0);
      bVal = bVal ? new Date(bVal) : new Date(0);
    } else {
      aVal = aVal ? aVal.toString().toLowerCase() : "";
      bVal = bVal ? bVal.toString().toLowerCase() : "";
    }
    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="p-4 bg-white min-h-screen">
      <h1 className="text-2xl text-purple-700 font-bold mb-4">Production Job Sheet Invoice</h1>
      
      {/* Red warning box if user lacks edit permission */}
      {!canEdit && (
        <div className="mb-4 p-2 text-red-700 bg-red-200 border border-red-400 rounded">
          You don't have permission to edit production job sheet invoices.
        </div>
      )}

      {/* Buttons to switch between Open and Closed Invoices */}
      <div className="mb-4 flex space-x-4">
        <button
          onClick={() => setActiveTab("open")}
          className={`px-4 py-2 rounded ${activeTab === "open" ? "bg-blue-500 text-white" : "bg-gray-200 text-black"}`}
        >
          Open Invoices
        </button>
        <button
          onClick={() => setActiveTab("closed")}
          className={`px-4 py-2 rounded ${activeTab === "closed" ? "bg-blue-500 text-white" : "bg-gray-200 text-black"}`}
        >
          Closed Invoices
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search invoices..."
          className="p-2 border rounded w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <ProductionJobSheetInvoiceTable
        data={sortedData}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
        onActionClick={handleActionClick}
      />
      {modalOpen && selectedInvoice && (
        <ProductionJobSheetInvoiceModal
          invoice={selectedInvoice}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default ProductionJobSheetInvoice;
