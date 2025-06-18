"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DeliveryChallan = () => {
  const { id } = useParams();
  const [deliveryChallan, setDeliveryChallan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const printRefs = useRef([]);

  useEffect(() => {
    async function fetchChallan() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/delivery-challans/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDeliveryChallan(res.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching delivery challan:", err);
        setError("Failed to fetch delivery challan");
      } finally {
        setLoading(false);
      }
    }
    fetchChallan();
  }, [id]);

  const handlePrint = () => {
    const printContents = printRefs.current
      .map((ref, index) => `
        <div class="print-content" style="${index < 2 ? 'page-break-after: always;' : ''}">
          ${ref.innerHTML}
        </div>
      `)
      .join('');

    const originalContents = document.body.innerHTML;

    document.body.innerHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Delivery Challan - ${deliveryChallan?.dcNumber || id}</title>
          <style>
            @page {
              size: A4;
              margin: 5mm; /* Small margin to prevent border clipping */
            }
            body {
              font-family: Calibri, sans-serif;
              width: 210mm;
              height: 297mm;
              margin: 0 auto;
              padding: 0;
              box-sizing: border-box;
            }
            .print-content {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              border: 1px solid #000;
              padding: 15px;
              margin: 0;
              box-sizing: border-box;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              border: 1px solid black;
            }
            th, td {
              border-left: 1px solid black;
              border-right: 1px solid black;
              padding: 2px 6px;
              text-align: left;
            }
            thead tr {
              border-bottom: 1px solid black;
            }
            .table-row {
              line-height: 1;
            }
            .table-cell {
              padding-top: 1px;
              padding-bottom: 1px;
            }
            .text-xs {
              font-size: 11px;
            }
            .flex {
              display: flex;
            }
            .justify-between {
              justify-content: space-between;
            }
            .items-start {
              align-items: flex-start;
            }
            .items-end {
              align-items: flex-end;
            }
            .mt-16 {
              margin-top: 64px;
            }
            .w-1\/2 {
              width: 50%;
            }
            .w-full {
              width: 100%;
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            .text-left {
              text-align: left;
            }
            .font-bold {
              font-weight: bold;
            }
            .uppercase {
              text-transform: uppercase;
            }
            .list-decimal {
              list-style-type: decimal;
            }
            .list-inside {
              list-style-position: inside;
            }
            .pl-2 {
              padding-left: 8px;
            }
            .mb-0 {
              margin-bottom: 0;
            }
            .mb-2 {
              margin-bottom: 8px;
            }
            .mb-3 {
              margin-bottom: 12px;
            }
            .mb-4 {
              margin-bottom: 16px;
            }
            .pb-1 {
              padding-bottom: 4px;
            }
            .mt-1 {
              margin-top: 4px;
            }
            .mt-2 {
              margin-top: 8px;
            }
            .p-1 {
              padding: 4px;
            }
            .flex-1 {
              flex: 1;
            }
            .border-header {
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .signature-section {
              margin-top: 50px;
            }
            .signature-space {
              margin-top: 80px;
            }
            .title-container {
              display: flex;
              justify-content: center;
              align-items: center;
              position: relative;
              margin-bottom: 10px;
            }
            .delivery-challan-title {
              font-size: 28px;
              font-weight: bold;
              text-align: center;
            }
            .original-recipient {
              font-size: 14px;
              position: absolute;
              right: 0;
              top: 50%;
              transform: translateY(-50%);
            }
            .company-details {
              font-size: 18px;
              line-height: 1.4;
            }
            .two-column {
              display: flex;
              justify-content: space-between;
            }
            .column {
              width: 45%;
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `;

    setTimeout(() => {
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }, 2000);
  };

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  const {
    customerCompany = "N/A",
    customerAddress = "N/A",
    dcNumber = "N/A",
    dcDate = new Date(),
    quotationNumber = "N/A",
    otherReferences = "N/A",
    poNumber = "N/A",
    poDate = null,
    items = [],
    materialTerms = [
      "Material received in good condition and correct quantity.",
      "No physical damage or shortage noticed at the time of delivery.",
      "Accepted after preliminary inspection and verification with delivery documents.",
    ],
  } = deliveryChallan || {};

  const PageContent = ({ index, label }) => (
    <div
      ref={el => (printRefs.current[index] = el)}
      className="bg-white font-sans flex flex-col"
      style={{
        width: "210mm",
        height: "297mm",
        padding: "15px",
        boxSizing: "border-box",
        border: "1px solid #000",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      <div className="title-container">
        <h1 className="delivery-challan-title uppercase">DELIVERY CHALLAN</h1>
        <p className="original-recipient">({label})</p>
      </div>

      <div className="text-center border-header company-details">
        <h2 className="font-bold">ACE PRINT PACK</h2>
        <p>#61, 1st Floor, 5th Main Road, Chamrajpet, Bangalore 560018</p>
        <p>+91 9945261108</p>
        <p>accounts@aceprintpack.com | www.aceprintpack.com</p>
        <p>GSTIN: 29ABCFA9924A12L | UDYAM-KR-03-0063533</p>
      </div>

      <div className="flex justify-between mb-3 text-xs">
        <div className="w-1/2">
          <h3 className="font-bold">To:</h3>
          <p className="font-bold">{customerCompany}</p>
          <p>{customerAddress}</p>
        </div>
        <div className="w-1/2">
          <div className="two-column">
            <div className="column text-left">
              <div className="flex">
                <span className="w-28 font-bold">DC No.:</span>
                <span className="font-medium">{dcNumber}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold">Date:</span>
                <span className="font-medium">{format(new Date(dcDate), "dd/MM/yyyy")}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold">Ref No:</span>
                <span className="font-medium">{quotationNumber}</span>
              </div>
            </div>
            <div className="column text-left">
              <div className="flex">
                <span className="w-28 font-bold">PO Number:</span>
                <span className="font-medium">{poNumber}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold">PO Date:</span>
                <span className="font-medium">{poDate ? format(new Date(poDate), "dd/MM/yyyy") : "N/A"}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold">Other Reference:</span>
                <span className="font-medium">{otherReferences}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 mb-2" style={{ minHeight: "350px" }}>
        <table className="w-full border border-black text-xs h-full">
          <thead>
            <tr className="border-b border-black">
              <th className="p-1 text-center w-[5%]">Sl No</th>
              <th className="p-1 text-center w-[65%]">Particulars</th>
              <th className="p-1 text-center w-[15%]">HSN/SAC</th>
              <th className="p-1 text-center w-[15%]">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index} className="table-row">
                  <td className="p-1 text-center align-top table-cell">{item.slNo || index + 1}</td>
                  <td className="p-1 align-top table-cell">{item.product || "N/A"}</td>
                  <td className="p-1 text-center align-top table-cell">{item.hsnCode || "N/A"}</td>
                  <td className="p-1 align-top text-right table-cell">{item.quantity ? `${item.quantity} No's` : "N/A"}</td>
                </tr>
              ))
            ) : (
              <tr className="table-row">
                <td colSpan={4} className="p-1 text-center table-cell">No items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border border-black p-1 text-xs mb-3">
        <ol className="list-decimal list-inside pl-2">
          {materialTerms.map((term, index) => (
            <li key={index} className="mb-0">{term}</li>
          ))}
        </ol>
      </div>

      <div className="text-xs signature-section">
        <div className="flex justify-between items-start">
          <div>
            <p>Date: _________________________</p>
          </div>
          <div className="text-right">
            <p>For Ace Print Pack</p>
          </div>
        </div>

        <div className="signature-space"></div>

        <div className="flex justify-between items-end">
          <div>
            <p>Seal & Signature:</p>
          </div>
          <div className="text-right">
            <p>Authorised Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={handlePrint}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Export to PDF
      </button>

      <PageContent index={0} label="ORIGINAL" />
      <PageContent index={1} label="DUPLICATE" />
      <PageContent index={2} label="TRIPLICATE" />
    </div>
  );
};

export default DeliveryChallan;