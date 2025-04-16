// src/components/productionjobsheet/ProductionJobSheetTable.js
import React, { useState } from "react";

function displayText(value) {
  return !value || value === "-" ? "" : value;
}
function displayDate(v) {
  if (!v || v === "-") return "";
  const d = new Date(v);
  return isNaN(d) ? "" : d.toLocaleDateString();
}
function displayDateTime(v) {
  if (!v || v === "-") return "";
  const d = new Date(v);
  return isNaN(d) ? "" : d.toLocaleString();
}

const ProductionJobSheetTable = ({ data, onActionClick, sortField, sortOrder, onSortChange }) => {
  const [followUpModalData, setFollowUpModalData] = useState(null);

  const getRowClass = (status) => {
    if (!status) return "bg-white";
    switch (status) {
      case "pending":
        return "bg-orange-200";
      case "received":
        return "bg-green-300";
      case "alert":
        return "bg-red-200";
      default:
        return "bg-white";
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <span className="ml-1 opacity-50">↕</span>;
    return sortOrder === "asc" ? <span className="ml-1">▲</span> : <span className="ml-1">▼</span>;
  };

  const latestFollowUpObj = (arr) =>
    arr?.reduce((p, c) => (new Date(p.followUpDate) > new Date(c.followUpDate) ? p : c), null);

  const handleFollowUpClick = (arr) => {
    const latest = latestFollowUpObj(arr);
    if (latest) setFollowUpModalData(latest);
  };

  return (
    <>
      <table className="min-w-full table-auto border-collapse text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer" onClick={() => onSortChange("jobSheetCreatedDate")}>
              Order Date {renderSortIcon("jobSheetCreatedDate")}
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer" onClick={() => onSortChange("jobSheetNumber")}>
              Job Sheet {renderSortIcon("jobSheetNumber")}
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer" onClick={() => onSortChange("deliveryDateTime")}>
              Delivery Date {renderSortIcon("deliveryDateTime")}
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer" onClick={() => onSortChange("clientCompanyName")}>
              Client {renderSortIcon("clientCompanyName")}
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer" onClick={() => onSortChange("eventName")}>
              Event {renderSortIcon("eventName")}
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer" onClick={() => onSortChange("product")}>
              Product {renderSortIcon("product")}
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold">Qty Req</th>
            <th className="border px-2 py-1 text-blue-800 font-semibold">Qty Ord</th>
            <th className="border px-2 py-1 text-blue-800 font-semibold">Product Expected In Hand</th>
            <th className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer" onClick={() => onSortChange("brandingType")}>
              Branding Type {renderSortIcon("brandingType")}
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer" onClick={() => onSortChange("brandingVendor")}>
              Branding Vendor {renderSortIcon("brandingVendor")}
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold">Expected Post Branding</th>
            <th className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer" onClick={() => onSortChange("schedulePickUp")}>
              Schedule Pick Up {renderSortIcon("schedulePickUp")}
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold">Follow Up</th>
            <th className="border px-2 py-1 text-blue-800 font-semibold">Remarks</th>
            <th className="border px-2 py-1 text-blue-800 font-semibold">Status</th>
            <th className="border px-2 py-1 text-blue-800 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r._id} className={getRowClass(r.status)}>
              <td className="border px-2 py-1">{displayDate(r.jobSheetCreatedDate)}</td>
              <td className="border px-2 py-1">{displayText(r.jobSheetNumber)}</td>
              <td className="border px-2 py-1">{displayDate(r.deliveryDateTime)}</td>
              <td className="border px-2 py-1">{displayText(r.clientCompanyName)}</td>
              <td className="border px-2 py-1">{displayText(r.eventName)}</td>
              <td className="border px-2 py-1">{displayText(r.product)}</td>
              <td className="border px-2 py-1">{displayText(r.qtyRequired)}</td>
              <td className="border px-2 py-1">{displayText(r.qtyOrdered)}</td>
              <td className="border px-2 py-1">{displayDate(r.expectedReceiveDate)}</td>
              <td className="border px-2 py-1">{displayText(r.brandingType)}</td>
              <td className="border px-2 py-1">{displayText(r.brandingVendor)}</td>
              <td className="border px-2 py-1">{displayDate(r.expectedPostBranding)}</td>
              <td className="border px-2 py-1">{displayDateTime(r.schedulePickUp)}</td>
              <td className="border px-2 py-1 cursor-pointer text-blue-600 underline" onClick={() => handleFollowUpClick(r.followUp)}>
                {latestFollowUpObj(r.followUp)?.followUpDate ? new Date(latestFollowUpObj(r.followUp).followUpDate).toLocaleDateString() : ""}
              </td>
              <td className="border px-2 py-1">{displayText(r.remarks)}</td>
              <td className="border px-2 py-1">{displayText(r.status)}</td>
              <td className="border px-2 py-1 text-center">
                <button onClick={() => onActionClick(r)} className="focus:outline-none">
                  &#8942;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {followUpModalData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-4 rounded shadow-lg max-w-md">
            <h2 className="text-xl font-bold mb-2">Follow Up Details</h2>
            <p>
              <strong>Date:</strong> {new Date(followUpModalData.followUpDate).toLocaleString()}
            </p>
            <p>
              <strong>Note:</strong> {followUpModalData.note}
            </p>
            <button onClick={() => setFollowUpModalData(null)} className="mt-4 px-4 py-2 border rounded bg-gray-300">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductionJobSheetTable;
