"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import { createPortal } from "react-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DeliveryChallan = () => {
  const { id } = useParams();
  const [deliveryChallan, setDeliveryChallan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const printRefs = useRef([]);

  useEffect(() => {
    async function fetchChallan() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${BACKEND_URL}/api/admin/delivery-challans/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setDeliveryChallan(res.data);
        setEditFormData({
          customerCompany: res.data.customerCompany || "",
          customerAddress: res.data.customerAddress || "",
          dcNumber: res.data.dcNumber || "",
          dcDate: res.data.dcDate
            ? format(new Date(res.data.dcDate), "yyyy-MM-dd")
            : "",
          quotationNumber: res.data.quotationNumber || "",
          otherReferences: res.data.otherReferences || "",
          poNumber: res.data.poNumber || "",
          poDate: res.data.poDate
            ? format(new Date(res.data.poDate), "yyyy-MM-dd")
            : "",
          materialTerms: res.data.materialTerms || [],
        });
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

  const handleEditInputChange = (e, field, index = null) => {
    const value = e.target.value;
    setEditFormData((prev) => {
      if (field === "materialTerms" && index !== null) {
        const newMaterialTerms = [...prev.materialTerms];
        newMaterialTerms[index] = value;
        return { ...prev, materialTerms: newMaterialTerms };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem("token");
      const updatedData = {
        ...editFormData,
        poDate: editFormData.poDate ? new Date(editFormData.poDate) : null,
        dcDate: new Date(editFormData.dcDate),
      };
      await axios.put(
        `${BACKEND_URL}/api/admin/delivery-challans/${id}`,
        updatedData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Delivery Challan updated successfully!");
      setOpenEditModal(false);
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/delivery-challans/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDeliveryChallan(res.data);
    } catch (error) {
      console.error("Error updating delivery challan:", error);
      alert("Failed to update delivery challan.");
    }
  };

  const renderEditModal = () => {
    if (!openEditModal) return null;
    return createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Edit Delivery Challan</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">DC Number</label>
              <input
                type="text"
                value={editFormData.dcNumber}
                disabled
                className="w-full p-2 border rounded text-sm bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Quotation Number
              </label>
              <input
                type="text"
                value={editFormData.quotationNumber}
                onChange={(e) => handleEditInputChange(e, "quotationNumber")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">PO Number</label>
              <input
                type="text"
                value={editFormData.poNumber}
                onChange={(e) => handleEditInputChange(e, "poNumber")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">PO Date</label>
              <input
                type="date"
                value={editFormData.poDate}
                onChange={(e) => handleEditInputChange(e, "poDate")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Other References
              </label>
              <input
                type="text"
                value={editFormData.otherReferences}
                onChange={(e) => handleEditInputChange(e, "otherReferences")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">DC Date</label>
              <input
                type="date"
                value={editFormData.dcDate}
                onChange={(e) => handleEditInputChange(e, "dcDate")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Customer Company
              </label>
              <input
                type="text"
                value={editFormData.customerCompany}
                onChange={(e) => handleEditInputChange(e, "customerCompany")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">
                Customer Address
              </label>
              <textarea
                value={editFormData.customerAddress}
                onChange={(e) => handleEditInputChange(e, "customerAddress")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">Material Terms</label>
              {editFormData.materialTerms.map((term, index) => (
                <div key={index} className="mb-2">
                  <input
                    type="text"
                    value={term}
                    onChange={(e) =>
                      handleEditInputChange(e, "materialTerms", index)
                    }
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setOpenEditModal(false)}
              className="px-4 py-2 border rounded text-sm hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-[#Ff8045] text-white rounded text-sm hover:bg-[#Ff8045]/90"
            >
              Save
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const handlePrint = () => {
    const printContents = printRefs.current
      .map(
        (ref, index) => `
        <div class="print-content" style="${
          index < 2 ? "page-break-after: always;" : ""
        }">
          ${ref.innerHTML}
        </div>
      `
      )
      .join("");

    const originalContents = document.body.innerHTML;

    document.body.innerHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Delivery Challan - ${
            deliveryChallan?.dcNumber || id
          }</title>
          <style>
            @page {
              size: A4;
              margin: 5mm;
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
              position: relative;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              line-height: 1.1;
            }
            th, td {
              padding: 0;
              text-align: left;
            }
            .text-xs {
              font-size: 14px;
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
            .w-1\\/2 {
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
            .company-details {
              font-size: 15px;
            }
            .top-row {
              min-height: 90px;
            }
            .logo-top-right {
              position: absolute;
              top: 8px;
              right: 16px;
              height: 52px;
              object-fit: contain;
            }
            .footer-note {
              position: absolute;
              bottom: 4px;
              left: 50%;
              transform: translateX(-50%);
              font-size: 10px;
              text-align: center;
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

  const customerGSTIN =
    deliveryChallan?.customerGSTIN || deliveryChallan?.customerGstin || "";

  const PageContent = ({ index, label }) => (
    <div
      ref={(el) => (printRefs.current[index] = el)}
      className="bg-white font-sans flex flex-col"
      style={{
        width: "210mm",
        height: "297mm",
        padding: "15px",
        boxSizing: "border-box",
        border: "1px solid #000",
        fontFamily: "Calibri, sans-serif",
        position: "relative",
      }}
    >
      {/* Logo */}
      <img
        src="/logo.png"
        alt="ACE PRINT PACK"
        className="logo-top-right"
        style={{
          position: "absolute",
          top: 8,
          right: 16,
          height: "52px",
          objectFit: "contain",
        }}
      />

      <div className="title-container">
        <h1 className="delivery-challan-title uppercase">DELIVERY CHALLAN</h1>
      </div>

      {/* Company details with equal line spacing and label on right */}
      <div
        className="text-center company-details"
        style={{
          lineHeight: "1.3",
          position: "relative",
          marginBottom: "4px",
        }}
      >
        <h1 className="font-bold text-2xl">ACE PRINT PACK</h1>
        <p># 61, 1st Floor, 5th Main Road, Chamrajpet, Bangalore 560018</p>
        <p>M: +91 9945261108 | accounts@aceprintpack.com</p>
        <p>GSTIN: 29ABCFA9924A1ZL | UDYAM-KR-03-0063533</p>

        {/* ORIGINAL / DUPLICATE / TRIPLICATE label */}
        <span
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            fontStyle: "italic",
            fontSize: "14px",
          }}
        >
          ({label})
        </span>
      </div>

      {/* Top details row: To 50%, DC 25%, PO 25% */}
      <div className="flex mb-0 text-xs border-l border-t border-r border-black top-row">
        {/* To: 50% */}
        <div
          className="border-r border-black"
          style={{ width: "50%", boxSizing: "border-box" }}
        >
          <h3 className="font-bold ml-2 mt-2">To:</h3>
          <p className="font-bold ml-2">{customerCompany}</p>
          <p className="ml-2">{customerAddress}</p>
        </div>

        {/* DC details: 25% */}
        <div
          className="border-r border-black"
          style={{ width: "25%", boxSizing: "border-box" }}
        >
          <div className="m-2">
            <div className="flex">
              <span className="font-bold">DC No.:</span>
              <span className="font-medium" style={{ marginLeft: 4 }}>
                {dcNumber}
              </span>
            </div>
            <div className="flex mt-1">
              <span className="font-bold">Date:</span>
              <span className="font-medium" style={{ marginLeft: 4 }}>
                {format(new Date(dcDate), "dd/MM/yyyy")}
              </span>
            </div>
            <div className="flex mt-1">
              <span className="font-bold">Ref QN No:</span>
              <span className="font-medium" style={{ marginLeft: 4 }}>
                {quotationNumber}
              </span>
            </div>
            <div className="flex mt-1">
              <span className="font-bold">Ref No:</span>
              <span className="font-medium" style={{ marginLeft: 4 }}>
                #00000
              </span>
            </div>
          </div>
        </div>

        {/* PO details: 25% */}
        <div style={{ width: "25%", boxSizing: "border-box" }}>
          <div className="m-2">
            <div className="flex">
              <span className="font-bold">PO Number:</span>
              <span className="font-medium" style={{ marginLeft: 4 }}>
                {poNumber}
              </span>
            </div>
            <div className="flex mt-1">
              <span className="font-bold">PO Date:</span>
              <span className="font-medium" style={{ marginLeft: 4 }}>
                {poDate ? format(new Date(poDate), "dd/MM/yyyy") : "N/A"}
              </span>
            </div>
            <div className="flex mt-1">
              <span className="font-bold">Other Reference:</span>
              <span className="font-medium" style={{ marginLeft: 4 }}>
                {otherReferences}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PRODUCT TABLE – 600px box, no horizontal row borders, vertical lines across empty space */}
      <div
        className="mb-2"
        style={{
          height: "600px",
          border: "1px solid #000",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Table itself (only header bottom border, no row horizontals) */}
        <table
          className="w-full text-xs"
          style={{
            lineHeight: "1.1",
            borderCollapse: "collapse",
            position: "relative",
            zIndex: 1,
          }}
        >
          <thead>
            <tr>
              <th
                className="p-0 text-center"
                style={{
                  width: "5%",
                  padding: "1px",
                  borderBottom: "1px solid #000",
                }}
              >
                Sl No
              </th>
              <th
                className="p-0 text-center"
                style={{
                  width: "65%",
                  padding: "1px",
                  borderBottom: "1px solid #000",
                }}
              >
                Particulars
              </th>
              <th
                className="p-0 text-center"
                style={{
                  width: "15%",
                  padding: "1px",
                  borderBottom: "1px solid #000",
                }}
              >
                HSN/SAC
              </th>
              <th
                className="p-0 text-center"
                style={{
                  width: "15%",
                  padding: "1px",
                  borderBottom: "1px solid #000",
                }}
              >
                Quantity
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index}>
                  <td className="text-center p-1">
                    {index + 1}
                  </td>
                  <td className="p-1">
                    {item.product || "N/A"}
                  </td>
                  <td className="text-center p-1">
                    {item.hsnCode || "N/A"}
                  </td>
                  <td className="text-center p-1">
                    {item.quantity ? `${item.quantity} No's` : "N/A"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center p-1">
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Column vertical lines spanning entire 600px, no double border on outer edges */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "5%",
            borderLeft: "1px solid #000",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "70%",
            borderLeft: "1px solid #000",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "85%",
            borderLeft: "1px solid #000",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      </div>

      <div className="border border-black p-1 text-xs mb-3">
        <ol className="list-decimal list-inside pl-2">
          {materialTerms.map((term, index) => (
            <li key={index} className="mb-0">
              {term}
            </li>
          ))}
        </ol>
      </div>

      <div className="text-xs signature-section">
        <div className="flex justify-between items-start">
          <div>
            <p>Date: _________________________</p>
          </div>
          <div className="text-right">
            <p className="pr-2">For Ace Print Pack</p>
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

      <div className="footer-note">
        This is a computer generated document.
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex gap-4 mb-4">
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Export to PDF
        </button>
        <button
          onClick={() => setOpenEditModal(true)}
          className="bg-[#Ff8045] text-white px-4 py-2 rounded hover:bg-[#Ff8045]/90"
        >
          Edit
        </button>
      </div>

      <PageContent index={0} label="ORIGINAL" />
      <PageContent index={1} label="DUPLICATE" />
      <PageContent index={2} label="TRIPLICATE" />

      {renderEditModal()}
    </div>
  );
};

export default DeliveryChallan;