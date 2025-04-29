/*********************************************************************/
/*  client/src/pages/Samples.jsx                                     */
/*********************************************************************/
"use client";

import React, { useState, useEffect } from "react";
import axios          from "axios";
import * as XLSX      from "xlsx";

import SampleTable    from "../components/samples/SampleTable.js";
import AddSampleModal from "../components/samples/AddSampleModal.js";

export default function Samples() {
  /* ------------------------------------------------------------ state */
  const [all,        setAll]        = useState([]);   // raw list from API
  const [search,     setSearch]     = useState("");
  const [showPanel,  setShowPanel]  = useState(false);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editItem,   setEditItem]   = useState(null);

  /* panel filters */
  const [flt, setFlt] = useState({
    dateFrom     : "",  // yyyy-MM-dd
    dateTo       : "",
    category     : "",
    subCategory  : "",
    brand        : "",
    returnable   : "",  // "" | "Returnable" | "Non Returnable"
  });

  /* --------------------------------------------------------------- env */
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token       = localStorage.getItem("token");

  /* -------------------------------------------------------------- data */
  const fetchSamples = async () => {
    try {
      let url = `${BACKEND_URL}/api/admin/samples`;
      if (search.trim()) url += `?search=${encodeURIComponent(search.trim())}`;
      const { data } = await axios.get(url,{
        headers:{ Authorization:`Bearer ${token}` }
      });
      setAll(data);
    } catch (err) { console.error(err); }
  };
  useEffect(()=>{ fetchSamples(); }, [search]);

  /* ----------------------------------------------------------- helpers */
  const inRange = (d,f,t)=>{
    if(!f && !t) return true;
    const ts = new Date(d).setHours(0,0,0,0);
    if(f && ts < new Date(f).setHours(0,0,0,0)) return false;
    if(t && ts > new Date(t).setHours(23,59,59,999)) return false;
    return true;
  };

  const visible = all.filter(s=>
       /* search already done at server – but keep quick front-end match */
       ( !search.trim() ||
         JSON.stringify(s).toLowerCase().includes(search.toLowerCase()) )

    && inRange(s.sampleInDate, flt.dateFrom, flt.dateTo)
    && ( !flt.category    || s.category?.toLowerCase().includes(flt.category.toLowerCase()) )
    && ( !flt.subCategory || s.subCategory?.toLowerCase().includes(flt.subCategory.toLowerCase()) )
    && ( !flt.brand       || s.brandName?.toLowerCase().includes(flt.brand.toLowerCase()) )
    && ( !flt.returnable  || s.returnable===flt.returnable )
  );

  /* ------------------------------------------------------------ export */
  const handleExport = () => {
    if(!visible.length){ alert("Nothing to export"); return; }
    const rows = visible.map(s=>({
      "Date"           : new Date(s.sampleInDate).toLocaleDateString("en-GB"),
      "Ref Code"       : s.sampleReferenceCode,
      "Product ID"     : s.productId,
      "Product Name"   : s.productName,
      "Category"       : s.category,
      "SubCategory"    : s.subCategory,
      "Brand"          : s.brandName,
      "Rate"           : s.sampleRate,
      "Qty"            : s.qty,
      "Returnable"     : s.returnable,
      "Return Days"    : s.returnableDays ?? ""
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Samples");
    XLSX.writeFile(wb,"samples.xlsx");
  };

  /* ----------------------------------------------------------- modal op */
  const openCreate = () => { setEditItem(null);  setModalOpen(true); };
  const openEdit   = (s)  => { setEditItem(s);   setModalOpen(true); };

  /* =============================================================== UI */
  return (
    <div className="p-6">
      {/* ------------------- toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Search samples…"
          className="border p-2 rounded flex-grow md:flex-grow-0 md:w-1/3"
          value={search}
          onChange={e=>setSearch(e.target.value)}
        />

        <button
          onClick={()=>setShowPanel(p=>!p)}
          className="px-4 py-2 bg-slate-600 text-white rounded"
        >Filters</button>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-emerald-600 text-white rounded"
        >Export Excel</button>

        <button
          onClick={openCreate}
          className="ml-auto bg-green-600 text-white px-4 py-2 rounded"
        >+ Add Sample</button>
      </div>

      {/* ------------------- filter panel */}
      {showPanel && (
        <div className="border rounded p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50">
          {/* date from / to */}
          <div>
            <label className="block text-xs mb-1">From (In Date)</label>
            <input
              type="date" className="border p-1 rounded w-full"
              value={flt.dateFrom}
              onChange={e=>setFlt(f=>({...f,dateFrom:e.target.value}))}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">To (In Date)</label>
            <input
              type="date" className="border p-1 rounded w-full"
              value={flt.dateTo}
              onChange={e=>setFlt(f=>({...f,dateTo:e.target.value}))}
            />
          </div>

          {/* text filters */}
          <div>
            <label className="block text-xs mb-1">Category</label>
            <input
              className="border p-1 rounded w-full"
              value={flt.category}
              onChange={e=>setFlt(f=>({...f,category:e.target.value}))}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Sub-Category</label>
            <input
              className="border p-1 rounded w-full"
              value={flt.subCategory}
              onChange={e=>setFlt(f=>({...f,subCategory:e.target.value}))}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Brand</label>
            <input
              className="border p-1 rounded w-full"
              value={flt.brand}
              onChange={e=>setFlt(f=>({...f,brand:e.target.value}))}
            />
          </div>

          {/* returnable */}
          <div>
            <label className="block text-xs mb-1">Returnable</label>
            <select
              className="border p-1 rounded w-full"
              value={flt.returnable}
              onChange={e=>setFlt(f=>({...f,returnable:e.target.value}))}
            >
              <option value="">All</option>
              <option value="Returnable">Returnable</option>
              <option value="Non Returnable">Non Returnable</option>
            </select>
          </div>
        </div>
      )}

      {/* ------------------- table */}
      <SampleTable samples={visible} onEdit={openEdit} />

      {/* ------------------- add / edit modal */}
      {modalOpen && (
        <AddSampleModal
          initialData={editItem}
          onClose={()=>setModalOpen(false)}
          onSave={()=>{
            setModalOpen(false);
            fetchSamples();
          }}
        />
      )}
    </div>
  );
}
