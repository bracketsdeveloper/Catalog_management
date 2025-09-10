import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import EWayBillModal from "./EWayBillModal.jsx";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

function isoDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

// shallow helpers
const safeNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const two = (n) => Number(n || 0).toFixed(2);

export default function EditInvoiceModal({ invoice, onClose, onSave, saving, error }) {
  // Read-only (still from other models)
  const readOnly = {
    clientName: invoice?.clientName || "",
    quotationRefNumber: invoice?.invoiceDetails?.quotationRefNumber || "",
    quotationDate: invoice?.invoiceDetails?.quotationDate || "",
    createdBy: invoice?.createdBy || "",
    createdDate: invoice?.invoiceDetails?.date || invoice?.createdAt || "",
  };

  // Editable (includes Bill To, Company, Ship To, Ref JS)
  const [form, setForm] = useState({
    billTo: invoice?.billTo || "",
    clientCompanyName: invoice?.clientCompanyName || "",
    shipTo: invoice?.shipTo || "",
    refJobSheetNumber: invoice?.invoiceDetails?.refJobSheetNumber || "",
    clientOrderIdentification: invoice?.invoiceDetails?.clientOrderIdentification || "",
    discount: invoice?.invoiceDetails?.discount ?? "",
    otherRef: invoice?.invoiceDetails?.otherRef || invoice?.invoiceDetails?.otherReference || "",
    placeOfSupply: invoice?.invoiceDetails?.placeOfSupply || "",
    dueDate: isoDate(invoice?.invoiceDetails?.dueDate),
    poDate: isoDate(invoice?.invoiceDetails?.poDate),
    poNumber: invoice?.invoiceDetails?.poNumber || "",
    eWayBillNumber: invoice?.invoiceDetails?.eWayBillNumber || "",
    invoiceNumber: invoice?.invoiceDetails?.invoiceNumber || "",
  });

  // JobSheet suggestions
  const [jsQuery, setJsQuery] = useState(invoice?.invoiceDetails?.refJobSheetNumber || "");
  const [jsSuggestions, setJsSuggestions] = useState([]);
  const [showJsSuggestions, setShowJsSuggestions] = useState(false);
  const debounceTimer = useRef(null);

  // --- E-INVOICE UI STATE ---
  const [eiMsg, setEiMsg] = useState("");
  const [eiLoading, setEiLoading] = useState(false);
  const [eiData, setEiData] = useState({
    auth: false,
    customer: null,
    refBuilt: false,
    irn: null,
    ackNo: null,
    ackDt: null,
    status: null,
    ewbNo: invoice?.invoiceDetails?.eWayBillNumber || null,
    ewbValidTill: null,
  });

  // Reference JSON Modal state
  const [showRefModal, setShowRefModal] = useState(false);
  const [refJson, setRefJson] = useState(null);
  const [editRef, setEditRef] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  // NEW: E-Way Bill modal
  const [showEwbModal, setShowEwbModal] = useState(false);

  // Automate 1→2→3 on open/refresh; also rehydrate IRN/EWB if present
  useEffect(() => {
    setForm({
      billTo: invoice?.billTo || "",
      clientCompanyName: invoice?.clientCompanyName || "",
      shipTo: invoice?.shipTo || "",
      refJobSheetNumber: invoice?.invoiceDetails?.refJobSheetNumber || "",
      clientOrderIdentification: invoice?.invoiceDetails?.clientOrderIdentification || "",
      discount: invoice?.invoiceDetails?.discount ?? "",
      otherRef: invoice?.invoiceDetails?.otherRef || invoice?.invoiceDetails?.otherReference || "",
      placeOfSupply: invoice?.invoiceDetails?.placeOfSupply || "",
      dueDate: isoDate(invoice?.invoiceDetails?.dueDate),
      poDate: isoDate(invoice?.invoiceDetails?.poDate),
      poNumber: invoice?.invoiceDetails?.poNumber || "",
      eWayBillNumber: invoice?.invoiceDetails?.eWayBillNumber || "",
      invoiceNumber: invoice?.invoiceDetails?.invoiceNumber || "",
    });
    setJsQuery(invoice?.invoiceDetails?.refJobSheetNumber || "");
    setJsSuggestions([]);
    setShowJsSuggestions(false);

    setEiMsg("");
    setEiData({
      auth: false,
      customer: null,
      refBuilt: false,
      irn: null,
      ackNo: null,
      ackDt: null,
      status: null,
      ewbNo: invoice?.invoiceDetails?.eWayBillNumber || null,
      ewbValidTill: null,
    });
    setShowRefModal(false);
    setRefJson(null);
    setEditRef(null);
    setShowRaw(false);

    if (invoice?._id) {
      (async () => {
        await autoAuthenticateFetchBuild();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?._id]);

  // --- JS suggestions ---
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!jsQuery?.trim()) {
      setJsSuggestions([]);
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const url = `${BACKEND}/api/admin/jobsheets?searchQuery=${encodeURIComponent(jsQuery)}&page=1&limit=5`;
        const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
        const list = Array.isArray(data?.jobSheets) ? data.jobSheets : Array.isArray(data) ? data : [];
        setJsSuggestions(list);
        setShowJsSuggestions(true);
      } catch {
        setJsSuggestions([]);
        setShowJsSuggestions(false);
      }
    }, 300);
    return () => debounceTimer.current && clearTimeout(debounceTimer.current);
  }, [jsQuery]);

  const pickJobSheet = (js) => {
    const num = js?.jobSheetNumber || "";
    setForm((f) => ({ ...f, refJobSheetNumber: num }));
    setJsQuery(num);
    setJsSuggestions([]);
    setShowJsSuggestions(false);
  };

  // --- E-INVOICE ACTIONS ---
  const tokenHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  const autoAuthenticateFetchBuild = async () => {
    try {
      setEiLoading(true);
      // 1) Authenticate
      setEiMsg("Authenticating…");
      const a = await axios.post(`${BACKEND}/api/admin/invoices/${invoice?._id}/einvoice/authenticate`, {}, { headers: tokenHeader() });
      const aEInv = a?.data?.eInvoice || {};
      const existingIrn = aEInv?.irn || null;

      setEiData((s) => ({
        ...s,
        auth: true,
        irn: existingIrn,
        ackNo: aEInv?.ackNo || null,
        ackDt: aEInv?.ackDt || null,
        status: aEInv?.status || null,
        ewbNo: aEInv?.ewbNo || s.ewbNo,
        ewbValidTill: aEInv?.ewbValidTill || s.ewbValidTill,
      }));

      // 2) Fetch customer
      setEiMsg("Fetching customer…");
      const c = await axios.get(`${BACKEND}/api/admin/invoices/${invoice?._id}/einvoice/customer`, { headers: tokenHeader() });
      const cust = c?.data?.customerDetails || null;
      setEiData((s) => ({ ...s, customer: cust }));

      // 3) Build reference (and open modal)
      setEiMsg("Building reference JSON…");
      const r = await axios.post(`${BACKEND}/api/admin/invoices/${invoice?._id}/einvoice/reference`, {}, { headers: tokenHeader() });
      const ref = r?.data?.referenceJson || null;
      setEiData((s) => ({ ...s, refBuilt: !!ref }));
      setRefJson(ref);
      setEditRef(ref ? JSON.parse(JSON.stringify(ref)) : null); // deep copy
      setShowRefModal(true);

      setEiMsg(existingIrn ? "Authenticated · Customer fetched · Reference loaded · IRN already generated" : "Authenticated · Customer fetched · Reference built");
    } catch (e) {
      setEiMsg(e?.response?.data?.message || "Auto-run failed");
    } finally {
      setEiLoading(false);
    }
  };

  const eiAuthenticate = async () => {
    try {
      setEiLoading(true);
      setEiMsg("Authenticating…");
      const { data } = await axios.post(`${BACKEND}/api/admin/invoices/${invoice?._id}/einvoice/authenticate`, {}, { headers: tokenHeader() });
      const eInv = data?.eInvoice || {};
      setEiData((s) => ({
        ...s,
        auth: true,
        irn: eInv?.irn || s.irn,
        ackNo: eInv?.ackNo || s.ackNo,
        ackDt: eInv?.ackDt || s.ackDt,
        status: eInv?.status || s.status,
        ewbNo: eInv?.ewbNo || s.ewbNo,
        ewbValidTill: eInv?.ewbValidTill || s.ewbValidTill,
      }));
      setEiMsg(data?.message || "Authenticated");
    } catch (e) {
      setEiMsg(e?.response?.data?.message || "Authentication failed");
    } finally {
      setEiLoading(false);
    }
  };

  const eiFetchCustomer = async () => {
    try {
      setEiLoading(true);
      setEiMsg("Fetching customer…");
      const { data } = await axios.get(`${BACKEND}/api/admin/invoices/${invoice?._id}/einvoice/customer`, { headers: tokenHeader() });
      setEiData((s) => ({ ...s, customer: data?.customerDetails || null }));
      setEiMsg(data?.message || "Customer fetched");
    } catch (e) {
      setEiMsg(e?.response?.data?.message || "Fetch failed");
    } finally {
      setEiLoading(false);
    }
  };

  const eiBuildReference = async () => {
    try {
      setEiLoading(true);
      setEiMsg("Building reference JSON…");
      const { data } = await axios.post(`${BACKEND}/api/admin/invoices/${invoice?._id}/einvoice/reference`, {}, { headers: tokenHeader() });
      const ref = data?.referenceJson || null;
      setEiData((s) => ({ ...s, refBuilt: !!ref }));
      setRefJson(ref);
      setEditRef(ref ? JSON.parse(JSON.stringify(ref)) : null);
      setShowRefModal(true);
      setEiMsg(data?.message || "Reference built");
    } catch (e) {
      setEiMsg(e?.response?.data?.message || "Reference build failed");
      setRefJson(null);
      setShowRefModal(false);
    } finally {
      setEiLoading(false);
    }
  };

  const eiSaveEditedReference = async () => {
    try {
      setEiLoading(true);
      setEiMsg("Saving edited reference…");
      const payload = { referenceJson: editRef }; // backend should upsert this into eInvoice.referenceJson
      const { data } = await axios.post(`${BACKEND}/api/admin/invoices/${invoice?._id}/einvoice/reference`, payload, { headers: tokenHeader() });
      const ref = data?.referenceJson || editRef;
      setRefJson(ref);
      setEditRef(JSON.parse(JSON.stringify(ref)));
      setEiData((s) => ({ ...s, refBuilt: true }));
      setEiMsg("Reference saved");
    } catch (e) {
      setEiMsg(e?.response?.data?.message || "Save failed");
    } finally {
      setEiLoading(false);
    }
  };

  const eiGenerateIRN = async () => {
    try {
      setEiLoading(true);
      setEiMsg("Generating IRN…");
      if (editRef) {
        await eiSaveEditedReference();
      }
      const { data } = await axios.post(`${BACKEND}/api/admin/invoices/${invoice?._id}/einvoice/generate`, {}, { headers: tokenHeader() });
      const eInv = data?.eInvoice || {};
      setEiData((s) => ({
        ...s,
        irn: eInv?.irn || s.irn,
        ackNo: eInv?.ackNo || s.ackNo,
        ackDt: eInv?.ackDt || s.ackDt,
        status: eInv?.status || s.status,
        ewbNo: eInv?.ewbNo || s.ewbNo,
        ewbValidTill: eInv?.ewbValidTill || s.ewbValidTill,
      }));
      setEiMsg(data?.message || "IRN generated");
    } catch (e) {
      setEiMsg(e?.response?.data?.status_desc || e?.response?.data?.message || "IRN failed");
    } finally {
      setEiLoading(false);
    }
  };

  const eiCancelIRN = async () => {
    try {
      setEiLoading(true);
      setEiMsg("Cancelling e-invoice…");
      const { data } = await axios.put(`${BACKEND}/api/admin/invoices/${invoice?._id}/einvoice/cancel`, {}, { headers: tokenHeader() });
      const eInv = data?.eInvoice || {};
      setEiData((s) => ({
        ...s,
        irn: eInv?.irn || null,
        ackNo: eInv?.ackNo || null,
        ackDt: eInv?.ackDt || null,
        status: eInv?.status || "CANCELLED",
      }));
      setEiMsg(data?.message || "E-Invoice cancelled");
    } catch (e) {
      setEiMsg(e?.response?.data?.message || "Cancel failed");
    } finally {
      setEiLoading(false);
    }
  };

  // --- Edit helpers (Reference form) ---
  const setPath = (path, val) => {
    setEditRef((prev) => {
      const next = { ...(prev || {}) };
      let cur = next;
      const keys = path.split(".");
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
        cur = cur[k];
      }
      cur[keys[keys.length - 1]] = val;
      return next;
    });
  };

  const setItem = (i, field, val) => {
    setEditRef((prev) => {
      const next = { ...(prev || {}) };
      const list = Array.isArray(next.ItemList) ? [...next.ItemList] : [];
      list[i] = { ...(list[i] || {}), [field]: val };
      next.ItemList = list;
      return next;
    });
  };

  const recalcTotals = () => {
    setEditRef((prev) => {
      const next = { ...(prev || {}) };
      const list = Array.isArray(next.ItemList) ? next.ItemList : [];
      let AssVal = 0, CgstVal = 0, SgstVal = 0, IgstVal = 0, TotInvVal = 0;

      const fixed = list.map((it) => {
        const qty = safeNum(it.Qty, 0);
        const unit = safeNum(it.UnitPrice, 0);
        const totAmt = qty * unit;
        const discount = safeNum(it.Discount, 0);
        const assAmt = safeNum(it.AssAmt, Math.max(0, totAmt - discount));
        const cgst = safeNum(it.CgstAmt, 0);
        const sgst = safeNum(it.SgstAmt, 0);
        const igst = safeNum(it.IgstAmt, 0);
        const totItemVal = safeNum(it.TotItemVal, assAmt + cgst + sgst + igst);

        AssVal += assAmt;
        CgstVal += cgst;
        SgstVal += sgst;
        IgstVal += igst;
        TotInvVal += totItemVal;

        return {
          ...it,
          TotAmt: Number(totAmt.toFixed(2)),
          AssAmt: Number(assAmt.toFixed(2)),
          CgstAmt: Number(cgst.toFixed(2)),
          SgstAmt: Number(sgst.toFixed(2)),
          IgstAmt: Number(igst.toFixed(2)),
          TotItemVal: Number(totItemVal.toFixed(2)),
        };
      });

      next.ItemList = fixed;
      next.ValDtls = {
        ...(next.ValDtls || {}),
        AssVal: Number(AssVal.toFixed(2)),
        CgstVal: Number(CgstVal.toFixed(2)),
        SgstVal: Number(SgstVal.toFixed(2)),
        IgstVal: Number(IgstVal.toFixed(2)),
        TotInvVal: Number(TotInvVal.toFixed(2)),
      };
      return next;
    });
  };

  // --- Reference Modal (editable) ---
  const RefPreviewModal = () => {
    if (!showRefModal) return null;
    const r = editRef || {};

    return (
      <div className="fixed inset-0 z-40 flex">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={() => setShowRefModal(false)} />
        {/* Panel */}
        <div className="relative ml-auto h-full w-full max-w-6xl bg-white shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <div className="text-base font-semibold">E-Invoice Reference Preview</div>
              <div className="text-xs text-gray-500">
                Review/edit the data below, <b>Save</b>, then click <b>Generate IRN</b>.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowRaw((v) => !v)} className="px-3 py-1 text-xs rounded border hover:bg-gray-100">
                {showRaw ? "Show Form" : "Show Raw JSON"}
              </button>
              <button
                disabled={eiLoading}
                onClick={eiSaveEditedReference}
                className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                title="Save edited JSON to server"
              >
                {eiLoading ? "Saving…" : "Save"}
              </button>
              <button
                disabled={eiLoading || !!eiData.irn || eiData.status === "GENERATED"}
                onClick={eiGenerateIRN}
                className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                title="Generate IRN"
              >
                {eiLoading ? "Generating…" : "Generate IRN"}
              </button>
              <button onClick={() => setShowRefModal(false)} className="px-3 py-1 text-xs rounded border hover:bg-gray-100">
                Close
              </button>
            </div>
          </div>

          {/* IRN / EWB banner */}
          {(eiData.irn || eiData.status === "GENERATED") && (
            <div className="px-4 py-2 text-xs bg-green-50 border-b">
              <b>IRN:</b> {eiData.irn || "—"}
              {eiData.ackNo ? <> &nbsp;<b>Ack No:</b> {eiData.ackNo}</> : null}
              {eiData.ackDt ? <> &nbsp;<b>Ack Dt:</b> {eiData.ackDt}</> : null}
              {eiData.ewbNo ? <> &nbsp;<b>E-Way Bill:</b> {eiData.ewbNo}</> : null}
              {eiData.ewbValidTill ? <> &nbsp;<b>Valid Till:</b> {eiData.ewbValidTill}</> : null}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-auto p-4 text-xs">
            {showRaw ? (
              <pre className="whitespace-pre-wrap text-[11px] bg-gray-50 p-3 rounded border">
                {JSON.stringify(editRef, null, 2)}
              </pre>
            ) : (
              <div className="space-y-4">
                {/* Doc + Tran */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded p-3 space-y-2">
                    <div className="font-semibold">Document</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-gray-600">Type</label>
                      <input className="border p-1 rounded" value={r?.DocDtls?.Typ || ""} onChange={(e) => setPath("DocDtls.Typ", e.target.value)} />
                      <label className="text-gray-600">No</label>
                      <input className="border p-1 rounded" value={r?.DocDtls?.No || ""} onChange={(e) => setPath("DocDtls.No", e.target.value)} />
                      <label className="text-gray-600">Date (DD/MM/YYYY)</label>
                      <input className="border p-1 rounded" value={r?.DocDtls?.Dt || ""} onChange={(e) => setPath("DocDtls.Dt", e.target.value)} />
                    </div>
                  </div>
                  <div className="border rounded p-3 space-y-2">
                    <div className="font-semibold">Transaction</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-gray-600">TaxSch</label>
                      <input className="border p-1 rounded" value={r?.TranDtls?.TaxSch || ""} onChange={(e) => setPath("TranDtls.TaxSch", e.target.value)} />
                      <label className="text-gray-600">SupTyp</label>
                      <select
                        className="border p-1 rounded"
                        value={r?.TranDtls?.SupTyp || "B2B"}
                        onChange={(e) => setPath("TranDtls.SupTyp", e.target.value)}
                      >
                        <option value="B2B">B2B</option>
                        <option value="SEZWP">SEZWP</option>
                        <option value="SEZWOP">SEZWOP</option>
                        <option value="EXPWP">EXPWP</option>
                        <option value="EXPWOP">EXPWOP</option>
                        <option value="DEXP">DEXP</option>
                      </select>
                      <label className="text-gray-600">IgstOnIntra</label>
                      <select
                        className="border p-1 rounded"
                        value={r?.TranDtls?.IgstOnIntra || "N"}
                        onChange={(e) => setPath("TranDtls.IgstOnIntra", e.target.value)}
                      >
                        <option value="N">N</option>
                        <option value="Y">Y</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Seller */}
                <div className="border rounded p-3">
                  <div className="font-semibold mb-2">Seller</div>
                  <div className="grid grid-cols-6 gap-2">
                    <label className="text-gray-600 col-span-1">GSTIN</label>
                    <input className="border p-1 rounded col-span-2" value={r?.SellerDtls?.Gstin || ""} onChange={(e) => setPath("SellerDtls.Gstin", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Legal Name</label>
                    <input className="border p-1 rounded col-span-2" value={r?.SellerDtls?.LglNm || ""} onChange={(e) => setPath("SellerDtls.LglNm", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Addr1</label>
                    <input className="border p-1 rounded col-span-2" value={r?.SellerDtls?.Addr1 || ""} onChange={(e) => setPath("SellerDtls.Addr1", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Addr2</label>
                    <input className="border p-1 rounded col-span-2" value={r?.SellerDtls?.Addr2 || ""} onChange={(e) => setPath("SellerDtls.Addr2", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Loc</label>
                    <input className="border p-1 rounded col-span-2" value={r?.SellerDtls?.Loc || ""} onChange={(e) => setPath("SellerDtls.Loc", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Pin</label>
                    <input className="border p-1 rounded col-span-2" value={r?.SellerDtls?.Pin || ""} onChange={(e) => setPath("SellerDtls.Pin", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Stcd</label>
                    <input className="border p-1 rounded col-span-2" value={r?.SellerDtls?.Stcd || ""} onChange={(e) => setPath("SellerDtls.Stcd", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Ph</label>
                    <input className="border p-1 rounded col-span-2" value={r?.SellerDtls?.Ph || ""} onChange={(e) => setPath("SellerDtls.Ph", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Email</label>
                    <input className="border p-1 rounded col-span-2" value={r?.SellerDtls?.Em || ""} onChange={(e) => setPath("SellerDtls.Em", e.target.value)} />
                  </div>
                </div>

                {/* Buyer */}
                <div className="border rounded p-3">
                  <div className="font-semibold mb-2">Buyer</div>
                  <div className="grid grid-cols-6 gap-2">
                    <label className="text-gray-600 col-span-1">GSTIN</label>
                    <input className="border p-1 rounded col-span-2" value={r?.BuyerDtls?.Gstin || ""} onChange={(e) => setPath("BuyerDtls.Gstin", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Legal Name</label>
                    <input className="border p-1 rounded col-span-2" value={r?.BuyerDtls?.LglNm || ""} onChange={(e) => setPath("BuyerDtls.LglNm", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Trade Name</label>
                    <input className="border p-1 rounded col-span-2" value={r?.BuyerDtls?.TrdNm || ""} onChange={(e) => setPath("BuyerDtls.TrdNm", e.target.value)} />
                    <label className="text-gray-600 col-span-1">POS (State Code)</label>
                    <input className="border p-1 rounded col-span-2" value={r?.BuyerDtls?.Pos || ""} onChange={(e) => setPath("BuyerDtls.Pos", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Addr1</label>
                    <input className="border p-1 rounded col-span-2" value={r?.BuyerDtls?.Addr1 || ""} onChange={(e) => setPath("BuyerDtls.Addr1", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Addr2</label>
                    <input className="border p-1 rounded col-span-2" value={r?.BuyerDtls?.Addr2 || ""} onChange={(e) => setPath("BuyerDtls.Addr2", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Loc</label>
                    <input className="border p-1 rounded col-span-2" value={r?.BuyerDtls?.Loc || ""} onChange={(e) => setPath("BuyerDtls.Loc", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Pin</label>
                    <input className="border p-1 rounded col-span-2" value={r?.BuyerDtls?.Pin || ""} onChange={(e) => setPath("BuyerDtls.Pin", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Stcd</label>
                    <input className="border p-1 rounded col-span-2" value={r?.BuyerDtls?.Stcd || ""} onChange={(e) => setPath("BuyerDtls.Stcd", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Ph</label>
                    <input className="border p-1 rounded col-span-2" value={r?.BuyerDtls?.Ph || ""} onChange={(e) => setPath("BuyerDtls.Ph", e.target.value)} />
                    <label className="text-gray-600 col-span-1">Email</label>
                    <input className="border p-1 rounded col-span-2" value={r?.BuyerDtls?.Em || ""} onChange={(e) => setPath("BuyerDtls.Em", e.target.value)} />
                  </div>
                </div>

                {/* Items */}
                <div className="border rounded">
                  <div className="p-3 font-semibold flex items-center justify-between">
                    <span>Items</span>
                    <button onClick={recalcTotals} className="px-3 py-1 text-xs rounded border hover:bg-gray-100">Recalculate totals</button>
                  </div>
                  <div className="overflow-auto">
                    <table className="table-auto w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1 border text-left">Sl</th>
                          <th className="px-2 py-1 border text-left">Description</th>
                          <th className="px-2 py-1 border text-left">HSN</th>
                          <th className="px-2 py-1 border text-right">Qty</th>
                          <th className="px-2 py-1 border text-right">Unit</th>
                          <th className="px-2 py-1 border text-right">Rate</th>
                          <th className="px-2 py-1 border text-right">Ass Amt</th>
                          <th className="px-2 py-1 border text-right">CGST</th>
                          <th className="px-2 py-1 border text-right">SGST</th>
                          <th className="px-2 py-1 border text-right">IGST</th>
                          <th className="px-2 py-1 border text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(editRef?.ItemList || refJson?.ItemList || []).map((it, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-2 py-1 border">
                              <input className="border p-1 rounded w-14" value={it?.SlNo || i + 1} onChange={(e) => setItem(i, "SlNo", e.target.value)} />
                            </td>
                            <td className="px-2 py-1 border">
                              <input className="border p-1 rounded w-full" value={it?.PrdDesc || ""} onChange={(e) => setItem(i, "PrdDesc", e.target.value)} />
                            </td>
                            <td className="px-2 py-1 border">
                              <input className="border p-1 rounded w-24" value={it?.HsnCd || ""} onChange={(e) => setItem(i, "HsnCd", e.target.value)} />
                            </td>
                            <td className="px-2 py-1 border text-right">
                              <input className="border p-1 rounded w-24 text-right" value={it?.Qty ?? ""} onChange={(e) => setItem(i, "Qty", e.target.value)} />
                            </td>
                            <td className="px-2 py-1 border text-right">
                              <input className="border p-1 rounded w-20 text-right" value={it?.Unit || "NOS"} onChange={(e) => setItem(i, "Unit", e.target.value)} />
                            </td>
                            <td className="px-2 py-1 border text-right">
                              <input className="border p-1 rounded w-24 text-right" value={it?.UnitPrice ?? ""} onChange={(e) => setItem(i, "UnitPrice", e.target.value)} />
                            </td>
                            <td className="px-2 py-1 border text-right">
                              <input className="border p-1 rounded w-24 text-right" value={it?.AssAmt ?? ""} onChange={(e) => setItem(i, "AssAmt", e.target.value)} />
                            </td>
                            <td className="px-2 py-1 border text-right">
                              <input className="border p-1 rounded w-24 text-right" value={it?.CgstAmt ?? ""} onChange={(e) => setItem(i, "CgstAmt", e.target.value)} />
                            </td>
                            <td className="px-2 py-1 border text-right">
                              <input className="border p-1 rounded w-24 text-right" value={it?.SgstAmt ?? ""} onChange={(e) => setItem(i, "SgstAmt", e.target.value)} />
                            </td>
                            <td className="px-2 py-1 border text-right">
                              <input className="border p-1 rounded w-24 text-right" value={it?.IgstAmt ?? ""} onChange={(e) => setItem(i, "IgstAmt", e.target.value)} />
                            </td>
                            <td className="px-2 py-1 border text-right">
                              <input className="border p-1 rounded w-28 text-right" value={it?.TotItemVal ?? ""} onChange={(e) => setItem(i, "TotItemVal", e.target.value)} />
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-100 font-semibold">
                          <td className="px-2 py-1 border text-center" colSpan={6}>Totals</td>
                          <td className="px-2 py-1 border text-right">{two(refJson?.ValDtls?.AssVal)}</td>
                          <td className="px-2 py-1 border text-right">{two(refJson?.ValDtls?.CgstVal)}</td>
                          <td className="px-2 py-1 border text-right">{two(refJson?.ValDtls?.SgstVal)}</td>
                          <td className="px-2 py-1 border text-right">{two(refJson?.ValDtls?.IgstVal)}</td>
                          <td className="px-2 py-1 border text-right">{two(refJson?.ValDtls?.TotInvVal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = () => {
    const patch = {
      billTo: form.billTo,
      clientCompanyName: form.clientCompanyName,
      shipTo: form.shipTo,
      invoiceDetails: {
        refJobSheetNumber: form.refJobSheetNumber || "",
        clientOrderIdentification: form.clientOrderIdentification,
        discount: form.discount === "" ? null : Number(form.discount),
        otherRef: form.otherRef,
        placeOfSupply: form.placeOfSupply,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        poDate: form.poDate ? new Date(form.poDate).toISOString() : null,
        poNumber: form.poNumber,
        eWayBillNumber: form.eWayBillNumber,
        invoiceNumber: form.invoiceNumber,
      },
    };
    onSave(patch);
  };

  // --- UI ---
  return (
    <div className="w-full min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Edit Invoice</h2>
          {(eiData.irn || eiData.status === "GENERATED") && (
            <div className="text-xs px-2 py-1 rounded bg-green-100 border border-green-300">
              <b>IRN:</b> {eiData.irn || "—"}
              {eiData.ackNo ? <> · <b>Ack No:</b> {eiData.ackNo}</> : null}
              {eiData.ackDt ? <> · <b>Ack Dt:</b> {eiData.ackDt}</> : null}
              {eiData.ewbNo ? <> · <b>E-Way Bill:</b> {eiData.ewbNo}</> : null}
              {eiData.ewbValidTill ? <> · <b>Valid Till:</b> {eiData.ewbValidTill}</> : null}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {/* Generate IRN */}
          <button
            disabled={eiLoading || !eiData.refBuilt || eiData.status === "GENERATED" || !!eiData.irn}
            onClick={eiGenerateIRN}
            className="text-sm px-3 py-1 rounded border bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
            title="Generate IRN"
          >
            {eiLoading ? "Generating…" : "Generate IRN"}
          </button>
          {/* NEW: Generate E-Way Bill (opens modal) */}
          <button
            disabled={eiLoading || !eiData.irn || !!eiData.ewbNo}
            onClick={() => setShowEwbModal(true)}
            className="text-sm px-3 py-1 rounded border bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
            title="Generate E-Way Bill (requires IRN)"
          >
            Generate E-Way Bill
          </button>

          <Link to={`/admin-dashboard/invoices/${invoice?._id}/print`}>
            <button className="text-sm px-3 py-1 rounded border bg-blue-600 text-white hover:bg-blue-700" title="Export / Print Invoice">
              Export / Print
            </button>
          </Link>
          <button onClick={onClose} className="text-sm px-3 py-1 rounded border hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>

      {/* E-INVOICE PANEL (hide if IRN already exists) */}
      {!(eiData.irn || eiData.status === "GENERATED") && (
        <div className="px-4 pt-3">
          <div className="border rounded p-3 bg-orange-50">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-semibold text-sm">E-Invoice</span>
              <span className="text-xs text-gray-600">
                Authenticate → Fetch Customer → Build Reference → Generate IRN
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={eiLoading}
                onClick={eiAuthenticate}
                className="px-3 py-1 text-xs rounded bg-gray-800 text-white disabled:opacity-60"
              >
                1) Authenticate
              </button>
              <button
                disabled={eiLoading || !eiData.auth}
                onClick={eiFetchCustomer}
                className="px-3 py-1 text-xs rounded bg-gray-700 text-white disabled:opacity-60"
              >
                2) Fetch Customer
              </button>
              <button
                disabled={eiLoading || !eiData.customer}
                onClick={eiBuildReference}
                className="px-3 py-1 text-xs rounded bg-gray-600 text-white disabled:opacity-60"
                title="Builds JSON and opens a confirmation modal"
              >
                3) Build Reference (Preview)
              </button>
              <button
                disabled={eiLoading || !eiData.refBuilt}
                onClick={eiGenerateIRN}
                className="px-3 py-1 text-xs rounded bg-green-600 text-white disabled:opacity-60"
              >
                4) Generate IRN
              </button>
              {eiData.irn && (
                <span className="text-xs ml-2">
                  IRN: <b>{eiData.irn}</b>
                </span>
              )}
            </div>
            {!!eiMsg && <div className="text-xs mt-2 text-gray-700">{eiMsg}</div>}
          </div>
        </div>
      )}

      {error && <div className="m-4 text-xs text-red-600">{error}</div>}

      {/* Scrollable form */}
      <div className="flex-1 overflow-auto p-6 space-y-6 text-xs">
        {/* Addresses + core info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">Bill To (editable)</label>
            <textarea name="billTo" value={form.billTo} onChange={handleChange} className="w-full border p-2 rounded h-20" />
          </div>
          <div>
            <label className="block font-medium mb-1">Ship To (editable)</label>
            <textarea name="shipTo" value={form.shipTo} onChange={handleChange} className="w-full border p-2 rounded h-20" />
          </div>

          <div>
            <label className="block font-medium mb-1">Client Company (editable)</label>
            <input name="clientCompanyName" value={form.clientCompanyName} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block font-medium mb-1">Client Name</label>
            <input value={readOnly.clientName} readOnly className="w-full border p-2 rounded bg-gray-100" />
          </div>

          {/* Ref JS (editable + suggestions) */}
          <div className="relative">
            <label className="block font-medium mb-1">Ref. JobSheet # (editable)</label>
            <input
              name="refJobSheetNumber"
              value={form.refJobSheetNumber}
              onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, refJobSheetNumber: v })); setJsQuery(v); }}
              onFocus={() => jsSuggestions.length && setShowJsSuggestions(true)}
              onBlur={() => setTimeout(() => setShowJsSuggestions(false), 150)}
              className="w-full border p-2 rounded"
              placeholder="Start typing to search…"
            />
            {showJsSuggestions && jsSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full border rounded bg-white shadow max-h-48 overflow-auto">
                {jsSuggestions.map((j) => (
                  <li
                    key={j._id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickJobSheet(j)}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="font-medium">{j.jobSheetNumber}</div>
                    <div className="text-[10px] text-gray-600">
                      {j.eventName ? `${j.eventName} · ` : ""}{j.clientCompanyName || ""}{j.clientName ? ` · ${j.clientName}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block font-medium mb-1">Quotation Ref #</label>
            <input value={readOnly.quotationRefNumber} readOnly className="w-full border p-2 rounded bg-gray-100" />
          </div>
          <div>
            <label className="block font-medium mb-1">Quotation Date</label>
            <input value={readOnly.quotationDate ? new Date(readOnly.quotationDate).toLocaleDateString() : ""} readOnly className="w-full border p-2 rounded bg-gray-100" />
          </div>
          <div>
            <label className="block font-medium mb-1">Invoice Created On</label>
            <input value={readOnly.createdDate ? new Date(readOnly.createdDate).toLocaleDateString() : ""} readOnly className="w-full border p-2 rounded bg-gray-100" />
          </div>
          <div>
            <label className="block font-medium mb-1">Created By</label>
            <input value={readOnly.createdBy} readOnly className="w-full border p-2 rounded bg-gray-100" />
          </div>
          <div>
            <label className="block font-medium mb-1">Invoice Number (editable)</label>
            <input name="invoiceNumber" value={form.invoiceNumber} onChange={handleChange} className="w-full border p-2 rounded" placeholder="APP/2025-2026/####" />
          </div>
        </div>

        {/* Invoice-only editable fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">Client Order Identification</label>
            <input name="clientOrderIdentification" value={form.clientOrderIdentification} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block font-medium mb-1">Discount</label>
            <input name="discount" type="number" value={form.discount} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>

          <div>
            <label className="block font-medium mb-1">Other Ref.</label>
            <input name="otherRef" value={form.otherRef} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block font-medium mb-1">Place of Supply</label>
            <input name="placeOfSupply" value={form.placeOfSupply} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>

          <div>
            <label className="block font-medium mb-1">Due Date</label>
            <input type="date" name="dueDate" value={form.dueDate || ""} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block font-medium mb-1">PO Date</label>
            <input type="date" name="poDate" value={form.poDate || ""} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>

          <div>
            <label className="block font-medium mb-1">PO Number</label>
            <input name="poNumber" value={form.poNumber} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block font-medium mb-1">E-Way Bill #</label>
            <input name="eWayBillNumber" value={form.eWayBillNumber} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
        </div>

        {/* Product details preview (read-only from Invoice model) */}
        <div>
          <h3 className="text-sm font-semibold mb-1">Product Details</h3>
          <div className="overflow-x-auto border rounded">
            <table className="table-auto w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 border text-left">Sl No</th>
                  <th className="px-2 py-1 border text-left">Description</th>
                  <th className="px-2 py-1 border text-left">HSN</th>
                  <th className="px-2 py-1 border text-right">Qty</th>
                  <th className="px-2 py-1 border text-left">Unit</th>
                  <th className="px-2 py-1 border text-right">Rate</th>
                  <th className="px-2 py-1 border text-right">Taxable</th>
                  <th className="px-2 py-1 border text-right">CGST</th>
                  <th className="px-2 py-1 border text-right">SGST</th>
                  <th className="px-2 py-1 border text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(invoice?.items || []).map((it, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-2 py-1 border">{it.slNo || i + 1}</td>
                    <td className="px-2 py-1 border">{it.description || it.product}</td>
                    <td className="px-2 py-1 border">{it.hsnCode || it.hsn || ""}</td>
                    <td className="px-2 py-1 border text-right">{it.quantity}</td>
                    <td className="px-2 py-1 border">{(it.unit || "NOS").toUpperCase()}</td>
                    <td className="px-2 py-1 border text-right">{Number(it.rate || 0).toFixed(2)}</td>
                    <td className="px-2 py-1 border text-right">{Number(it.taxableAmount || 0).toFixed(2)}</td>
                    <td className="px-2 py-1 border text-right">
                      {Number(it.cgstAmount || 0).toFixed(2)}{" "}
                      <span className="text-[10px] text-gray-500">({Number(it.cgstPercent || 0)}%)</span>
                    </td>
                    <td className="px-2 py-1 border text-right">
                      {Number(it.sgstAmount || 0).toFixed(2)}{" "}
                      <span className="text-[10px] text-gray-500">({Number(it.sgstPercent || 0)}%)</span>
                    </td>
                    <td className="px-2 py-1 border text-right">{Number(it.totalAmount || 0).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-2 py-1 border text-center" colSpan={6}>Totals</td>
                  <td className="px-2 py-1 border text-right">{Number(invoice?.subtotalTaxable || 0).toFixed(2)}</td>
                  <td className="px-2 py-1 border text-right">{Number(invoice?.totalCgst || 0).toFixed(2)}</td>
                  <td className="px-2 py-1 border text-right">{Number(invoice?.totalSgst || 0).toFixed(2)}</td>
                  <td className="px-2 py-1 border text-right">{Number(invoice?.grandTotal || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
        <button onClick={onClose} className="px-4 py-2 border rounded text-xs" disabled={saving}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded text-xs">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Reference JSON confirmation modal (editable) */}
      <RefPreviewModal />

      {/* NEW: E-Way Bill Modal */}
      <EWayBillModal
        open={showEwbModal}
        onClose={() => setShowEwbModal(false)}
        invoiceId={invoice?._id}
        irn={eiData.irn}
        refJson={refJson || editRef || {}}
        shipToText={form.shipTo || invoice?.shipTo || ""}
        onGenerated={(eInvoice, updatedInvoice) => {
          const ewb = eInvoice?.ewbNo || updatedInvoice?.invoiceDetails?.eWayBillNumber || null;
          const vTill = eInvoice?.ewbValidTill || null;
          setEiData((s) => ({ ...s, ewbNo: ewb, ewbValidTill: vTill }));
          if (ewb) {
            setForm((f) => ({ ...f, eWayBillNumber: ewb }));
          }
        }}
      />
    </div>
  );
}
