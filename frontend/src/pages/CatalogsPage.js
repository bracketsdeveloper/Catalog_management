// src/pages/CatalogManagementPage.jsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as XLSX from "xlsx";

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
  groupQuotationsByTimePeriod
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

  // Track which catalog's three-dots dropdown is open
  const [openDropdownForCatalog, setOpenDropdownForCatalog] = useState(null);
  const [selectedCatalogForDropdown, setSelectedCatalogForDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownButtonRef = useRef(null);

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

  // Close the dropdown if clicking anywhere outside
  useEffect(() => {
    function handleDocumentClick() {
      setOpenDropdownForCatalog(null);
      setSelectedCatalogForDropdown(null);
      dropdownButtonRef.current = null;
    }
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  // Update dropdown position on scroll/resize using a layout effect
  useLayoutEffect(() => {
    function updatePosition() {
      if (!dropdownButtonRef.current) return;
      const rect = dropdownButtonRef.current.getBoundingClientRect();
      // Approximate dropdown height
      const dropdownHeight = 200;
      let top;
      if (window.innerHeight - rect.bottom < dropdownHeight) {
        // Not enough space below, position above the button
        top = rect.top + window.pageYOffset - dropdownHeight;
      } else {
        top = rect.bottom + window.pageYOffset;
      }
      setDropdownPosition({
        top,
        left: rect.left + window.pageXOffset,
      });
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  // LIFECYCLE
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
    if (!window.confirm(`Are you sure you want to delete "${catalog.catalogName}"?`)) return;
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
    if (!window.confirm(`Are you sure you want to delete Quotation ${quotation.quotationNumber}?`)) return;
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

  function handleEditQuotation(quotation) {
    navigate(`/admin-dashboard/quotation/manual/${quotation._id}`);
  }

  function handleEditQuotationold(quotation) {
    navigate(`/admin-dashboard/oldquotation/manual/${quotation._id}`);
  }

  // -------------- CREATE QUOTATION FROM CATALOG --------------
  async function handleCreateQuotationFromCatalog(catalog) {
    try {
      const token = localStorage.getItem("token");
      const newQuotationData = {
        catalogId: catalog._id,
        opportunityNumber: catalog.opportunityNumber || "",
        catalogName: catalog.catalogName || "",
        salutation: catalog.salutation || "Mr.",
        customerName: catalog.customerName || "",
        customerEmail: catalog.customerEmail || "",
        customerCompany: catalog.customerCompany || "",
        customerAddress: catalog.customerAddress || "",
        margin: catalog.margin || 0,
        gst: catalog.gst || 18,
        fieldsToDisplay: catalog.fieldsToDisplay || [],
        terms: catalog.terms && Array.isArray(catalog.terms) ? catalog.terms : [],
        displayTotals: true,
        displayHSNCodes: true,
        items: catalog.products.map((prod, idx) => {
          const baseCost = prod.productCost || 0;
          const quantity = prod.quantity || 1;
          const marginFactor = 1 + (catalog.margin || 0) / 100;
          const rate = parseFloat((baseCost * marginFactor).toFixed(2));
          const amount = parseFloat((rate * quantity).toFixed(2));
          const gst = prod.productGST || catalog.gst || 18;
          const gstAmount = parseFloat((amount * (gst / 100)).toFixed(2));
          const total = parseFloat((amount + gstAmount).toFixed(2));
          const productName = prod.productName || (prod.productId && typeof prod.productId === "object" ? prod.productId.name : "");
          return {
            slNo: idx + 1,
            productId: prod.productId,
            product: `${productName}${prod.color ? `(${prod.color})` : ""}${prod.size ? `[${prod.size}]` : ""}`,
            hsnCode: prod.hsnCode || "",
            quantity,
            rate,
            productprice: baseCost,
            amount,
            productGST: gst,
            total,
            material: prod.material || "",
            weight: prod.weight || "",
            brandingTypes: Array.isArray(prod.brandingTypes) ? prod.brandingTypes : [],
            suggestedBreakdown: prod.suggestedBreakdown || {
              baseCost: 0,
              marginPct: 0,
              marginAmount: 0,
              logisticsCost: 0,
              brandingCost: 0,
              finalPrice: 0,
            },
            imageIndex: prod.imageIndex || 0,
          };
        }),
      };

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
      const commonFields = [
        "images",
        "productId",
        "productName",
        "ProductDescription",
        "ProductBrand",
        "productGST",
        "productCost"
      ];
      const extraFields = (item.fieldsToDisplay || []).filter(field => !commonFields.includes(field));
      const header = [
        ...commonFields.map(field => fieldMapping[field] || field),
        ...extraFields.map(field => fieldMapping[field] || field)
      ];
      const data = [header];
      item.products?.forEach((prodObj) => {
        const p = prodObj;
        const row = [];
        row.push((p.images || []).join(", "));
        row.push(p.productId ? p.productId.toString() : "N/A");
        row.push(p.productName || "");
        row.push(p.ProductDescription || "");
        row.push(p.ProductBrand || "");
        row.push(p.productGST !== undefined ? p.productGST : "");
        if (p.productCost !== undefined) {
          const effectiveCost = p.productCost * (1 + (item.margin || 0) / 100);
          row.push(effectiveCost.toFixed(2));
        } else {
          row.push("");
        }
        extraFields.forEach(field => {
          if (field === "images") {
            row.push((p.images || []).join(", "));
          } else if (field === "productCost" && p.productCost !== undefined) {
            const effectiveCost = p.productCost * (1 + (item.margin || 0) / 100);
            row.push(effectiveCost.toFixed(2));
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

      // Combine the second PDF for each product
      for (let i = 0; i < (catalog.products || []).length; i++) {
        const sub = catalog.products[i];
        const prod = (sub.productId && typeof sub.productId === "object") ? sub.productId : {};

        const [page] = await newPdf.copyPages(pdf2Doc, [0]);
        const { width, height } = page.getSize();
        const fixedHeight = 550;
        const imageX = 100;
        const imageY = height - 780;
        let mainImg = (prod.images && prod.images[0]) || (sub.images && sub.images[0]) || "";
        if (mainImg && mainImg.startsWith("http://")) {
          mainImg = mainImg.replace("http://", "https://");
        }
        let imageData = "";
        if (mainImg) {
          try {
            imageData = await getBase64ImageFromUrl(mainImg);
          } catch (err) {
            console.error("Error fetching product image:", err);
          }
        }
        if (imageData) {
          let embeddedImage;
          if (imageData.startsWith("data:image/png")) {
            embeddedImage = await newPdf.embedPng(imageData);
          } else {
            embeddedImage = await newPdf.embedJpg(imageData);
          }
          const autoWidth = (embeddedImage.width / embeddedImage.height) * fixedHeight;
          page.drawImage(embeddedImage, { x: imageX, y: imageY, width: autoWidth, height: fixedHeight });
        } else {
          page.drawRectangle({
            x: imageX,
            y: imageY,
            width: 600,
            height: fixedHeight,
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

        let xText = 1000;
        let yText = height - 200;
        const lineHeight = 48;
        page.drawText(prod.name || sub.productName || "", {
          x: xText,
          y: yText,
          size: 32,
          font: boldFont,
          color: rgb(0, 0, 0),
          maxWidth: 800,
        });
        yText -= lineHeight * 2;

        if (prod.ProductBrand || sub.ProductBrand) {
          page.drawText("Brand Name: ", {
            x: xText,
            y: yText,
            size: 25,
            font: boldFont,
            color: rgb(0, 0, 0),
            maxWidth: 800,
          });
          page.drawText(prod.ProductBrand || sub.ProductBrand || "", {
            x: xText + 210,
            y: yText,
            size: 25,
            font: normalFont,
            color: rgb(0, 0, 0),
            maxWidth: 800,
          });
          yText -= lineHeight;
        }

        if (prod.ProductDescription || sub.ProductDescription) {
          page.drawText("Description:", {
            x: xText,
            y: yText,
            size: 25,
            font: boldFont,
            color: rgb(0, 0, 0),
            maxWidth: 800,
          });
          yText -= lineHeight;

          const descriptionText = (prod.ProductDescription || sub.ProductDescription || "").replace(/\n/g, " ");
          const wrapped = wrapText(descriptionText, 500, normalFont, 7);
          wrapped.forEach((line) => {
            page.drawText(line, {
              x: xText,
              y: yText,
              size: 20,
              font: normalFont,
              color: rgb(0, 0, 0),
              maxWidth: 800,
            });
            yText -= lineHeight;
          });
          yText -= lineHeight * 0.5; // Additional spacing after description
        }

        if (sub.quantity) {
          page.drawText("Qty: ", {
            x: xText,
            y: yText,
            size: 25,
            font: boldFont,
            color: rgb(0, 0, 0),
            maxWidth: 800,
          });
          page.drawText(String(sub.quantity), {
            x: xText + 110,
            y: yText,
            size: 25,
            font: normalFont,
            color: rgb(0, 0, 0),
            maxWidth: 800,
          });
          yText -= lineHeight;
        }

        if (sub.productCost !== undefined) {
          const baseCost = sub.productCost;
          const margin = catalog.margin || 0;
          const effPrice = baseCost * (1 + margin / 100);
          page.drawText("Rate in INR (per pc): ", {
            x: xText,
            y: yText,
            size: 25,
            font: boldFont,
            color: rgb(0, 0, 0),
            maxWidth: 800,
          });
          page.drawText(`${effPrice.toFixed(2)}/-`, {
            x: xText + 310,
            y: yText,
            size: 25,
            font: normalFont,
            color: rgb(0, 0, 0),
            maxWidth: 800,
          });
          yText -= lineHeight;
        }

        if (sub.productGST !== undefined) {
          page.drawText("GST: ", {
            x: xText,
            y: yText,
            size: 25,
            font: boldFont,
            color: rgb(0, 0, 0),
            maxWidth: 800,
          });
          page.drawText(String(sub.productGST) + "%", {
            x: xText + 110,
            y: yText,
            size: 25,
            font: normalFont,
            color: rgb(0, 0, 0),
            maxWidth: 800,
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

  // -------------- Three Dots Dropdown for Catalog --------------
  function toggleCatalogDropdown(id, e) {
    e.stopPropagation();
    dropdownButtonRef.current = e.currentTarget;
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 200;
    let top;
    if (window.innerHeight - rect.bottom < dropdownHeight) {
      top = rect.top + window.pageYOffset - dropdownHeight;
    } else {
      top = rect.bottom + window.pageYOffset;
    }
    setDropdownPosition({
      top,
      left: rect.left + window.pageXOffset,
    });
    setSelectedCatalogForDropdown(catalogs.find((cat) => cat._id === id));
    setOpenDropdownForCatalog(id === openDropdownForCatalog ? null : id);
  }

  async function handleDuplicateCatalog(catalog) {
    try {
      const token = localStorage.getItem("token");
      const duplicatedCatalog = { ...catalog };
      delete duplicatedCatalog._id;
      delete duplicatedCatalog.createdAt;
      duplicatedCatalog.catalogNumber = `${duplicatedCatalog.catalogNumber}-copy-${Date.now()}`;

      const res = await axios.post(`${BACKEND_URL}/api/admin/catalogs`, duplicatedCatalog, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 201) {
        alert("Catalog duplicated successfully!");
        fetchData();
      } else {
        throw new Error("Failed to duplicate catalog");
      }
    } catch (error) {
      console.error("Error duplicating catalog:", error);
      alert("Failed to duplicate catalog.");
    }
  }

  // -------------- SEARCH SUGGESTIONS --------------
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

  // -------------- RENDER HELPERS --------------
  const renderFilterButtons = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
      <div className="flex space-x-4 mb-2 sm:mb-0">
        <button
          onClick={() => setFilterType("catalogs")}
          className={`px-4 py-2 rounded ${
            filterType === "catalogs" ? "bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white" : "bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white"
          }`}
        >
          Catalogs
        </button>
        <button
          onClick={() => setFilterType("quotations")}
          className={`px-4 py-2 rounded ${
            filterType === "quotations" ? "bg-[#66C3D0] hover:bg-[#66C3D0]/90 text-white" : "bg-[#66C3D0] hover:bg-[#66C3D0]/90 text-white"
          }`}
        >
          Quotations
        </button>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => setApprovalFilter("all")}
          className={`px-3 py-1 rounded ${
            approvalFilter === "all" ? "bg-[#66C3D0] text-white" : "bg-[#66C3D0] text-white"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setApprovalFilter("approved")}
          className={`px-3 py-1 rounded ${
            approvalFilter === "approved" ? "bg-[#44b977] text-white" : "bg-[#44b977] text-white"
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setApprovalFilter("notApproved")}
          className={`px-3 py-1 rounded ${
            approvalFilter === "notApproved" ? "bg-[#e73d3e] text-white" : "bg-[#e73d3e] text-white"
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
          <button onClick={handleSearch} className="ml-2 bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white p-2 rounded">
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
            <div key={groupName} className="mb-6 ">
              <h3 className="text-lg font-bold mb-2">{groupName}</h3>
              <div className="overflow-x-auto ">
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-orange-200 text-Black">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium  uppercase">
                        Catalog Number
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase">
                        Company Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase">
                        Customer Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium  uppercase">
                        Event Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase">
                        Products
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                   {[...items]
                      .sort((a, b) => (a.catalogNumber < b.catalogNumber ? 1 : -1)) // Descending order
                      .map((cat) => (
                        <tr key={cat._id}>
                          <td className="px-4 py-2">{cat.catalogNumber}</td>
                          <td className="px-4 py-2">{cat.customerCompany}</td> 
                         <td className="px-4 py-2">{cat.customerName}</td>
                          <td
                          className="px-4 py-2 underline cursor-pointer"
                          onClick={() => handleVirtualLink(cat)}
                        >
                          {cat.catalogName}
                        </td>
                        <td className="px-4 py-2">{cat.products?.length || 0}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCatalogForDropdown(cat);
                              toggleCatalogDropdown(cat._id, e);
                            }}
                            className="px-2 py-1 hover:bg-gray-200 rounded"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v.01M12 12v.01M12 18v.01" />
                            </svg>
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
    const filteredQuotations = filterData(quotations);
    if (filteredQuotations.length === 0) {
      return <div className="text-gray-600">Nothing to display.</div>;
    }
    const grouped = groupItemsByDate(filteredQuotations);
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
                        Quotation No.
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Event Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Company Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Customer Name
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
                    {items.map((quotation) => (
                      <tr key={quotation._id}>
                        
                        <td className="px-4 py-2">{quotation.quotationNumber} </td>
                        <td className="px-4 py-2">{quotation.catalogName || "N/A"}</td>
                        <td className="px-4 py-2">{quotation.customerCompany || "N/A"}{quotation.quotationNumber < 10496 && (<>(old quotation)</>)}</td>
                        <td className="px-4 py-2">{quotation.customerName}</td>
                        <td className="px-4 py-2">{quotation.items?.length || 0}</td>
                        <td className="px-4 py-2 space-x-2">
                          <button
                            onClick={() => navigate(`/admin-dashboard/quotations/${quotation._id}`)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            View
                          </button>
                          
                          {quotation.quotationNumber >= 10496 && (
                            <button
                            onClick={() => handleEditQuotation(quotation)}
                            className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                          >
                            Edit
                          </button>
                          )}
                          {quotation.quotationNumber < 10496 && (
                            <button
                              onClick={() => handleEditQuotationold(quotation)}
                              className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                            >
                              Edit
                            </button>
                          )}
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
          ) : null
        )}
      </div>
    );
  };

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
              className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 px-4 py-2 rounded hover:bg-blue-700 text-white"
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

      {/* Catalog actions dropdown via a portal */}
      {openDropdownForCatalog && selectedCatalogForDropdown &&
        createPortal(
          <div
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              position: "absolute",
              zIndex: 9999,
            }}
            className="w-48 bg-white border border-gray-200 rounded shadow-md p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExportExcel(selectedCatalogForDropdown);
                setOpenDropdownForCatalog(null);
                setSelectedCatalogForDropdown(null);
                dropdownButtonRef.current = null;
              }}
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
            >
              Excel
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openPDFTemplateModal(selectedCatalogForDropdown);
                setOpenDropdownForCatalog(null);
                setSelectedCatalogForDropdown(null);
                dropdownButtonRef.current = null;
              }}
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
            >
              PDF
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleVirtualLink(selectedCatalogForDropdown);
                setOpenDropdownForCatalog(null);
                setSelectedCatalogForDropdown(null);
                dropdownButtonRef.current = null;
              }}
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
            >
              Virtual
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyLink(selectedCatalogForDropdown);
                setOpenDropdownForCatalog(null);
                setSelectedCatalogForDropdown(null);
                dropdownButtonRef.current = null;
              }}
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
            >
              Copy
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditCatalog(selectedCatalogForDropdown);
                setOpenDropdownForCatalog(null);
                setSelectedCatalogForDropdown(null);
                dropdownButtonRef.current = null;
              }}
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateQuotationFromCatalog(selectedCatalogForDropdown);
                setOpenDropdownForCatalog(null);
                setSelectedCatalogForDropdown(null);
                dropdownButtonRef.current = null;
              }}
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
            >
              Create Quotation
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openRemarksModal(selectedCatalogForDropdown, "catalog");
                setOpenDropdownForCatalog(null);
                setSelectedCatalogForDropdown(null);
                dropdownButtonRef.current = null;
              }}
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
            >
              Remarks
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCatalog(selectedCatalogForDropdown);
                setOpenDropdownForCatalog(null);
                setSelectedCatalogForDropdown(null);
                dropdownButtonRef.current = null;
              }}
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
            >
              Delete
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicateCatalog(selectedCatalogForDropdown);
                setOpenDropdownForCatalog(null);
                setSelectedCatalogForDropdown(null);
                dropdownButtonRef.current = null;
              }}
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
            >
              Duplicate
            </button>
          </div>,
          document.body
        )
      }
    </div>
  );
}

// ----------------------- Reusable Inline Editing Component -----------------------
function EditableField({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleIconClick = () => setEditing(true);
  const handleBlur = () => {
    setEditing(false);
    onSave(currentValue);
  };

  if (editing) {
    return (
      <input
        type="text"
        className="border p-1 rounded"
        autoFocus
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
      />
    );
  }

  return (
    <div className="flex items-center">
      <span>{currentValue}</span>
      <button onClick={handleIconClick} className="ml-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 4h2M12 5v6m-7 7h14a2 2 0 002-2v-5a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2z"
          />
        </svg>
      </button>
    </div>
  );
}

// ----------------------- Helper Functions to Compute Totals -----------------------
function computedAmount(quotation) {
  let sum = 0;
  quotation.items.forEach((item) => {
    const marginFactor = 1 + ((parseFloat(quotation.margin) || 0) / 100);
    const baseRate = parseFloat(item.rate) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    sum += baseRate * marginFactor * quantity;
  });
  return sum;
}

function computedTotal(quotation) {
  let sum = 0;
  quotation.items.forEach((item) => {
    const marginFactor = 1 + ((parseFloat(quotation.margin) || 0) / 100);
    const baseRate = parseFloat(item.rate) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    const amount = baseRate * marginFactor * quantity;
    const gstVal = parseFloat((amount * (parseFloat(item.productGST) / 100)).toFixed(2));
    sum += amount + gstVal;
  });
  return sum;
}

// ----------------------- VARIATION EDIT MODAL -----------------------
function VariationEditModal({ item, onClose, onUpdate }) {
  const [name, setName] = useState(item.productName || item.name || "");
  const [productCost, setProductCost] = useState(item.productCost || 0);
  const [productGST, setProductGST] = useState(item.productGST || 0);
  const [color, setColor] = useState(item.color || "");
  const [size, setSize] = useState(item.size || "");
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [material, setMaterial] = useState(item.material || "");
  const [weight, setWeight] = useState(item.weight || "");

  const handleSave = () => {
    const parsedCost = parseFloat(productCost);
    const finalCost = isNaN(parsedCost) || parsedCost === 0 ? item.productprice : parsedCost;
    const parsedGST = parseFloat(productGST);
    const finalGST = isNaN(parsedGST) ? item.productGST : parsedGST;
    const updatedItem = {
      name: item.productName || name,
      productCost: finalCost,
      productprice: finalCost,
      productGST: finalGST,
      color,
      size,
      quantity: parseInt(quantity) || item.quantity || 1,
      material,
      weight,
    };
    console.log("Updated item from VariationEditModal:", updatedItem);
    onUpdate(updatedItem);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border border-gray-200 shadow-lg">
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-600 hover:text-gray-900">
            <span className="text-xl font-bold">×</span>
          </button>
          <h2 className="text-xl font-bold mb-4 text-purple-700">Edit Cart Item</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Product Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Cost</label>
              <input
                type="number"
                value={productCost}
                onChange={(e) => setProductCost(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">GST (%)</label>
              <input
                type="number"
                value={productGST}
                onChange={(e) => setProductGST(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Color</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Size</label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Material</label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Weight</label>
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-2">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}