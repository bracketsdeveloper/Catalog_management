"use client"; // Remove if you're using Create React App

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as XLSX from "xlsx"; // For Excel export

// Sub-components
import RemarksModal from "../components/CatalogManagement/RemarksModal";
import PDFTemplateModal from "../components/CatalogManagement/PDFTemplateModal";

// Utility modules
import {
  getBase64ImageFromUrl,
  wrapText
} from "../components/CatalogManagement/exportUtils";
import {
  groupItemsByDate,
  groupQuotationsByTimePeriod,
  isToday as isTodayFn,
  isYesterday as isYesterdayFn,
  isThisWeek as isThisWeekFn,
  isThisMonth,
  isThisYear
} from "../components/CatalogManagement/dateUtils";

import { fieldMapping, templateConfig } from "../components/CatalogManagement/constants";

const limit = 100;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function CatalogManagementPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // States for catalogs and quotations
  const [catalogs, setCatalogs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [quotation, setQuotation] = useState(null);
  const [editableQuotation, setEditableQuotation] = useState(null);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & approval states
  const [filterType, setFilterType] = useState(
    localStorage.getItem("catalogManagementFilterType") || "catalogs"
  );
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [fromDateFilter, setFromDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  // For "create catalog" dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Remarks modal states
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [selectedItemForRemarks, setSelectedItemForRemarks] = useState(null);
  const [itemTypeForRemarks, setItemTypeForRemarks] = useState(""); // "catalog" or "quotation"

  // PDF Template modal
  const [pdfTemplateModalOpen, setPdfTemplateModalOpen] = useState(false);
  const [selectedItemForPDF, setSelectedItemForPDF] = useState(null);

  // Current user email
  const [userEmail, setUserEmail] = useState("");

  // Additional search input
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // Persist filterType changes to localStorage
  useEffect(() => {
    localStorage.setItem("catalogManagementFilterType", filterType);
  }, [filterType]);

  // -------------- LIFECYCLE --------------
  useEffect(() => {
    fetchData();
    fetchUserEmail();
    // eslint-disable-next-line
  }, [filterType, approvalFilter, fromDateFilter, toDateFilter, companyFilter]);

  useEffect(() => {
    if (id) {
      fetchQuotation();
    }
  }, [id]);

  // -------------- API / Data --------------
  async function fetchUserEmail() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserEmail(res.data.email);
    } catch (err) {
      console.error("Error fetching user email:", err);
    }
  }

  async function fetchQuotation() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch quotation");
      const data = await res.json();
      setQuotation(data);
      setEditableQuotation(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching quotation:", err);
      setError("Failed to load quotation");
    } finally {
      setLoading(false);
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (filterType === "catalogs") {
        const res = await axios.get(`${BACKEND_URL}/api/admin/catalogs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        let data =
          approvalFilter === "all"
            ? res.data
            : res.data.filter((cat) =>
                approvalFilter === "approved" ? cat.approveStatus : !cat.approveStatus
              );

        // Additional client-side filtering
        if (fromDateFilter) {
          const from = new Date(fromDateFilter);
          data = data.filter((item) => new Date(item.createdAt) >= from);
        }
        if (toDateFilter) {
          const to = new Date(toDateFilter);
          data = data.filter((item) => new Date(item.createdAt) <= to);
        }
        if (companyFilter) {
          data = data.filter((item) =>
            (item.customerCompany || item.catalogName || "")
              .toLowerCase()
              .includes(companyFilter.toLowerCase())
          );
        }
        setCatalogs(data);
      } else {
        const res = await axios.get(`${BACKEND_URL}/api/admin/quotations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        let data =
          approvalFilter === "all"
            ? res.data
            : res.data.filter((q) =>
                approvalFilter === "approved" ? q.approveStatus : !q.approveStatus
              );
        // Additional filters
        if (fromDateFilter) {
          const from = new Date(fromDateFilter);
          data = data.filter((item) => new Date(item.createdAt) >= from);
        }
        if (toDateFilter) {
          const to = new Date(toDateFilter);
          data = data.filter((item) => new Date(item.createdAt) <= to);
        }
        if (companyFilter) {
          data = data.filter((item) =>
            (item.customerCompany || item.quotationNumber || "")
              .toLowerCase()
              .includes(companyFilter.toLowerCase())
          );
        }
        setQuotations(data);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }

  // -------------- CREATE CATALOG DROPDOWN --------------
  function handleToggleDropdown() {
    setDropdownOpen((prev) => !prev);
  }

  function handleCreateManually() {
    setDropdownOpen(false);
    navigate("/admin-dashboard/catalogs/manual");
  }

  function handleCreateAI() {
    setDropdownOpen(false);
    navigate("/admin-dashboard/catalogs/ai");
  }

  // -------------- DELETES --------------
  async function handleDeleteCatalog(catalog) {
    if (!window.confirm(`Are you sure you want to delete "${catalog.catalogName}"?`))
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/catalogs/${catalog._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Catalog deleted successfully!");
      fetchData();
    } catch (error) {
      console.error("Error deleting catalog:", error);
      alert("Failed to delete catalog.");
    }
  }

  async function handleDeleteQuotation(quotation) {
    if (!window.confirm(`Are you sure you want to delete Quotation ${quotation.quotationNumber}?`))
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/quotations/${quotation._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Quotation deleted successfully!");
      fetchData();
    } catch (error) {
      console.error("Error deleting quotation:", error);
      alert("Failed to delete quotation.");
    }
  }

  function handleEditCatalog(catalog) {
    navigate(`/admin-dashboard/catalogs/manual/${catalog._id}`);
  }

  // -------------- CREATE QUOTATION FROM CATALOG --------------
  async function handleCreateQuotationFromCatalog(catalog) {
    try {
      const token = localStorage.getItem("token");
      // Build the base quotation payload from catalog data.
      const newQuotationData = {
        catalogNumber: catalog.catalogNumber,
        catalogName: catalog.catalogName,
        customerName: catalog.customerName,
        customerEmail: catalog.customerEmail,
        customerCompany: catalog.customerCompany,
        customerAddress: catalog.customerAddress,
        margin: catalog.margin,
        // Use catalog terms if provided; otherwise, leave empty so that your server can apply defaults.
        terms: catalog.terms && catalog.terms.length > 0 ? catalog.terms : [],
        items: []
      };
  
      // Process each product in the catalog sequentially.
      for (let idx = 0; idx < catalog.products.length; idx++) {
        const prod = catalog.products[idx];
        let productDoc = {};
  
        // Check if the product is already populated (i.e. an object with a 'name' property).
        if (prod.productId && typeof prod.productId === "object" && prod.productId.name) {
          productDoc = prod.productId;
        } else {
          // If not, fetch the product details from the backend.
          const response = await axios.get(`${BACKEND_URL}/api/admin/products/${prod.productId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          productDoc = response.data;
        }
  
        const rate = productDoc.productCost || 0;
        const quantity = prod.quantity || 1;
        const amount = rate * quantity;
        const gst = prod.productGST || 0;
        const gstAmount = parseFloat((amount * (gst / 100)).toFixed(2));
        const total = parseFloat((amount + gstAmount).toFixed(2));
  
        newQuotationData.items.push({
          slNo: idx + 1,
          productId: prod.productId,
          product: productDoc.name || "",
          quantity,
          rate,
          amount,
          productGST: gst,
          total,
        });
      }
  
      // Post the payload to create the quotation.
      const res = await axios.post(`${BACKEND_URL}/api/admin/quotations`, newQuotationData, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (res.status === 201) {
        alert("Quotation created successfully!");
        navigate(`/admin-dashboard/quotations/${res.data.quotation._id}`);
      } else {
        throw new Error("Quotation creation failed");
      }
    } catch (error) {
      console.error("Error creating quotation from catalog:", error);
      alert("Error creating quotation from catalog. Check console.");
    }
  }
  

  // -------------- REMARKS MODAL --------------
  const openRemarksModal = (item, type) => {
    setSelectedItemForRemarks(item);
    setItemTypeForRemarks(type);
    setRemarksModalOpen(true);
  };

  async function handleSaveRemarks(remarks, type, id) {
    try {
      const token = localStorage.getItem("token");
      const endpoint =
        type === "catalog"
          ? `${BACKEND_URL}/api/admin/catalogs/${id}/remarks`
          : `${BACKEND_URL}/api/admin/quotations/${id}/remarks`;
      await axios.put(endpoint, { remarks }, { headers: { Authorization: `Bearer ${token}` } });
      alert("Remarks updated!");
      setRemarksModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving remarks:", error);
      alert("Failed to save remarks");
    }
  }

  // -------------- EXCEL EXPORT --------------
  async function handleExportExcel(item) {
    try {
      const wb = XLSX.utils.book_new();
      // Define common fields that should always be present
      const commonFields = ["images", "productId", "name", "productDetails", "productGST(%)", "price"];
      // Get extra fields specified in fieldsToDisplay that are not in commonFields
      const extraFields = (item.fieldsToDisplay || []).filter(field => !commonFields.includes(field));
  
      // Build the header: first the common fields (mapped using fieldMapping) then extra fields.
      const header = [
        ...commonFields.map(field => fieldMapping[field] || field),
        ...extraFields.map(field => fieldMapping[field] || field)
      ];
      const data = [header];
  
      // Process each product in the catalog
      item.products?.forEach((prodObj) => {
        // p is the actual product document (populated or as is)
        const p = prodObj.productId || prodObj;
        const row = [];
  
        // --- Common Fields ---
        // 1. Images (join multiple images with a comma)
        row.push((p.images || []).join(", "));
  
        // 2. Product ID: if productId is populated as an object, extract its _id; otherwise use it directly
        let productIdVal = "N/A";
        if (p.productId) {
          productIdVal = typeof p.productId === "object" ? (p.productId._id || p.productId.id) : p.productId;
        } else if (p._id) {
          productIdVal = p._id;
        }
        row.push(productIdVal);
  
        // 3. Product Name
        row.push(p.name || "");
  
        // 4. Product Details
        row.push(p.productDetails || "");
  
        // 5. Product GST
        row.push(p.productGST !== undefined ? p.productGST : "");
  
        // 6. Price (calculate effective price if available)
        if (p.price !== undefined) {
          const effectivePrice = p.price * (1 + (item.margin || 0) / 100);
          row.push(effectivePrice.toFixed(2));
        } else {
          row.push("");
        }
  
        // --- Extra Fields ---
        extraFields.forEach(field => {
          if (field === "images") {
            row.push((p.images || []).join(", "));
          } else if (field === "price" && p.price !== undefined) {
            const effectivePrice = p.price * (1 + (item.margin || 0) / 100);
            row.push(effectivePrice.toFixed(2));
          } else if (field === "productGST") {
            row.push(p.productGST !== undefined ? p.productGST : "");
          } else {
            row.push(p[field] !== undefined ? p[field] : "");
          }
        });
  
        data.push(row);
      });
  
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Catalog");
      const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbOut], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Catalog-${item.catalogName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Excel export failed");
    }
  }
  
  // -------------- PDF EXPORT --------------
  function openPDFTemplateModal(item) {
    setSelectedItemForPDF(item);
    setPdfTemplateModalOpen(true);
  }
  
  async function handleExportCombinedPDF(catalog, templateId = "1") {
    try {
      const tmpl = templateConfig[templateId];
      if (!tmpl) {
        alert("Invalid template selection");
        return;
      }
      const pdf1Bytes = await fetch(tmpl.pdf1).then((res) => res.arrayBuffer());
      const pdf2Bytes = await fetch(tmpl.pdf2).then((res) => res.arrayBuffer());
      const pdf3Bytes = await fetch(tmpl.pdf3).then((res) => res.arrayBuffer());
  
      const pdf1Doc = await PDFDocument.load(pdf1Bytes);
      const pdf2Doc = await PDFDocument.load(pdf2Bytes);
      const pdf3Doc = await PDFDocument.load(pdf3Bytes);
  
      const newPdf = await PDFDocument.create();
      const pdf1Pages = await newPdf.copyPages(pdf1Doc, pdf1Doc.getPageIndices());
      pdf1Pages.forEach((page) => newPdf.addPage(page));
  
      const normalFont = await newPdf.embedFont(StandardFonts.Helvetica);
      const boldFont = await newPdf.embedFont(StandardFonts.HelveticaBold);
  
      // Loop over each product in the catalog
      for (let i = 0; i < (catalog.products || []).length; i++) {
        const prodObj = catalog.products[i];
        const p = prodObj.productId || prodObj;
        const [page] = await newPdf.copyPages(pdf2Doc, [0]);
        const { width, height } = page.getSize();
  
        // Product image placement
        const imageX = 250,
          imageY = height - 850,
          imageW = 600,
          imageH = 700;
        let mainImg = p.images && p.images[0] ? p.images[0] : "";
        if (mainImg && mainImg.startsWith("http://")) {
          mainImg = mainImg.replace("http://", "https://");
        }
        let imageData = "";
        if (mainImg) {
          try {
            imageData = await getBase64ImageFromUrl(mainImg);
          } catch (err) {
            console.error("Error loading product image:", err);
          }
        }
        if (imageData) {
          let embeddedImage;
          if (imageData.startsWith("data:image/png")) {
            embeddedImage = await newPdf.embedPng(imageData);
          } else {
            embeddedImage = await newPdf.embedJpg(imageData);
          }
          page.drawImage(embeddedImage, {
            x: imageX,
            y: imageY,
            width: imageW,
            height: imageH,
          });
        } else {
          page.drawRectangle({
            x: imageX,
            y: imageY,
            width: imageW,
            height: imageH,
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 1,
          });
          page.drawText("No Image", {
            x: imageX + 40,
            y: imageY + 60,
            size: 5,
            font: normalFont,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
  
        // Right-side overlay for product details
        let xText = 1000;
        let yText = height - 200;
        const lineHeight = 44;
  
        page.drawText(p.name || "", {
          x: xText,
          y: yText,
          size: 39,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yText -= lineHeight * 1.3;
        
        if (p.brandName) {
          page.drawText("Brand Name: ", {
            x: xText,
            y: yText,
            size: 25,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          page.drawText(p.brandName, {
            x: xText + 300,
            y: yText,
            size: 25,
            font: normalFont,
            color: rgb(0, 0, 0),
          });
          yText -= lineHeight;
        }
        
        if (p.productDetails) {
          page.drawText("Description:", {
            x: xText,
            y: yText,
            size: 25,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          yText -= lineHeight;
          const wrapped = wrapText(p.productDetails, 200, normalFont, 7);
          wrapped.forEach((line) => {
            page.drawText(line, {
              x: xText,
              y: yText,
              size: 25,
              font: normalFont,
              color: rgb(0, 0, 0),
            });
            yText -= lineHeight;
          });
          yText -= lineHeight * 0.5;
        }
        
        if (p.qty) {
          page.drawText("Qty: ", {
            x: xText,
            y: yText,
            size: 25,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          page.drawText(String(p.qty), {
            x: xText + 300,
            y: yText,
            size: 25,
            font: normalFont,
            color: rgb(0, 0, 0),
          });
          yText -= lineHeight;
        }
        
        if (p.productCost !== undefined) {
          const baseCost = p.productCost || 0;
          const margin = catalog.margin || 0;
          const effPrice = baseCost * (1 + margin / 100);
          page.drawText("Rate in INR (per pc): ", {
            x: xText,
            y: yText,
            size: 25,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          page.drawText(`${effPrice.toFixed(2)}/-`, {
            x: xText + 300,
            y: yText,
            size: 25,
            font: normalFont,
            color: rgb(0, 0, 0),
          });
          yText -= lineHeight;
        }
        
        // Updated block: Always check for productGST
        if (p.productGST !== undefined) {
          page.drawText("GST: ", {
            x: xText,
            y: yText,
            size: 25,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          page.drawText(String(p.productGST) + "%", {
            x: xText + 300,
            y: yText,
            size: 25,
            font: normalFont,
            color: rgb(0, 0, 0),
          });
          yText -= lineHeight;
        }
        newPdf.addPage(page);
      }
  
      const pdf3Pages = await newPdf.copyPages(pdf3Doc, pdf3Doc.getPageIndices());
      pdf3Pages.forEach((page) => newPdf.addPage(page));
  
      const finalPdfBytes = await newPdf.save();
      const blob = new Blob([finalPdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Catalog-${catalog.catalogName}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Combined PDF export error:", error);
      alert("Combined PDF export failed");
    }
  }
  
  // -------------- VIRTUAL LINK --------------
  function handleVirtualLink(item) {
    const link = `${window.location.origin}/catalog/${item._id}`;
    window.open(link, "_blank");
  }
  
  function handleCopyLink(item) {
    const link = `${window.location.origin}/catalog/${item._id}`;
    navigator.clipboard
      .writeText(link)
      .then(() => alert("Virtual link copied to clipboard!"))
      .catch((err) => {
        console.error("Error copying link:", err);
        alert("Failed to copy link");
      });
  }
  
  // -------------- SEARCH + SUGGESTIONS --------------
  const getUniqueCompanyNames = () => {
    const companySet = new Set();
    catalogs.forEach((c) => {
      if (c.customerCompany) companySet.add(c.customerCompany);
    });
    quotations.forEach((q) => {
      if (q.customerCompany) companySet.add(q.customerCompany);
    });
    return Array.from(companySet);
  };
  const companyNames = getUniqueCompanyNames();
  
  const filterSuggestions = (input) => {
    if (!input) {
      setSuggestions([]);
      return;
    }
    const filtered = companyNames.filter((name) =>
      name.toLowerCase().includes(input.toLowerCase())
    );
    setSuggestions(filtered);
  };
  
  const handleSearch = () => {
    setCompanyFilter(searchTerm);
    setSuggestions([]);
  };
  
  // -------------- FILTERS UI --------------
  const renderFilterButtons = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
      <div className="flex space-x-4 mb-2 sm:mb-0">
        <button
          onClick={() => setFilterType("catalogs")}
          className={`px-4 py-2 rounded ${
            filterType === "catalogs" ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-900"
          }`}
        >
          Catalogs
        </button>
        <button
          onClick={() => setFilterType("quotations")}
          className={`px-4 py-2 rounded ${
            filterType === "quotations" ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-900"
          }`}
        >
          Quotations
        </button>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => setApprovalFilter("all")}
          className={`px-3 py-1 rounded ${
            approvalFilter === "all" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-900"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setApprovalFilter("approved")}
          className={`px-3 py-1 rounded ${
            approvalFilter === "approved" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-900"
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setApprovalFilter("notApproved")}
          className={`px-3 py-1 rounded ${
            approvalFilter === "notApproved" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-900"
          }`}
        >
          Not Approved
        </button>
      </div>
    </div>
  );
  
  const renderFilterControls = () => (
    <div className="flex flex-wrap gap-4 items-center mb-4">
      <div className="flex flex-col">
        <label htmlFor="fromDate" className="mb-1 text-gray-700">
          From Date
        </label>
        <input
          id="fromDate"
          type="date"
          value={fromDateFilter}
          onChange={(e) => setFromDateFilter(e.target.value)}
          className="border p-2"
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="toDate" className="mb-1 text-gray-700">
          To Date
        </label>
        <input
          id="toDate"
          type="date"
          value={toDateFilter}
          onChange={(e) => setToDateFilter(e.target.value)}
          className="border p-2"
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="companyName" className="mb-1 text-gray-700">
          Company Name
        </label>
        <div className="flex items-center">
          <input
            id="companyName"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              filterSuggestions(e.target.value);
            }}
            className="border p-2"
            placeholder="Company Name"
          />
          <button onClick={handleSearch} className="ml-2 bg-blue-600 text-white p-2 rounded">
            Search
          </button>
        </div>
        <div className="bg-white border border-gray-300 mt-1 rounded shadow-md">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-2 cursor-pointer hover:bg-gray-200"
              onClick={() => {
                setSearchTerm(suggestion);
                setSuggestions([]);
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  
  // -------------- RENDER DATA --------------
  const filterData = (data) => {
    if (!companyFilter) return data;
    return data.filter((item) =>
      (item.customerCompany || item.catalogName || item.quotationNumber || "")
        .toLowerCase()
        .includes(companyFilter.toLowerCase())
    );
  };
  
  const renderCatalogList = () => {
    const filteredCatalogs = filterData(catalogs);
    if (filteredCatalogs.length === 0) {
      return <div className="text-gray-600">Nothing to display.</div>;
    }
    const grouped = groupItemsByDate(filteredCatalogs);
    return (
      <div>
        {Object.entries(grouped).map(([groupName, items]) =>
          items.length > 0 ? (
            <div key={groupName} className="mb-6">
              <h3 className="text-lg font-bold mb-2">{groupName}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Catalog Number
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Company
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Customer Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Products
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((cat) => (
                      <tr key={cat._id}>
                        <td className="px-4 py-2">{cat.catalogNumber}</td>
                        <td
                          className="px-4 py-2 underline cursor-pointer"
                          onClick={() => handleVirtualLink(cat)}
                        >
                          {cat.customerCompany || cat.catalogName}
                        </td>
                        <td className="px-4 py-2">{cat.customerName}</td>
                        <td className="px-4 py-2">{cat.products?.length || 0}</td>
                        <td className="px-4 py-2 space-x-2">
                          <button
                            onClick={() => handleExportExcel(cat)}
                            className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                          >
                            Excel
                          </button>
                          <button
                            onClick={() => openPDFTemplateModal(cat)}
                            className="px-2 py-1 bg-pink-600 text-white rounded text-xs hover:bg-pink-700"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => handleVirtualLink(cat)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Virtual
                          </button>
                          <button
                            onClick={() => handleCopyLink(cat)}
                            className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => handleEditCatalog(cat)}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                          >
                            Edit
                          </button>
                          {/* New Create Quotation Button */}
                          <button
                            onClick={() => handleCreateQuotationFromCatalog(cat)}
                            className="px-2 py-1 bg-teal-600 text-white rounded text-xs hover:bg-teal-700"
                          >
                            Create Quotation
                          </button>
                          <button
                            onClick={() => openRemarksModal(cat, "catalog")}
                            className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                          >
                            Remarks
                          </button>
                          <button
                            onClick={() => handleDeleteCatalog(cat)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null
        )}
      </div>
    );
  };
  
  const renderQuotationList = () => {
    if (quotations.length === 0) {
      return <div className="text-gray-600">Nothing to display.</div>;
    }
    const groupedQuotations = groupQuotationsByTimePeriod(quotations);
    return (
      <div>
        {groupedQuotations.map(({ period, all }) => (
          <div key={period} className="mb-6">
            <h3 className="text-lg font-bold mb-2">{period}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Quotation No.
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Company Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Items
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {all.map((quotation) => (
                    <tr key={quotation._id}>
                      <td className="px-4 py-2">{quotation.quotationNumber}</td>
                      <td className="px-4 py-2">
                        {quotation.customerCompany || "N/A"}
                      </td>
                      <td className="px-4 py-2">{quotation.customerName}</td>
                      <td className="px-4 py-2">{quotation.customerEmail}</td>
                      <td className="px-4 py-2">
                        {quotation.items?.length || 0}
                      </td>
                      <td className="px-4 py-2 space-x-2">
                        <button
                          onClick={() =>
                            navigate(`/admin-dashboard/quotations/${quotation._id}`)
                          }
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteQuotation(quotation)}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // -------------- MAIN RENDER --------------
  if (loading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-400">{error}</div>;
  }
  
  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      {renderFilterButtons()}
      {renderFilterControls()}
  
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {filterType === "catalogs" ? "Manage Catalogs" : "Manage Quotations"}
        </h1>
        {filterType === "catalogs" && (
          <div className="relative inline-block text-left">
            <button
              onClick={handleToggleDropdown}
              className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 text-white"
            >
              Create Catalog
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-purple-200 rounded shadow-md p-2 z-50">
                <button
                  onClick={handleCreateManually}
                  className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm text-gray-900"
                >
                  Create Manually
                </button>
                <button
                  onClick={handleCreateAI}
                  className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm text-gray-900"
                >
                  AI Generated
                </button>
              </div>
            )}
          </div>
        )}
      </div>
  
      {filterType === "catalogs" ? renderCatalogList() : renderQuotationList()}
  
      {remarksModalOpen && selectedItemForRemarks && (
        <RemarksModal
          item={selectedItemForRemarks}
          type={itemTypeForRemarks}
          onClose={() => setRemarksModalOpen(false)}
          onSave={handleSaveRemarks}
          userEmail={userEmail}
        />
      )}
  
      {pdfTemplateModalOpen && selectedItemForPDF && (
        <PDFTemplateModal
          onSelect={(templateId) => {
            setPdfTemplateModalOpen(false);
            handleExportCombinedPDF(selectedItemForPDF, templateId);
          }}
          onClose={() => setPdfTemplateModalOpen(false)}
        />
      )}
    </div>
  );
}
