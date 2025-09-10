import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import InvoiceFilterPanel from "../components/invoices/InvoiceFilterPanel.jsx";
import InvoiceSearchBar from "../components/invoices/InvoiceSearchBar.jsx";
import InvoicesTable from "../components/invoices/InvoicesTable.jsx";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ManageInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // simple client-side filters mirroring backend
  const [filters, setFilters] = useState({
    invoiceNumber: "",
    quotationRefNumber: "",
    refJobSheetNumber: "",
    clientCompanyName: "",
    clientName: "",
    placeOfSupply: "",
    poNumber: "",
    eWayBillNumber: "",
    createdBy: "",
    subtotalMin: "",
    subtotalMax: "",
    grandMin: "",
    grandMax: "",
    dateFrom: "",
    dateTo: "",
    quotationDateFrom: "",
    quotationDateTo: "",
    dueDateFrom: "",
    dueDateTo: "",
    poDateFrom: "",
    poDateTo: ""
  });

  useEffect(() => {
    setLoading(true);
    axios.get(`${BACKEND_URL}/api/admin/invoices`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
    .then(r => setInvoices(r.data.invoices || []))
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const displayed = useMemo(() => {
    // client-side filter + search so UI feels instant
    const regexSafe = (v) => new RegExp(String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    let list = [...invoices];

    if (search) {
      const r = regexSafe(search);
      list = list.filter(inv =>
        r.test(inv?.invoiceDetails?.invoiceNumber || "") ||
        r.test(inv?.invoiceDetails?.quotationRefNumber || "") ||
        r.test(inv?.invoiceDetails?.refJobSheetNumber || "") ||
        r.test(inv?.clientCompanyName || "") ||
        r.test(inv?.clientName || "") ||
        r.test(inv?.billTo || "") ||
        r.test(inv?.shipTo || "") ||
        r.test(inv?.invoiceDetails?.placeOfSupply || "") ||
        r.test(inv?.invoiceDetails?.poNumber || "") ||
        r.test(inv?.invoiceDetails?.eWayBillNumber || "") ||
        r.test(inv?.createdBy || "")
      );
    }

    const fp = filters;
    const betweenNum = (x, min, max) => {
      if (x == null) return false;
      const n = Number(x);
      if (min !== "" && !isNaN(Number(min)) && n < Number(min)) return false;
      if (max !== "" && !isNaN(Number(max)) && n > Number(max)) return false;
      return true;
    };
    const betweenDate = (d, from, to) => {
      if (!from && !to) return true;
      const t = d ? new Date(d).getTime() : NaN;
      if (isNaN(t)) return false;
      if (from && t < new Date(from).getTime()) return false;
      if (to && t > new Date(to).getTime()) return false;
      return true;
    };
    const like = (v, q) => !q || regexSafe(q).test(v || "");

    list = list.filter(inv => {
      const det = inv.invoiceDetails || {};
      return (
        like(det.invoiceNumber, fp.invoiceNumber) &&
        like(det.quotationRefNumber, fp.quotationRefNumber) &&
        like(det.refJobSheetNumber, fp.refJobSheetNumber) &&
        like(inv.clientCompanyName, fp.clientCompanyName) &&
        like(inv.clientName, fp.clientName) &&
        like(det.placeOfSupply, fp.placeOfSupply) &&
        like(det.poNumber, fp.poNumber) &&
        like(det.eWayBillNumber, fp.eWayBillNumber) &&
        like(inv.createdBy, fp.createdBy) &&
        betweenNum(inv.subtotalTaxable, fp.subtotalMin, fp.subtotalMax) &&
        betweenNum(inv.grandTotal, fp.grandMin, fp.grandMax) &&
        betweenDate(det.date, fp.dateFrom, fp.dateTo) &&
        betweenDate(det.quotationDate, fp.quotationDateFrom, fp.quotationDateTo) &&
        betweenDate(det.dueDate, fp.dueDateFrom, fp.dueDateTo) &&
        betweenDate(det.poDate, fp.poDateFrom, fp.poDateTo)
      );
    });

    return list;
  }, [invoices, search, filters]);

  const exportToExcel = () => {
    const header = [
      "Invoice #","Date","Client Company","Client Name","Bill To","Ship To",
      "Ref. JS","Quotation Ref","Quotation Date","Client Order ID","Discount",
      "Other Ref","Place of Supply","Due Date","PO Date","PO Number",
      "E-Way Bill #","Subtotal Taxable","Total CGST","Total SGST","Grand Total","Created By"
    ];
    const rows = displayed.map(inv => {
      const d = inv.invoiceDetails || {};
      return [
        d.invoiceNumber || "",
        d.date ? new Date(d.date).toLocaleDateString() : "",
        inv.clientCompanyName || "",
        inv.clientName || "",
        inv.billTo || "",
        inv.shipTo || "",
        d.refJobSheetNumber || "",
        d.quotationRefNumber || "",
        d.quotationDate ? new Date(d.quotationDate).toLocaleDateString() : "",
        d.clientOrderIdentification || "",
        d.discount ?? "",
        d.otherReference || "",
        d.placeOfSupply || "",
        d.dueDate ? new Date(d.dueDate).toLocaleDateString() : "",
        d.poDate ? new Date(d.poDate).toLocaleDateString() : "",
        d.poNumber || "",
        d.eWayBillNumber || "",
        inv.subtotalTaxable ?? "",
        inv.totalCgst ?? "",
        inv.totalSgst ?? "",
        inv.grandTotal ?? "",
        inv.createdBy || ""
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, "Invoices.xlsx");
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <InvoiceSearchBar value={search} onChange={setSearch} />
          <button
            onClick={() => setFiltersOpen(x => !x)}
            className="bg-gray-200 px-3 py-1 rounded text-xs"
          >
            {filtersOpen ? "Hide Filters" : "Filters"}
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportToExcel}
            className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
          >
            Export to Excel
          </button>
        </div>
      </div>

      {filtersOpen && (
        <InvoiceFilterPanel filters={filters} setFilters={setFilters} />
      )}

      <InvoicesTable data={displayed} loading={loading} />
    </div>
  );
}
