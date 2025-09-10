"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function fmtDate(d, fallback = "—") {
  if (!d) return fallback;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return fallback;
  return format(dt, "dd/MM/yyyy");
}
function fmtAmt(n) {
  const x = Number(n);
  if (isNaN(x)) return "0.00";
  return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(n) {
  const x = Number(n);
  if (isNaN(x)) return "0%";
  return x % 1 === 0 ? `${x.toFixed(0)}%` : `${x.toFixed(1)}%`;
}

/** Indian numbering style words with special-case for 1000. */
function numberToWordsIndian(numIn) {
  const n = Math.round(Number(numIn || 0));
  if (!isFinite(n) || n < 0) return "zero only";
  if (n === 0) return "zero only";
  if (n === 1000) return "thousand only";

  const ones = [
    "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
    "sixteen", "seventeen", "eighteen", "nineteen",
  ];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  function twoDigits(num) {
    if (num < 20) return ones[num];
    const t = Math.floor(num / 10);
    const o = num % 10;
    return (tens[t] + (o ? " " + ones[o] : "")).trim();
  }
  function threeDigits(num) {
    const h = Math.floor(num / 100);
    const r = num % 100;
    const parts = [];
    if (h) parts.push(ones[h] + " hundred");
    if (r) parts.push(twoDigits(r));
    return parts.join(" ").trim();
  }

  let num = n;
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thou = Math.floor(num / 1000); num %= 1000;
  const rest = num;

  const words = [];
  if (crore) words.push(threeDigits(crore) + " crore");
  if (lakh) words.push(threeDigits(lakh) + " lakh");
  if (thou) words.push(threeDigits(thou) + " thousand");
  if (rest) words.push(threeDigits(rest));

  return (words.join(" ") + " only").trim();
}

export default function InvoicePrint() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const pageRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/invoices/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInvoice(res.data);
      } catch (e) {
        console.error(e);
        setErr("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!invoice) return;
    const original = document.body.innerHTML;
    const timer = setTimeout(() => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice - ${invoice?.invoiceDetails?.invoiceNumber || id}</title>
            <style>
              @page { size: A4; margin: 5mm; }
              * { box-sizing: border-box; }
              html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body {
                font-family: Calibri, Arial, sans-serif;
                width: 210mm; height: 297mm; margin: 0 auto;
                padding: 0;
              }
              .sheet {
                width: 210mm; min-height: 297mm; padding: 10px 12px;
                border: 1px solid #000; border-bottom: 0; /* footer owns bottom line */
                display: flex; flex-direction: column;
              }
              /* Top */
              .topbar { position: relative; margin: 0; padding: 0; }
              .brand {
                font-size: 13px; line-height: 1.3; text-align: center; margin: 0; padding: 0;
              }
              .brand h1 { margin: 0; font-size: 20px; }
              .logo {
                position: absolute; top: 0; right: 0;
                width: 140px; height: 88px; object-fit: contain; display: block;
              }
              /* Title + IRN */
              .title {
                text-align:center; font-weight:700; font-size: 20px;
                margin: 0; padding: 0; text-transform: uppercase;
              }
              .irnbar { text-align:center; font-size: 11px; margin: 0; padding: 0; }
              .irnbar .label { font-weight:700; }
              /* 3-col header grid */
              .grid3 {
                display:flex; border:1px solid #000; border-bottom:0; /* seamless with items table */
                font-size:11px; margin:0;
              }
              .cell { padding:5px; border-right:1px solid #000; position: relative; }
              .cell:last-child { border-right:0; }

              /* FIX: make headings span full cell width & print with bg */
              .cell h4.secHead {
                display:block;
                background:#e8f4ff;
                border-bottom:1px solid #000;
                /* pull over cell padding so the line touches left/right borders */
                margin: -5px -5px 4px -5px;
                padding: 4px 6px;
                font-size:11px; font-weight:700; white-space:nowrap;
              }

              .kv { display:flex; justify-content: space-between; gap:8px; white-space:nowrap; }
              .kv .l { font-weight:700; }

              /* Items table */
              table.itemsTable {
                border-collapse: collapse; width: 100%;
                border:1px solid #000; border-bottom:0;
                line-height:1.2; margin:0;
              }
              table.itemsTable thead th {
                font-size: 10px; white-space: nowrap; padding: 4px 6px;
                border-left:1px solid #000; border-right:1px solid #000;
                background:#e8f4ff; /* light blue header */
              }
              table.itemsTable tbody td {
                font-size: 10px;
                padding: 8px 6px;
                border-left:1px solid #000; border-right:1px solid #000;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
              }
              table.itemsTable thead tr { border-bottom:1px solid #000; }
              .center { text-align:center; }
              .right { text-align:right; }
              .fw { font-weight:700; }
              .tiny { font-size:10px; }
              .totRowBorderTop td { border-top: 1px solid #000; }

              /* Totals */
              .totbox { display:flex; gap:0; margin:0; }
              .totL {
                flex:1; border:1px solid #000; border-top:1px solid #000; border-bottom:0;
                border-right:0; padding:0; margin:0;
              }
              .totR {
                flex:1; border:1px solid #000; border-top:1px solid #000; border-bottom:0;
                border-left:1px solid #000; padding:0; margin:0;
              }
              .totLTable, .totTable { width:100%; border-collapse:collapse; }
              .totLTable td {
                font-size:11px; padding:4px 6px;
                line-height:1.15; border-bottom:1px solid #000;
                white-space:normal; word-break:break-word;
              }
              .totLTable tr:last-child td { border-bottom:0; }
              .totTable td { font-size:11px; padding:5px 6px; border-bottom:1px solid #000; }
              .totTable tr:last-child td { border-bottom:0; }

              /* Footer */
              .foot3 { display:flex; gap:0; margin:0; border:1px solid #000; border-top:1px solid #000; border-bottom:1px solid #000; }
              .foot3 .col { flex:1; padding:6px; font-size:11px; line-height:1.25; min-height:80px; }
              .foot3 .col + .col { border-left:1px solid #000; }
              .signwrap { display:flex; align-items:flex-end; justify-content:space-between; height:100%; }
              .sigimg { width:70%; height:auto; margin-left:auto; margin-right-auto; object-fit: contain; display: block; }
            </style>
          </head>
          <body>${pageRef.current?.innerHTML || ""}</body>
        </html>
      `;
      document.body.innerHTML = html;
      window.print();
      document.body.innerHTML = original;
      window.location.replace(`/admin-dashboard/invoices/${id}`);
    }, 3000);
    return () => clearTimeout(timer);
  }, [invoice, id]);

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;
  if (err) return <div className="p-6 text-red-500">{err}</div>;
  if (!invoice) return null;

  const {
    billTo = "",
    shipTo = "",
    clientCompanyName = "",
    items = [],
    invoiceDetails = {},
    subtotalTaxable,
    totalCgst,
    totalSgst,
    grandTotal,
    irn: irnFromInvoice,
    ackNo: ackNoFromInvoice,
    ackDt: ackDtFromInvoice,
    eInvoice: eInvoiceEmbedded,
    einvoice: einvoiceEmbedded,
  } = invoice;

  const {
    invoiceNumber = "APP/2025-2026/0001",
    date = invoice.createdAt,
    refJobSheetNumber = "",
    quotationRefNumber = "",
    quotationDate = "",
    clientOrderIdentification = "—",
    otherRef = invoiceDetails.otherRef ?? invoiceDetails.otherReference ?? "—",
    placeOfSupply = "—",
    dueDate = "",
    poNumber = "",
    poDate = "",
    eWayBillNumber = "—",
  } = invoiceDetails || {};

  const irn =
    irnFromInvoice ||
    eInvoiceEmbedded?.irn ||
    einvoiceEmbedded?.irn ||
    invoice?.meta?.irn ||
    null;
  const ackNo =
    ackNoFromInvoice ||
    eInvoiceEmbedded?.ackNo ||
    einvoiceEmbedded?.ackNo ||
    invoice?.meta?.ackNo ||
    null;
  const ackDt =
    ackDtFromInvoice ||
    eInvoiceEmbedded?.ackDt ||
    einvoiceEmbedded?.ackDt ||
    invoice?.meta?.ackDt ||
    null;

  const rows = (items || []).map((r, idx) => {
    const qty = Number(r.quantity) || 0;
    const unit = (r.unit || "NOS").toLowerCase();
    const rate = Number(r.rate) || 0;
    const taxable = Number(r.taxableAmount) || qty * rate;
    const cgstAmt = Number(r.cgstAmount) || 0;
    const sgstAmt = Number(r.sgstAmount) || 0;
    const cgstPct = Number(r.cgstPercent) || 0;
    const sgstPct = Number(r.sgstPercent) || 0;
    const total = !isNaN(Number(r.totalAmount))
      ? Number(r.totalAmount)
      : taxable + cgstAmt + sgstAmt;

    return {
      sl: r.slNo ?? idx + 1,
      description: r.description || r.product || "",
      hsn: r.hsnCode || r.hsn || "",
      qtyUnit: `${qty} ${unit}`,
      rate,
      taxable,
      cgstAmt,
      cgstPct,
      sgstAmt,
      sgstPct,
      total,
    };
  });

  const red = rows.reduce(
    (a, r) => {
      a.taxable += r.taxable;
      a.cgst += r.cgstAmt;
      a.sgst += r.sgstAmt;
      a.total += r.total;
      return a;
    },
    { taxable: 0, cgst: 0, sgst: 0, total: 0 }
  );

  const totals = {
    taxable: Number(subtotalTaxable ?? red.taxable),
    cgst: Number(totalCgst ?? red.cgst),
    sgst: Number(totalSgst ?? red.sgst),
    total: Number(grandTotal ?? red.total),
  };

  const amountInWords = numberToWordsIndian(totals.total);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div ref={pageRef} className="sheet">
        <div className="title">TAX INVOICE</div>
        <img className="logo" alt="ACE Logo" src="/logo.png" />

        {/* Top brand row */}
        <div className="topbar">
          <div className="brand">
            <h1>ACE PRINT PACK</h1>
            <div>#1, 1st Floor, 147, Vasavi Complex, Seshadripuram Main Road, Bangalore 560020</div>
            <div>Phone: +91 9945261108 | Email: accounts@aceprintpack.com</div>
            <div>GSTIN: 29AACF4992A1ZL | Udyam Reg: UDYAM-KR-03-006533</div>
          </div>
        </div>

        {irn && (
          <div className="irnbar">
            <span className="label">IRN:</span> {irn}
            {ackNo ? <> &nbsp; | &nbsp; <span className="label">Ack No:</span> {ackNo}</> : null}
            {ackDt ? <> &nbsp; | &nbsp; <span className="label">Ack Dt:</span> {ackDt}</> : null}
          </div>
        )}

        {/* 3-column header table */}
        <div className="grid3 border-2 border-black ">
          <div className="cell" style={{ width: "33.33%" }}>
            <h4 className="secHead">Bill To</h4>
            <div className="fw" style={{ whiteSpace: "nowrap" }}>{clientCompanyName || "—"}</div>
            <div>{billTo || "—"}</div>
          </div>
          <div className="cell" style={{ width: "33.33%" }}>
            <h4 className="secHead">Ship To</h4>
            <div>{shipTo || "—"}</div>
          </div>
          <div className="cell" style={{ width: "33.33%" }}>
            <h4 className="secHead">Invoice Details</h4>
            <div className="kv"><span className="l">Invoice No.:</span><span>{invoiceNumber}</span></div>
            <div className="kv"><span className="l">Date:</span><span>{fmtDate(date)}</span></div>
            <div className="kv"><span className="l">Ref. JS:</span><span>{refJobSheetNumber || "—"}</span></div>
            <div className="kv"><span className="l">Quotation Ref.:</span><span>{quotationRefNumber || "—"}</span></div>
            <div className="kv"><span className="l">Quotation Date:</span><span>{fmtDate(quotationDate)}</span></div>
            <div className="kv"><span className="l">Client Order ID:</span><span>{clientOrderIdentification || "—"}</span></div>
            <div className="kv"><span className="l">Other Ref.:</span><span>{otherRef || "—"}</span></div>
            <div className="kv"><span className="l">E-Way Bill No.:</span><span>{eWayBillNumber || "—"}</span></div>
            <div className="kv"><span className="l">Place of Supply:</span><span>{placeOfSupply || "—"}</span></div>
            <div className="kv"><span className="l">Due Date:</span><span>{fmtDate(dueDate)}</span></div>
            <div className="kv"><span className="l">PO Number:</span><span>{poNumber || "—"}</span></div>
            <div className="kv"><span className="l">PO Date:</span><span>{fmtDate(poDate)}</span></div>
            {irn && (
              <>
                <div className="kv"><span className="l">IRN:</span><span style={{ wordBreak: "break-all" }}>{irn}</span></div>
                {ackNo ? <div className="kv"><span className="l">Ack No:</span><span>{ackNo}</span></div> : null}
                {ackDt ? <div className="kv"><span className="l">Ack Dt:</span><span>{ackDt}</span></div> : null}
              </>
            )}
          </div>
        </div>

        {/* Product table */}
        <table className="itemsTable">
          <thead>
            <tr>
              <th className="center" style={{ width: "5%" }}>Sl No</th>
              <th className="center" style={{ width: "45%" }}>Description</th>
              <th className="center" style={{ width: "10%" }}>HSN</th>
              <th className="center" style={{ width: "10%" }}>Qty</th>
              <th className="center" style={{ width: "10%" }}>Rate</th>
              <th className="center" style={{ width: "10%" }}>Taxable</th>
              <th className="center" style={{ width: "5%" }}>CGST</th>
              <th className="center" style={{ width: "5%" }}>SGST</th>
              <th className="center" style={{ width: "10%" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="center">No items</td>
              </tr>
            )}
            {rows.map(r => (
              <tr key={r.sl}>
                <td className="center">{r.sl}</td>
                <td>{r.description}</td>
                <td className="center">{r.hsn || "—"}</td>
                <td className="center">{r.qtyUnit}</td>
                <td className="right">{fmtAmt(r.rate)}</td>
                <td className="right">{fmtAmt(r.taxable)}</td>
                <td className="right">
                  {fmtAmt(r.cgstAmt)} <span className="tiny">({fmtPct(r.cgstPct)})</span>
                </td>
                <td className="right">
                  {fmtAmt(r.sgstAmt)} <span className="tiny">({fmtPct(r.sgstPct)})</span>
                </td>
                <td className="right">{fmtAmt(r.total)}</td>
              </tr>
            ))}

            {rows.length > 0 && (
              <tr className="totRowBorderTop">
                <td colSpan={5} className="center fw">Totals</td>
                <td className="right fw">{fmtAmt(totals.taxable)}</td>
                <td className="right fw">{fmtAmt(totals.cgst)}</td>
                <td className="right fw">{fmtAmt(totals.sgst)}</td>
                <td className="right fw">{fmtAmt(totals.total)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="totbox">
          <div className="totL">
            <table className="totLTable">
              <tbody>
                <tr>
                  <td className="fw" style={{ width: "35%" }}>Amount in Words</td>
                  <td>{amountInWords}</td>
                </tr>
                <tr>
                  <td className="fw">CGST Total</td>
                  <td className="right">{fmtAmt(totals.cgst)}</td>
                </tr>
                <tr>
                  <td className="fw">SGST Total</td>
                  <td className="right">{fmtAmt(totals.sgst)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="totR">
            <table className="totTable">
              <tbody>
                <tr>
                  <td className="fw" style={{ width: "60%" }}>Sub-total (Taxable)</td>
                  <td className="right">{fmtAmt(totals.taxable)}</td>
                </tr>
                <tr>
                  <td className="fw">Grand Total</td>
                  <td className="right">{fmtAmt(totals.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="foot3">
          <div className="col">
            <div className="fw" style={{ marginBottom: 4 }}>Bank Details</div>
            <div>Bank: HDFC BANK, BANGALORE – SESHADRIPURAM</div>
            <div>A/C No.: 000000111222 | IFSC: HDFC0003637</div>
            <div>Account Holder: Ace Print Pack</div>
          </div>
          <div className="col">
            <div className="fw" style={{ marginBottom: 4 }}>Terms & Conditions</div>
            <div>• Interest @ 2% p.m. if not paid within due date.</div>
            <div>• Subject to Bangalore jurisdiction. E & O.E.</div>
          </div>
          <div className="col">
            <div className="signwrap">
              <div className="flex justify-center w-full">
                <div className="flex flex-col items-center">
                  <img className="sigimg" src="/signature2.png" alt="Authorized Signatory" />
                  <div className="fw">Authorised Signatory</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
