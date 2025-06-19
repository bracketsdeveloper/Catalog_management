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
        const res = await axios.get(`${BACKEND_URL}/api/admin/delivery-challans/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDeliveryChallan(res.data);
        setEditFormData({
          customerCompany: res.data.customerCompany || "",
          customerAddress: res.data.customerAddress || "",
          dcNumber: res.data.dcNumber || "",
          dcDate: res.data.dcDate ? format(new Date(res.data.dcDate), "yyyy-MM-dd") : "",
          quotationNumber: res.data.quotationNumber || "",
          otherReferences: res.data.otherReferences || "",
          poNumber: res.data.poNumber || "",
          poDate: res.data.poDate ? format(new Date(res.data.poDate), "yyyy-MM-dd") : "",
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
      // Refresh data
      const res = await axios.get(`${BACKEND_URL}/api/admin/delivery-challans/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
              <label className="block text-sm font-medium">Quotation Number</label>
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
              <label className="block text-sm font-medium">Other References</label>
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
              <label className="block text-sm font-medium">Customer Company</label>
              <input
                type="text"
                value={editFormData.customerCompany}
                onChange={(e) => handleEditInputChange(e, "customerCompany")}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">Customer Address</label>
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
                    onChange={(e) => handleEditInputChange(e, "materialTerms", index)}
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
            }
            table {
              border-collapse: collapse;
              width: 100%;
              border: 1px solid black;
              line-height: 1.1;
            }
            th, td {
              border-left: 1px solid black;
              border-right: 1px solid black;
              padding: 0;
              text-align: left;
              vertical-align: top;
            }
            thead tr {
              border-bottom: 1px solid black;
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
              font-size: 15px;
              line-height: 1.4;
            }
            .two-column {
              display: flex;
              width: 100%;
            }
            .column-35 {
              width: 35%;
            }
            .column-65 {
              width: 65%;
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
        <p className="original-recipient italic">({label})</p>
      </div>

      <div className="text-center border-header company-details">
        <h1 className="font-bold text-2xl">ACE PRINT PACK</h1>
        <p># 61, 1st Floor, 5th Main Road, Chamrajpet, Bangalore 560018</p>
        <p>  M: +91 9945261108 | accounts@aceprintpack.com</p>
        <p> www.aceprintpack.com</p>
        <p>GSTIN: 29ABCFA9924A1ZL | UDYAM-KR-03-0063533</p>
      </div>

      <div className="flex justify-between mb-0 text-xs border-l border-t border-r border-black ">
        <div className="w-1/2 border-r border-black">
          <h3 className="font-bold ml-2 mt-2">To:</h3>
          <p className="font-bold ml-2">{customerCompany}</p>
          <p className="ml-2">{customerAddress}</p>
        </div>
        <div className="w-1/2">
          <div className="two-column">
            <div className="column-35 text-left border-r border-black">
              <div className="flex m-2">
                <span className=" font-bold">DC No.:</span>
                <span className="font-medium">{dcNumber}</span>
              </div>
              <div className="flex m-2">
                <span className=" font-bold">Date:</span>
                <span className="font-medium">{format(new Date(dcDate), "dd/MM/yyyy")}</span>
              </div>
              <div className="flex m-2">
                <span className=" font-bold">Ref QN No:</span>
                <span className="font-medium">{quotationNumber}</span>
              </div>
              <div className="flex m-2">
                <span className=" font-bold">Ref No:</span>
                <span className="font-medium">#00000</span>
              </div>
            </div>
            <div className="column-65">
              <div className="flex m-2">
                <span className=" font-bold">PO Number:</span>
                <span className="font-medium">{poNumber}</span>
              </div>
              <div className="flex m-2">
                <span className=" font-bold">PO Date:</span>
                <span className="font-medium">{poDate ? format(new Date(poDate), "dd/MM/yyyy") : "N/A"}</span>
              </div>
              <div className="flex m-2">
                <span className=" font-bold">Other Reference:</span>
                <span className="font-medium">{otherReferences}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 mb-2" style={{ minHeight: "350px" }}>
        <table className="w-full border border-black text-xs h-full" style={{ lineHeight: '1.1' }}>
          <thead>
            <tr className="border-b border-black">
              <th className="p-0 text-center" style={{ width: '5%', padding: '1px' }}>Sl No</th>
              <th className="p-0 text-center" style={{ width: '65%', padding: '1px' }}>Particulars</th>
              <th className="p-0 text-center" style={{ width: '15%', padding: '1px' }}>HSN/SAC</th>
              <th className="p-0 text-center" style={{ width: '15%', padding: '1px' }}>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              <tr style={{ lineHeight: '2' }}>
                <td className="p-0 text-center align-top" style={{ padding: '1px' }}>
                  {items.map((_, index) => (
                    <div key={index}>{index + 1}</div>
                  ))}
                </td>
                <td className="p-0 align-top" style={{ padding: '1px' }}>
                  {items.map((item, index) => (
                    <div key={index}>{item.product || "N/A"}</div>
                  ))}
                </td>
                <td className="p-0 text-center align-top" style={{ padding: '1px' }}>
                  {items.map((item, index) => (
                    <div key={index}>{item.hsnCode || "N/A"}</div>
                  ))}
                </td>
                <td className="p-0 text-center align-top" style={{ padding: '1px' }}>
                  {items.map((item, index) => (
                    <div key={index}>{item.quantity ? `${item.quantity} No's` : "N/A"}</div>
                  ))}
                </td>
              </tr>
            ) : (
              <tr style={{ lineHeight: '1.1' }}>
                <td colSpan={4} className="p-0 text-center" style={{ padding: '1px' }}>
                  No items found
                </td>
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