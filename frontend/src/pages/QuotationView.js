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
  const [eInvoiceModalOpen, setEInvoiceModalOpen] = useState(false);
  const [eInvoiceData, setEInvoiceData] = useState(null);
  const [referenceJson, setReferenceJson] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [jsonView, setJsonView] = useState("json");
  const token = localStorage.getItem("token");
  // NEW: Operations Breakdown table state
  const [opRows, setOpRows] = useState([]);

  const fieldNameMapping = {
    txn: "Transaction",
    DocDtls: "Document Details",
    Dt: "Date",
    No: "Document Number",
    Typ: "Document Type",
    RefDtls: "Reference Details",
    InvRm: "Invoice Remarks",
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
    async function checkEInvoice() {
      try {
        const res = await axios.get(
          `${BACKEND_URL}/api/admin/quotations/${id}/einvoice/customer`,
          { headers: { Authorization: `Bearer ${token}` } }
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
      console.error("Error fetching products:", error.response?.data || error.message);
    }
  }

  async function fetchQuotation() {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch quotation");
      const data = await res.json();

      const sanitizedItems = (data.items || []).map((item, idx) => ({
        ...item,
        quantity: parseFloat(item.quantity) || 1,
        slNo: item.slNo || idx + 1,
        productGST: item.productGST != null ? parseFloat(item.productGST) : 0,
        rate: parseFloat(item.rate) || 0,
        product: item.product || "Unknown Product",
        hsnCode: item.hsnCode || item.productId?.hsnCode || "",
      }));

      // init operationsBreakdown table
      const initialOps = (data.operationsBreakdown || []).map((r, idx) => ({
        slNo: r.slNo || idx + 1,
        product: r.product || "",
        quantity: Number(r.quantity) || 0,
        rate: Number(r.rate) || 0,
        amount: Number(r.amount) || 0,
        gst: r.gst || "",
        total: Number(r.total) || 0,
        ourCost: Number(r.ourCost) || 0,
        brandingCost: Number(r.brandingCost) || 0,
        deliveryCost: Number(r.deliveryCost) || 0,
        markUpCost: Number(r.markUpCost) || 0,
        finalTotal: Number(r.finalTotal) || 0,
        vendor: r.vendor || "",
      }));

      setQuotation({ ...data, items: sanitizedItems });
      setEditableQuotation({ ...data, items: sanitizedItems });
      setOpRows(initialOps);
      setError(null);
    } catch (err) {
      console.error("Error fetching quotation:", err);
      setError("Failed to load quotation");
    } finally {
      setLoading(false);
    }
  }

  // --- Ops table helpers (calculations) ---
  const num = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };
  const parseGstPercent = (raw) => {
    if (!raw) return 0;
    const s = String(raw).trim();
    const n = parseFloat(s.replace("%", ""));
    return isNaN(n) ? 0 : n;
  };
  const recalcRow = (row) => {
    const h = num(row.ourCost);
    const i = num(row.brandingCost);
    const j = num(row.deliveryCost);
    const k = num(row.markUpCost);
    const c = num(row.quantity);
    const l = h + i + j + k;                // finalTotal
    const d = l;                            // rate
    const e = c * d;                        // amount
    const fPct = parseGstPercent(row.gst);  // GST %
    const g = e * (1 + fPct / 100);         // total including GST
    return { ...row, finalTotal: l, rate: d, amount: e, total: g };
  };
  const addOpRow = () => {
    const nextSl = (opRows[opRows.length - 1]?.slNo || 0) + 1;
    setOpRows((prev) => [
      ...prev,
      recalcRow({
        slNo: nextSl,
        product: "",
        quantity: 0,
        rate: 0,
        amount: 0,
        gst: "",
        total: 0,
        ourCost: 0,
        brandingCost: 0,
        deliveryCost: 0,
        markUpCost: 0,
        finalTotal: 0,
        vendor: "",
      }),
    ]);
  };
  const updateOpRow = (idx, field, value) => {
    setOpRows((prev) => {
      const copy = [...prev];
      copy[idx] = recalcRow({
        ...copy[idx],
        [field]:
          field === "product" || field === "gst" || field === "vendor"
            ? value
            : num(value),
      });
      return copy;
    });
  };
  const removeOpRow = (idx) => {
    setOpRows((prev) =>
      prev.filter((_, i) => i !== idx).map((r, i2) => ({ ...r, slNo: i2 + 1 }))
    );
  };

  // NEW: Save ONLY operationsBreakdown to current quotation (no new quotation)
  async function handleSaveOperationsBreakdownOnly() {
    try {
      const payload = {
        operationsBreakdown: opRows.map((r) => ({
          slNo: r.slNo,
          product: r.product,
          quantity: num(r.quantity),
          rate: num(r.rate),
          amount: num(r.amount),
          gst: r.gst,
          total: num(r.total),
          ourCost: num(r.ourCost),
          brandingCost: num(r.brandingCost),
          deliveryCost: num(r.deliveryCost),
          markUpCost: num(r.markUpCost),
          finalTotal: num(r.finalTotal),
          vendor: r.vendor,
        })),
      };

      const res = await axios.put(`${BACKEND_URL}/api/admin/quotations/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // refresh local state from server response if available
      if (res?.data?.quotation) {
        setEditableQuotation(res.data.quotation);
        setQuotation(res.data.quotation);

        const fresh = (res.data.quotation.operationsBreakdown || []).map((r, idx) =>
          recalcRow({
            slNo: r.slNo || idx + 1,
            product: r.product || "",
            quantity: Number(r.quantity) || 0,
            rate: Number(r.rate) || 0,
            amount: Number(r.amount) || 0,
            gst: r.gst || "",
            total: Number(r.total) || 0,
            ourCost: Number(r.ourCost) || 0,
            brandingCost: Number(r.brandingCost) || 0,
            deliveryCost: Number(r.deliveryCost) || 0,
            markUpCost: Number(r.markUpCost) || 0,
            finalTotal: Number(r.finalTotal) || 0,
            vendor: r.vendor || "",
          })
        );
        setOpRows(fresh);
      }

      alert("Operations breakdown saved to this quotation (no new quotation created).");
    } catch (err) {
      console.error("Save operations breakdown only error:", err);
      alert(
        "Failed to save operations breakdown on this quotation: " +
        (err.response?.data?.message || err.message)
      );
    }
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
        { headers: { Authorization: `Bearer ${token}` } }
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
            const fieldLabel =
              fieldNameMapping[`${key}.${subKey}`] ||
              `${fieldNameMapping[key] || key}.${fieldNameMapping[subKey] || subKey}`;
            fields.push(
              <div key={`${key}.${subKey}`} className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {fieldLabel}
                </label>
                <input
                  type="text"
                  value={parsedJson[key][subKey] || ""}
                  onChange={(e) => handleFormFieldChange(subKey, e.target.value, key)}
                  className={`border p-2 w-full text-xs rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${key === "RefDtls" &&
                      subKey === "InvRm" &&
                      (parsedJson[key][subKey]?.length < 3 ||
                        parsedJson[key][subKey]?.length > 100)
                      ? "border-red-500"
                      : "border-gray-300"
                    }`}
                />
                {key === "RefDtls" &&
                  subKey === "InvRm" &&
                  (parsedJson[key][subKey]?.length < 3 ||
                    parsedJson[key][subKey]?.length > 100) && (
                    <p className="text-red-500 text-xs mt-1">
                      Invoice remarks must be 3–100 characters
                    </p>
                  )}
              </div>
            );
          });
        } else {
          const fieldLabel = fieldNameMapping[key] || key;
          fields.push(
            <div key={key} className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {fieldLabel}
              </label>
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
        制限
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
                item.productGST != null
                  ? parseFloat(item.productGST)
                  : editableQuotation.gst
                    ? parseFloat(editableQuotation.gst)
                    : 0;
              const total = (
                parseFloat(amount) +
                (gstRate > 0 ? parseFloat(amount) * (gstRate / 100) : 0)
              ).toFixed(2);

              return (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2">{item.slNo || index + 1}</td>
                  <td className="p-2">{item.product}</td>
                  <td className="p-2">
                    {item.hsnCode || item.productId?.hsnCode || ""}
                  </td>
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
      if (!parsedJson.RefDtls) parsedJson.RefDtls = {};
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
      let detail =
        err.response?.data?.status_desc ||
        err.response?.data?.message ||
        err.message;
      if (typeof detail === "string" && detail.trim().startsWith("[")) {
        try {
          const list = JSON.parse(detail);
          detail = list.map((e) => e.ErrorMessage).join("\n");
        } catch { }
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
          item.productGST != null
            ? parseFloat(item.productGST)
            : gst
              ? parseFloat(gst)
              : 0;
        const gstAmount =
          gstRate > 0 ? parseFloat((amount * (gstRate / 100)).toFixed(2)) : 0;
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
        operationsBreakdown: opRows.map((r) => ({
          slNo: r.slNo,
          product: r.product,
          quantity: num(r.quantity),
          rate: num(r.rate),
          amount: num(r.amount),
          gst: r.gst,
          total: num(r.total),
          ourCost: num(r.ourCost),
          brandingCost: num(r.brandingCost),
          deliveryCost: num(r.deliveryCost),
          markUpCost: num(r.markUpCost),
          finalTotal: num(r.finalTotal),
          vendor: r.vendor,
        })),
      };

      const createRes = await fetch(`${BACKEND_URL}/api/admin/quotations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(errorData.message || "Failed to create new quotation");
      }

      const data = await createRes.json();
      if (!data || !data.quotation || !data.quotation._id) {
        throw new Error("Invalid response from server: Missing quotation data");
      }

      alert("New quotation created successfully!");
      navigate(`/admin-dashboard/quotations/${data.quotation._id}`);
    } catch (error) {
      console.error("Create error:", error);
      alert(`Failed to create new quotation: ${error.message}`);
    }
  }

  async function handleToggleHSNCodes() {
    try {
      const newDisplayHSNCodes = !editableQuotation.displayHSNCodes;
      await axios.put(
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
      alert(
        `HSN Codes display ${newDisplayHSNCodes ? "enabled" : "disabled"} in database`
      );
    } catch (error) {
      console.error("Error toggling HSN codes:", error);
      alert("Failed to toggle HSN codes in database");
    }
  }

  async function handleCreateInvoice(format) {
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/admin/invoices/from-quotation/${id}`,
        // Pass optional format string; fallback is APP/{FY}/{SEQ4}
        format ? { format } : {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Invoice created: ${res.data.invoice.invoiceDetails.invoiceNumber}`);
      // Navigate to your invoice page (adjust route as per your app)
      navigate(`/admin-dashboard/invoices/${res.data.invoice._id}`);
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert(
        "Failed to create invoice: " + (error.response?.data?.message || error.message)
      );
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
          [field]:
            newValue === "" || isNaN(parsedValue)
              ? field === "quantity"
                ? 1
                : 0
              : parsedValue,
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
      items: prev.items
        .filter((_, i) => i !== index)
        .map((item, idx) => ({ ...item, slNo: idx + 1 })),
    }));
  }

  function handleAddEmail() {
    const email = window.prompt("Enter customer email:");
    if (email) {
      setEditableQuotation((prev) => ({ ...prev, customerEmail: email }));
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
    updatedTerms[editingTermIdx] = {
      heading: newTerm.heading,
      content: newTerm.content,
    };
    setEditableQuotation((prev) => ({ ...prev, terms: updatedTerms }));
    setTermModalOpen(false);
    setEditingTermIdx(null);
  }

  const handleExportPDF = () => {
    navigate(`/admin-dashboard/print-quotation/${id}`);
  };

  // Add the missing handleViewOperation function
  const handleViewOperation = (operation) => {
    console.log("View/Edit operation:", operation);
    alert(`Operation details: ${JSON.stringify(operation, null, 2)}`);
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
          <button
            onClick={() => {
              const defFmt = "APP/{FY}/{SEQ4}";
              const fmt = window.prompt(
                `Enter invoice number format (tokens: {FY}, {SEQn}).\nExample: ${defFmt}`,
                defFmt
              );
              if (fmt === null) return; // user cancelled
              handleCreateInvoice(fmt.trim());
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded text-xs"
          >
            Create Invoice
          </button>

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
            onClick={() => {
              const el = document.getElementById("op-breakdown-panel");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-xs"
          >
            Operations Cost (New)
          </button>
        </div>
      </div>

      <div
        id="op-breakdown-panel"
        className="sticky top-16 z-30 bg-white border border-gray-300 shadow p-3 rounded mb-6"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold">Operations Cost — Detailed Table</div>

          {/* NEW: Save-only button for operationsBreakdown */}
          <button
            onClick={handleSaveOperationsBreakdownOnly}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs"
            title="Save operations breakdown to this quotation without creating a new one"
          >
            Save Operations Breakdown
          </button>
        </div>

        <div className="overflow-auto">
          <table className="table-auto w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">slno</th>
                <th className="border px-2 py-1">product</th>
                <th className="border px-2 py-1">quantity</th>
                <th className="border px-2 py-1">rate</th>
                <th className="border px-2 py-1">amount</th>
                <th className="border px-2 py-1">gst</th>
                <th className="border px-2 py-1">total</th>
                <th className="border px-2 py-1">our cost</th>
                <th className="border px-2 py-1">branding cost</th>
                <th className="border px-2 py-1">delivery cost</th>
                <th className="border px-2 py-1">mark up cost</th>
                <th className="border px-2 py-1">Final Total</th>
                <th className="border px-2 py-1">Vendor</th>
                <th className="border px-2 py-1">Action</th>
              </tr>

            </thead>
            <tbody>
              {opRows.map((r, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{r.slNo}</td>
                  <td className="border px-2 py-1">
                    <input
                      value={r.product}
                      onChange={(e) => updateOpRow(idx, "product", e.target.value)}
                      className="w-40 border px-1 py-0.5 rounded"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="number"
                      value={r.quantity}
                      onChange={(e) => updateOpRow(idx, "quantity", e.target.value)}
                      className="w-24 border px-1 py-0.5 rounded"
                      min="0"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      value={r.rate}
                      disabled
                      className="w-24 border px-1 py-0.5 rounded bg-gray-100 text-gray-600"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      value={r.amount.toFixed(2)}
                      disabled
                      className="w-24 border px-1 py-0.5 rounded bg-gray-100 text-gray-600"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      value={r.gst}
                      onChange={(e) => updateOpRow(idx, "gst", e.target.value)}
                      placeholder="e.g., 18 or 18%"
                      className="w-24 border px-1 py-0.5 rounded"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      value={r.total.toFixed(2)}
                      disabled
                      className="w-24 border px-1 py-0.5 rounded bg-gray-100 text-gray-600"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="number"
                      value={r.ourCost}
                      onChange={(e) => updateOpRow(idx, "ourCost", e.target.value)}
                      className="w-24 border px-1 py-0.5 rounded"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="number"
                      value={r.brandingCost}
                      onChange={(e) => updateOpRow(idx, "brandingCost", e.target.value)}
                      className="w-24 border px-1 py-0.5 rounded"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="number"
                      value={r.deliveryCost}
                      onChange={(e) => updateOpRow(idx, "deliveryCost", e.target.value)}
                      className="w-24 border px-1 py-0.5 rounded"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="number"
                      value={r.markUpCost}
                      onChange={(e) => updateOpRow(idx, "markUpCost", e.target.value)}
                      className="w-24 border px-1 py-0.5 rounded"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      value={r.finalTotal.toFixed(2)}
                      disabled
                      className="w-24 border px-1 py-0.5 rounded bg-gray-100 text-gray-600"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      value={r.vendor}
                      onChange={(e) => updateOpRow(idx, "vendor", e.target.value)}
                      className="w-40 border px-1 py-0.5 rounded"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <button
                      onClick={() => removeOpRow(idx)}
                      className="text-red-600 text-xs hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={14} className="border px-2 py-2 text-right">
                  <button
                    onClick={addOpRow}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                  >
                    + Add Row
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
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

      {eInvoiceModalOpen && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50 z-50">
          <div className="bg-white p-8 rounded-lg w-3/4 max_h-[80vh] overflow-y-auto shadow-xl">
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
                          className={`border p-2 w-full text-xs font-mono h-64 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${referenceJson &&
                            (() => {
                              try {
                                const parsed = JSON.parse(referenceJson);
                                return parsed.RefDtls?.InvRm &&
                                  (parsed.RefDtls.InvRm.length < 3 || parsed.RefDtls.InvRm.length > 100)
                                  ? "border-red-500"
                                  : "border-gray-300";
                              } catch {
                                return "border-red-500";
                              }
                            })()
                            }`}
                        />
                        {referenceJson &&
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
                          })()}
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
              item.productGST != null
                ? parseFloat(item.productGST)
                : editableQuotation.gst
                  ? parseFloat(editableQuotation.gst)
                  : 0;
            const total = (
              parseFloat(amount) +
              (gstRate > 0 ? parseFloat(amount) * (gstRate / 100) : 0)
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
            Grand Total:
            {editableQuotation.items
              .reduce((sum, item) => {
                const baseRate = parseFloat(item.rate) || 0;
                const effRate = baseRate * marginFactor;
                const amount = effRate * (parseFloat(item.quantity) || 1);
                const gstRate =
                  item.productGST != null
                    ? parseFloat(item.productGST)
                    : editableQuotation.gst
                      ? parseFloat(editableQuotation.gst)
                      : 0;
                return sum + (amount + (gstRate > 0 ? amount * (gstRate / 100) : 0));
              }, 0)
              .toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
