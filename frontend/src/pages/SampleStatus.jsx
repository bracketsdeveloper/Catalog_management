// client/src/pages/SampleStatus.jsx
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import SampleStatusTable from "../components/samples/SampleStatusTable";
import FilterModal from "../components/samples/FilterModal";

export default function SampleStatus() {
  const [samples, setSamples] = useState([]);
  const [outs, setOuts] = useState([]);
  const [search, setSearch] = useState("");
  const [fromRef, setFromRef] = useState("");
  const [toRef, setToRef] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    categories: [], subCategories: [], brands: [], returnable: []
  });

  /* header sort state */
  const [sort, setSort] = useState({ field: "", dir: "asc" });
  const toggleSort = (field) => {
    setSort(s => ({
      field,
      dir: s.field === field && s.dir === "asc" ? "desc" : "asc"
    }));
  };

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token       = localStorage.getItem("token");
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const hasExportPermission = localStorage.getItem("permissions")?.includes("export-samples");

  useEffect(() => {
    async function fetchData() {
      try {
        const [sRes, oRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/admin/samples`, { headers:{ Authorization:`Bearer ${token}` } }),
          axios.get(`${BACKEND_URL}/api/admin/sample-outs`, { headers:{ Authorization:`Bearer ${token}` } }),
        ]);
        setSamples(sRes.data);
        setOuts(oRes.data);
      } catch (err) {
        console.error("Error loading sample status:", err);
      }
    }
    fetchData();
  }, []);

  // pre‐filter by search, ref range, modal filters
  const displayed = samples
    .filter(s => {
      const code = s.sampleReferenceCode.toLowerCase();
      if (search && !code.includes(search.toLowerCase())) return false;
      if (fromRef && code < fromRef.toLowerCase()) return false;
      if (toRef && code > toRef.toLowerCase()) return false;
      return true;
    })
    .filter(s => filters.categories.length ? filters.categories.includes(s.category) : true)
    .filter(s => filters.subCategories.length ? filters.subCategories.includes(s.subCategory) : true)
    .filter(s => filters.brands.length ? filters.brands.includes(s.brandName) : true)
    .filter(s => filters.returnable.length ? filters.returnable.includes(s.returnable) : true);

  const handleExport = () => {
    const mapByRef = outs.reduce((acc, o) => {
      acc[o.sampleReferenceCode] = acc[o.sampleReferenceCode] || [];
      acc[o.sampleReferenceCode].push(o);
      return acc;
    }, {});
    const rows = displayed.map(s => {
      const list     = mapByRef[s.sampleReferenceCode] || [];
      const totalOut = list.reduce((sum,o) => sum + Number(o.qty), 0);
      const totalRet = list.reduce((sum,o) => sum + Number(o.qtyReceivedBack), 0);
      return {
        "Ref Code":     s.sampleReferenceCode,
        "Prod Code":    s.productId,
        "In Date":      new Date(s.sampleInDate).toLocaleDateString("en-GB"),
        "Product Name": s.productName,
        Category:       s.category,
        "Sub Category": s.subCategory,
        "Brand Name":   s.brandName,
        Specs:          s.productDetails,
        Color:          s.color,
        "Vendor/Client":s.fromVendorClient,
        "Sample Rate":  s.sampleRate,
        "On-Hand Qty":  s.qty - totalOut + totalRet,
        Returnable:     s.returnable,
        Days:           s.returnableDays,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SampleStatus");
    XLSX.writeFile(wb, "sample_status.xlsx");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Sample Status</h1>

      <div className="flex flex-wrap items-center mb-4 space-x-4">
        <input
          type="text"
          placeholder="Search samples…"
          className="border p-2 rounded flex-grow"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <input
          type="text"
          placeholder="From Ref Code…"
          className="border p-2 rounded w-40"
          value={fromRef}
          onChange={e => setFromRef(e.target.value)}
        />
        <input
          type="text"
          placeholder="To Ref Code…"
          className="border p-2 rounded w-40"
          value={toRef}
          onChange={e => setToRef(e.target.value)}
        />

        <button
          onClick={() => setShowFilter(true)}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
        >
          Filter
        </button>

        {(isSuperAdmin || hasExportPermission) && (
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export Excel
          </button>
        )}
      </div>

      <SampleStatusTable
        samples={displayed}
        outs={outs}
        sortField={sort.field}
        sortOrder={sort.dir}
        toggleSort={toggleSort}
      />

      {showFilter && (
        <FilterModal
          samples={samples}
          initialFilters={filters}
          onApply={f => { setFilters(f); setShowFilter(false); }}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  );
}
