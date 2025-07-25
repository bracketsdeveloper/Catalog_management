  "use client";

  import React, { useState, useEffect } from "react";
  import axios from "axios";
  import { useParams, useNavigate } from "react-router-dom";
  import jsPDF from "jspdf";
  import html2canvas from "html2canvas";

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  export default function QuotationView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quotation, setQuotation] = useState(null);
    const [editableQuotation, setEditableQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newTerm, setNewTerm] = useState({ heading: "", content: "" });
    const [termModalOpen, setTermModalOpen] = useState(false);
    const [editingTermIdx, setEditingTermIdx] = useState(null);
    const [products, setProducts] = useState([]);
    const [operationModalOpen, setOperationModalOpen] = useState(false);
    const [newOperation, setNewOperation] = useState({
      ourCost: "",
      branding: "",
      delivery: "",
      markup: "",
      total: "",
      vendor: "",
      remarks: "",
      reference: "",
    });
    const [editingOperationId, setEditingOperationId] = useState(null);
    const [vendors, setVendors] = useState([]);
    const [vendorSuggestions, setVendorSuggestions] = useState([]);
    const [showVendorDropdown, setShowVendorDropdown] = useState(false);
    const [eInvoiceModalOpen, setEInvoiceModalOpen] = useState(false);
    const [eInvoiceData, setEInvoiceData] = useState(null);
    const [referenceJson, setReferenceJson] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [customerDetails, setCustomerDetails] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [jsonView, setJsonView] = useState("json"); // Toggle between "json" and "form"
    const token = localStorage.getItem("token");

    // Field name mapping for clear display
    const fieldNameMapping = {
      txn: "Transaction",
      DocDtls: "Document Details",
      Dt: "Date",
      No: "Document Number",
      Typ: "Document Type",
      RefDtls: "Reference Details",
      InvRm: "Invoice Remarks",
      // Add more mappings as needed
    };

    const defaultTerms = [
      {
        heading: "Delivery",
        content:
          "10 – 12 Working days upon order confirmation\nSingle delivery to Hyderabad office included in the cost",
      },
      { heading: "Branding", content: "As mentioned above" },
      { heading: "Payment Terms", content: "Within 30 days upon delivery" },
      {
        heading: "Quote Validity",
        content: "The quote is valid only for 6 days from the date of quotation",
      },
    ];

    useEffect(() => {
      fetchQuotation();
      fetchProducts();
    }, [id]);

    useEffect(() => {
      if (
        editableQuotation &&
        (!editableQuotation.terms || editableQuotation.terms.length === 0)
      ) {
        setEditableQuotation((prev) => ({ ...prev, terms: defaultTerms }));
      }
    }, [editableQuotation?.terms]);

    useEffect(() => {
      if (operationModalOpen) {
        fetchVendors();
      }
    }, [operationModalOpen]);

    useEffect(() => {
      const ourCost = parseFloat(newOperation.ourCost) || 0;
      const branding = parseFloat(newOperation.branding) || 0;
      const delivery = parseFloat(newOperation.delivery) || 0;
      const markup = parseFloat(newOperation.markup) || 0;
      const total = (ourCost + branding + delivery + markup).toFixed(2);
      setNewOperation((prev) => ({ ...prev, total }));
    }, [
      newOperation.ourCost,
      newOperation.branding,
      newOperation.delivery,
      newOperation.markup,
    ]);

    useEffect(() => {
      async function checkEInvoice() {
        try {
          const res = await axios.get(
            `${BACKEND_URL}/api/admin/quotations/${id}/einvoice/customer`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setEInvoiceData(res.data.eInvoice);
          setCustomerDetails(res.data.customerDetails);
          setIsAuthenticated(!!res.data.eInvoice?.authToken);
          const refJson = res.data.eInvoice?.referenceJson || {};
          if (!refJson.RefDtls?.InvRm) {
            refJson.RefDtls = { ...refJson.RefDtls, InvRm: "Standard quotation remarks" };
          }
          setReferenceJson(JSON.stringify(refJson, null, 2));
        } catch (err) {
          console.error("Check e-invoice error:", err);
        }
      }
      checkEInvoice();
    }, [id, token]);

    async function fetchProducts() {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/admin/products`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProducts(res.data.products || []);
      } catch (error) {
        console.error(
          "Error fetching products:",
          error.response?.data || error.message
        );
      }
    }

    async function fetchVendors() {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/admin/vendors`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVendors(res.data || []);
      } catch (error) {
        console.error(
          "Error fetching vendors:",
          error.response?.data || error.message
        );
      }
    }

    async function fetchQuotation() {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error("Failed to fetch quotation");
        }
        const data = await res.json();
        const sanitizedItems = (data.items || []).map((item, idx) => ({
          ...item,
          quantity: parseFloat(item.quantity) || 1,
          slNo: item.slNo || idx + 1,
          productGST: item.productGST != null ? parseFloat(item.productGST) : 18,
          rate: parseFloat(item.rate) || 0,
          product: item.product || "Unknown Product",
          hsnCode: item.hsnCode || item.productId?.hsnCode || "",
        }));
        setQuotation({ ...data, items: sanitizedItems });
        setEditableQuotation({ ...data, items: sanitizedItems });
        setError(null);
      } catch (err) {
        console.error("Error fetching quotation:", err);
        setError("Failed to load quotation");
      } finally {
        setLoading(false);
      }
    }

    function handleVendorInputChange(value) {
      setNewOperation((prev) => ({ ...prev, vendor: value }));
      if (value.trim() === "") {
        setVendorSuggestions([]);
        setShowVendorDropdown(false);
        return;
      }
      const lowerValue = value.toLowerCase();
      const suggestions = vendors.filter(
        (vendor) =>
          vendor.vendorName?.toLowerCase().includes(lowerValue) ||
          vendor.vendorCompany?.toLowerCase().includes(lowerValue)
      );
      setVendorSuggestions(suggestions);
      setShowVendorDropdown(suggestions.length > 0);
    }

    function handleVendorSelect(vendor) {
      setNewOperation((prev) => ({ ...prev, vendor: vendor.vendorName }));
      setShowVendorDropdown(false);
    }

    async function handleAuthenticate() {
      try {
        const res = await axios.post(
          `${BACKEND_URL}/api/admin/quotations/${id}/einvoice/authenticate`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEInvoiceData(res.data.eInvoice);
        setIsAuthenticated(true);
        setErrorMessage("");
        alert("Authentication successful");
      } catch (err) {
        setErrorMessage(
          "Authentication failed: " + (err.response?.data?.message || err.message)
        );
      }
    }

    async function handleFetchCustomerDetails() {
      try {
        const res = await axios.get(
          `${BACKEND_URL}/api/admin/quotations/${id}/einvoice/customer`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setCustomerDetails(res.data.customerDetails);
        setEInvoiceData(res.data.eInvoice);
        setErrorMessage("");
        alert("Customer details fetched");
      } catch (err) {
        setErrorMessage(
          "Failed to fetch customer details: " +
            (err.response?.data?.message || err.message)
        );
      }
    }

    async function handleGenerateReferenceJson() {
      try {
        const res = await axios.post(
          `${BACKEND_URL}/api/admin/quotations/${id}/einvoice/reference`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const refJson = res.data.referenceJson || {};
        if (!refJson.RefDtls?.InvRm) {
          refJson.RefDtls = { ...refJson.RefDtls, InvRm: "Standard quotation remarks" };
        }
        setReferenceJson(JSON.stringify(refJson, null, 2));
        setEInvoiceData(res.data.eInvoice);
        setErrorMessage("");
        // Automatically save the generated JSON
        await handleSaveReferenceJson();
        alert("Reference JSON generated and saved");
      } catch (err) {
        let detail = "";
        const sd = err.response?.data?.status_desc;
        if (typeof sd === "string" && sd.trim().startsWith("[")) {
          try {
            const list = JSON.parse(sd);
            detail = list.map((e) => e.ErrorMessage).join("\n");
          } catch {
            detail = sd;
          }
        } else if (sd) {
          detail = sd;
        } else {
          detail = err.response?.data?.message || err.message;
        }
        setErrorMessage(detail);
      }
    }

    async function handleSaveReferenceJson() {
      try {
        const parsedJson = JSON.parse(referenceJson);
        if (
          parsedJson.RefDtls?.InvRm &&
          (parsedJson.RefDtls.InvRm.length < 3 || parsedJson.RefDtls.InvRm.length > 100)
        ) {
          throw new Error("Invoice remarks must be 3–100 characters");
        }
        const res = await axios.put(
          `${BACKEND_URL}/api/admin/quotations/${id}/einvoice/reference`,
          { referenceJson: parsedJson },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEInvoiceData(res.data.eInvoice);
        setErrorMessage("");
        // No alert here since it's called automatically from handleGenerateReferenceJson
      } catch (err) {
        setErrorMessage(
          "Failed to save reference JSON: " +
            (err.response?.data?.message || err.message)
        );
      }
    }

    function handleFormFieldChange(field, value, parentField = null) {
      try {
        const parsedJson = JSON.parse(referenceJson);
        if (parentField) {
          parsedJson[parentField] = { ...parsedJson[parentField], [field]: value };
        } else {
          parsedJson[field] = value;
        }
        setReferenceJson(JSON.stringify(parsedJson, null, 2));
      } catch {
        setErrorMessage("Invalid JSON format");
      }
    }

    function renderJsonForm() {
      try {
        const parsedJson = JSON.parse(referenceJson);
        const fields = [];

        Object.keys(parsedJson).forEach((key) => {
          if (typeof parsedJson[key] === "object" && parsedJson[key] !== null) {
            Object.keys(parsedJson[key]).forEach((subKey) => {
              const fieldLabel = fieldNameMapping[`${key}.${subKey}`] || `${fieldNameMapping[key] || key}.${fieldNameMapping[subKey] || subKey}`;
              fields.push(
                <div key={`${key}.${subKey}`} className="mb-4">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{fieldLabel}</label>
                  <input
                    type="text"
                    value={parsedJson[key][subKey] || ""}
                    onChange={(e) => handleFormFieldChange(subKey, e.target.value, key)}
                    className={`border p-2 w-full text-xs rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      key === "RefDtls" && subKey === "InvRm" &&
                      (parsedJson[key][subKey]?.length < 3 || parsedJson[key][subKey]?.length > 100)
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {key === "RefDtls" && subKey === "InvRm" &&
                    (parsedJson[key][subKey]?.length < 3 || parsedJson[key][subKey]?.length > 100) && (
                      <p className="text-red-500 text-xs mt-1">Invoice remarks must be 3–100 characters</p>
                    )}
                </div>
              );
            });
          } else {
            const fieldLabel = fieldNameMapping[key] || key;
            fields.push(
              <div key={key} className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1">{fieldLabel}</label>
                <input
                  type="text"
                  value={parsedJson[key] || ""}
                  onChange={(e) => handleFormFieldChange(key, e.target.value)}
                  className="border p-2 w-full text-xs rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                />
              </div>
            );
          }
        });

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields}
          </div>
        );
      } catch {
        return <p className="text-red-500 text-xs">Invalid JSON format</p>;
      }
    }

    function renderProductTable() {
      if (!editableQuotation?.items) return null;
      const marginFactor = 1 + (parseFloat(editableQuotation?.margin) || 0) / 100;

      return (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-700">Product Details</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-2 text-left font-semibold">Sl. No.</th>
                <th className="p-2 text-left font-semibold">Product</th>
                <th className="p-2 text-left font-semibold">HSN</th>
                <th className="p-2 text-left font-semibold">Quantity</th>
                <th className="p-2 text-left font-semibold">Rate</th>
                <th className="p-2 text-left font-semibold">Amount</th>
                <th className="p-2 text-left font-semibold">GST (%)</th>
                <th className="p-2 text-left font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {editableQuotation.items.map((item, index) => {
                const baseRate = parseFloat(item.rate) || 0;
                const effRate = baseRate * marginFactor;
                const amount = (effRate * (parseFloat(item.quantity) || 1)).toFixed(2);
                const gstRate =
                  parseFloat(item.productGST) || parseFloat(editableQuotation.gst) || 18;
                const total = (
                  parseFloat(amount) +
                  parseFloat(amount) * (gstRate / 100)
                ).toFixed(2);

                return (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2">{item.slNo || index + 1}</td>
                    <td className="p-2">{item.product}</td>
                    <td className="p-2">{item.hsnCode || item.productId?.hsnCode || ""}</td>
                    <td className="p-2">{item.quantity}</td>
                    <td className="p-2">{item.rate}</td>
                    <td className="p-2">{amount}</td>
                    <td className="p-2">{gstRate}</td>
                    <td className="p-2">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    async function handleGenerateIRN() {
      try {
        if (editableQuotation.operations) {
          for (const op of editableQuotation.operations) {
            if (op.remarks && (op.remarks.length < 3 || op.remarks.length > 100)) {
              throw new Error("Operation remarks must be 3–100 characters");
            }
          }
        }
        if (!referenceJson) {
          throw new Error("Reference JSON is missing");
        }
        const parsedJson = JSON.parse(referenceJson);
        if (!parsedJson.RefDtls) {
          parsedJson.RefDtls = {};
        }
        if (!parsedJson.RefDtls.InvRm) {
          parsedJson.RefDtls.InvRm = "Standard quotation remarks";
          setReferenceJson(JSON.stringify(parsedJson, null, 2));
          await handleSaveReferenceJson();
        } else if (
          parsedJson.RefDtls.InvRm.length < 3 ||
          parsedJson.RefDtls.InvRm.length > 100
        ) {
          throw new Error("Invoice remarks must be 3–100 characters");
        }
        const res = await axios.post(
          `${BACKEND_URL}/api/admin/quotations/${id}/einvoice/generate`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEInvoiceData(res.data.eInvoice);
        setErrorMessage("");
        alert("IRN generated: " + res.data.irn);
      } catch (err) {
        let detail = err.response?.data?.status_desc || err.response?.data?.message || err.message;
        if (typeof detail === "string" && detail.trim().startsWith("[")) {
          try {
            const list = JSON.parse(detail);
            detail = list.map((e) => e.ErrorMessage).join("\n");
          } catch {
            // Keep detail as is
          }
        }
        setErrorMessage("Failed to generate IRN: " + detail);
      }
    }

    async function handleCancelEInvoice() {
      try {
        const res = await axios.put(
          `${BACKEND_URL}/api/admin/quotations/${id}/einvoice/cancel`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEInvoiceData(res.data.eInvoice);
        setErrorMessage("");
        alert("E-Invoice cancelled");
      } catch (err) {
        setErrorMessage(
          "Failed to cancel e-invoice: " +
            (err.response?.data?.message || err.message)
        );
      }
    }

    async function handleSaveQuotation() {
      if (!editableQuotation) return;

      try {
        const updatedMargin = parseFloat(editableQuotation.margin) || 0;
        const {
          opportunityNumber,
          catalogName,
          salutation,
          customerName,
          customerEmail,
          customerCompany,
          customerAddress,
          gst,
          items,
          terms,
          fieldsToDisplay,
          displayTotals,
          displayHSNCodes,
          operations,
          priceRange,
        } = editableQuotation;

        const updatedItems = items.map((item) => {
          const baseRate = parseFloat(item.rate) || 0;
          const quantity = parseFloat(item.quantity) || 1;
          const marginFactor = 1 + updatedMargin / 100;
          const effRate = baseRate * marginFactor;
          const amount = effRate * quantity;
          const gstRate =
            item.productGST != null ? parseFloat(item.productGST) : parseFloat(gst) || 18;
          const gstAmount = parseFloat((amount * (gstRate / 100)).toFixed(2));
          const total = parseFloat((amount + gstAmount).toFixed(2));

          return {
            ...item,
            rate: baseRate,
            amount,
            total,
            productprice: baseRate,
            productGST: gstRate,
            quantity,
            productId: item.productId?._id || item.productId || null,
            hsnCode: item.hsnCode || item.productId?.hsnCode || "",
          };
        });

        const body = {
          opportunityNumber,
          catalogName,
          salutation,
          customerName,
          customerEmail,
          customerCompany,
          customerAddress,
          margin: updatedMargin,
          gst,
          items: updatedItems,
          terms,
          fieldsToDisplay,
          displayTotals,
          displayHSNCodes,
          operations,
          priceRange,
        };

        const updateRes = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (!updateRes.ok) {
          const errorData = await updateRes.json();
          throw new Error(errorData.message || "Failed to update quotation");
        }

        const data = await updateRes.json();
        if (!data || !data.quotation || !data.quotation._id) {
          throw new Error("Invalid response from server: Missing quotation data");
        }

        alert("Quotation updated successfully!");
        setQuotation(data.quotation);
        setEditableQuotation(data.quotation);
      } catch (error) {
        console.error("Save error:", error);
        alert(`Failed to save quotation: ${error.message}`);
      }
    }

    async function handleToggleHSNCodes() {
      try {
        const newDisplayHSNCodes = !editableQuotation.displayHSNCodes;
        const res = await axios.put(
          `${BACKEND_URL}/api/admin/quotations/${id}`,
          { displayHSNCodes: newDisplayHSNCodes },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEditableQuotation((prev) => ({
          ...prev,
          displayHSNCodes: newDisplayHSNCodes,
        }));
        setQuotation((prev) => ({
          ...prev,
          displayHSNCodes: newDisplayHSNCodes,
        }));
        alert(`HSN Codes display ${newDisplayHSNCodes ? "enabled" : "disabled"} in database`);
      } catch (error) {
        console.error("Error toggling HSN codes:", error);
        alert("Failed to toggle HSN codes in database");
      }
    }

    function handleHeaderBlur(field, e) {
      setEditableQuotation((prev) => ({
        ...prev,
        [field]: e.target.innerText,
      }));
    }

    function updateItemField(index, field, newValue) {
      setEditableQuotation((prev) => {
        const newItems = [...prev.items];
        if (field === "quantity" || field === "productGST" || field === "rate") {
          const parsedValue = parseFloat(newValue);
          newItems[index] = {
            ...newItems[index],
            [field]: isNaN(parsedValue) ? (field === "productGST" ? 18 : 1) : parsedValue,
          };
        } else {
          newItems[index] = { ...newItems[index], [field]: newValue };
        }
        return { ...prev, items: newItems };
      });
    }

    function removeItem(index) {
      setEditableQuotation((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index).map((item, idx) => ({
          ...item,
          slNo: idx + 1,
        })),
      }));
    }

    function handleAddEmail() {
      const email = window.prompt("Enter customer email:");
      if (email) {
        setEditableQuotation((prev) => ({
          ...prev,
          customerEmail: email,
        }));
      }
    }

    function handleAddTerm() {
      if (newTerm.heading && newTerm.content) {
        setEditableQuotation((prev) => ({
          ...prev,
          terms: [...prev.terms, newTerm],
        }));
        setNewTerm({ heading: "", content: "" });
        setTermModalOpen(false);
      }
    }

    function handleEditTerm(idx) {
      const term = editableQuotation.terms[idx];
      setNewTerm({ heading: term.heading, content: term.content });
      setEditingTermIdx(idx);
      setTermModalOpen(true);
    }

    function handleUpdateTerm() {
      const updatedTerms = [...editableQuotation.terms];
      updatedTerms[editingTermIdx] = { heading: newTerm.heading, content: newTerm.content };
      setEditableQuotation((prev) => ({
        ...prev,
        terms: updatedTerms,
      }));
      setTermModalOpen(false);
      setEditingTermIdx(null);
    }

    async function handleAddOperation() {
      try {
        if (newOperation.remarks && (newOperation.remarks.length < 3 || newOperation.remarks.length > 100)) {
          throw new Error("Remarks must be 3–100 characters");
        }
        const body = { ...newOperation };
        const res = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}/operations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to add operation cost");
        const data = await res.json();
        setEditableQuotation(data.quotation);
        setQuotation(data.quotation);
        setNewOperation({
          ourCost: "",
          branding: "",
          delivery: "",
          markup: "",
          total: "",
          vendor: "",
          remarks: "",
          reference: "",
        });
        setShowVendorDropdown(false);
        setOperationModalOpen(false);
      } catch (error) {
        console.error("Error adding operation:", error);
        alert(`Failed to add operation cost: ${error.message}`);
      }
    }

    async function handleUpdateOperation() {
      try {
        if (newOperation.remarks && (newOperation.remarks.length < 3 || newOperation.remarks.length > 100)) {
          throw new Error("Remarks must be 3–100 characters");
        }
        const body = { ...newOperation };
        const res = await fetch(
          `${BACKEND_URL}/api/admin/quotations/${id}/operations/${editingOperationId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) throw new Error("Failed to update operation cost");
        const data = await res.json();
        setEditableQuotation(data.quotation);
        setQuotation(data.quotation);
        setNewOperation({
          ourCost: "",
          branding: "",
          delivery: "",
          markup: "",
          total: "",
          vendor: "",
          remarks: "",
          reference: "",
        });
        setShowVendorDropdown(false);
        setOperationModalOpen(false);
        setEditingOperationId(null);
      } catch (error) {
        console.error("Error updating operation:", error);
        alert(`Failed to update operation cost: ${error.message}`);
      }
    }

    function handleViewOperation(op) {
      const operationData = {
        ourCost: String(op?.ourCost ?? ""),
        branding: String(op?.branding ?? ""),
        delivery: String(op?.delivery ?? ""),
        markup: String(op?.markup ?? ""),
        total: String(op?.total ?? ""),
        vendor: String(op?.vendor ?? ""),
        remarks: String(op?.remarks ?? ""),
        reference: String(op?.reference ?? ""),
      };
      setNewOperation(operationData);
      setEditingOperationId(op?._id?.toString() || null);
      setOperationModalOpen(true);
    }

    const handleExportPDF = () => {
      navigate(`/admin-dashboard/print-quotation/${id}`);
    };

    const marginFactor = 1 + (parseFloat(editableQuotation?.margin) || 0) / 100;

    if (loading) return <div className="p-6 text-gray-400">Loading quotation...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;
    if (!editableQuotation || !editableQuotation.items)
      return <div className="p-6 text-gray-400">Quotation not found.</div>;

    return (
      <div className="p-6 bg-white text-black min-h-screen" id="quotation-content">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={handleExportPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs"
          >
            Export to PDF
          </button>
          <div className="flex space-x-4">
            {!eInvoiceData?.irn || eInvoiceData?.cancelled ? (
              <button
                onClick={() => setEInvoiceModalOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded text-xs"
              >
                Generate E-Invoice
              </button>
            ) : null}
            <button
              onClick={async () => {
                try {
                  const res = await axios.post(
                    `${BACKEND_URL}/api/admin/dc/${id}`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  alert("Delivery Challan created successfully!");
                  navigate(`/admin-delivery-challan/${res.data.deliveryChallan._id}`);
                } catch (error) {
                  console.error("Error generating delivery challan:", error);
                  alert("Failed to generate delivery challan.");
                }
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-xs"
            >
              Generate Delivery Challan
            </button>
            <button
              onClick={handleSaveQuotation}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs"
            >
              Save Changes
            </button>
            <button
              onClick={() =>
                setEditableQuotation((prev) => ({
                  ...prev,
                  displayTotals: !prev.displayTotals,
                }))
              }
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs"
            >
              {editableQuotation.displayTotals ? "Hide Totals" : "Show Totals"}
            </button>
            <button
              onClick={handleToggleHSNCodes}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-xs"
            >
              {editableQuotation.displayHSNCodes ? "Disable HSN Codes in DB" : "Enable HSN Codes in DB"}
            </button>
            <button
              onClick={() => setOperationModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-xs"
            >
              {editableQuotation.operations?.length > 0
                ? "View Operations Cost"
                : "Add Operations Cost"}
            </button>
          </div>
        </div>

        <div className="mb-4 space-y-2 text-xs">
          {editableQuotation.customerName && (
            <div>
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleHeaderBlur("salutation", e)}
              >
                {editableQuotation.salutation || "Mr."}
              </span>{" "}
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleHeaderBlur("customerName", e)}
              >
                {editableQuotation.customerName}
              </span>
            </div>
          )}
          <div>
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleHeaderBlur("customerCompany", e)}
            >
              {editableQuotation.customerCompany}
            </span>
          </div>
          {editableQuotation.customerAddress && (
            <div>
              <span className="font-bold uppercase">Address:</span>{" "}
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleHeaderBlur("customerAddress", e)}
              >
                {editableQuotation.customerAddress}
              </span>
            </div>
          )}
          {editableQuotation.customerEmail && (
            <div>
              <span className="font-bold uppercase">Email:</span>{" "}
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleHeaderBlur("customerEmail", e)}
              >
                {editableQuotation.customerEmail}
              </span>
            </div>
          )}
          <button
            onClick={handleAddEmail}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs"
          >
            {editableQuotation.customerEmail ? "Edit Email" : "Add Email"}
          </button>
        </div>

        <div className="mb-6">
          <button
            onClick={() => setTermModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mb-4 text-xs"
          >
            + Add Terms
          </button>
          {editableQuotation.terms.map((term, idx) => (
            <div key={idx} className="mb-4 text-xs">
              <div className="font-semibold">{term.heading}</div>
              <div className="whitespace-pre-line">{term.content}</div>
              <button
                onClick={() => handleEditTerm(idx)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded mt-2 text-xs"
              >
                Edit
              </button>
            </div>
          ))}
        </div>

        {termModalOpen && (
          <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50">
            <div className="bg-white p-6 rounded w-1/3">
              <h2 className="text-xl font-semibold mb-4">
                {editingTermIdx !== null ? "Edit Term" : "Add Term"}
              </h2>
              <div className="mb-4">
                <input
                  type="text"
                  value={newTerm.heading}
                  placeholder="Term Heading"
                  onChange={(e) =>
                    setNewTerm((prev) => ({ ...prev, heading: e.target.value }))
                  }
                  className="border p-2 w-full text-xs"
                  readOnly={editingTermIdx !== null}
                />
              </div>
              <div className="mb-4">
                <textarea
                  value={newTerm.content}
                  placeholder="Term Content"
                  onChange={(e) =>
                    setNewTerm((prev) => ({ ...prev, content: e.target.value }))
                  }
                  className="border p-2 w-full text-xs"
                  rows="4"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setTermModalOpen(false);
                    setNewTerm({ heading: "", content: "" });
                    setEditingTermIdx(null);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTermIdx !== null ? handleUpdateTerm : handleAddTerm}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs"
                >
                  {editingTermIdx !== null ? "Update Term" : "Add Term"}
                </button>
              </div>
            </div>
          </div>
        )}

        {operationModalOpen && (
          <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50">
            <div className="bg-white p-6 rounded w-1/2">
              <h2 className="text-xl font-semibold mb-4">
                {editingOperationId ? "View/Edit Operation Cost" : "Add Operation Cost"}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className="block text-xs">Our Cost</label>
                  <input
                    type="text"
                    value={newOperation.ourCost || ""}
                    onChange={(e) =>
                      setNewOperation((prev) => ({ ...prev, ourCost: e.target.value }))
                    }
                    className="border p-2 w-full text-xs"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-xs">Branding</label>
                  <input
                    type="text"
                    value={newOperation.branding || ""}
                    onChange={(e) =>
                      setNewOperation((prev) => ({ ...prev, branding: e.target.value }))
                    }
                    className="border p-2 w-full text-xs"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-xs">Delivery</label>
                  <input
                    type="text"
                    value={newOperation.delivery || ""}
                    onChange={(e) =>
                      setNewOperation((prev) => ({ ...prev, delivery: e.target.value }))
                    }
                    className="border p-2 w-full text-xs"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-xs">Markup</label>
                  <input
                    type="text"
                    value={newOperation.markup || ""}
                    onChange={(e) =>
                      setNewOperation((prev) => ({ ...prev, markup: e.target.value }))
                    }
                    className="border p-2 w-full text-xs"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-xs">Total</label>
                  <input
                    type="text"
                    value={newOperation.total || ""}
                    readOnly
                    className="border p-2 w-full text-xs bg-gray-100"
                  />
                </div>
                <div className="mb-4 relative">
                  <label className="block text-xs">Vendor</label>
                  <input
                    type="text"
                    value={newOperation.vendor || ""}
                    onChange={(e) => handleVendorInputChange(e.target.value)}
                    onFocus={() => handleVendorInputChange(newOperation.vendor)}
                    className="border p-2 w-full text-xs"
                  />
                  {showVendorDropdown && (
                    <ul className="absolute z-10 bg-white border rounded w-full max-h-40 overflow-y-auto text-xs">
                      {vendorSuggestions.map((vendor) => (
                        <li
                          key={vendor._id}
                          onClick={() => handleVendorSelect(vendor)}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                        >
                          {vendor.vendorName} ({vendor.vendorCompany})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-xs">Remarks</label>
                  <textarea
                    value={newOperation.remarks || ""}
                    onChange={(e) =>
                      setNewOperation((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    className={`border p-2 w-full text-xs ${
                      newOperation.remarks && (newOperation.remarks.length < 3 || newOperation.remarks.length > 100)
                        ? "border-red-500"
                        : ""
                    }`}
                    rows="3"
                  />
                  {newOperation.remarks && (newOperation.remarks.length < 3 || newOperation.remarks.length > 100) && (
                    <p className="text-red-500 text-xs mt-1">Remarks must be 3–100 characters</p>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-xs">Reference</label>
                  <input
                    type="text"
                    value={newOperation.reference || ""}
                    onChange={(e) =>
                      setNewOperation((prev) => ({ ...prev, reference: e.target.value }))
                    }
                    className="border p-2 w-full text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setOperationModalOpen(false);
                    setEditingOperationId(null);
                    setNewOperation({
                      ourCost: "",
                      branding: "",
                      delivery: "",
                      markup: "",
                      total: "",
                      vendor: "",
                      remarks: "",
                      reference: "",
                    });
                    setShowVendorDropdown(false);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded text-xs"
                >
                  Cancel
                </button>
                {editingOperationId ? (
                  <button
                    onClick={handleUpdateOperation}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs"
                  >
                    Update Operation
                  </button>
                ) : (
                  <button
                    onClick={handleAddOperation}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs"
                  >
                    Add Operation
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {eInvoiceModalOpen && (
          <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50 z-50">
            <div className="bg-white p-8 rounded-lg w-3/4 max-h-[80vh] overflow-y-auto shadow-xl">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">Generate E-Invoice</h2>
              {errorMessage && (
                <div className="text-red-500 mb-4 text-xs bg-red-100 p-2 rounded">{errorMessage}</div>
              )}

              <div className="mb-6">
                <button
                  onClick={handleAuthenticate}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs"
                  disabled={isAuthenticated}
                >
                  {isAuthenticated ? "Authenticated" : "Generate Token"}
                </button>
                {isAuthenticated && (
                  <div className="mt-2 text-xs text-gray-600">
                    <p>Auth Token: {eInvoiceData?.authToken}</p>
                    <p>Token Expiry: {new Date(eInvoiceData?.tokenExpiry).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {isAuthenticated && (
                <div className="mb-6">
                  <button
                    onClick={handleFetchCustomerDetails}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs"
                    disabled={customerDetails}
                  >
                    {customerDetails ? "Customer Details Fetched" : "Get Customer Details"}
                  </button>
                  {customerDetails && (
                    <div className="mt-2 text-xs text-gray-600">
                      <p><span className="font-semibold">GSTIN:</span> {customerDetails.gstin}</p>
                      <p><span className="font-semibold">Legal Name:</span> {customerDetails.legalName}</p>
                      <p><span className="font-semibold">Trade Name:</span> {customerDetails.tradeName}</p>
                      <p><span className="font-semibold">Address:</span> {customerDetails.address1}
                        {customerDetails.address2 ? `, ${customerDetails.address2}` : ""}</p>
                      <p><span className="font-semibold">Location:</span> {customerDetails.location}</p>
                      <p><span className="font-semibold">Pincode:</span> {customerDetails.pincode}</p>
                      <p><span className="font-semibold">State Code:</span> {customerDetails.stateCode}</p>
                      <p><span className="font-semibold">Phone:</span> {customerDetails.phone}</p>
                      <p><span className="font-semibold">Email:</span> {customerDetails.email}</p>
                    </div>
                  )}
                </div>
              )}

              {customerDetails && (
                <div className="mb-6">
                  {renderProductTable()}
                  <div className="flex space-x-2 mb-4">
                    <button
                      onClick={handleGenerateReferenceJson}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-xs"
                      disabled={referenceJson && eInvoiceData?.referenceJson}
                    >
                      {referenceJson && eInvoiceData?.referenceJson
                        ? "Reference JSON Generated"
                        : "Generate Reference JSON"}
                    </button>
                    {referenceJson && eInvoiceData?.referenceJson && (
                      <button
                        onClick={handleGenerateReferenceJson}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-xs"
                      >
                        Regenerate
                      </button>
                    )}
                    <button
                      onClick={() => setJsonView(jsonView === "json" ? "form" : "json")}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-xs"
                    >
                      {jsonView === "json" ? "Show Form View" : "Show JSON View"}
                    </button>
                  </div>
                  {referenceJson && (
                    <div className="mt-2">
                      {jsonView === "json" ? (
                        <>
                          <textarea
                            value={referenceJson}
                            onChange={(e) => setReferenceJson(e.target.value)}
                            className={`border p-2 w-full text-xs font-mono h-64 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              referenceJson &&
                              (() => {
                                try {
                                  const parsed = JSON.parse(referenceJson);
                                  return parsed.RefDtls?.InvRm &&
                                    (parsed.RefDtls.InvRm.length < 3 || parsed.RefDtls.InvRm.length > 100)
                                    ? "border-red-500"
                                    : "border-gray-300"
                                } catch {
                                  return "border-red-500";
                                }
                              })()
                            }`}
                          />
                          {referenceJson && (
                            (() => {
                              try {
                                const parsed = JSON.parse(referenceJson);
                                if (
                                  parsed.RefDtls?.InvRm &&
                                  (parsed.RefDtls.InvRm.length < 3 || parsed.RefDtls.InvRm.length > 100)
                                ) {
                                  return (
                                    <p className="text-red-500 text-xs mt-1">
                                      Invoice remarks must be 3–100 characters
                                    </p>
                                  );
                                }
                              } catch {
                                return <p className="text-red-500 text-xs mt-1">Invalid JSON format</p>;
                              }
                              return null;
                            })()
                          )}
                        </>
                      ) : (
                        renderJsonForm()
                      )}
                      <button
                        onClick={handleSaveReferenceJson}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs mt-4"
                      >
                        Save Reference JSON
                      </button>
                    </div>
                  )}
                </div>
              )}

              {referenceJson && eInvoiceData?.referenceJson && (
                <div className="mb-6">
                  <button
                    onClick={handleGenerateIRN}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-xs"
                    disabled={eInvoiceData?.irn}
                  >
                    {eInvoiceData?.irn ? "IRN Generated" : "Create E-Invoice (Generate IRN)"}
                  </button>
                  {eInvoiceData?.irn && (
                    <div className="mt-2 text-xs text-gray-600">
                      <p><span className="font-semibold">IRN:</span> {eInvoiceData.irn}</p>
                      <p><span className="font-semibold">Ack No:</span> {eInvoiceData.ackNo}</p>
                      <p><span className="font-semibold">Ack Date:</span> {new Date(eInvoiceData.ackDt).toLocaleString()}</p>
                      <p><span className="font-semibold">Status:</span> {eInvoiceData.status}</p>
                      {eInvoiceData.ewbNo && <p><span className="font-semibold">EWB No:</span> {eInvoiceData.ewbNo}</p>}
                      {eInvoiceData.ewbDt && (
                        <p><span className="font-semibold">EWB Date:</span> {new Date(eInvoiceData.ewbDt).toLocaleString()}</p>
                      )}
                      {eInvoiceData.ewbValidTill && (
                        <p><span className="font-semibold">EWB Valid Till:</span> {new Date(eInvoiceData.ewbValidTill).toLocaleString()}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {eInvoiceData?.irn && (
                <div className="mb-6">
                  <button
                    onClick={handleCancelEInvoice}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs"
                    disabled={eInvoiceData?.cancelled}
                  >
                    {eInvoiceData?.cancelled ? "E-Invoice Cancelled" : "Cancel E-Invoice"}
                  </button>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setEInvoiceModalOpen(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {editableQuotation.operations?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-xs">Operations Costs</h3>
            <table className="w-full border-collapse mb-6 text-xs">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Our Cost</th>
                  <th className="p-2 text-left">Branding</th>
                  <th className="p-2 text-left">Delivery</th>
                  <th className="p-2 text-left">Markup</th>
                  <th className="p-2 text-left">Total</th>
                  <th className="p-2 text-left">Vendor</th>
                  <th className="p-2 text-left">Remarks</th>
                  <th className="p-2 text-left">Reference</th>
                  <th className="p-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {editableQuotation.operations.map((op, idx) => (
                  <tr key={op._id || idx} className="border-b">
                    <td className="p-2">{op.ourCost || "0"}</td>
                    <td className="p-2">{op.branding || "0"}</td>
                    <td className="p-2">{op.delivery || "0"}</td>
                    <td className="p-2">{op.markup || "0"}</td>
                    <td className="p-2">{op.total || "0"}</td>
                    <td className="p-2">{op.vendor || ""}</td>
                    <td className="p-2">{op.remarks || ""}</td>
                    <td className="p-2">{op.reference || ""}</td>
                    <td className="p-2">
                      <button
                        onClick={() => handleViewOperation(op)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <table className="w-full border-collapse mb-6 text-xs">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Sl. No.</th>
              <th className="p-2 text-left">Image</th>
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-left">HSN</th>
              <th className="p-2 text-left">Quantity</th>
              <th className="p-2 text-left">Rate</th>
              {editableQuotation.displayTotals && (
                <>
                  <th className="p-2 text-left">Amount</th>
                  <th className="p-2 text-left">GST (%)</th>
                  <th className="p-2 text-left">Total</th>
                </>
              )}
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {editableQuotation.items.map((item, index) => {
              const baseRate = parseFloat(item.rate) || 0;
              const effRate = baseRate * marginFactor;
              const amount = (effRate * (parseFloat(item.quantity) || 1)).toFixed(2);
              const gstRate =
                parseFloat(item.productGST) || parseFloat(editableQuotation.gst) || 18;
              const total = (
                parseFloat(amount) +
                parseFloat(amount) * (gstRate / 100)
              ).toFixed(2);

              return (
                <tr key={index} className="border-b">
                  <td className="p-2">{item.slNo || index + 1}</td>
                  <td className="p-2">
                    {item.productId?.images?.[item.imageIndex || 0] ? (
                      <img
                        src={item.productId.images[item.imageIndex || 0]}
                        alt="Product"
                        className="w-16 h-16 object-cover"
                      />
                    ) : (
                      "No Image"
                    )}
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.product}
                      onChange={(e) => updateItemField(index, "product", e.target.value)}
                      className="border p-1 w-full text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.hsnCode || item.productId?.hsnCode || ""}
                      onChange={(e) => updateItemField(index, "hsnCode", e.target.value)}
                      className="border p-1 w-full text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItemField(index, "quantity", e.target.value)}
                      className="border p-1 w-16 text-xs"
                      min="1"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateItemField(index, "rate", e.target.value)}
                      className="border p-1 w-20 text-xs"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  {editableQuotation.displayTotals && (
                    <>
                      <td className="p-2">{amount}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.productGST}
                          onChange={(e) =>
                            updateItemField(index, "productGST", e.target.value)
                          }
                          className="border p-1 w-16 text-xs"
                          min="0"
                          step="0.1"
                        />
                      </td>
                      <td className="p-2">{total}</td>
                    </>
                  )}
                  <td className="p-2">
                    <button
                      onClick={() => removeItem(index)}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {editableQuotation.displayTotals && (
          <div className="text-right text-xs">
            <p>
              Total Amount:{" "}
              {editableQuotation.items
                .reduce((sum, item) => {
                  const baseRate = parseFloat(item.rate) || 0;
                  const effRate = baseRate * marginFactor;
                  return sum + effRate * (parseFloat(item.quantity) || 1);
                }, 0)
                .toFixed(2)}
            </p>
            <p>
              Grand Total:{" "}
              {editableQuotation.items
                .reduce((sum, item) => {
                  const baseRate = parseFloat(item.rate) || 0;
                  const effRate = baseRate * marginFactor;
                  const amount = effRate * (parseFloat(item.quantity) || 1);
                  const gstRate =
                    parseFloat(item.productGST) || parseFloat(editableQuotation.gst) || 18;
                  return sum + (amount + amount * (gstRate / 100));
                }, 0)
                .toFixed(2)}
            </p>
          </div>
        )}
      </div>
    );
  }