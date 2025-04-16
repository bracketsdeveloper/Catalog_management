// src/components/productionjobsheet/ProductionJobSheetModal.js
import React, { useState } from "react";
import axios from "axios";
import FollowUpModal from "./FollowUpModal";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ProductionJobSheetModal = ({ record, onClose }) => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token = localStorage.getItem("token");

  const [formData, setFormData] = useState({
    expectedPostBranding: record.expectedPostBranding
      ? new Date(record.expectedPostBranding).toISOString().split("T")[0]
      : "",
    schedulePickUp: record.schedulePickUp
      ? record.schedulePickUp.split("T")[0]
      : "",
    qtyRequired: record.qtyRequired || 0,
    qtyOrdered: record.qtyOrdered || 0,
    remarks: record.remarks || "",
    status: "",
    followUp: record.followUp || [],
  });
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const addFollowUp = (fu) => {
    setFormData((p) => ({ ...p, followUp: [...p.followUp, fu] }));
    setShowFollowUpModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let url = `${BACKEND_URL}/api/admin/productionjobsheets`;
      let method = "post";
      if (record._id && !record.isTemporary) {
        url = `${BACKEND_URL}/api/admin/productionjobsheets/${record._id}`;
        method = "put";
      } else {
        Object.assign(formData, {
          openPurchaseId: record._id,
          jobSheetId: record.jobSheetId,
          jobSheetCreatedDate: record.jobSheetCreatedDate,
          jobSheetNumber: record.jobSheetNumber,
          clientCompanyName: record.clientCompanyName,
          eventName: record.eventName,
          product: record.product,
          deliveryDateTime: record.deliveryDateTime,
          expectedReceiveDate: record.expectedReceiveDate,
          brandingType: record.brandingType,
          brandingVendor: record.brandingVendor,
        });
      }
      await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Saved successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving production job sheet", error);
      toast.error(
        `Error: ${error.response?.data?.message || error.message}`
      );
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-4 rounded w-11/12 max-w-5xl max-h-[90vh] overflow-y-auto shadow-lg">
        <h2 className="text-xl text-purple-700 font-bold mb-4">
          Edit Production Job Sheet
        </h2>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {/* STATIC / NON‑EDITABLE */}
          <div className="col-span-1">
            <label className="block text-purple-600 font-semibold">
              Order Date
            </label>
            <input
              type="text"
              value={new Date(
                record.jobSheetCreatedDate
              ).toLocaleDateString()}
              disabled
              className="w-full border border-blue-300 p-1 rounded bg-gray-50"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-purple-600 font-semibold">
              Job Sheet #
            </label>
            <input
              type="text"
              value={record.jobSheetNumber}
              disabled
              className="w-full border border-blue-300 p-1 rounded bg-gray-50"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-purple-600 font-semibold">
              Delivery Date to Client
            </label>
            <input
              type="text"
              value={new Date(
                record.deliveryDateTime
              ).toLocaleDateString()}
              disabled
              className="w-full border border-blue-300 p-1 rounded bg-gray-50"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-purple-600 font-semibold">
              Client Company
            </label>
            <input
              type="text"
              value={record.clientCompanyName}
              disabled
              className="w-full border border-blue-300 p-1 rounded bg-gray-50"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-purple-600 font-semibold">
              Event Name
            </label>
            <input
              type="text"
              value={record.eventName}
              disabled
              className="w-full border border-blue-300 p-1 rounded bg-gray-50"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-purple-600 font-semibold">
              Product
            </label>
            <input
              type="text"
              value={record.product}
              disabled
              className="w-full border border-blue-300 p-1 rounded bg-gray-50"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-purple-600 font-semibold">
              Product Expected In Hand
            </label>
            <input
              type="text"
              value={
                record.expectedReceiveDate
                  ? new Date(record.expectedReceiveDate).toLocaleDateString()
                  : "-"
              }
              disabled
              className="w-full border border-blue-300 p-1 rounded bg-gray-50"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-purple-600 font-semibold">
              Branding Type
            </label>
            <input
              type="text"
              value={record.brandingType || "-"}
              disabled
              className="w-full border border-blue-300 p-1 rounded bg-gray-50"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-purple-600 font-semibold">
              Branding Vendor
            </label>
            <input
              type="text"
              value={record.brandingVendor || "-"}
              disabled
              className="w-full border border-blue-300 p-1 rounded bg-gray-50"
            />
          </div>

          {/* EDITABLE */}
          <div className="col-span-1">
            <label className="block text-purple-600 font-semibold">
              Qty Required
            </label>
            <input
              type="number"
              name="qtyRequired"
              value={formData.qtyRequired}
              onChange={handleInputChange}
              className="w-full border border-blue-300 p-1 rounded"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-purple-600 font-semibold">
              Qty Ordered
            </label>
            <input
              type="number"
              name="qtyOrdered"
              value={formData.qtyOrdered}
              onChange={handleInputChange}
              className="w-full border border-blue-300 p-1 rounded"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-purple-600 font-semibold">
              Expected Post Branding
            </label>
            <input
              type="date"
              name="expectedPostBranding"
              value={formData.expectedPostBranding}
              onChange={handleInputChange}
              className="w-full border border-blue-300 p-1 rounded"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-purple-600 font-semibold">
              Schedule Pick Up
            </label>
            <input
              type="datetime-local"
              name="schedulePickUp"
              value={formData.schedulePickUp}
              onChange={handleInputChange}
              className="w-full border border-blue-300 p-1 rounded"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-purple-600 font-semibold">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full border border-blue-300 p-1 rounded"
            >
              <option value="">-- Select --</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="alert">Alert</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-purple-600 font-semibold">
              Remarks
            </label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              className="w-full border border-blue-300 p-1 rounded"
            />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-purple-600 font-semibold">
              Follow Up
            </label>
            <button
              type="button"
              onClick={() => setShowFollowUpModal(true)}
              className="mb-1 p-1 border border-blue-300 rounded hover:bg-blue-100"
            >
              Add Follow Up
            </button>
            <ul className="list-disc pl-5">
              {formData.followUp.map((fu, i) => (
                <li key={i}>
                  {fu.followUpDate}: {fu.note}
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-1 md:col-span-3 flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border rounded bg-blue-500 text-white"
            >
              Save
            </button>
          </div>
        </form>

        {showFollowUpModal && (
          <FollowUpModal
            onClose={() => setShowFollowUpModal(false)}
            onSave={addFollowUp}
          />
        )}
      </div>
    </div>
  );
};

export default ProductionJobSheetModal;
