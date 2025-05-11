"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as XLSX from "xlsx";

// Sub-components
import RemarksModal from "../components/CatalogManagement/RemarksModal";
import PDFTemplateModal from "../components/CatalogManagement/PDFTemplateModal";

// Utility modules
import {
  getBase64ImageFromUrl,
  wrapText,
} from "../components/CatalogManagement/exportUtils";
import { groupItemsByDate } from "../components/CatalogManagement/dateUtils";

import { fieldMapping, templateConfig } from "../components/CatalogManagement/constants";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function CatalogManagementPage() {
  const navigate = useNavigate();

  // States for catalogs and opportunities
  const [catalogs, setCatalogs] = useState([]);
  const [opportunities, setOpportunities] = useState([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & approval states
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [fromDateFilter, setFromDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState([]);
  const [opportunityOwnerFilter, setOpportunityOwnerFilter] = useState([]);
  const [showFilterWindow, setShowFilterWindow] = useState(false);

  // Sorting states
  const [sortConfig, setSortConfig] = useState({
    key: "catalogNumber",
    direction: "desc",
  });

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

  // PDF Template modal
  const [pdfTemplateModalOpen, setPdfTemplateModalOpen] = useState(false);
  const [selectedItemForPDF, setSelectedItemForPDF] = useState(null);

  // Current user email
  const [userEmail, setUserEmail] = useState("");

  // Search input
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // Current user role
  const [userRole, setUserRole] = useState("");

  // Superadmin status
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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

  // Update dropdown position on scroll/resize
  useLayoutEffect(() => {
    function updatePosition() {
      if (!dropdownButtonRef.current) return;
      const rect = dropdownButtonRef.current.getBoundingClientRect();
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
    fetchOpportunities();
  }, [approvalFilter, fromDateFilter, toDateFilter, companyFilter, opportunityOwnerFilter, searchTerm]);

  // -------------- API / Data --------------
  async function fetchUserEmail() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserEmail(res.data.email);
      setIsSuperAdmin(localStorage.getItem("isSuperAdmin") === "true");
    } catch (err) {
      console.error("Error fetching user email:", err);
    }
  }

  async function fetchOpportunities() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/opportunities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOpportunities(res.data);
    } catch (err) {
      console.error("Error fetching opportunities:", err);
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
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
      if (companyFilter.length > 0) {
        data = data.filter((item) =>
          companyFilter.includes(item.customerCompany)
        );
      }
      if (opportunityOwnerFilter.length > 0) {
        const filteredOpportunities = opportunities.filter((opp) =>
          opportunityOwnerFilter.includes(opp.opportunityOwner)
        );
        const opportunityCodes = filteredOpportunities.map((opp) => opp.opportunityCode);
        data = data.filter((cat) => opportunityCodes.includes(cat.opportunityNumber));
      }
      if (searchTerm) {
        data = data.filter((cat) => {
          const opp = opportunities.find((o) => o.opportunityCode === cat.opportunityNumber);
          return (
            cat.catalogNumber.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
            (cat.customerCompany || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (cat.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (cat.catalogName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (cat.opportunityNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (opp?.opportunityOwner || "").toLowerCase().includes(searchTerm.toLowerCase())
          );
        });
      }
      setCatalogs(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching catalogs:", err);
      setError("Failed to fetch catalogs");
    } finally {
      setLoading(false);
    }
  }

  // -------------- Sorting --------------
  const handleSort = (key, isDate = false) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sortedCatalogs = [...catalogs].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];

      if (key === "opportunityOwner") {
        const oppA = opportunities.find((o) => o.opportunityCode === a.opportunityNumber);
        const oppB = opportunities.find((o) => o.opportunityCode === b.opportunityNumber);
        valA = oppA?.opportunityOwner || "";
        valB = oppB?.opportunityOwner || "";
      } else if (key === "products.length") {
        valA = (a.products || []).length;
        valB = (b.products || []).length;
      }

      if (isDate) {
        valA = new Date(valA || 0);
        valB = new Date(valB || 0);
      } else {
        valA = (valA || "").toString().toLowerCase();
        valB = (valB || "").toString().toLowerCase();
      }

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setCatalogs(sortedCatalogs);
  };

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

  function handleEditCatalog(catalog) {
    navigate(`/admin-dashboard/catalogs/manual/${catalog._id}`);
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
  const openRemarksModal = (item) => {
    setSelectedItemForRemarks(item);
    setRemarksModalOpen(true);
  };

  async function handleSaveRemarks(remarks, _, id) {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BACKEND_URL}/api/admin/catalogs/${id}/remarks`,
        { remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
        "productCost",
      ];
      const extraFields = (item.fieldsToDisplay || []).filter((field) => !commonFields.includes(field));
      const header = [
        ...commonFields.map((field) => fieldMapping[field] || field),
        ...extraFields.map((field) => fieldMapping[field] || field),
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
        extraFields.forEach((field) => {
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
          yText -= lineHeight * 0.5;
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
    setCompanyFilter([]); // Clear company filter to allow global search
    fetchData();
    setSuggestions([]);
  };

  // -------------- RENDER HELPERS --------------
  const renderFilterButtons = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
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
        <button
          onClick={() => setShowFilterWindow(true)}
          className="px-3 py-1 rounded bg-[#Ff8045] text-white hover:bg-[#Ff8045]/90"
        >
          Filters
        </button>
      </div>
    </div>
  );

  const renderFilterWindow = () => {
    // Get unique opportunity owners and company names
    const uniqueOpportunityOwners = [...new Set(opportunities.map(opp => opp.opportunityOwner))];
    const uniqueCompanyNames = [...new Set(catalogs.map(cat => cat.customerCompany))];

    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
        <div className="flex items-center justify-center min-h-full py-8 px-4">
          <div className="bg-white p-6 rounded w-full max-w-md relative border border-gray-200 shadow-lg">
            <button
              onClick={() => setShowFilterWindow(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
            >
              <span className="text-xl font-bold">×</span>
            </button>
            <h2 className="text-xl font-bold mb-4 text-[#Ff8045]">Filters</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Owner</label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2">
                  {uniqueOpportunityOwners.map((owner, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`owner-${index}`}
                        value={owner}
                        checked={opportunityOwnerFilter.includes(owner)}
                        onChange={(e) => {
                          const selected = e.target.checked
                            ? [...opportunityOwnerFilter, owner]
                            : opportunityOwnerFilter.filter((item) => item !== owner);
                          setOpportunityOwnerFilter(selected);
                        }}
                        className="mr-2"
                      />
                      <label htmlFor={`owner-${index}`} className="text-sm text-gray-700">
                        {owner}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2">
                  {uniqueCompanyNames.map((company, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`company-${index}`}
                        value={company}
                        checked={companyFilter.includes(company)}
                        onChange={(e) => {
                          const selected = e.target.checked
                            ? [...companyFilter, company]
                            : companyFilter.filter((item) => item !== company);
                          setCompanyFilter(selected);
                        }}
                        className="mr-2"
                      />
                      <label htmlFor={`company-${index}`} className="text-sm text-gray-700">
                        {company}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDateFilter}
                  onChange={(e) => setFromDateFilter(e.target.value)}
                  className="border border-gray-300 rounded p-2 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDateFilter}
                  onChange={(e) => setToDateFilter(e.target.value)}
                  className="border border-gray-300 rounded p-2 w-full"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setOpportunityOwnerFilter([]);
                  setFromDateFilter("");
                  setToDateFilter("");
                  setCompanyFilter([]);
                  setShowFilterWindow(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  fetchData();
                  setShowFilterWindow(false);
                }}
                className="px-4 py-2 bg-[#Ff8045] text-white rounded hover:bg-[#Ff8045]/90"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFilterControls = () => (
    <div className="flex flex-wrap gap-4 items-center mb-4">
      <div className="flex flex-col">
        <label htmlFor="search" className="mb-1 text-gray-700">Search</label>
        <div className="flex items-center">
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              filterSuggestions(e.target.value);
            }}
            className="border p-2"
            placeholder="Search all fields"
          />
          <button
            onClick={handleSearch}
            className="ml-2 bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white p-2 rounded"
          >
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
                handleSearch();
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCatalogList = () => {
    const filteredCatalogs = catalogs;
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
                  <thead className="bg-orange-200 text-black">
                    <tr>
                      <th
                        className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                        onClick={() => handleSort("catalogNumber")}
                      >
                        Catalog Number {sortConfig.key === "catalogNumber" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                        onClick={() => handleSort("opportunityNumber")}
                      >
                        Opportunity Number {sortConfig.key === "opportunityNumber" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                        onClick={() => handleSort("opportunityOwner")}
                      >
                        Opportunity Owner {sortConfig.key === "opportunityOwner" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                        onClick={() => handleSort("customerCompany")}
                      >
                        Company Name {sortConfig.key === "customerCompany" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                        onClick={() => handleSort("customerName")}
                      >
                        Customer Name {sortConfig.key === "customerName" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                        onClick={() => handleSort("catalogName")}
                      >
                        Event Name {sortConfig.key === "catalogName" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                        onClick={() => handleSort("products.length")}
                      >
                        Products {sortConfig.key === "products.length" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="px-4 py-2 text-left text-xs font-medium uppercase cursor-pointer"
                        onClick={() => handleSort("createdAt", true)}
                      >
                        Created At {sortConfig.key === "createdAt" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[...items]
                      .sort((a, b) => {
                        let valA = a[sortConfig.key];
                        let valB = b[sortConfig.key];

                        if (sortConfig.key === "opportunityOwner") {
                          const oppA = opportunities.find((o) => o.opportunityCode === a.opportunityNumber);
                          const oppB = opportunities.find((o) => o.opportunityCode === b.opportunityNumber);
                          valA = oppA?.opportunityOwner || "";
                          valB = oppB?.opportunityOwner || "";
                        } else if (sortConfig.key === "products.length") {
                          valA = (a.products || []).length;
                          valB = (b.products || []).length;
                        }

                        if (sortConfig.key === "createdAt") {
                          valA = new Date(valA || 0);
                          valB = new Date(valB || 0);
                        } else {
                          valA = (valA || "").toString().toLowerCase();
                          valB = (valB || "").toString().toLowerCase();
                        }

                        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
                        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
                        return 0;
                      })
                      .map((cat) => {
                        const opp = opportunities.find((o) => o.opportunityCode === cat.opportunityNumber);
                        return (
                          <tr key={cat._id}>
                            <td className="px-4 py-2">{cat.catalogNumber}</td>
                            <td className="px-4 py-2">{cat.opportunityNumber || "N/A"}</td>
                            <td className="px-4 py-2">{opp?.opportunityOwner || "N/A"}</td>
                            <td className="px-4 py-2">{cat.customerCompany}</td>
                            <td className="px-4 py-2">{cat.customerName}</td>
                            <td
                              className="px-4 py-2 underline cursor-pointer"
                              onClick={() => handleVirtualLink(cat)}
                            >
                              {cat.catalogName}
                            </td>
                            <td className="px-4 py-2">{cat.products?.length || 0}</td>
                            <td className="px-4 py-2">{new Date(cat.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCatalogForDropdown(cat);
                                  toggleCatalogDropdown(cat._id, e);
                                }}
                                className="px-2 py-1 hover:bg-gray-200 rounded"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-6 w-6"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6v.01M12 12v.01M12 18v.01"
                                  />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null
        )}
      </div>
    );
  };

  // -------------- NEW EXPORT FUNCTION --------------
  async function handleExportAllToExcel() {
    try {
      const wb = XLSX.utils.book_new();
      const header = [
        "Catalog Number",
        "Opportunity Number",
        "Opportunity Owner",
        "Company Name",
        "Customer Name",
        "Event Name",
        "Products",
        "Created At",
        "Remarks",
        "Approve Status",
        // Add other fields as needed
      ];
      const data = [header];
      catalogs.forEach((cat) => {
        const opp = opportunities.find((o) => o.opportunityCode === cat.opportunityNumber);
        const row = [
          cat.catalogNumber,
          cat.opportunityNumber || "N/A",
          opp?.opportunityOwner || "N/A",
          cat.customerCompany,
          cat.customerName,
          cat.catalogName,
          cat.products?.length || 0,
          new Date(cat.createdAt).toLocaleDateString(),
          cat.remarks || "",
          cat.approveStatus ? "Approved" : "Not Approved",
          // Add other fields as needed
        ];
        data.push(row);
      });
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "All Catalogs");
      const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbOut], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `All_Catalogs.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Excel export failed");
    }
  }

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
      {showFilterWindow && renderFilterWindow()}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Catalogs</h1>
        <div className="flex space-x-2">
          {isSuperAdmin && (
            <button
              onClick={handleExportAllToExcel}
              className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 px-4 py-2 rounded text-white"
            >
              Export All to Excel
            </button>
          )}
          <div className="relative inline-block text-left">
            <button
              onClick={handleToggleDropdown}
              className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 px-4 py-2 rounded text-white"
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
        </div>
      </div>

      {renderCatalogList()}

      {remarksModalOpen && selectedItemForRemarks && (
        <RemarksModal
          item={selectedItemForRemarks}
          type="catalog"
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
                openRemarksModal(selectedCatalogForDropdown);
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
        )}
    </div>
  );
}