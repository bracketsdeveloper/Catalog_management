"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Indian number formatting helper
const formatIndianNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "0.00";
  const number = parseFloat(num);
  const isNegative = number < 0;
  const absoluteNum = Math.abs(number);
  
  const parts = absoluteNum.toFixed(2).split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1];
  
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  
  if (otherNumbers !== "") {
    lastThree = "," + lastThree;
  }
  
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  
  return (isNegative ? "-" : "") + formatted + "." + decimalPart;
};

// Format integer without decimals
const formatIndianInteger = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "0";
  const number = Math.round(parseFloat(num));
  const isNegative = number < 0;
  const absoluteNum = Math.abs(number);
  
  let integerPart = absoluteNum.toString();
  
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  
  if (otherNumbers !== "") {
    lastThree = "," + lastThree;
  }
  
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  
  return (isNegative ? "-" : "") + formatted;
};

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
  const [opRows, setOpRows] = useState([]);
  const [catalogData, setCatalogData] = useState(null);
  const [hasCatalog, setHasCatalog] = useState(false);

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

  async function fetchCatalogByName(catalogName) {
    if (!catalogName) return null;
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/catalogs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const catalogs = res.data || [];
      const matchedCatalog = catalogs.find(
        (c) => c.catalogName?.toLowerCase() === catalogName?.toLowerCase()
      );
      if (matchedCatalog) {
        setCatalogData(matchedCatalog);
        setHasCatalog(true);
        return matchedCatalog;
      }
      return null;
    } catch (error) {
      console.error("Error fetching catalog:", error.response?.data || error.message);
      return null;
    }
  }

  function getCatalogPriceForProduct(productName, catalog) {
    if (!catalog || !catalog.products || !productName) return 0;
    const matchedProduct = catalog.products.find(
      (p) => 
        p.productName?.toLowerCase() === productName?.toLowerCase() ||
        p.productId?.name?.toLowerCase() === productName?.toLowerCase()
    );
    if (matchedProduct) {
      return Number(matchedProduct.productCost) || Number(matchedProduct.baseCost) || 0;
    }
    return 0;
  }

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

  function buildOpRowFromItem(item, idx, catalog = null) {
    const sb = item.suggestedBreakdown || {};
    const quantity = num(item.quantity) || 0;
    
    let catalogPrice = 0;
    
    if (catalog && item.product) {
      catalogPrice = getCatalogPriceForProduct(item.product, catalog);
    }
    
    if (catalogPrice === 0) {
      catalogPrice = num(sb.finalPrice) || num(item.rate) || 0;
    }
    
    const baseCost = num(sb.baseCost) || 0;
    const brandingCost = num(sb.brandingCost) || 0;
    const logisticCost = num(sb.logisticsCost) || 0;
    const markUp = num(sb.marginAmount) || 0;
    const successFee = num(sb.successFee) || 0;
    const gstStr = item.productGST != null ? String(item.productGST) : "";

    return {
      slNo: idx + 1,
      catalogPrice,
      product: item.product || "",
      quantity,
      baseCost,
      brandingCost,
      logisticCost,
      markUp,
      successFee,
      rate: 0,
      gst: gstStr,
      totalWithGst: 0,
      vendor: "",
      remarks: "",
      _source: catalog ? "catalog" : "suggestedBreakdown",
    };
  }

  async function fetchQuotation() {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch quotation");
      const data = await res.json();

      // FIX: Preserve original rates exactly as they are in database
      const sanitizedItems = (data.items || []).map((item, idx) => ({
        ...item,
        quantity: parseFloat(item.quantity) || 1,
        slNo: item.slNo || idx + 1,
        productGST: item.productGST != null ? parseFloat(item.productGST) : 0,
        rate: parseFloat(item.rate) || 0, // Keep original rate
        productprice: parseFloat(item.productprice) || 0, // Keep original productprice
        product: item.product || "Unknown Product",
        hsnCode: item.hsnCode || item.productId?.hsnCode || "",
        suggestedBreakdown: item.suggestedBreakdown || {}, // Preserve breakdown
        imageIndex: item.imageIndex || 0, // Preserve image index
        // FIX: Add these fields to ensure they're not lost
        material: item.material || "",
        weight: item.weight || "",
        brandingTypes: item.brandingTypes || [],
      }));

      // Check if quotation has a catalog and fetch it
      let catalog = null;
      const quotationHasCatalog = !!(data.catalogName && data.catalogName.trim());
      setHasCatalog(quotationHasCatalog);
      
      if (quotationHasCatalog) {
        catalog = await fetchCatalogByName(data.catalogName);
      }

      let initialOps = [];
      
      if (data.operationsBreakdown && data.operationsBreakdown.length > 0) {
        initialOps = data.operationsBreakdown.map((r, idx) => {
          const linkedItem = sanitizedItems[idx] || {};
          
          let catalogPrice = Number(r.catalogPrice) || 0;
          
          if (catalogPrice === 0 && catalog && r.product) {
            catalogPrice = getCatalogPriceForProduct(r.product, catalog);
          }
          
          if (catalogPrice === 0 && linkedItem.suggestedBreakdown) {
            catalogPrice = num(linkedItem.suggestedBreakdown.finalPrice) || num(linkedItem.rate) || 0;
          }
          
          const quantity = Number(r.quantity) || num(linkedItem.quantity) || 0;
          const baseCost = Number(r.baseCost) || Number(r.ourCost) || 0;
          const brandingCost = Number(r.brandingCost) || 0;
          const logisticCost = Number(r.logisticCost) || Number(r.deliveryCost) || 0;
          const markUp = Number(r.markUp) || Number(r.markUpCost) || 0;
          const successFee = Number(r.successFee) || Number(r.sfCost) || 0;
          
          const gstStr =
            r.gst ||
            (linkedItem.productGST != null
              ? String(linkedItem.productGST)
              : data.gst != null
              ? String(data.gst)
              : "");

          let rate = Number(r.rate) || 0;
          if (!rate) {
            rate = num(linkedItem.rate);
          }

          let totalWithGst = Number(r.totalWithGst) || Number(r.total) || 0;
          
          return {
            slNo: r.slNo || idx + 1,
            catalogPrice,
            product: r.product || linkedItem.product || "",
            quantity,
            baseCost,
            brandingCost,
            logisticCost,
            markUp,
            successFee,
            rate,
            gst: gstStr,
            totalWithGst,
            vendor: r.vendor || "",
            remarks: r.remarks || "",
            _source: catalog ? "catalog" : "suggestedBreakdown",
          };
        });
      } else {
        initialOps = sanitizedItems.map((item, idx) => 
          buildOpRowFromItem(item, idx, catalog)
        );
      }

      initialOps = initialOps.map(r => recalcRow(r));

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

  const recalcRow = (row) => {
    const baseCost = num(row.baseCost);
    const brandingCost = num(row.brandingCost);
    const logisticCost = num(row.logisticCost);
    const markUp = num(row.markUp);
    const successFee = num(row.successFee);
    const quantity = num(row.quantity);
    
    const rate = baseCost + brandingCost + logisticCost + markUp + successFee;
    
    const gstPct = parseGstPercent(row.gst);
    const totalWithGst = rate * (1 + gstPct / 100);
    
    const amount = quantity * rate;
    const totalAmount = quantity * totalWithGst;
    
    return { 
      ...row, 
      rate, 
      totalWithGst,
      amount,
      totalAmount
    };
  };
  
  const addOpRow = () => {
    const nextSl = (opRows[opRows.length - 1]?.slNo || 0) + 1;
    setOpRows((prev) => [
      ...prev,
      recalcRow({
        slNo: nextSl,
        catalogPrice: 0,
        product: "",
        quantity: 0,
        baseCost: 0,
        brandingCost: 0,
        logisticCost: 0,
        markUp: 0,
        successFee: 0,
        rate: 0,
        gst: "",
        totalWithGst: 0,
        vendor: "",
        remarks: "",
        _source: hasCatalog ? "catalog" : "manual",
      }),
    ]);
  };
  
  const duplicateOpRow = (idx) => {
    const rowToDuplicate = opRows[idx];
    const nextSl = (opRows[opRows.length - 1]?.slNo || 0) + 1;
    const newRow = recalcRow({
      ...rowToDuplicate,
      slNo: nextSl,
    });
    setOpRows((prev) => [...prev, ...newRow]);
  };
  
  const updateOpRow = (idx, field, value) => {
    setOpRows((prev) => {
      const copy = [...prev];
      copy[idx] = recalcRow({
        ...copy[idx],
        [field]:
          field === "product" || field === "gst" || field === "vendor" || field === "remarks"
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

  const fetchCatalogPriceForRow = async (idx) => {
    const row = opRows[idx];
    if (!row || !row.product) {
      alert("No product name to fetch catalog price for");
      return;
    }
    
    if (hasCatalog) {
      let catalog = catalogData;
      if (!catalog && editableQuotation?.catalogName) {
        catalog = await fetchCatalogByName(editableQuotation.catalogName);
      }
      
      if (catalog) {
        const price = getCatalogPriceForProduct(row.product, catalog);
        if (price > 0) {
          updateOpRow(idx, "catalogPrice", price);
          alert(`Catalog price fetched: ${price}`);
          return;
        }
      }
    }
    
    const linkedItem = editableQuotation?.items?.find(
      (item, itemIdx) => 
        idx === itemIdx || 
        (item.product?.toLowerCase() === row.product?.toLowerCase())
    );
    
    if (linkedItem?.suggestedBreakdown?.finalPrice) {
      const price = num(linkedItem.suggestedBreakdown.finalPrice);
      updateOpRow(idx, "catalogPrice", price);
      alert(`Using suggested breakdown price: ${price}`);
      return;
    }
    
    if (linkedItem?.rate) {
      const price = num(linkedItem.rate);
      updateOpRow(idx, "catalogPrice", price);
      alert(`Using item rate: ${price}`);
      return;
    }
    
    alert(`No price found for "${row.product}". Check: Catalog (if available), Suggested Breakdown, or Item Rate`);
  };

  const fetchAllCatalogPrices = async () => {
    let catalog = catalogData;
    if (hasCatalog && !catalog && editableQuotation?.catalogName) {
      catalog = await fetchCatalogByName(editableQuotation.catalogName);
    }
    
    setOpRows((prev) => 
      prev.map((row, idx) => {
        let catalogPrice = 0;
        
        if (catalog) {
          catalogPrice = getCatalogPriceForProduct(row.product, catalog);
        }
        
        if (catalogPrice === 0) {
          const linkedItem = editableQuotation?.items?.[idx] || 
                           editableQuotation?.items?.find(
                             item => item.product?.toLowerCase() === row.product?.toLowerCase()
                           );
          
          if (linkedItem?.suggestedBreakdown?.finalPrice) {
            catalogPrice = num(linkedItem.suggestedBreakdown.finalPrice);
          }
        }
        
        if (catalogPrice === 0) {
          const linkedItem = editableQuotation?.items?.[idx];
          if (linkedItem?.rate) {
            catalogPrice = num(linkedItem.rate);
          }
        }
        
        if (catalogPrice > 0) {
          return recalcRow({ ...row, catalogPrice });
        }
        return row;
      })
    );
    
    alert(`Fetched prices for ${opRows.length} rows`);
  };

  const populateFromSuggestedBreakdown = () => {
    if (!editableQuotation?.items) {
      alert("No quotation items to populate from");
      return;
    }
    
    setOpRows((prev) => 
      prev.map((row, idx) => {
        const linkedItem = editableQuotation.items[idx];
        if (!linkedItem?.suggestedBreakdown) {
          const matchedItem = editableQuotation.items.find(
            item => item.product?.toLowerCase() === row.product?.toLowerCase()
          );
          
          if (matchedItem?.suggestedBreakdown) {
            const sb = matchedItem.suggestedBreakdown;
            return recalcRow({
              ...row,
              catalogPrice: num(sb.finalPrice) || num(matchedItem.rate) || row.catalogPrice,
              baseCost: num(sb.baseCost) || row.baseCost,
              brandingCost: num(sb.brandingCost) || row.brandingCost,
              logisticCost: num(sb.logisticsCost) || row.logisticCost,
              markUp: num(sb.marginAmount) || row.markUp,
              quantity: num(matchedItem.quantity) || row.quantity,
              product: matchedItem.product || row.product,
              gst: matchedItem.productGST != null ? String(matchedItem.productGST) : row.gst,
            });
          }
          return row;
        }
        
        const sb = linkedItem.suggestedBreakdown;
        return recalcRow({
          ...row,
          catalogPrice: num(sb.finalPrice) || num(linkedItem.rate) || row.catalogPrice,
          baseCost: num(sb.baseCost) || row.baseCost,
          brandingCost: num(sb.brandingCost) || row.brandingCost,
          logisticCost: num(sb.logisticsCost) || row.logisticCost,
          markUp: num(sb.marginAmount) || row.markUp,
          quantity: num(linkedItem.quantity) || row.quantity,
          product: linkedItem.product || row.product,
          gst: linkedItem.productGST != null ? String(linkedItem.productGST) : row.gst,
        });
      })
    );
    
    alert("Populated fields from suggested breakdown");
  };

  const syncOpsToQuotation = useCallback(() => {
    if (!editableQuotation || opRows.length === 0) return;

    const updatedItems = opRows.map((opRow, idx) => {
      const existingItem = editableQuotation.items[idx] || {};

      const existingQty = num(existingItem.quantity) || 0;
      const existingRate = num(existingItem.rate) || 0;
      const existingGst =
        existingItem.productGST != null ? num(existingItem.productGST) : 0;

      const opQty = num(opRow.quantity);
      const opRate = num(opRow.rate);
      const opGst = parseGstPercent(opRow.gst);

      const quantity = opQty > 0 ? opQty : existingQty || 1;
      const rate = opRate > 0 ? opRate : existingRate; // FIX: Preserve original rate if not changed
      const productGST = opGst > 0 ? opGst : existingGst;

      const amount = quantity * rate;
      const total = amount * (1 + productGST / 100);

      return {
        ...existingItem,
        slNo: opRow.slNo ?? existingItem.slNo ?? idx + 1,
        product: opRow.product || existingItem.product,
        quantity,
        rate,
        productprice: rate, // FIX: Keep productprice same as rate
        productGST,
        amount,
        total,
        hsnCode: existingItem.hsnCode || "",
        imageIndex: existingItem.imageIndex || 0, // FIX: Preserve image index
        material: existingItem.material || "",
        weight: existingItem.weight || "",
        brandingTypes: existingItem.brandingTypes || [],
        suggestedBreakdown: existingItem.suggestedBreakdown || {},
      };
    });

    setEditableQuotation((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  }, [opRows, editableQuotation]);

  useEffect(() => {
    if (opRows.length > 0 && editableQuotation) {
      syncOpsToQuotation();
    }
  }, [opRows]);

  useEffect(() => {
    if (!editableQuotation) return;
    if (opRows.length > 0) return;
    const items = editableQuotation.items || [];
    if (items.length === 0) return;

    const prefilled = items.map((item, idx) => 
      buildOpRowFromItem(item, idx, catalogData)
    ).map(r => recalcRow(r));
    
    setOpRows(prefilled);
  }, [editableQuotation, opRows.length, catalogData]);

  // FIX: Create new quotation instead of updating existing one
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

      // FIX: Use quotation terms or default
      const quotationTerms = Array.isArray(terms) && terms.length > 0 ? terms : defaultTerms;

      // FIX: Preserve original rates exactly as they are
      const updatedItems = items.map((item) => {
        const baseRate = parseFloat(item.rate) || 0; // Original rate
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
          rate: baseRate, // Keep original rate
          productprice: baseRate, // Keep productprice same as rate
          amount,
          total,
          productGST: gstRate,
          quantity,
          productId: item.productId?._id || item.productId || null,
          hsnCode: item.hsnCode || item.productId?.hsnCode || "",
          imageIndex: item.imageIndex || 0, // FIX: Preserve image index
        };
      });

      // FIX: Create NEW quotation instead of updating existing one
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
        terms: quotationTerms,
        fieldsToDisplay,
        displayTotals,
        displayHSNCodes,
        operations,
        priceRange,
        operationsBreakdown: opRows.map((r) => ({
          slNo: r.slNo,
          catalogPrice: num(r.catalogPrice),
          product: r.product,
          quantity: num(r.quantity),
          baseCost: num(r.baseCost),
          brandingCost: num(r.brandingCost),
          logisticCost: num(r.logisticCost),
          markUp: num(r.markUp),
          successFee: num(r.successFee),
          rate: num(r.rate),
          gst: r.gst,
          totalWithGst: num(r.totalWithGst),
          vendor: r.vendor,
          remarks: r.remarks,
          ourCost: num(r.baseCost),
          deliveryCost: num(r.logisticCost),
          markUpCost: num(r.markUp),
          sfCost: num(r.successFee),
          amount: num(r.amount),
          total: num(r.totalAmount),
        })),
      };

      // FIX: Use POST to create NEW quotation instead of PUT to update
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
      if (!data || !data.quotation) {
        throw new Error("Invalid response from server: Missing quotation data");
      }

      // Redirect to the new quotation
      alert(`New quotation created: #${data.quotation.quotationNumber}`);
      navigate(`/admin-dashboard/quotations/${data.quotation._id}`);
      
    } catch (error) {
      console.error("Create new quotation error:", error);
      alert(`Failed to create new quotation: ${error.message}`);
    }
  }

  async function handleSaveOperationsBreakdownOnly() {
    try {
      const payload = {
        operationsBreakdown: opRows.map((r) => ({
          slNo: r.slNo,
          catalogPrice: num(r.catalogPrice),
          product: r.product,
          quantity: num(r.quantity),
          baseCost: num(r.baseCost),
          brandingCost: num(r.brandingCost),
          logisticCost: num(r.logisticCost),
          markUp: num(r.markUp),
          successFee: num(r.successFee),
          rate: num(r.rate),
          gst: r.gst,
          totalWithGst: num(r.totalWithGst),
          vendor: r.vendor,
          remarks: r.remarks,
          ourCost: num(r.baseCost),
          deliveryCost: num(r.logisticCost),
          markUpCost: num(r.markUp),
          sfCost: num(r.successFee),
          amount: num(r.amount),
          total: num(r.totalAmount),
        })),
      };

      const res = await axios.put(
        `${BACKEND_URL}/api/admin/quotations/${id}/operations-breakdown`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res?.data?.quotation) {
        setEditableQuotation(res.data.quotation);
        setQuotation(res.data.quotation);

        const fresh = (res.data.quotation.operationsBreakdown || []).map(
          (r, idx) => ({
            slNo: r.slNo || idx + 1,
            catalogPrice: Number(r.catalogPrice) || 0,
            product: r.product || "",
            quantity: Number(r.quantity) || 0,
            baseCost: Number(r.baseCost) || Number(r.ourCost) || 0,
            brandingCost: Number(r.brandingCost) || 0,
            logisticCost: Number(r.logisticCost) || Number(r.deliveryCost) || 0,
            markUp: Number(r.markUp) || Number(r.markUpCost) || 0,
            successFee: Number(r.successFee) || Number(r.sfCost) || 0,
            rate: Number(r.rate) || 0,
            gst: r.gst || "",
            totalWithGst: Number(r.totalWithGst) || Number(r.total) || 0,
            vendor: r.vendor || "",
            remarks: r.remarks || "",
          })
        );
        setOpRows(fresh.map(r => recalcRow(r)));
      }

      alert("Operations breakdown saved successfully.");
    } catch (err) {
      console.error("Save operations breakdown error:", err);
      alert(
        "Failed to save operations breakdown: " +
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
        (parsedJson.RefDtls.InvRm.length < 3 ||
          parsedJson.RefDtls.InvRm.length > 100)
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
              `${fieldNameMapping[key] || key}.${
                fieldNameMapping[subKey] || subKey
              }`;
            fields.push(
              <div key={`${key}.${subKey}`} className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {fieldLabel}
                </label>
                <input
                  type="text"
                  value={parsedJson[key][subKey] || ""}
                  onChange={(e) =>
                    handleFormFieldChange(subKey, e.target.value, key)
                  }
                  className={`border p-2 w-full text-xs rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    key === "RefDtls" &&
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg-grid-cols-3 gap-4">
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
              const amount = effRate * (parseFloat(item.quantity) || 1);
              const gstRate =
                item.productGST != null
                  ? parseFloat(item.productGST)
                  : editableQuotation.gst
                  ? parseFloat(editableQuotation.gst)
                  : 0;
              const total = amount + (gstRate > 0 ? amount * (gstRate / 100) : 0);

              return (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2">{item.slNo || index + 1}</td>
                  <td className="p-2 wrap-text">{item.product}</td>
                  <td className="p-2">
                    {item.hsnCode || item.productId?.hsnCode || ""}
                  </td>
                  <td className="p-2">{formatIndianInteger(item.quantity)}</td>
                  <td className="p-2">{formatIndianNumber(item.rate)}</td>
                  <td className="p-2">{formatIndianNumber(amount)}</td>
                  <td className="p-2">{gstRate}</td>
                  <td className="p-2">{formatIndianNumber(total)}</td>
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
        } catch {}
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
        `HSN Codes display ${
          newDisplayHSNCodes ? "enabled" : "disabled"
        } in database`
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
        format ? { format } : {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(
        `Invoice created: ${res.data.invoice.invoiceDetails.invoiceNumber}`
      );
      navigate(`/admin-dashboard/invoices/${res.data.invoice._id}`);
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert(
        "Failed to create invoice: " +
          (error.response?.data?.message || error.message)
      );
    }
  }

  function handleHeaderBlur(field, e) {
    setEditableQuotation((prev) => ({
      ...prev,
      [field]: e.target.innerText,
    }));
  }

  // FIX: Update item field function to preserve image index
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
        terms: [...(prev.terms || []), newTerm],
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
    const updatedTerms = [...(editableQuotation.terms || [])];
    updatedTerms[editingTermIdx] = {
      heading: newTerm.heading,
      content: newTerm.content,
    };
    setEditableQuotation((prev) => ({ ...prev, terms: updatedTerms }));
    setTermModalOpen(false);
    setEditingTermIdx(null);
    setNewTerm({ heading: "", content: "" });
  }

  const handleExportPDF = () => {
    navigate(`/admin-dashboard/print-quotation/${id}`);
  };

  const handleViewOperation = (operation) => {
    console.log("View/Edit operation:", operation);
    alert(`Operation details: ${JSON.stringify(operation, null, 2)}`);
  };

  const marginFactor = 1 + (parseFloat(editableQuotation?.margin) || 0) / 100;

  const opTotals = opRows.reduce(
    (acc, r) => {
      acc.quantity += num(r.quantity);
      acc.catalogPrice += num(r.catalogPrice);
      acc.baseCost += num(r.baseCost);
      acc.brandingCost += num(r.brandingCost);
      acc.logisticCost += num(r.logisticCost);
      acc.markUp += num(r.markUp);
      acc.successFee += num(r.successFee);
      acc.rate += num(r.rate);
      acc.totalWithGst += num(r.totalWithGst);
      acc.amount += num(r.amount);
      acc.totalAmount += num(r.totalAmount);
      return acc;
    },
    {
      quantity: 0,
      catalogPrice: 0,
      baseCost: 0,
      brandingCost: 0,
      logisticCost: 0,
      markUp: 0,
      successFee: 0,
      rate: 0,
      totalWithGst: 0,
      amount: 0,
      totalAmount: 0,
    }
  );

  if (loading) return <div className="p-4 text-gray-400">Loading quotation...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!editableQuotation || !editableQuotation.items)
    return <div className="p-4 text-gray-400">Quotation not found.</div>;

  return (
    <div className="p-3 bg-white text-black min-h-screen text-xs" id="quotation-content">
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
        .wrap-text {
          white-space: normal !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          word-break: break-word !important;
        }
        #op-breakdown-panel table {
          table-layout: fixed;
        }
        #op-breakdown-panel td,
        #op-breakdown-panel th {
          overflow: hidden;
          text-overflow: ellipsis;
          word-wrap: break-word;
        }
        #op-breakdown-panel td:nth-child(3),
        #op-breakdown-panel th:nth-child(3) {
          white-space: normal;
          word-break: break-word;
        }
      `}</style>

      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-3 py-2 rounded-lg mb-3 flex justify-between items-center">
        <div>
          <h1 className="text-base font-bold">
            Quotation #{editableQuotation.quotationNumber || "N/A"}
          </h1>
          <p className="text-[10px] opacity-90">
            {editableQuotation.customerCompany} | {editableQuotation.opportunityNumber}
          </p>
        </div>
        <div className="text-right text-[10px]">
          <p>Created: {new Date(editableQuotation.createdAt).toLocaleDateString()}</p>
          <p>By: {editableQuotation.createdBy}</p>
          <p className={`font-medium ${hasCatalog ? 'text-green-200' : 'text-yellow-200'}`}>
            {hasCatalog ? `📁 Catalog: ${editableQuotation.catalogName}` : '📝 Direct (No Catalog)'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          onClick={handleExportPDF}
          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px]"
        >
          PDF
        </button>
        <button
          onClick={() => {
            const defFmt = "APP/{FY}/{SEQ4}";
            const fmt = window.prompt(
              `Enter invoice number format (tokens: {FY}, {SEQn}).\nExample: ${defFmt}`,
              defFmt
            );
            if (fmt === null) return;
            handleCreateInvoice(fmt.trim());
          }}
          className="bg-teal-600 hover:bg-teal-700 text-white px-2 py-1 rounded text-[10px]"
        >
          Invoice
        </button>
        <button
          onClick={handleSaveQuotation}
          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[10px]"
        >
          Save as NEW
        </button>
        <button
          onClick={() =>
            setEditableQuotation((prev) => ({
              ...prev,
              displayTotals: !prev.displayTotals,
            }))
          }
          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-[10px]"
        >
          {editableQuotation.displayTotals ? "Hide $" : "Show $"}
        </button>
        <button
          onClick={handleToggleHSNCodes}
          className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-[10px]"
        >
          {editableQuotation.displayHSNCodes ? "Hide HSN" : "Show HSN"}
        </button>
      </div>

      <div
        id="op-breakdown-panel"
        className="sticky top-0 z-30 bg-white border border-gray-300 shadow-lg rounded mb-3"
      >
        <div className="bg-gray-100 px-2 py-1.5 border-b flex items-center justify-between">
          <div className="font-semibold text-xs text-gray-800">
            Operations Cost — Quotation #{editableQuotation.quotationNumber || "N/A"}
            <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] ${
              hasCatalog 
                ? 'bg-green-100 text-green-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {hasCatalog ? '📁 From Catalog' : '📝 From SuggestedBreakdown'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {!hasCatalog && (
              <button
                onClick={populateFromSuggestedBreakdown}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-[10px]"
                title="Populate all fields from item's suggestedBreakdown"
              >
                ↻ Reload Breakdown
              </button>
            )}
            <button
              onClick={handleSaveOperationsBreakdownOnly}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-[10px]"
            >
              Save Ops
            </button>
          </div>
        </div>

        {!hasCatalog && (
          <div className="bg-yellow-50 px-2 py-1 border-b text-[9px] text-yellow-800">
            <strong>Field Mapping:</strong> 
            Catalog Price ← finalPrice | 
            Base Cost ← baseCost | 
            Branding ← brandingCost | 
            Logistic ← logisticsCost | 
            Mark Up ← marginAmount
          </div>
        )}

        <div className="max-h-[50vh] overflow-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead className="sticky top-0 bg-gray-200 z-10">
              <tr>
                <th className="border px-1 py-1 text-center bg-gray-300" style={{width: "25px"}}>Sl</th>
                <th className="border px-1 py-1 text-right bg-yellow-100" style={{width: "70px"}}>
                  <div className="flex items-center justify-between">
                    <span>{hasCatalog ? 'Catalog' : 'Ref'}</span>
                    <button
                      onClick={fetchAllCatalogPrices}
                      className="text-[8px] bg-blue-500 text-white px-1 rounded hover:bg-blue-600"
                      title="Fetch price from: Catalog → Suggested Breakdown → Item Rate"
                    >
                      ↓
                    </button>
                  </div>
                  <div className="text-[8px] text-gray-500">Price</div>
                </th>
                <th className="border px-1 py-1 text-left bg-blue-50 wrap-text" style={{minWidth: "140px", width: "18%"}}>
                  <div>Product</div>
                  <div className="text-[8px] text-gray-500">
                    {hasCatalog ? 'From catalog' : 'From quotation'}
                  </div>
                </th>
                <th className="border px-1 py-1 text-center bg-blue-50" style={{width: "45px"}}>
                  <div>Qty</div>
                </th>
                <th className="border px-1 py-1 text-right bg-green-50" style={{width: "55px"}}>
                  <div>Base</div>
                  <div className="text-[8px] text-gray-500">Cost</div>
                </th>
                <th className="border px-1 py-1 text-right bg-green-50" style={{width: "50px"}}>
                  <div>Branding</div>
                </th>
                <th className="border px-1 py-1 text-right bg-green-50" style={{width: "50px"}}>
                  <div>Logistic</div>
                  <div className="text-[8px] text-gray-500">Cost</div>
                </th>
                <th className="border px-1 py-1 text-right bg-orange-50" style={{width: "50px"}}>
                  <div>Mark Up</div>
                </th>
                <th className="border px-1 py-1 text-right bg-orange-50" style={{width: "55px"}}>
                  <div>Success</div>
                  <div className="text-[8px] text-gray-500">Fee</div>
                </th>
                <th className="border px-1 py-1 text-right bg-purple-100" style={{width: "65px"}}>
                  <div>Rate</div>
                  <div className="text-[8px] text-gray-500">(Total)</div>
                </th>
                <th className="border px-1 py-1 text-center bg-gray-100" style={{width: "35px"}}>
                  <div>GST</div>
                  <div className="text-[8px] text-gray-500">%</div>
                </th>
                <th className="border px-1 py-1 text-right bg-purple-100" style={{width: "70px"}}>
                  <div>Total/pc</div>
                  <div className="text-[8px] text-gray-500">With GST</div>
                </th>
                <th className="border px-1 py-1 text-left bg-gray-100" style={{width: "65px"}}>
                  <div>Vendor</div>
                </th>
                <th className="border px-1 py-1 text-left bg-gray-100" style={{width: "70px"}}>
                  <div>Remarks</div>
                </th>
                <th className="border px-1 py-1 text-center bg-gray-300" style={{width: "45px"}}>Action</th>
              </tr>
            </thead>

            <tbody>
              {opRows.map((r, idx) => (
                <tr key={idx} className="hover:bg-blue-50">
                  <td className="border px-1 py-0.5 text-center bg-gray-50">{r.slNo}</td>

                  <td className="border px-1 py-0.5 bg-yellow-50">
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        value={r.catalogPrice}
                        onChange={(e) => updateOpRow(idx, "catalogPrice", e.target.value)}
                        className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded text-right text-[10px]"
                      />
                      <button
                        onClick={() => fetchCatalogPriceForRow(idx)}
                        className="text-[8px] text-blue-600 hover:text-blue-800 px-0.5"
                        title="Fetch from: Catalog → Suggested Breakdown → Item Rate"
                      >
                        ↓
                      </button>
                    </div>
                  </td>

                  <td className="border px-1 py-0.5 wrap-text">
                    <textarea
                      value={r.product}
                      onChange={(e) => updateOpRow(idx, "product", e.target.value)}
                      className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-0.5 text-[10px] resize-none"
                      rows={Math.max(1, Math.ceil(r.product.length / 20))}
                      style={{
                        minHeight: '20px',
                        lineHeight: '1.2',
                        overflow: 'hidden',
                        resize: 'vertical',
                      }}
                    />
                  </td>

                  <td className="border px-1 py-0.5">
                    <input
                      type="number"
                      value={r.quantity}
                      onChange={(e) => updateOpRow(idx, "quantity", e.target.value)}
                      className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded text-center text-[10px]"
                      min="0"
                    />
                  </td>

                  <td className="border px-1 py-0.5 bg-green-50">
                    <input
                      type="number"
                      value={r.baseCost}
                      onChange={(e) => updateOpRow(idx, "baseCost", e.target.value)}
                      className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded text-right text-[10px]"
                    />
                  </td>

                  <td className="border px-1 py-0.5 bg-green-50">
                    <input
                      type="number"
                      value={r.brandingCost}
                      onChange={(e) => updateOpRow(idx, "brandingCost", e.target.value)}
                      className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded text-right text-[10px]"
                    />
                  </td>

                  <td className="border px-1 py-0.5 bg-green-50">
                    <input
                      type="number"
                      value={r.logisticCost}
                      onChange={(e) => updateOpRow(idx, "logisticCost", e.target.value)}
                      className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded text-right text-[10px]"
                    />
                  </td>

                  <td className="border px-1 py-0.5 bg-orange-50">
                    <input
                      type="number"
                      value={r.markUp}
                      onChange={(e) => updateOpRow(idx, "markUp", e.target.value)}
                      className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded text-right text-[10px]"
                    />
                  </td>

                  <td className="border px-1 py-0.5 bg-orange-50">
                    <input
                      type="number"
                      value={r.successFee}
                      onChange={(e) => updateOpRow(idx, "successFee", e.target.value)}
                      className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded text-right text-[10px]"
                    />
                  </td>

                  <td className="border px-1 py-0.5 bg-purple-50 text-right font-medium text-purple-800">
                    {formatIndianNumber(r.rate)}
                  </td>

                  <td className="border px-1 py-0.5">
                    <input
                      value={r.gst}
                      onChange={(e) => updateOpRow(idx, "gst", e.target.value)}
                      placeholder="%"
                      className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded text-center text-[10px]"
                    />
                  </td>

                  <td className="border px-1 py-0.5 bg-purple-50 text-right font-bold text-green-700">
                    {formatIndianNumber(r.totalWithGst)}
                  </td>

                  <td className="border px-1 py-0.5">
                    <textarea
                      value={r.vendor}
                      onChange={(e) => updateOpRow(idx, "vendor", e.target.value)}
                      className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded text-[10px] resize-none"
                      rows={1}
                      style={{
                        minHeight: '20px',
                        lineHeight: '1.2',
                        overflow: 'hidden',
                        resize: 'vertical',
                      }}
                    />
                  </td>

                  <td className="border px-1 py-0.5">
                    <textarea
                      value={r.remarks}
                      onChange={(e) => updateOpRow(idx, "remarks", e.target.value)}
                      className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded text-[10px] resize-none"
                      rows={1}
                      style={{
                        minHeight: '20px',
                        lineHeight: '1.2',
                        overflow: 'hidden',
                        resize: 'vertical',
                      }}
                    />
                  </td>

                  <td className="border px-1 py-0.5 text-center bg-gray-50">
                    <button
                      onClick={() => duplicateOpRow(idx)}
                      className="text-blue-600 text-[9px] hover:underline mr-1"
                      title="Duplicate row for same product"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeOpRow(idx)}
                      className="text-red-600 text-[9px] hover:underline"
                      title="Remove row"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}

              {opRows.length > 0 && (
                <tr className="bg-blue-100 font-semibold sticky bottom-0">
                  <td className="border px-1 py-1 text-center bg-blue-200">Σ</td>
                  <td className="border px-1 py-1 text-right bg-yellow-100">
                    {formatIndianNumber(opTotals.catalogPrice)}
                  </td>
                  <td className="border px-1 py-1 text-right wrap-text">
                    <span className="text-[9px]">({opRows.length} items)</span>
                  </td>
                  <td className="border px-1 py-1 text-center">
                    {formatIndianInteger(opTotals.quantity)}
                  </td>
                  <td className="border px-1 py-1 text-right bg-green-100">
                    {formatIndianNumber(opTotals.baseCost)}
                  </td>
                  <td className="border px-1 py-1 text-right bg-green-100">
                    {formatIndianNumber(opTotals.brandingCost)}
                  </td>
                  <td className="border px-1 py-1 text-right bg-green-100">
                    {formatIndianNumber(opTotals.logisticCost)}
                  </td>
                  <td className="border px-1 py-1 text-right bg-orange-100">
                    {formatIndianNumber(opTotals.markUp)}
                  </td>
                  <td className="border px-1 py-1 text-right bg-orange-100">
                    {formatIndianNumber(opTotals.successFee)}
                  </td>
                  <td className="border px-1 py-1 text-right bg-purple-100">
                    {formatIndianNumber(opTotals.rate)}
                  </td>
                  <td className="border px-1 py-1"></td>
                  <td className="border px-1 py-1 text-right bg-purple-100 text-green-700">
                    {formatIndianNumber(opTotals.totalWithGst)}
                  </td>
                  <td className="border px-1 py-1"></td>
                  <td className="border px-1 py-1"></td>
                  <td className="border px-1 py-1 text-center bg-blue-200">
                    <button
                      onClick={addOpRow}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-1.5 py-0.5 rounded text-[9px]"
                    >
                      +Row
                    </button>
                  </td>
                </tr>
              )}

              {opRows.length === 0 && (
                <tr>
                  <td colSpan={15} className="border px-2 py-2 text-center text-gray-500 wrap-text">
                    No operations data.{" "}
                    <button
                      onClick={addOpRow}
                      className="text-blue-600 hover:underline"
                    >
                      Add first row
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {opRows.length > 0 && (
          <div className="bg-green-50 px-2 py-1.5 border-t flex justify-between items-center">
            <span className="text-[10px] font-medium text-gray-700">
              Items: {opRows.length} | Total Qty: {formatIndianInteger(opTotals.quantity)}
            </span>
            <div className="text-right flex items-center gap-4">
              <span className="text-[10px] text-gray-600">
                Total Amount: <span className="font-semibold">₹{formatIndianNumber(opTotals.amount)}</span>
              </span>
              <span className="text-[10px] text-gray-600">
                Grand Total (with GST): <span className="text-sm font-bold text-green-700">₹{formatIndianNumber(opTotals.totalAmount)}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mb-3 space-y-0.5 text-[10px] bg-gray-50 p-2 rounded">
        <div className="flex flex-wrap gap-2">
          {editableQuotation.customerName && (
            <span>
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleHeaderBlur("salutation", e)}
                className="font-medium"
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
            </span>
          )}
          <span className="text-gray-400">|</span>
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleHeaderBlur("customerCompany", e)}
            className="font-semibold"
          >
            {editableQuotation.customerCompany}
          </span>
        </div>
        {editableQuotation.customerAddress && (
          <div>
            <span className="font-bold text-gray-500">Addr:</span>{" "}
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleHeaderBlur("customerAddress", e)}
            >
              {editableQuotation.customerAddress}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {editableQuotation.customerEmail && (
            <span>
              <span className="font-bold text-gray-500">Email:</span>{" "}
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleHeaderBlur("customerEmail", e)}
              >
                {editableQuotation.customerEmail}
              </span>
            </span>
          )}
          <button
            onClick={handleAddEmail}
            className="bg-blue-600 hover:bg-blue-700 text-white px-1.5 py-0.5 rounded text-[9px]"
          >
            {editableQuotation.customerEmail ? "Edit" : "Add"} Email
          </button>
        </div>
      </div>

      <div className="mb-3 bg-yellow-50 p-2 rounded">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-[11px]">Terms & Conditions</h3>
          <button
            onClick={() => {
              setEditingTermIdx(null);
              setNewTerm({ heading: "", content: "" });
              setTermModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-1.5 py-0.5 rounded text-[9px]"
          >
            + Add
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(editableQuotation.terms || []).map((term, idx) => (
            <div key={idx} className="text-[10px] border-l-2 border-yellow-400 pl-1.5 wrap-text">
              <div className="font-semibold text-gray-800">{term.heading}</div>
              <div className="text-gray-600 line-clamp-2">{term.content}</div>
              <button
                onClick={() => handleEditTerm(idx)}
                className="text-blue-600 hover:underline text-[9px]"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      {termModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setTermModalOpen(false)} />
          <div className="relative z-[70] bg-white p-4 rounded w-full max-w-md shadow-xl">
            <h2 className="text-sm font-semibold mb-3">
              {editingTermIdx !== null ? "Edit Term" : "Add Term"}
            </h2>

            <div className="mb-3">
              <input
                type="text"
                value={newTerm.heading}
                placeholder="Term Heading"
                onChange={(e) =>
                  setNewTerm((prev) => ({ ...prev, heading: e.target.value }))
                }
                className="border p-1.5 w-full text-xs rounded"
              />
            </div>

            <div className="mb-3">
              <textarea
                value={newTerm.content}
                placeholder="Term Content"
                onChange={(e) =>
                  setNewTerm((prev) => ({ ...prev, content: e.target.value }))
                }
                className="border p-1.5 w-full text-xs rounded"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setTermModalOpen(false);
                  setNewTerm({ heading: "", content: "" });
                  setEditingTermIdx(null);
                }}
                className="bg-gray-500 text-white px-3 py-1.5 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={editingTermIdx !== null ? handleUpdateTerm : handleAddTerm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs"
              >
                {editingTermIdx !== null ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {eInvoiceModalOpen && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg w-3/4 max-h-[80vh] overflow-y-auto shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Generate E-Invoice
            </h2>
            {errorMessage && (
              <div className="text-red-500 mb-3 text-xs bg-red-100 p-2 rounded">
                {errorMessage}
              </div>
            )}

            <div className="mb-4">
              <button
                onClick={handleAuthenticate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs"
                disabled={isAuthenticated}
              >
                {isAuthenticated ? "Authenticated" : "Generate Token"}
              </button>
              {isAuthenticated && eInvoiceData && (
                <div className="mt-1 text-[10px] text-gray-600">
                  <p>Token: {eInvoiceData?.authToken?.substring(0, 20)}...</p>
                  <p>Expiry: {new Date(eInvoiceData?.tokenExpiry).toLocaleString()}</p>
                </div>
              )}
            </div>

            {isAuthenticated && (
              <div className="mb-4">
                <button
                  onClick={handleFetchCustomerDetails}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs"
                  disabled={customerDetails}
                >
                  {customerDetails ? "Customer Fetched" : "Get Customer"}
                </button>
                {customerDetails && (
                  <div className="mt-1 text-[10px] text-gray-600 grid grid-cols-2 gap-1">
                    <p><b>GSTIN:</b> {customerDetails.gstin}</p>
                    <p><b>Legal:</b> {customerDetails.legalName}</p>
                    <p><b>Location:</b> {customerDetails.location}</p>
                    <p><b>State:</b> {customerDetails.stateCode}</p>
                  </div>
                )}
              </div>
            )}

            {customerDetails && (
              <div className="mb-4">
                {renderProductTable()}
                <div className="flex space-x-2 mb-3">
                  <button
                    onClick={handleGenerateReferenceJson}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded text-xs"
                  >
                    {referenceJson && eInvoiceData?.referenceJson ? "Regenerate" : "Generate"} JSON
                  </button>
                  <button
                    onClick={() => setJsonView(jsonView === "json" ? "form" : "json")}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-xs"
                  >
                    {jsonView === "json" ? "Form" : "JSON"}
                  </button>
                </div>
                {referenceJson && (
                  <div className="mt-2">
                    {jsonView === "json" ? (
                      <textarea
                        value={referenceJson}
                        onChange={(e) => setReferenceJson(e.target.value)}
                        className="border p-2 w-full text-[10px] font-mono h-48 rounded-md"
                      />
                    ) : (
                      renderJsonForm()
                    )}
                    <button
                      onClick={handleSaveReferenceJson}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs mt-2"
                    >
                      Save JSON
                    </button>
                  </div>
                )}
              </div>
            )}

            {referenceJson && eInvoiceData?.referenceJson && (
              <div className="mb-4">
                <button
                  onClick={handleGenerateIRN}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-xs"
                  disabled={eInvoiceData?.irn}
                >
                  {eInvoiceData?.irn ? "IRN Generated" : "Generate IRN"}
                </button>
                {eInvoiceData?.irn && (
                  <div className="mt-1 text-[10px] text-gray-600">
                    <p><b>IRN:</b> {eInvoiceData.irn}</p>
                    <p><b>Ack:</b> {eInvoiceData.ackNo}</p>
                    <p><b>Status:</b> {eInvoiceData.status}</p>
                  </div>
                )}
              </div>
            )}

            {eInvoiceData?.irn && (
              <div className="mb-4">
                <button
                  onClick={handleCancelEInvoice}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs"
                  disabled={eInvoiceData?.cancelled}
                >
                  {eInvoiceData?.cancelled ? "Cancelled" : "Cancel E-Invoice"}
                </button>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setEInvoiceModalOpen(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editableQuotation.operations?.length > 0 && (
        <div className="mb-3">
          <h3 className="text-[11px] font-semibold mb-1">Legacy Operations</h3>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b bg-gray-100">
                <th className="p-1 text-left">Cost</th>
                <th className="p-1 text-left">Brand</th>
                <th className="p-1 text-left">Deliv</th>
                <th className="p-1 text-left">Mark</th>
                <th className="p-1 text-left">Total</th>
                <th className="p-1 text-left">Vendor</th>
              </tr>
            </thead>
            <tbody>
              {editableQuotation.operations.map((op, idx) => (
                <tr key={op._id || idx} className="border-b">
                  <td className="p-1">{formatIndianNumber(op.ourCost)}</td>
                  <td className="p-1">{formatIndianNumber(op.branding)}</td>
                  <td className="p-1">{formatIndianNumber(op.delivery)}</td>
                  <td className="p-1">{formatIndianNumber(op.markup)}</td>
                  <td className="p-1">{formatIndianNumber(op.total)}</td>
                  <td className="p-1 wrap-text">{op.vendor || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FIX: Ensure imageIndex is preserved in table */}
      <div className="mb-3">
        <h3 className="text-[11px] font-semibold mb-1">Quotation Items (synced from Ops)</h3>
        <div className="max-h-[40vh] overflow-auto border rounded">
          <table className="w-full border-collapse text-[10px]">
            <thead className="sticky top-0 bg-gray-100 z-10">
              <tr className="border-b">
                <th className="p-1 text-left" style={{width: "30px"}}>Sl</th>
                <th className="p-1 text-left" style={{width: "50px"}}>Img</th>
                <th className="p-1 text-left wrap-text" style={{minWidth: "150px", width: "30%"}}>Product</th>
                {editableQuotation.displayHSNCodes && (
                  <th className="p-1 text-left" style={{width: "50px"}}>HSN</th>
                )}
                <th className="p-1 text-center" style={{width: "50px"}}>Qty</th>
                <th className="p-1 text-right" style={{width: "70px"}}>Rate</th>
                {editableQuotation.displayTotals && (
                  <>
                    <th className="p-1 text-right" style={{width: "75px"}}>Amount</th>
                    <th className="p-1 text-center" style={{width: "40px"}}>GST%</th>
                    <th className="p-1 text-right" style={{width: "80px"}}>Total</th>
                  </>
                )}
                <th className="p-1 text-center" style={{width: "50px"}}>Act</th>
              </tr>
            </thead>
            <tbody>
              {editableQuotation.items.map((item, index) => {
                const baseRate = parseFloat(item.rate) || 0;
                const effRate = baseRate * marginFactor;
                const amount = effRate * (parseFloat(item.quantity) || 1);
                const gstRate =
                  item.productGST != null
                    ? parseFloat(item.productGST)
                    : editableQuotation.gst
                    ? parseFloat(editableQuotation.gst)
                    : 0;
                const total = amount + (gstRate > 0 ? amount * (gstRate / 100) : 0);
                
                // FIX: Get correct image using imageIndex
                const imageUrl = item.productId?.images?.[item.imageIndex || 0] || "";

                return (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-1">{item.slNo || index + 1}</td>
                    <td className="p-1">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt="Prod"
                          className="w-8 h-8 object-cover rounded"
                        />
                      ) : (
                        <span className="text-gray-400 text-[9px]">-</span>
                      )}
                    </td>
                    <td className="p-1 wrap-text">
                      <input
                        type="text"
                        value={item.product}
                        onChange={(e) => updateItemField(index, "product", e.target.value)}
                        className="border p-0.5 w-full text-[10px] rounded wrap-text"
                      />
                    </td>
                    {editableQuotation.displayHSNCodes && (
                      <td className="p-1">
                        <input
                          type="text"
                          value={item.hsnCode || item.productId?.hsnCode || ""}
                          onChange={(e) => updateItemField(index, "hsnCode", e.target.value)}
                          className="border p-0.5 w-full text-[10px] rounded"
                        />
                      </td>
                    )}
                    <td className="p-1">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItemField(index, "quantity", e.target.value)}
                        className="border p-0.5 w-full text-[10px] text-center rounded"
                        min="1"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItemField(index, "rate", e.target.value)}
                        className="border p-0.5 w-full text-[10px] text-right rounded"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    {editableQuotation.displayTotals && (
                      <>
                        <td className="p-1 text-right">{formatIndianNumber(amount)}</td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={item.productGST}
                            onChange={(e) => updateItemField(index, "productGST", e.target.value)}
                            className="border p-0.5 w-full text-[10px] text-center rounded"
                            min="0"
                            step="0.1"
                          />
                        </td>
                        <td className="p-1 text-right font-medium">{formatIndianNumber(total)}</td>
                      </>
                    )}
                    <td className="p-1 text-center">
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700 text-[10px]"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-right text-[11px] bg-gray-100 p-2 rounded">
        <p className="mb-0.5">
          <span className="text-gray-600">Total Amount:</span>{" "}
          <span className="font-medium">
            ₹{formatIndianNumber(
              editableQuotation.items.reduce((sum, item) => {
                const baseRate = parseFloat(item.rate) || 0;
                const effRate = baseRate * marginFactor;
                return sum + effRate * (parseFloat(item.quantity) || 1);
              }, 0)
            )}
          </span>
        </p>
        <p>
          <span className="text-gray-600">Grand Total (incl. GST):</span>{" "}
          <span className="font-bold text-green-700 text-sm">
            ₹{formatIndianNumber(
              editableQuotation.items.reduce((sum, item) => {
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
            )}
          </span>
        </p>
      </div>
    </div>
  );
}