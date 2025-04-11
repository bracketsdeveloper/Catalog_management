// src/components/openPurchase/OpenPurchaseItemModal.js
"use client";

import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const OpenPurchaseItemModal = ({ item, onClose, onSave }) => {
  const [vendorContactNumber, setVendorContactNumber] = useState(item.vendorContactNumber || "");
  const [orderConfirmedDate, setOrderConfirmedDate] = useState(
    item.orderConfirmedDate ? new Date(item.orderConfirmedDate) : null
  );
  const [expectedReceiveDate, setExpectedReceiveDate] = useState(
    item.expectedReceiveDate ? new Date(item.expectedReceiveDate) : null
  );
  const [scheduledPickup, setScheduledPickup] = useState(
    item.scheduledPickup ? new Date(item.scheduledPickup) : null
  );
  
  // Use an array for multiple follow-up entries
  const [followUps, setFollowUps] = useState(item.followUps || []);
  const [newFollowUp, setNewFollowUp] = useState("");
  
  const [remarks, setRemarks] = useState(item.remarks || "");
  const [status, setStatus] = useState(item.status || "Pending");

  // Add a follow-up entry when user clicks the "Add" button
  const handleAddFollowUp = () => {
    if (newFollowUp.trim() === "") return;
    // Retrieve the current user's name from localStorage or default to "Unknown User"
    const updatedBy = localStorage.getItem("username") || "Unknown User";
    const followUpEntry = {
      note: newFollowUp.trim(),
      timestamp: new Date().toISOString(),
      updatedBy: updatedBy
    };
    setFollowUps([...followUps, followUpEntry]);
    setNewFollowUp("");
  };

  const handleSave = () => {
    const updatedItem = {
      vendorContactNumber,
      orderConfirmedDate: orderConfirmedDate ? orderConfirmedDate.toISOString() : "",
      expectedReceiveDate: expectedReceiveDate ? expectedReceiveDate.toISOString() : "",
      scheduledPickup: scheduledPickup ? scheduledPickup.toISOString() : "",
      followUps, // now an array of follow-up entries with updatedBy field
      remarks,
      status
    };
    onSave(updatedItem);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white rounded p-6 w-full max-w-4xl relative shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          <span className="text-xl font-bold">&times;</span>
        </button>
        <h2 className="text-xl font-bold text-purple-700 mb-4">Edit Product Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-purple-700">Product</label>
            <input
              type="text"
              value={item.product}
              readOnly
              className="border border-purple-300 rounded w-full p-2 bg-gray-100"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-purple-700">Sourced From</label>
            <input
              type="text"
              value={item.sourcingFrom}
              readOnly
              className="border border-purple-300 rounded w-full p-2 bg-gray-100"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-purple-700">
              Vendor Contact Number
            </label>
            <input
              type="text"
              value={vendorContactNumber}
              onChange={(e) => setVendorContactNumber(e.target.value)}
              className="border border-purple-300 rounded w-full p-2"
              placeholder="Enter contact number (optional)"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-purple-700">
              Order Confirmed Date
            </label>
            <DatePicker
              selected={orderConfirmedDate}
              onChange={date => setOrderConfirmedDate(date)}
              dateFormat="dd/MM/yyyy"
              className="border border-purple-300 rounded w-full p-2"
              placeholderText="Select date"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-purple-700">
              Expected Receive Date
            </label>
            <DatePicker
              selected={expectedReceiveDate}
              onChange={date => setExpectedReceiveDate(date)}
              dateFormat="dd/MM/yyyy"
              className="border border-purple-300 rounded w-full p-2"
              placeholderText="Select date"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-purple-700">
              Schedule Pickup
            </label>
            <DatePicker
              selected={scheduledPickup}
              onChange={date => setScheduledPickup(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="dd/MM/yyyy h:mm aa"
              className="border border-purple-300 rounded w-full p-2"
              placeholderText="Select date and time"
            />
          </div>
          {/* Follow Up section for multiple entries */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-purple-700">Follow Up</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newFollowUp}
                onChange={(e) => setNewFollowUp(e.target.value)}
                className="border border-purple-300 rounded w-full p-2"
                placeholder="Enter follow-up note"
              />
              <button
                onClick={handleAddFollowUp}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add
              </button>
            </div>
            {followUps.length > 0 && (
              <ul className="mt-2 border border-gray-200 rounded p-2 max-h-40 overflow-y-auto">
                {followUps.map((fu, index) => (
                  <li key={index} className="text-sm text-gray-700 mb-1">
                    <span className="font-bold">{fu.updatedBy}</span> - {new Date(fu.timestamp).toLocaleString()}: {fu.note}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-purple-700">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="border border-purple-300 rounded w-full p-2"
              placeholder="Enter remarks"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-purple-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-purple-300 rounded w-full p-2"
            >
              <option value="Pending">Pending</option>
              <option value="Received">Received</option>
              <option value="Alert">Alert</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenPurchaseItemModal;
