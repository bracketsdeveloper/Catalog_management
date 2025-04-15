// components/productionjobsheet/ProductionJobSheetInvoiceModal.jsx
import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const ProductionJobSheetInvoiceModal = ({ invoice, onClose }) => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token = localStorage.getItem("token");

  // Editable fields only.
  const [formData, setFormData] = useState({
    cost: invoice.cost || "",
    negotiatedCost: invoice.negotiatedCost || "",
    paymentModes: invoice.paymentModes || [],
    newPaymentMode: "",
    vendorInvoiceNumber: invoice.vendorInvoiceNumber || "",
    vendorInvoiceReceived: invoice.vendorInvoiceReceived || "No",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const addPaymentMode = () => {
    if (formData.newPaymentMode.trim() !== "") {
      setFormData(prev => ({
        ...prev,
        paymentModes: [...prev.paymentModes, { mode: formData.newPaymentMode.trim() }],
        newPaymentMode: "",
      }));
    }
  };

  const removePaymentMode = (index) => {
    setFormData(prev => ({
      ...prev,
      paymentModes: prev.paymentModes.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cost || !formData.negotiatedCost || !formData.vendorInvoiceNumber) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const payload = {
      productionJobSheetId: invoice.productionJobSheetId,
      orderConfirmationDate: invoice.orderConfirmationDate,
      jobSheetNumber: invoice.jobSheetNumber,
      clientCompanyName: invoice.clientCompanyName,
      eventName: invoice.eventName,
      product: invoice.product,
      sourceFrom: invoice.sourceFrom,
      cost: Number(formData.cost),
      negotiatedCost: Number(formData.negotiatedCost),
      paymentModes: formData.paymentModes,
      vendorInvoiceNumber: formData.vendorInvoiceNumber.toUpperCase(),
      vendorInvoiceReceived: formData.vendorInvoiceReceived,
    };

    try {
      let url = `${BACKEND_URL}/api/admin/productionjobsheetinvoice`;
      let method = "post";
      // If the invoice has an _id and is not a virtual record, then perform an update.
      if (invoice._id && !invoice.isVirtual) {
        url = `${BACKEND_URL}/api/admin/productionjobsheetinvoice/${invoice._id}`;
        method = "put";
      }
      await axios[method](url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Invoice saved successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving invoice", error);
      toast.error(`Error saving invoice: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="bg-white p-4 rounded w-11/12 max-w-5xl max-h-[90vh] overflow-y-auto shadow-lg">
        <h2 className="text-xl text-purple-700 font-bold mb-4">Edit Production Job Sheet Invoice</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Non-editable Fields */}
          <div className="col-span-1">
            <label className="block font-semibold text-purple-600">Order Confirmation Date</label>
            <input
              type="text"
              value={new Date(invoice.orderConfirmationDate).toLocaleDateString()}
              disabled
              className="w-full border p-1 rounded bg-gray-50"
            />
          </div>
          <div className="col-span-1">
            <label className="block font-semibold text-purple-600">Job Sheet</label>
            <input
              type="text"
              value={invoice.jobSheetNumber}
              disabled
              className="w-full border p-1 rounded bg-gray-50"
            />
          </div>
          <div className="col-span-1">
            <label className="block font-semibold text-purple-600">Client Name</label>
            <input
              type="text"
              value={invoice.clientCompanyName}
              disabled
              className="w-full border p-1 rounded bg-gray-50"
            />
          </div>
          <div className="col-span-1">
            <label className="block font-semibold text-purple-600">Event Name</label>
            <input
              type="text"
              value={invoice.eventName}
              disabled
              className="w-full border p-1 rounded bg-gray-50"
            />
          </div>
          <div className="col-span-1">
            <label className="block font-semibold text-purple-600">Product Name</label>
            <input
              type="text"
              value={invoice.product}
              disabled
              className="w-full border p-1 rounded bg-gray-50"
            />
          </div>
          <div className="col-span-1">
            <label className="block font-semibold text-purple-600">Source From</label>
            <input
              type="text"
              value={invoice.sourceFrom}
              disabled
              className="w-full border p-1 rounded bg-gray-50"
            />
          </div>
          {/* Editable Fields */}
          <div className="col-span-1">
            <label className="block font-semibold text-purple-600">Cost</label>
            <input
              type="number"
              name="cost"
              value={formData.cost}
              onChange={handleInputChange}
              className="w-full border p-1 rounded"
              required
            />
          </div>
          <div className="col-span-1">
            <label className="block font-semibold text-purple-600">Negotiated Cost</label>
            <input
              type="number"
              name="negotiatedCost"
              value={formData.negotiatedCost}
              onChange={handleInputChange}
              className="w-full border p-1 rounded"
              required
            />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block font-semibold text-purple-600">Payment Made</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                name="newPaymentMode"
                value={formData.newPaymentMode}
                onChange={handleInputChange}
                className="w-full border p-1 rounded"
                placeholder="Payment received"
              />
              <button type="button" onClick={addPaymentMode} className="px-3 py-1 bg-green-600 text-white rounded">
                Add
              </button>
            </div>
            <ul className="text-xs mt-1">
              {formData.paymentModes.map((pm, index) => (
                <li key={index} className="flex justify-between items-center">
                  <span>{pm.mode}</span>
                  <button type="button" onClick={() => removePaymentMode(index)} className="text-red-500">
                    x
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-1">
            <label className="block font-semibold text-purple-600">Vendor Invoice Number</label>
            <input
              type="text"
              name="vendorInvoiceNumber"
              value={formData.vendorInvoiceNumber}
              onChange={handleInputChange}
              className="w-full border p-1 rounded"
              required
            />
          </div>
          <div className="col-span-1">
            <label className="block font-semibold text-purple-600">Vendor Invoice Received</label>
            <select
              name="vendorInvoiceReceived"
              value={formData.vendorInvoiceReceived}
              onChange={handleInputChange}
              className="w-full border p-1 rounded"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="col-span-3 flex justify-end space-x-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded bg-gray-300 text-gray-800"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 border rounded bg-blue-500 text-white">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductionJobSheetInvoiceModal;
