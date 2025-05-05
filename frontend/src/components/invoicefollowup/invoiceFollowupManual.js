import { useState } from "react";
import axios from "axios";
export default function InvoiceFollowUpManual({onClose}) {

    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

    const [form, setForm] = useState({
        orderDate: "",
        jobSheetNumber: "",
        clientCompanyName: "",
        eventName: "",
        quotationNumber: "",
        crmName: "",
        product: "",
        partialQty: 0,
        dispatchedOn: "",
        deliveredThrough: "",
        poStatus: "",
        invoiceGenerated: "",
        invoiceNumber: ""  ,
        pendingFromDays: 0,
    });


    const handleInvoiceFollowUpSubmit = () => {
        const token = localStorage.getItem("token");
        axios.post(`${BACKEND_URL}/api/admin/invoice-followup`, form, {
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log(form);
        onClose();

        setForm({
            orderDate: "",
            jobSheetNumber: "",
            clientCompanyName: "",
            eventName: "",
            quotationNumber: "",
            crmName: "",
            product: "",
            partialQty: 0,
            dispatchedOn: "",
            deliveredThrough: "",
            poStatus: "",
            invoiceGenerated: "",
            invoiceNumber: "",
            pendingFromDays: 0,
        });
    }

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };


    return (
        <div>
<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Add Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-semibold">Order Date</label>
              <input
                type="date"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="orderDate"
                value={form.orderDate}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Job Sheet #</label>
              <input
                type="text"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="jobSheetNumber"
                value={form.jobSheetNumber}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Client (Co.)</label>
              <input
                type="text"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="clientCompanyName"
                value={form.clientCompanyName}
              />
            </div> 
            <div>
              <label className="block mb-1 font-semibold">Client Name</label>
              <input
                type="text"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="clientName"
                value={form.clientName}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Event</label>
              <input
                type="text"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="eventName"
                value={form.eventName}

              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Quotation #</label>
              <input
                type="text"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="quotationNumber"
                value={form.quotationNumber}
              />
            </div> 
            <div>
              <label className="block mb-1 font-semibold">CRM Name</label>
              <input
                type="text"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="crmName"
                value={form.crmName}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Product</label>
              <input
                type="text"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="product"
                value={form.product}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Partial Qty</label>
              <input
                type="text"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="partialQty"
                value={form.partialQty}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-semibold">Dispatched On</label>
              <input
                type="date"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="dispatchedOn"
                value={form.dispatchedOn}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Delivered Through</label>
              <input
                type="text"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="deliveredThrough"
                value={form.deliveredThrough}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">PO Status</label>
              <input
                type="text"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="poStatus"
                value={form.poStatus}
              />
            </div> 
            <div>
              <label className="block mb-1 font-semibold">Invoice Generated</label>
              <input
                type="text"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="invoiceGenerated"
                value={form.invoiceGenerated}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Invoice #</label>
              <input
                type="text"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="invoiceNumber"
                value={form.invoiceNumber}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Pending From (days)</label>
              <input
                type="text"
                className="border w-full p-1 rounded"
                onChange={handleChange}
                name="pendingFromDays"
                value={form.pendingFromDays}
              />
            </div>
            </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Handle submit logic here
               handleInvoiceFollowUpSubmit();
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Submit
          </button>
        </div>
      </div>
    </div>

        </div>
    );
}