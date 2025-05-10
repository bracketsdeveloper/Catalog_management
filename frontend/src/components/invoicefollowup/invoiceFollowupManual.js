import { useEffect, useState } from "react";
import axios from "axios";
export default function InvoiceFollowUpManual({onClose}) {

    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
    const [error  , setError] = useState("");
    const [jobSheetSuggestion , setJobSheetSuggestion] = useState([]);
    const [companySuggesion , setCompanySuggestion] = useState([]);
    const [clients, setClients] = useState([]);


    const [form, setForm] = useState({
        orderDate: "",
        jobSheetNumber: "",
        clientCompanyName: "",
        clientName: "",
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
           alert("Invoice Follow-Up saved successfully!");
          
        setForm({
            orderDate: "",
            jobSheetNumber: "",
            clientCompanyName: "",
            clientName: "",
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

    // const handleChange = (e) => {
    //     setForm({
    //         ...form,
    //         [e.target.name]: e.target.value,
    //     });
    // };

    const handleChange = (e) => {
      const { name, value } = e.target;
  
      if (name === "clientCompanyName") {
        const company = companySuggesion.find(c => c.companyName === value);
        setClients(company ? company.clients : []);
        setForm({
          ...form,
          [name]: value,
          clientName: "", // reset client name on company change
        });
      } else {
        setForm({
          ...form,
          [name]: value,
        });
      }
    };

    useEffect(() => {
        async function fetchJobSheetSuggestions() {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`${BACKEND_URL}/api/admin/companies`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setCompanySuggestion(res.data || []);
            } catch (err) {
                console.error("Error fetching job sheet suggestions:", err);
            }
        }
        fetchJobSheetSuggestions();
    }, []);

  
  
        const getUniqueOptions = (key) => {
        return [...new Set(companySuggesion.map(item => item[key]).filter(Boolean))];
        };


  //getch the client and event name from the jobsheet

     useEffect(() => {
        async function fetchJobSheetSuggestions() {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`${BACKEND_URL}/api/admin/jobsheets`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setJobSheetSuggestion(res.data);
            } catch (err) {
                console.error("Error fetching job sheet suggestions:", err);
            }
        }
        fetchJobSheetSuggestions();
    }, []);

  const getClientName = (key) => {
    return [...new Set(jobSheetSuggestion.map(item => item[key]).filter(Boolean))];
  };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto px-4 py-8">
  <div className="bg-white rounded-lg w-full max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
    <h2 className="text-xl font-semibold mb-6 text-center">Add Invoice Follow-Up</h2>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Order Date */}
      <div>
        <label className="block mb-1 font-semibold">Order Date</label>
        <input
          type="date"
          className="border w-full p-2 rounded"
          onChange={handleChange}
          name="orderDate"
          value={form.orderDate}
        />
      </div>

      {/* Job Sheet Number */}
      <div>
        <label className="block mb-1 font-semibold">Job Sheet #</label>
        <input
          type="text"
          className="border w-full p-2 rounded"
          onChange={handleChange}
          name="jobSheetNumber"
          value={form.jobSheetNumber}
        />
      </div>

         <div>
            <label className="block mb-1 font-semibold text-sm">Client Company Name</label>
            <select
              name="clientCompanyName"
              className="border w-full p-2 rounded text-sm"
              value={form.clientCompanyName}
              onChange={handleChange}
            >
              <option value="">Select...</option>
              {getUniqueOptions("companyName").map((name, idx) => (
                <option key={idx} value={name}>
                  {name.length > 60 ? name.slice(0, 60) + "..." : name}
                </option>
              ))}
            </select>
          </div>

          {/* Client Name */}
          <div>
            <label className="block mb-1 font-semibold">Client Name</label>
            <select
              name="clientName"
              className="border w-full p-2 rounded"
              value={form.clientName}
              onChange={handleChange}
            >
              <option value="">Select...</option>
              {clients.map((client, idx) => (
                <option key={idx} value={client.name}>{client.name}</option>
              ))}
            </select>
          </div>

      {/* Event Name */}
      <div>
        <label className="block mb-1 font-semibold">Event Name</label>
        <select
          name="eventName"
          className="border w-full p-2 rounded"
          value={form.eventName}
          onChange={handleChange}
        >
          <option value="">Select...</option>
          {getClientName("eventName").map((name, idx) => (
            <option key={idx} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Quotation Number */}
      <div>
        <label className="block mb-1 font-semibold">Quotation #</label>
        <input
          type="text"
          className="border w-full p-2 rounded"
          onChange={handleChange}
          name="quotationNumber"
          value={form.quotationNumber}
        />
      </div>

      {/* CRM Name */}
      <div>
        <label className="block mb-1 font-semibold">CRM Name</label>
        <input
          type="text"
          className="border w-full p-2 rounded"
          onChange={handleChange}
          name="crmName"
          value={form.crmName}
        />
      </div>

      {/* Product */}
      <div>
        <label className="block mb-1 font-semibold">Product</label>
        <input
          type="text"
          className="border w-full p-2 rounded"
          onChange={handleChange}
          name="product"
          value={form.product}
        />
      </div>

      {/* Partial Quantity */}
      <div>
        <label className="block mb-1 font-semibold">Partial Qty</label>
        <input
          type="number"
          className="border w-full p-2 rounded"
          onChange={handleChange}
          name="partialQty"
          value={form.partialQty}
        />
      </div>

      {/* Dispatched On */}
      <div>
        <label className="block mb-1 font-semibold">Dispatched On</label>
        <input
          type="date"
          className="border w-full p-2 rounded"
          onChange={handleChange}
          name="dispatchedOn"
          value={form.dispatchedOn}
        />
      </div>

      {/* Delivered Through */}
      <div>
        <label className="block mb-1 font-semibold">Delivered Through</label>
        <input
          type="text"
          className="border w-full p-2 rounded"
          onChange={handleChange}
          name="deliveredThrough"
          value={form.deliveredThrough}
        />
      </div>

      {/* PO Status */}
      <div>
        <label className="block mb-1 font-semibold">PO Status</label>
        <input
          type="text"
          className="border w-full p-2 rounded"
          onChange={handleChange}
          name="poStatus"
          value={form.poStatus}
        />
      </div>

      {/* Invoice Generated */}
      <div>
        <label className="block mb-1 font-semibold">Invoice Generated</label>
        <select
          className="border w-full p-2 rounded"
          onChange={handleChange}
          name="invoiceGenerated"
          value={form.invoiceGenerated}
        >
          <option value="">Select</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      {/* Invoice Number */}
      <div>
        <label className="block mb-1 font-semibold">Invoice #</label>
        <input
          type="text"
          className="border w-full p-2 rounded"
          onChange={handleChange}
          name="invoiceNumber"
          value={form.invoiceNumber}
        />
      </div>

      {/* Pending From Days */}
      <div>
        <label className="block mb-1 font-semibold">Pending From (days)</label>
        <input
          type="number"
          className="border w-full p-2 rounded"
          onChange={handleChange}
          name="pendingFromDays"
          value={form.pendingFromDays}
        />
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex flex-col md:flex-row justify-end gap-3 mt-4">
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
      >
        Cancel
      </button>
      <button
        onClick={handleInvoiceFollowUpSubmit}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Submit
      </button>
    </div>
  </div>
</div>

    );
  }