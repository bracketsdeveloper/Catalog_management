// src/components/productionjobsheet/ProductionJobSheetTable.js
import React, { useState } from "react";

// Helper functions to cleanly display values:
function displayText(value) {
  if (!value || value === "-") return "";
  return value;
}

// For simple date display (e.g. 04/14/2025):
function displayDate(value) {
  if (!value || value === "-") return "";
  const dateObj = new Date(value);
  return isNaN(dateObj.getTime()) ? "" : dateObj.toLocaleDateString();
}

// For date+time display (e.g. 4/14/2025, 10:30:00 AM):
function displayDateTime(value) {
  if (!value || value === "-") return "";
  const dateObj = new Date(value);
  return isNaN(dateObj.getTime()) ? "" : dateObj.toLocaleString();
}

const ProductionJobSheetTable = ({
  data,
  onActionClick,
  sortField,
  sortOrder,
  onSortChange,
}) => {
  const [followUpModalData, setFollowUpModalData] = useState(null);

  const getRowClass = (status) => {
    if (!status || status.trim() === "") return "bg-white";
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
    if (sortField !== field) {
      return <span className="ml-1 opacity-50">↕</span>;
    }
    return sortOrder === "asc" ? <span className="ml-1">▲</span> : <span className="ml-1">▼</span>;
  };

  const getLatestFollowUp = (followUp) => {
    if (followUp && followUp.length > 0) {
      const dates = followUp.map((f) => new Date(f.followUpDate));
      const latest = new Date(Math.max(...dates));
      return latest.toLocaleDateString();
    }
    return "";
  };

  const getLatestFollowUpObj = (followUp) => {
    if (followUp && followUp.length > 0) {
      return followUp.reduce((prev, current) =>
        new Date(prev.followUpDate) > new Date(current.followUpDate) ? prev : current
      );
    }
    return null;
  };

  const handleFollowUpClick = (followUp) => {
    const latest = getLatestFollowUpObj(followUp);
    if (latest) {
      setFollowUpModalData(latest);
    }
  };

  const closeFollowUpModal = () => {
    setFollowUpModalData(null);
  };

  return (
    <>
      <table className="min-w-full table-auto border-collapse text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer"
              onClick={() => onSortChange("jobSheetCreatedDate")}
            >
              Order Date {renderSortIcon("jobSheetCreatedDate")}
            </th>
            <th
              className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer"
              onClick={() => onSortChange("jobSheetNumber")}
            >
              Job Sheet Number {renderSortIcon("jobSheetNumber")}
            </th>
            <th
              className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer"
              onClick={() => onSortChange("deliveryDateTime")}
            >
              Delivery Date to Client {renderSortIcon("deliveryDateTime")}
            </th>
            <th
              className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer"
              onClick={() => onSortChange("clientCompanyName")}
            >
              Client Company Name {renderSortIcon("clientCompanyName")}
            </th>
            <th
              className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer"
              onClick={() => onSortChange("eventName")}
            >
              Event Name {renderSortIcon("eventName")}
            </th>
            <th
              className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer"
              onClick={() => onSortChange("product")}
            >
              Product {renderSortIcon("product")}
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold">
              Product Expected In Hand
            </th>
            <th
              className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer"
              onClick={() => onSortChange("brandingType")}
            >
              Branding Type {renderSortIcon("brandingType")}
            </th>
            <th
              className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer"
              onClick={() => onSortChange("brandingVendor")}
            >
              Branding Vendor {renderSortIcon("brandingVendor")}
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold">
              Expected Post Branding in Ace
            </th>
            <th
              className="border px-2 py-1 text-blue-800 font-semibold cursor-pointer"
              onClick={() => onSortChange("schedulePickUp")}
            >
              Schedule Pick Up Date &amp; Time {renderSortIcon("schedulePickUp")}
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold">
              Follow Up
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold">
              Remarks
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold">
              Status
            </th>
            <th className="border px-2 py-1 text-blue-800 font-semibold">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((record) => {
            const rowClass = getRowClass(record.status);
            return (
              <tr key={record._id} className={`${rowClass}`}>
                <td className="border px-2 py-1">
                  {displayDate(record.jobSheetCreatedDate)}
                </td>
                <td className="border px-2 py-1">
                  {displayText(record.jobSheetNumber)}
                </td>
                <td className="border px-2 py-1">
                  {displayDate(record.deliveryDateTime)}
                </td>
                <td className="border px-2 py-1">
                  {displayText(record.clientCompanyName)}
                </td>
                <td className="border px-2 py-1">
                  {displayText(record.eventName)}
                </td>
                <td className="border px-2 py-1">
                  {displayText(record.product)}
                </td>
                <td className="border px-2 py-1">
                  {displayDate(record.expectedReceiveDate)}
                </td>
                <td className="border px-2 py-1">
                  {displayText(record.brandingType)}
                </td>
                <td className="border px-2 py-1">
                  {displayText(record.brandingVendor)}
                </td>
                <td className="border px-2 py-1">
                  {displayDate(record.expectedPostBranding)}
                </td>
                <td className="border px-2 py-1">
                  {displayDateTime(record.schedulePickUp)}
                </td>
                <td
                  className="border px-2 py-1 cursor-pointer text-blue-600 underline"
                  onClick={() => handleFollowUpClick(record.followUp)}
                >
                  {getLatestFollowUp(record.followUp)}
                </td>
                <td className="border px-2 py-1">
                  {displayText(record.remarks)}
                </td>
                <td className="border px-2 py-1">
                  {displayText(record.status)}
                </td>
                <td className="border px-2 py-1 text-center">
                  <button
                    onClick={() => onActionClick(record)}
                    className="focus:outline-none"
                  >
                    &#8942;
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {followUpModalData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-4 rounded shadow-lg max-w-md">
            <h2 className="text-xl font-bold mb-2">Follow Up Details</h2>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(followUpModalData.followUpDate).toLocaleString()}
            </p>
            <p>
              <strong>Note:</strong> {followUpModalData.note}
            </p>
            <button
              onClick={closeFollowUpModal}
              className="mt-4 px-4 py-2 border rounded bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductionJobSheetTable;
