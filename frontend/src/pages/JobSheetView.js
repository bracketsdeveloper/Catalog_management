"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function JobSheetView() {
  const { id } = useParams();
  const [jobSheet, setJobSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch job sheet data on mount.
  useEffect(() => {
    const fetchJobSheet = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/jobsheets/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setJobSheet(res.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching job sheet:", err);
        setError("Failed to fetch job sheet");
      } finally {
        setLoading(false);
      }
    };
    fetchJobSheet();
  }, [id]);

  // Helper to format date as "dd-MMM-yyyy"
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Function to export the job sheet content to PDF in landscape orientation with margin and high quality.
  const exportToPDF = () => {
    const input = document.getElementById("job-sheet-content");
    // Increase scale to boost the resolution.
    html2canvas(input, { scale: 5 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");

      // Set a margin (in pt) for the PDF pages.
      const margin = 4;
      // Initialize jsPDF in landscape orientation.
      const pdf = new jsPDF("l", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      // Usable width and height taking into account the margins.
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      // Calculate image height to maintain aspect ratio.
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
      heightLeft -= usableHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        position = heightLeft - imgHeight;
        pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
        heightLeft -= usableHeight;
      }
      pdf.save(`job-sheet-${id}.pdf`);
    });
  };

  if (loading) return <div className="text-xs">Loading job sheet...</div>;
  if (error) return <div className="text-red-500 text-xs">{error}</div>;
  if (!jobSheet) return <div className="text-xs">No job sheet found.</div>;

  return (
    <>
      {/* Export to PDF Button */}
      <div className="mb-4">
        <button
          onClick={exportToPDF}
          className="px-4 py-2 bg-blue-500 text-white text-xs rounded"
        >
          Export to PDF
        </button>
      </div>

      {/* Job Sheet Content */}
      <div
        id="job-sheet-content"
        className="mx-auto border border-black text-xs"
        style={{ width: "90%", maxWidth: "1123px" }}
      >
        {/* Top Header Row */}
        <div className="grid grid-cols-[1fr_2fr_1fr] gap-0 ">
          <div className="border border-black flex items-center justify-center text-left">
            <span className="font-bold uppercase">EVENT NAME:</span>{" "}
            <span className="ml-1">{jobSheet.eventName || "N/A"}</span>
          </div>
          <div className="border border-black flex items-center justify-center">
            <span className="font-bold uppercase">ORDER FORM</span>
          </div>
          <div className="border border-black flex items-center justify-center text-right">
            <img src="/logo.png" alt="Logo" className="h-16 inline-block" />
          </div>
        </div>

        {/* 3×3 Grid Header (Left aligned with separated title and value) */}
        <div className="grid grid-cols-3 gap-0">
          {/* Row 1 */}
          <div className="border border-black flex items-center justify-start">
            <span className="font-bold uppercase border-r border-black p-2 w-[50%]">
              ORDER FORM #:
            </span>
            <span className="border-black p-1 w-[50%]">
              {jobSheet.jobSheetNumber || "N/A"}
            </span>
          </div>
          <div className="border border-black flex items-center justify-start">
            <span className="font-bold uppercase border-r border-black p-2 w-[50%]">
              DELIVERY DATE:
            </span>
            <span className="border-black p-1 w-[50%]">
              {formatDate(jobSheet.deliveryDate)}
            </span>
          </div>
          <div className="border border-black flex items-center justify-start">
            <span className="font-bold uppercase border-r border-black p-2 w-[50%]">
              CLIENT COMPANY:
            </span>
            <span className="border-r border-black p-2 w-[50%]">
              {jobSheet.clientCompanyName || "N/A"}
            </span>
          </div>
          {/* Row 2 */}
          <div className="border border-black flex items-center justify-start">
            <span className="font-bold uppercase border-r border-black p-2 w-[50%]">
              REF QUOTATION:
            </span>
            <span className="border-black p-1 w-[50%]">
              {jobSheet.referenceQuotation || "N/A"}
            </span>
          </div>
          <div className="border border-black flex items-center justify-start">
            <span className="font-bold uppercase border-r border-black p-2 w-[50%]">
              DELIVERY TIME:
            </span>
            <span className="border-black p-1 w-[50%]">
              {jobSheet.deliveryTime || "N/A"}
            </span>
          </div>
          <div className="border border-black flex items-center justify-start">
            <span className="font-bold uppercase border-r border-black p-2 w-[50%]">
              CLIENT NAME:
            </span>
            <span className="border-r border-black p-2 w-[50%]">
              {jobSheet.clientName || "N/A"}
            </span>
          </div>
          {/* Row 3 */}
          <div className="border border-black flex items-center justify-start">
            <span className="font-bold uppercase border-r border-black p-2 w-[50%]">
              ORDER DATE:
            </span>
            <span className="border-black p-1 w-[50%]">
              {formatDate(jobSheet.orderDate)}
            </span>
          </div>
          <div className="border border-black flex items-center justify-start">
            <span className="font-bold uppercase border-r border-black p-2 w-[50%]">
              CRM INCHARGE:
            </span>
            <span className="border-black p-1 w-[50%]">
              {jobSheet.crmIncharge || "N/A"}
            </span>
          </div>
          <div className="border border-black flex items-center justify-start">
            <span className="font-bold uppercase border-r border-black p-2 w-[50%]">
              CONTACT:
            </span>
            <span className="border-black p-2 w-[50%]">
              {jobSheet.contactNumber || "N/A"}
            </span>
          </div>
        </div>

        {/* Product Table */}
        <div className="">
          <table className="min-w-full border-collapse border border-black">
            <thead>
              <tr className="border border-black">
                <th className="p-1 border border-black uppercase">SL NO.</th>
                <th className="p-1 border border-black uppercase">PRODUCTS</th>
                <th className="p-1 border border-black uppercase">COLOR</th>
                <th className="p-1 border border-black uppercase">
                  SIZE/CAPACITY
                </th>
                <th className="p-1 border border-black uppercase">QTY</th>
                <th className="p-1 border border-black uppercase">
                  SOURCING FROM
                </th>
                <th className="p-1 border border-black uppercase">
                  BRANDING TYPE
                </th>
                <th className="p-1 border border-black uppercase">
                  BRANDING VENDOR
                </th>
                <th className="p-1 border border-black uppercase">
                  REMARKS
                </th>
              </tr>
            </thead>
            <tbody>
              {jobSheet.items.map((item, index) => (
                <tr key={index} className="border border-black">
                  <td className="p-1 border border-black">
                    {item.slNo || index + 1}
                  </td>
                  <td className="p-1 border border-black">{item.product}</td>
                  <td className="p-1 border border-black">{item.color}</td>
                  <td className="p-1 border border-black">{item.size}</td>
                  <td className="p-1 border border-black">{item.quantity}</td>
                  <td className="p-1 border border-black">
                    {item.sourcingFrom || "N/A"}
                  </td>
                  <td className="p-1 border border-black">
                    {item.brandingType || "N/A"}
                  </td>
                  <td className="p-1 border border-black">
                    {item.brandingVendor || "N/A"}
                  </td>
                  <td className="p-1 border border-black">
                    {item.remarks || "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Additional Details */}
        <div className="border border-black">
          <div className="border-b border-black p-1">
            <span className="font-bold uppercase">PO NUMBER:</span>
            <span className="ml-1">{jobSheet.poNumber || "N/A"}</span>
          </div>
          <div className="grid grid-cols-3 gap-0 border-b border-black">
            <div className="p-1 border-r border-black ">
              <span className="font-bold uppercase">DELIVERY TYPE:</span>
              <span className="ml-1">{jobSheet.deliveryType || "N/A"}</span>
            </div>
            <div className="p-1 border-r border-black">
              <span className="font-bold uppercase">DELIVERY MODE:</span>
              <span className="ml-1">{jobSheet.deliveryMode || "N/A"}</span>
            </div>
            <div className="p-1">
              <span className="font-bold uppercase">DELIVERY CHARGES:</span>
              <span className="ml-1">{jobSheet.deliveryCharges || "N/A"}</span>
            </div>
          </div>
          <div className="border-b border-black p-1">
            <span className="font-bold uppercase border-black border-r pr-20 p-1">
              DELIVERY ADDRESS:
            </span>
            <span className="ml-1 border-black ">
              {jobSheet.deliveryAddress || "N/A"}
            </span>
          </div>
          <div className="border-b border-black p-1">
            <span className="font-bold uppercase border-black border-r pr-11 p-1">
              GIFT BOX / BAGS DETAILS:
            </span>
            <span className="ml-1">
              {jobSheet.giftBoxBagsDetails || "N/A"}
            </span>
          </div>
          <div className="border-b border-black p-1">
            <span className="font-bold uppercase border-black border-r w-16 pr-[37px] p-1">
              PACKAGING INSTRUCTIONS:
            </span>
            <span className="ml-1">
              {jobSheet.packagingInstructions || "N/A"}
            </span>
          </div>
          <div className="border-b border-black p-1">
            <span className="font-bold uppercase border-black border-r pr-[79px] p-1">
              ANY OTHER DETAILS:
            </span>
            <span className="ml-1">{jobSheet.otherDetails || "N/A"}</span>
          </div>
        </div>

        {/* Handwritten Fields */}
        <div className="mt-2">
          <div className="flex justify-between mb-20 px-6">
            <div className="w-1/3">
              <span className="font-bold uppercase">SEAL/SIGN:</span>
              <span className="border-b border-black inline-block w-full">
                &nbsp;
              </span>
            </div>
            <div className="w-1/3 text-center">
              <span className="font-bold uppercase">SENT ON:</span>
              <span className="border-b border-black inline-block w-full">
                &nbsp;
              </span>
            </div>
            <div className="w-1/3 text-right">
              <span className="font-bold uppercase">QTY DISPATCHED:</span>
              <span className="border-b border-black inline-block w-full">
                &nbsp;
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
