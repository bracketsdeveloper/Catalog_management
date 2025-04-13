import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const invoiceReceivedOptions = ["Yes", "No"];

function HeaderFilters({ headerFilters, onFilterChange }) {
  const columns = [
    { key: "orderConfirmedDate", label: "Order Confirmation Date" },
    { key: "deliveryDateTime", label: "Delivery Date" },
    { key: "jobSheetNumber", label: "Job Sheet" },
    { key: "clientCompanyName", label: "Client Name" },
    { key: "eventName", label: "Event Name" },
    { key: "product", label: "Product" },
    { key: "sourcingFrom", label: "Source From" },
    { key: "cost", label: "Cost" },
    { key: "negotiatedCost", label: "Negotiated Cost" },
    { key: "paymentMade", label: "Payment Made" },
    { key: "vendorInvoiceNumber", label: "Vendor Invoice Number" },
    { key: "vendorInvoiceReceived", label: "Vendor Invoice Received" },
  ];
  return (
    <tr className="bg-gray-100">
      {columns.map((col) => (
        <th key={col.key} className="p-1 border border-gray-300">
          <input
            type="text"
            placeholder={`Filter ${col.label}`}
            value={headerFilters[col.key] || ""}
            onChange={(e) => onFilterChange(col.key, e.target.value)}
            className="w-full p-1 text-xs border rounded"
          />
        </th>
      ))}
      <th className="p-1 border border-gray-300">Actions</th>
    </tr>
  );
}

const getClosedPurchases = (records) => {
  const groups = {};
  records.forEach((record) => {
    const key = record.jobSheetNumber;
    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
  });
  const closed = [];
  Object.values(groups).forEach((group) => {
    if (group.length > 0 && group.every((item) => item.status === "received")) {
      closed.push(...group);
    }
  });
  return closed;
};

function EditInvoiceModal({ invoice, onClose, onSave }) {
  const [editedData, setEditedData] = useState({ ...invoice });

  const handleFieldChange = (field, value) => {
    setEditedData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    if (editedData.vendorInvoiceNumber) {
      editedData.vendorInvoiceNumber = editedData.vendorInvoiceNumber.toUpperCase();
    }
    onSave(editedData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-purple-700">Edit Purchase Invoice</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 text-2xl"
          >
            ×
          </button>
        </div>
        <form className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-purple-700 font-bold mb-1">
                Order Confirmation Date:
              </label>
              <span>
                {invoice.orderConfirmedDate
                  ? new Date(invoice.orderConfirmedDate).toLocaleDateString()
                  : ""}
              </span>
            </div>
            <div>
              <label className="block text-purple-700 font-bold mb-1">
                Delivery Date:
              </label>
              <span>
                {invoice.deliveryDateTime
                  ? new Date(invoice.deliveryDateTime).toLocaleDateString()
                  : ""}
              </span>
            </div>
            <div>
              <label className="block text-purple-700 font-bold mb-1">
                Job Sheet:
              </label>
              <span>{invoice.jobSheetNumber}</span>
            </div>
            <div>
              <label className="block text-purple-700 font-bold mb-1">
                Client Name:
              </label>
              <span>{invoice.clientCompanyName}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-purple-700 font-bold mb-1">
                Event Name:
              </label>
              <span>{invoice.eventName}</span>
            </div>
            <div>
              <label className="block text-purple-700 font-bold mb-1">
                Product:
              </label>
              <span>{invoice.product}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-purple-700 font-bold mb-1">
                Source From:
              </label>
              <span>{invoice.sourcingFrom}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-purple-700 font-bold mb-1">
                Cost:
              </label>
              <input
                type="number"
                value={editedData.cost || ""}
                onChange={(e) => handleFieldChange("cost", e.target.value)}
                className="w-full border p-1"
              />
            </div>
            <div>
              <label className="block text-purple-700 font-bold mb-1">
                Negotiated Cost:
              </label>
              <input
                type="number"
                value={editedData.negotiatedCost || ""}
                onChange={(e) => handleFieldChange("negotiatedCost", e.target.value)}
                className="w-full border p-1"
              />
            </div>
            <div>
              <label className="block text-purple-700 font-bold mb-1">
                Payment Made:
              </label>
              <input
                type="number"
                value={editedData.paymentMade || ""}
                onChange={(e) => handleFieldChange("paymentMade", e.target.value)}
                className="w-full border p-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-purple-700 font-bold mb-1">
                Vendor Invoice Number:
              </label>
              <input
                type="text"
                value={editedData.vendorInvoiceNumber || ""}
                onChange={(e) => handleFieldChange("vendorInvoiceNumber", e.target.value)}
                className="w-full border p-1"
              />
            </div>
            <div>
              <label className="block text-purple-700 font-bold mb-1">
                Vendor Invoice Received:
              </label>
              <select
                value={editedData.vendorInvoiceReceived || "No"}
                onChange={(e) => handleFieldChange("vendorInvoiceReceived", e.target.value)}
                className="w-full border p-1"
              >
                {invoiceReceivedOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManagePurchaseInvoice() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [headerFilters, setHeaderFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "" });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem("token");
        // Fetch open purchases
        const openPurchasesRes = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/openPurchases`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const closedData = getClosedPurchases(openPurchasesRes.data);

        // Fetch all purchase invoices
        const purchaseInvoicesRes = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchaseInvoice`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const purchaseInvoices = purchaseInvoicesRes.data;

        // Merge closed purchases with purchase invoices
        const mergedData = closedData.map((openPurchase) => {
          const matchingInvoice = purchaseInvoices.find(
            (invoice) =>
              invoice.jobSheetNumber === openPurchase.jobSheetNumber &&
              invoice.product === openPurchase.product
          );
          return {
            ...openPurchase,
            cost: matchingInvoice ? matchingInvoice.cost : openPurchase.cost || "",
            negotiatedCost: matchingInvoice
              ? matchingInvoice.negotiatedCost
              : openPurchase.negotiatedCost || "",
            paymentMade: matchingInvoice
              ? matchingInvoice.paymentMade
              : openPurchase.paymentMade || "",
            vendorInvoiceNumber: matchingInvoice
              ? matchingInvoice.vendorInvoiceNumber
              : openPurchase.vendorInvoiceNumber || "",
            vendorInvoiceReceived: matchingInvoice
              ? matchingInvoice.vendorInvoiceReceived
              : openPurchase.vendorInvoiceReceived || "No",
            _id: matchingInvoice ? matchingInvoice._id : openPurchase._id,
            clientCompanyName: matchingInvoice
              ? matchingInvoice.clientName
              : openPurchase.clientCompanyName,
            orderConfirmedDate: matchingInvoice
              ? matchingInvoice.orderConfirmationDate 
              : openPurchase.orderConfirmedDate,
          };
        });

        // Add any purchase invoices that don't exist in closedData
        purchaseInvoices.forEach((invoice) => {
          if (
            !mergedData.some(
              (data) =>
                data.jobSheetNumber === invoice.jobSheetNumber &&
                data.product === invoice.product
            )
          ) {
            mergedData.push({
              ...invoice,
              clientCompanyName: invoice.clientName,
              orderConfirmedDate: invoice.orderConfirmationDate,
              cost: invoice.cost || "",
              negotiatedCost: invoice.negotiatedCost || "",
              paymentMade: invoice.paymentMade || "",
              vendorInvoiceNumber: invoice.vendorInvoiceNumber || "",
              vendorInvoiceReceived: invoice.vendorInvoiceReceived || "No",
            });
          }
        });

        setInvoices(mergedData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const globalFiltered = invoices.filter((inv) => {
    const searchLower = searchText.toLowerCase();
    return (
      (inv.orderConfirmedDate &&
        new Date(inv.orderConfirmedDate)
          .toLocaleDateString()
          .toLowerCase()
          .includes(searchLower)) ||
      (inv.jobSheetNumber || "").toLowerCase().includes(searchLower) ||
      (inv.clientCompanyName || "").toLowerCase().includes(searchLower) ||
      (inv.eventName || "").toLowerCase().includes(searchLower) ||
      (inv.product || "").toLowerCase().includes(searchLower) ||
      (inv.sourcingFrom || "").toLowerCase().includes(searchLower) ||
      (inv.cost ? String(inv.cost).toLowerCase() : "").includes(searchLower) ||
      (inv.negotiatedCost ? String(inv.negotiatedCost).toLowerCase() : "").includes(
        searchLower
      ) ||
      (inv.paymentMade ? String(inv.paymentMade).toLowerCase() : "").includes(
        searchLower
      ) ||
      (inv.vendorInvoiceNumber || "").toLowerCase().includes(searchLower) ||
      (inv.vendorInvoiceReceived || "").toLowerCase().includes(searchLower)
    );
  });

  const headerFiltered = globalFiltered.filter((record) => {
    const keys = [
      "orderConfirmedDate",
      "jobSheetNumber",
      "clientCompanyName",
      "eventName",
      "product",
      "sourcingFrom",
      "cost",
      "negotiatedCost",
      "paymentMade",
      "vendorInvoiceNumber",
      "vendorInvoiceReceived",
    ];
    return keys.every((key) => {
      if (!headerFilters[key]) return true;
      let value = "";
      if (record[key]) {
        if (key === "orderConfirmedDate") {
          value = new Date(record[key]).toLocaleDateString();
        } else {
          value = String(record[key]);
        }
      }
      return value.toLowerCase().includes(headerFilters[key].toLowerCase());
    });
  });

  const handleSort = (key, type = "string") => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setInvoices((prev) => {
      const sorted = [...prev].sort((a, b) => {
        let aVal = a[key] || "";
        let bVal = b[key] || "";
        if (type === "date") {
          aVal = aVal ? new Date(aVal) : new Date(0);
          bVal = bVal ? new Date(bVal) : new Date(0);
        }
        if (aVal < bVal) return direction === "asc" ? -1 : 1;
        if (aVal > bVal) return direction === "asc" ? 1 : -1;
        return 0;
      });
      return sorted;
    });
  };

  const handleHeaderFilterChange = (key, value) => {
    setHeaderFilters((prev) => ({ ...prev, [key]: value }));
  };

  const exportToExcel = () => {
    const exportData = headerFiltered.map((inv) => ({
      "Order Confirmation Date": inv.orderConfirmedDate
        ? new Date(inv.orderConfirmedDate).toLocaleDateString()
        : "",
      "Delivery Date": inv.deliveryDateTime
        ? new Date(inv.deliveryDateTime).toLocaleDateString()
        : "",
      "Job Sheet": inv.jobSheetNumber || "",
      "Client Name": inv.clientCompanyName || "",
      "Event Name": inv.eventName || "",
      "Product": inv.product || "",
      "Source From": inv.sourcingFrom || "",
      "Cost": inv.cost || "",
      "Negotiated Cost": inv.negotiatedCost || "",
      "Payment Made": inv.paymentMade || "",
      "Vendor Invoice Number": inv.vendorInvoiceNumber
        ? inv.vendorInvoiceNumber.toUpperCase()
        : "",
      "Vendor Invoice Received": inv.vendorInvoiceReceived || "No",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PurchaseInvoice");
    XLSX.writeFile(workbook, "PurchaseInvoice.xlsx");
  };

  const handleOpenEditModal = (invoice) => {
    setCurrentInvoice(invoice);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setCurrentInvoice(null);
    setEditModalOpen(false);
  };

  const handleSaveEdit = async (updatedInvoice) => {
    try {
      const token = localStorage.getItem("token");
      const invoiceData = {
        orderConfirmationDate: updatedInvoice.orderConfirmedDate,
        jobSheetNumber: updatedInvoice.jobSheetNumber,
        clientName: updatedInvoice.clientCompanyName,
        eventName: updatedInvoice.eventName,
        product: updatedInvoice.product,
        sourcingFrom: updatedInvoice.sourcingFrom,
        cost: parseFloat(updatedInvoice.cost) || 0,
        negotiatedCost: parseFloat(updatedInvoice.negotiatedCost) || 0,
        paymentMade: parseFloat(updatedInvoice.paymentMade) || 0,
        vendorInvoiceNumber: updatedInvoice.vendorInvoiceNumber
          ? updatedInvoice.vendorInvoiceNumber.toUpperCase()
          : "",
        vendorInvoiceReceived: updatedInvoice.vendorInvoiceReceived || "No",
      };

      // Check if invoice exists in database by jobSheetNumber and product
      const existingInvoice = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchaseInvoice/find`,
        {
          params: { jobSheetNumber: invoiceData.jobSheetNumber, product: invoiceData.product },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      let returnedInvoice;
      if (existingInvoice.data._id) {
        // Update existing invoice
        const res = await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchaseInvoice/${existingInvoice.data._id}`,
          invoiceData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        returnedInvoice = res.data.invoice;
      } else {
        // Create new invoice
        const res = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchaseInvoice`,
          invoiceData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        returnedInvoice = res.data.invoice;
      }

      // Fetch the updated invoice from the database to ensure data consistency
      const updatedInvoiceResponse = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/purchaseInvoice/find`,
        {
          params: {
            jobSheetNumber: returnedInvoice.jobSheetNumber,
            product: returnedInvoice.product,
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const fetchedInvoice = updatedInvoiceResponse.data;

      // Update local state with the fetched invoice
      setInvoices((prev) => {
        const updatedInvoices = prev.map((inv) =>
          inv.jobSheetNumber === fetchedInvoice.jobSheetNumber &&
          inv.product === fetchedInvoice.product
            ? {
                ...fetchedInvoice,
                clientCompanyName: fetchedInvoice.clientName,
                orderConfirmedDate: fetchedInvoice.orderConfirmationDate,
              }
            : inv
        );
        // If the invoice was newly created, add it to the list
        if (!updatedInvoices.some((inv) => inv._id === fetchedInvoice._id)) {
          updatedInvoices.push({
            ...fetchedInvoice,
            clientCompanyName: fetchedInvoice.clientName,
            orderConfirmedDate: fetchedInvoice.orderConfirmationDate,
          });
        }
        return updatedInvoices;
      });

      setEditModalOpen(false);
      setCurrentInvoice(null);
      alert("Record saved successfully!");
    } catch (error) {
      console.error("Error saving invoice edit:", error);
      alert("Error saving invoice edit; check console.");
    }
  };

  if (loading) return <div>Loading purchase invoices...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">
        Manage Purchase Invoice
      </h1>
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search purchase invoices..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button
          onClick={exportToExcel}
          className="bg-green-600 text-white px-4 py-2 rounded ml-4 hover:bg-green-700"
        >
          Export to Excel
        </button>
      </div>
      <table className="min-w-full border-collapse border border-gray-300">
        <thead className="bg-gray-50">
          <tr className="text-xs">
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("orderConfirmedDate", "date")}
            >
              Order Confirmation Date{" "}
              {sortConfig.key === "orderConfirmedDate" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("deliveryDateTime", "date")}
            >
              Delivery Date{" "}
              {sortConfig.key === "deliveryDateTime" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("jobSheetNumber", "string")}
            >
              Job Sheet{" "}
              {sortConfig.key === "jobSheetNumber" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("clientCompanyName", "string")}
            >
              Client Name{" "}
              {sortConfig.key === "clientCompanyName" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("eventName", "string")}
            >
              Event Name{" "}
              {sortConfig.key === "eventName" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("product", "string")}
            >
              Product{" "}
              {sortConfig.key === "product" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("sourcingFrom", "string")}
            >
              Source From{" "}
              {sortConfig.key === "sourcingFrom" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("cost", "number")}
            >
              Cost{" "}
              {sortConfig.key === "cost" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("negotiatedCost", "number")}
            >
              Negotiated Cost{" "}
              {sortConfig.key === "negotiatedCost" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("paymentMade", "number")}
            >
              Payment Made{" "}
              {sortConfig.key === "paymentMade" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("vendorInvoiceNumber", "string")}
            >
              Vendor Invoice Number{" "}
              {sortConfig.key === "vendorInvoiceNumber" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => handleSort("vendorInvoiceReceived", "string")}
            >
              Vendor Invoice Received{" "}
              {sortConfig.key === "vendorInvoiceReceived" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </th>
            <th className="p-2 border border-gray-300">Actions</th>
          </tr>
          <HeaderFilters
            headerFilters={headerFilters}
            onFilterChange={handleHeaderFilterChange}
          />
        </thead>
        <tbody>
          {headerFiltered.map((invoice) => (
            <tr
              key={invoice._id || invoice.jobSheetNumber + invoice.product}
              className="text-xs bg-green-300"
            >
              <td className="p-2 border border-gray-300">
                {invoice.orderConfirmedDate
                  ? new Date(invoice.orderConfirmedDate).toLocaleDateString()
                  : ""}
              </td>
              <td className="p-2 border border-gray-300">
                {invoice.deliveryDateTime
                  ? new Date(invoice.deliveryDateTime).toLocaleDateString()
                  : ""}
              </td>
              <td className="p-2 border border-gray-300">{invoice.jobSheetNumber}</td>
              <td className="p-2 border border-gray-300">{invoice.clientCompanyName}</td>
              <td className="p-2 border border-gray-300">{invoice.eventName}</td>
              <td className="p-2 border border-gray-300">{invoice.product}</td>
              <td className="p-2 border border-gray-300">{invoice.sourcingFrom}</td>
              <td className="p-2 border border-gray-300">{invoice.cost || ""}</td>
              <td className="p-2 border border-gray-300">{invoice.negotiatedCost || ""}</td>
              <td className="p-2 border border-gray-300">{invoice.paymentMade || ""}</td>
              <td className="p-2 border border-gray-300">{invoice.vendorInvoiceNumber || ""}</td>
              <td className="p-2 border border-gray-300">
                {invoice.vendorInvoiceReceived || "No"}
              </td>
              <td className="p-2 border border-gray-300">
                <button
                  onClick={() => handleOpenEditModal(invoice)}
                  className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] w-full"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editModalOpen && currentInvoice && (
        <EditInvoiceModal
          invoice={currentInvoice}
          onClose={handleCloseEditModal}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}