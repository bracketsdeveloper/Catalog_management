// src/components/EInvoiceTable.jsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { QRCodeSVG  } from 'qrcode.react';


const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function EInvoiceTable() {
  const [invoices, setInvoices] = useState([]);
  const [globalSearch, setGlobalSearch] = useState("");
  const [filters, setFilters] = useState({
    quotationNumber: "",
    createdBy: "",
    irn: "",
    customer: "",
    status: "",
    createdAt: "",
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    async function fetchEInvoices() {
      try {
        const res = await axios.get(
          `${BACKEND_URL}/api/admin/einvoices`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setInvoices(res.data);
      } catch (err) {
        console.error("Failed to fetch e‑invoices:", err);
      }
    }
    fetchEInvoices();
  }, [token]);

  const filteredAndSorted = useMemo(() => {
    let data = invoices.filter(inv => {
      const qNo = inv.referenceJson?.DocDtls?.No || "";
      const text = `${qNo} ${inv.irn} ${inv.customerDetails.legalName} ${inv.status} ${inv.createdBy}`.toLowerCase();
      if (globalSearch && !text.includes(globalSearch.toLowerCase())) return false;
      if (
        filters.quotationNumber &&
        !qNo.toLowerCase().includes(filters.quotationNumber.toLowerCase())
      ) return false;
      if (
        filters.createdBy &&
        !inv.createdBy.toLowerCase().includes(filters.createdBy.toLowerCase())
      ) return false;
      if (filters.irn && !inv.irn.toLowerCase().includes(filters.irn.toLowerCase()))
        return false;
      if (
        filters.customer &&
        !inv.customerDetails.legalName
          .toLowerCase()
          .includes(filters.customer.toLowerCase())
      ) return false;
      if (filters.status && inv.status !== filters.status) return false;
      if (
        filters.createdAt &&
        !new Date(inv.createdAt).toLocaleDateString().includes(filters.createdAt)
      ) return false;
      return true;
    });

    if (sortConfig.key) {
      data.sort((a, b) => {
        let aVal, bVal;
        switch (sortConfig.key) {
          case "quotationNumber":
            aVal = a.referenceJson?.DocDtls?.No || "";
            bVal = b.referenceJson?.DocDtls?.No || "";
            break;
          case "createdBy":
            aVal = a.createdBy || "";
            bVal = b.createdBy || "";
            break;
          case "irn":
            aVal = a.irn || "";
            bVal = b.irn || "";
            break;
          case "customer":
            aVal = a.customerDetails.legalName || "";
            bVal = b.customerDetails.legalName || "";
            break;
          case "status":
            aVal = a.status;
            bVal = b.status;
            break;
          case "createdAt":
            aVal = new Date(a.createdAt);
            bVal = new Date(b.createdAt);
            break;
          default:
            return 0;
        }
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [invoices, globalSearch, filters, sortConfig]);

  function onSort(key) {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  }

  function renderSortIcon(key) {
    if (sortConfig.key !== key) {
      return <FaSort className="inline ml-1 text-gray-400" />;
    }
    return sortConfig.direction === "asc" ? (
      <FaSortUp className="inline ml-1" />
    ) : (
      <FaSortDown className="inline ml-1" />
    );
  }

  function openViewModal(inv) {
    setSelectedInvoice(inv);
    setViewModalOpen(true);
  }

  async function handleDownload(type) {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/quotations/${selectedInvoice._id}/einvoice/download-${type}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `eInvoice_${selectedInvoice.irn}_${type}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed");
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">E‑Invoices</h2>
        <input
          type="text"
          placeholder="Global search…"
          value={globalSearch}
          onChange={e => setGlobalSearch(e.target.value)}
          className="border rounded px-3 py-1 w-1/3 text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                { key: "quotationNumber", label: "Quotation No." },
                { key: "createdBy", label: "Created By" },
                { key: "irn", label: "IRN" },
                { key: "customer", label: "Customer" },
                { key: "status", label: "Status" },
                { key: "createdAt", label: "Created" },
              ].map(col => (
                <th key={col.key} className="px-4 py-2 text-left">
                  <button
                    onClick={() => onSort(col.key)}
                    className="flex items-center font-medium hover:underline"
                  >
                    {col.label} {renderSortIcon(col.key)}
                  </button>
                  {col.key === "status" ? (
                    <select
                      value={filters.status}
                      onChange={e =>
                        setFilters(f => ({ ...f, status: e.target.value }))
                      }
                      className="mt-1 border rounded px-2 py-1 w-full"
                    >
                      <option value="">All</option>
                      <option value="PENDING">PENDING</option>
                      <option value="ACT">GENERATED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder={`Filter ${col.label.toLowerCase()}`}
                      value={filters[col.key]}
                      onChange={e =>
                        setFilters(f => ({ ...f, [col.key]: e.target.value }))
                      }
                      className="mt-1 border rounded px-2 py-1 w-full"
                    />
                  )}
                </th>
              ))}
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-gray-500">
                  No records found.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map(inv => (
                <tr key={inv._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {inv.referenceJson?.DocDtls?.No || "-"}
                  </td>
                  <td className="px-4 py-2">{inv.createdBy}</td>
                  <td className="px-4 py-2">{inv.irn || "-"}</td>
                  <td className="px-4 py-2">
                    {inv.customerDetails.legalName}
                  </td>
                  <td className="px-4 py-2">{inv.status}</td>
                  <td className="px-4 py-2">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => openViewModal(inv)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {viewModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-start overflow-y-auto py-8 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">E‑Invoice Details</h3>
              <button
                onClick={() => { setViewModalOpen(false); setSelectedInvoice(null); }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Key details grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6 text-sm">
              <div>
                <span className="font-semibold">Quotation No.:</span>{" "}
                <span
                  className="truncate max-w-[160px] inline-block align-bottom"
                  title={selectedInvoice.referenceJson?.DocDtls?.No}
                >
                  {selectedInvoice.referenceJson?.DocDtls?.No}
                </span>
              </div>
              <div>
                <span className="font-semibold">Created By:</span>{" "}
                <span
                  className="truncate max-w-[160px] inline-block align-bottom"
                  title={selectedInvoice.createdBy}
                >
                  {selectedInvoice.createdBy}
                </span>
              </div>
              <div>
                <span className="font-semibold">IRN:</span>{" "}
                <span
                  className="truncate max-w-[160px] inline-block align-bottom"
                  title={selectedInvoice.irn}
                >
                  {selectedInvoice.irn}
                </span>
              </div>
              <div>
                <span className="font-semibold">Ack No:</span>{" "}
                <span
                  className="truncate max-w-[160px] inline-block align-bottom"
                  title={selectedInvoice.ackNo}
                >
                  {selectedInvoice.ackNo}
                </span>
              </div>
              <div>
                <span className="font-semibold">Status:</span>{" "}
                {selectedInvoice.status}
              </div>
              <div>
                <span className="font-semibold">Created:</span>{" "}
                {new Date(selectedInvoice.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="font-semibold">Customer GSTIN:</span>{" "}
                {selectedInvoice.customerDetails.gstin}
              </div>
              <div>
                <span className="font-semibold">Customer Name:</span>{" "}
                {selectedInvoice.customerDetails.legalName}
              </div>
              <div>
                <span className="font-semibold">Trade Name:</span>{" "}
                {selectedInvoice.customerDetails.tradeName}
              </div>
              <div>
                <span className="font-semibold">Customer Email:</span>{" "}
                {selectedInvoice.customerDetails.email}
              </div>
            </div>

            {/* Products table */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2 text-sm">Items</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full border text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Sl No.</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-left">HSN</th>
                      <th className="p-2 text-left">Qty</th>
                      <th className="p-2 text-left">Unit Price</th>
                      <th className="p-2 text-left">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      selectedInvoice.referenceJson?.ItemList || []
                    ).map(item => (
                      <tr key={item.SlNo} className="border-t">
                        <td className="p-2">{item.SlNo}</td>
                        <td className="p-2">{item.PrdDesc}</td>
                        <td className="p-2">{item.HsnCd}</td>
                        <td className="p-2">{item.Qty}</td>
                        <td className="p-2">{item.UnitPrice}</td>
                        <td className="p-2">{item.TotItemVal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* QR Code */}
            {selectedInvoice.signedQRCode && (
              <div className="mb-6 text-center">
                <h4 className="font-semibold mb-2 text-sm">Signed QR Code</h4>
                <QRCodeSVG 
                  value={selectedInvoice.signedQRCode}
                  size={128}
                  level="H"
                />
              </div>
            )}

            {/* Download buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => handleDownload("duplicate")}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
              >
                Download Duplicate
              </button>
              <button
                onClick={() => handleDownload("original")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
              >
                Download Original
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
