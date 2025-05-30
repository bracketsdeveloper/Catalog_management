"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx"; // For Excel export
import { useNavigate } from "react-router-dom";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Helper: Convert an image URL to base64
 */
async function getBase64ImageFromUrl(url) {
  try {
    const response = await fetch(url, { mode: "cors" });
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result?.toString() || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return "";
  }
}

/**
 * Helper: Wrap text for pdf-lib (since it doesn't have splitTextToSize)
 */
function wrapText(text, maxWidth, font, fontSize) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";
  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * PDF Template configuration: each template folder contains pdf1.pdf, pdf2.pdf, pdf3.pdf
 */
const templateConfig = {
  "1": {
    pdf1: "/templates/template1/pdf1.pdf",
    pdf2: "/templates/template1/pdf2.pdf",
    pdf3: "/templates/template1/pdf3.pdf",
  },
  
};

/**
 * Field mapping – defines how to label fields for Excel export
 */
const fieldMapping = {
  name: "Name",
  price: "productCost",
  productDetails: "Product Details",
  images: "Images",
  brandName: "Brand Name",
};

/**
 * Fields we never display
 */
const NEVER_DISPLAY_FIELDS = ["color", "weight"];

/**
 * Mandatory fields for Excel
 */
const MANDATORY_FIELDS = ["images", "name", "price", "productDetails"];

/**
 * Simple RemarksModal component
 */
function RemarksModal({ item, type, onClose, onSave, userEmail }) {
  const [remarksText, setRemarksText] = useState("");
  const [remarksList, setRemarksList] = useState(item.remarks || []);

  const handleSubmit = async () => {
    const newRemark = {
      sender: userEmail,
      message: remarksText,
      timestamp: new Date(),
    };
    const updatedRemarks = [...remarksList, newRemark];
    setRemarksList(updatedRemarks);
    setRemarksText("");
    await onSave(updatedRemarks, type, item._id);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
      <div className="bg-white p-4 rounded w-96">
        <h2 className="text-lg font-bold mb-2">Remarks</h2>
        <div className="max-h-60 overflow-y-auto border p-2 mb-2">
          {remarksList.length > 0 ? (
            remarksList.map((r, idx) => (
              <div key={idx} className="mb-1">
                <span className="font-bold">{r.sender}: </span>
                <span>{r.message}</span>
                <br />
                <small className="text-gray-500">
                  {new Date(r.timestamp).toLocaleString()}
                </small>
              </div>
            ))
          ) : (
            <p>No remarks yet.</p>
          )}
        </div>
        <textarea
          className="w-full border p-2 rounded mb-2"
          rows="3"
          placeholder="Type your remark..."
          value={remarksText}
          onChange={(e) => setRemarksText(e.target.value)}
        />
        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-3 py-1 bg-gray-500 text-white rounded">
            Close
          </button>
          <button onClick={handleSubmit} className="px-3 py-1 bg-blue-600 text-white rounded">
            Save Remark
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * PDFTemplateModal: Pop-up modal that displays preview images for each template.
 * When the user selects one, onSelect(templateId) is called.
 */
function PDFTemplateModal({ onSelect, onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
        <h2 className="text-lg font-bold mb-4 text-center">Select PDF Template</h2>
        <div className="flex justify-center space-x-4 mb-4">
          {Object.keys(templateConfig).map((templateId) => (
            <div
              key={templateId}
              className="cursor-pointer text-center"
              onClick={() => onSelect(templateId)}
            >
              <img
                src={`/templates/template${templateId}/preview.png`}
                alt={`Template ${templateId}`}
                className="w-32 h-32 object-cover border rounded"
              />
              <div className="mt-2">Template {templateId}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Date helper functions for grouping
 */
function isToday(date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}
function isYesterday(date) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}
function isThisWeek(date) {
  const today = new Date();
  const firstDayOfWeek = new Date(today);
  firstDayOfWeek.setDate(today.getDate() - today.getDay());
  const lastDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
  return date >= firstDayOfWeek && date <= lastDayOfWeek;
}
function isLastWeek(date) {
  const today = new Date();
  const firstDayOfThisWeek = new Date(today);
  firstDayOfThisWeek.setDate(today.getDate() - today.getDay());
  const firstDayOfLastWeek = new Date(firstDayOfThisWeek);
  firstDayOfLastWeek.setDate(firstDayOfThisWeek.getDate() - 7);
  const lastDayOfLastWeek = new Date(firstDayOfThisWeek);
  lastDayOfLastWeek.setDate(firstDayOfThisWeek.getDate() - 1);
  return date >= firstDayOfLastWeek && date <= lastDayOfLastWeek;
}
function isLastMonth(date) {
  const today = new Date();
  const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
  const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  return date.getMonth() === lastMonth && date.getFullYear() === year;
}
function isLastYear(date) {
  const lastYear = new Date().getFullYear() - 1;
  return date.getFullYear() === lastYear;
}
function groupItemsByDate(items) {
  const groups = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    "Last Week": [],
    "Last Month": [],
    "Last Year": [],
    Earlier: [],
  };
  items.forEach((item) => {
    const d = new Date(item.createdAt);
    if (isToday(d)) groups["Today"].push(item);
    else if (isYesterday(d)) groups["Yesterday"].push(item);
    else if (isThisWeek(d)) groups["This Week"].push(item);
    else if (isLastWeek(d)) groups["Last Week"].push(item);
    else if (isLastMonth(d)) groups["Last Month"].push(item);
    else if (isLastYear(d)) groups["Last Year"].push(item);
    else groups["Earlier"].push(item);
  });
  return groups;
}

/**
 * Filter helper: filters items based on company name.
 */
const filterData = (data, companyFilter) => {
  if (!companyFilter) return data;
  return data.filter((item) =>
    (item.customerCompany || item.catalogName || item.quotationNumber || "")
      .toLowerCase()
      .includes(companyFilter.toLowerCase())
  );
};

/**
 * Main Component – ReviewDashboard
 */
export default function ReviewDashboard() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();

  // Data states
  const [catalogs, setCatalogs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter type & approval
  const [filterType, setFilterType] = useState("catalogs"); // "catalogs" or "quotations"
  const [approvalFilter, setApprovalFilter] = useState("all");

  // Additional filter states
  const [fromDateFilter, setFromDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  // Remarks modal state
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [selectedItemForRemarks, setSelectedItemForRemarks] = useState(null);
  const [itemTypeForRemarks, setItemTypeForRemarks] = useState("");

  // PDF Template modal state
  const [pdfTemplateModalOpen, setPdfTemplateModalOpen] = useState(false);
  const [selectedItemForPDF, setSelectedItemForPDF] = useState(null);

  // Field selection modal for Excel export (if needed)
  const [fieldSelectionOpen, setFieldSelectionOpen] = useState(false);
  const [exportItem, setExportItem] = useState(null);
  const [exportMode, setExportMode] = useState(null); // "excel" or "pdf"
  const [optionalFieldsSelected, setOptionalFieldsSelected] = useState([]);

  // For company name auto-suggestions
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // Define userEmail state
  const [userEmail, setUserEmail] = useState("");

  // Extract unique company names from catalogs and quotations
  const getUniqueCompanyNames = () => {
    const companySet = new Set();
    catalogs.forEach((item) => {
      if (item.customerCompany) companySet.add(item.customerCompany);
    });
    quotations.forEach((item) => {
      if (item.customerCompany) companySet.add(item.customerCompany);
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

  // ----------------------- Data Fetching -----------------------
  useEffect(() => {
    fetchData();
    fetchUserEmail();
    // eslint-disable-next-line
  }, [filterType, approvalFilter, fromDateFilter, toDateFilter, companyFilter]);

  const fetchUserEmail = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserEmail(res.data.email);
    } catch (err) {
      console.error("Error fetching user email:", err);
    }
  };

  const fetchData = async () => {
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
        data = filterData(data, companyFilter);
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
        data = filterData(data, companyFilter);
        setQuotations(data);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------- Action Handlers -----------------------
  const handleDeleteCatalog = async (catalog) => {
    if (!window.confirm(`Delete "${catalog.catalogName}"?`)) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/catalogs/${catalog._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Catalog deleted!");
      fetchData();
    } catch (err) {
      console.error("Error deleting catalog:", err);
      alert("Failed to delete.");
    }
  };

  const handleDeleteQuotation = async (quotation) => {
    if (!window.confirm(`Delete Quotation ${quotation.quotationNumber}?`)) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/quotations/${quotation._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Quotation deleted!");
      fetchData();
    } catch (err) {
      console.error("Error deleting quotation:", err);
      alert("Failed to delete.");
    }
  };

  const handleEditCatalog = (catalog) => {
    navigate(`/admin-dashboard/catalogs/manual/${catalog._id}`);
  };

  const handleApproveCatalog = async (catalog) => {
    if (!window.confirm(`Approve catalog "${catalog.catalogName}"?`)) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BACKEND_URL}/api/admin/catalogs/${catalog._id}/approve`,
        { approveStatus: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Approved!");
      fetchData();
    } catch (err) {
      console.error("Error approving catalog:", err);
      alert("Approve failed.");
    }
  };

  const handleApproveQuotation = async (quotation) => {
    if (!window.confirm(`Approve Quotation #${quotation.quotationNumber}?`)) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BACKEND_URL}/api/admin/quotations/${quotation._id}/approve`,
        { approveStatus: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Approved!");
      fetchData();
    } catch (err) {
      console.error("Error approving quotation:", err);
      alert("Approve failed.");
    }
  };

  // Open Remarks modal
  const openRemarksModal = (item, type) => {
    setSelectedItemForRemarks(item);
    setItemTypeForRemarks(type);
    setRemarksModalOpen(true);
  };

  const handleSaveRemarks = async (remarks, type, id) => {
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
  };

  // For Excel export via field selection
  const handleExcelClick = (item) => {
    setExportItem(item);
    setExportMode("excel");
    setOptionalFieldsSelected([]);
    setFieldSelectionOpen(true);
  };

  // Instead of direct PDF export, open the PDFTemplateModal for selection
  const handlePDFClick = (item) => {
    setSelectedItemForPDF(item);
    setPdfTemplateModalOpen(true);
  };

  // Excel Export
  async function handleExportExcel(catalog, optionalFields) {
    try {
      const safeOptionalFields = optionalFields.filter((f) => !NEVER_DISPLAY_FIELDS.includes(f));
      const forced = MANDATORY_FIELDS;
      const allFields = [...forced, ...safeOptionalFields];
      const wb = XLSX.utils.book_new();
      const header = allFields.map((field) => fieldMapping[field] || field);
      const data = [header];

      catalog.products?.forEach((prodObj) => {
        const p = prodObj.productId || prodObj;
        const row = allFields.map((field) => {
          if (field === "images") return (p.images || []).join(", ");
          if (field === "price") {
            const baseCost = p.productCost || 0;
            const margin = catalog.margin || 0;
            const effPrice = baseCost * (1 + margin / 100);
            return effPrice.toFixed(2);
          }
          return p[field] !== undefined ? p[field] : "";
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
      link.setAttribute("download", `Catalog-${catalog.catalogName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Excel export failed");
    }
  }

  // Combined PDF export using pdf-lib with selected template
  async function handleExportCombinedPDF(catalog, templateId) {
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
            size: 10,
            font: normalFont,
            color: rgb(0.5, 0.5, 0.5),
          });
        }

        // Right-side overlay for product details
        let xText = 1200;
        let yText = height - 200;
        const lineHeight = 44;
        page.drawText(p.name || "", {
          x: xText,
          y: yText,
          size: 44,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yText -= lineHeight * 1.3;
        if (p.brandName) {
          page.drawText("Brand Name: ", {
            x: xText,
            y: yText,
            size: 30,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          page.drawText(p.brandName, {
            x: xText + 300,
            y: yText,
            size: 30,
            font: normalFont,
            color: rgb(0, 0, 0),
          });
          yText -= lineHeight;
        }
        if (p.productDetails) {
          page.drawText("Description:", {
            x: xText,
            y: yText,
            size: 30,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          yText -= lineHeight;
          const wrapped = wrapText(p.productDetails, 200, normalFont, 12);
          wrapped.forEach((line) => {
            page.drawText(line, {
              x: xText,
              y: yText,
              size: 30,
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
            size: 30,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          page.drawText(String(p.qty), {
            x: xText + 300,
            y: yText,
            size: 30,
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
            size: 30,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          page.drawText(`${effPrice.toFixed(2)}/-`, {
            x: xText + 300,
            y: yText,
            size: 30,
            font: normalFont,
            color: rgb(0, 0, 0),
          });
          yText -= lineHeight;
        }
        if (p.gst) {
          page.drawText("GST (Additional): ", {
            x: xText,
            y: yText,
            size: 30,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          page.drawText(p.gst, {
            x: xText + 300,
            y: yText,
            size: 30,
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

  const handleVirtualLink = (catalog) => {
    const link = `${window.location.origin}/catalog/${catalog._id}`;
    window.open(link, "_blank");
  };

  const handleCopyLink = (catalog) => {
    const link = `${window.location.origin}/catalog/${catalog._id}`;
    navigator.clipboard
      .writeText(link)
      .then(() => alert("Virtual link copied!"))
      .catch((err) => {
        console.error("Error copying link:", err);
        alert("Failed to copy link");
      });
  };

  /**
   * Render Filter Buttons and additional controls for date range and company name
   */
  const renderFilterButtons = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
      <div className="flex space-x-4 mb-2 sm:mb-0">
        <button
          onClick={() => setFilterType("catalogs")}
          className={`px-4 py-2 rounded ${
            filterType === "catalogs" ? "bg-[#Ff8045] text-white" : "bg-[#Ff8045] text-white"
          }`}
        >
          Catalogs
        </button>
        <button
          onClick={() => setFilterType("quotations")}
          className={`px-4 py-2 rounded ${
            filterType === "quotations" ? "bg-[#66C3D0] text-white" : "bg-[#66C3D0] text-white"
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
      <div className="flex space-x-4 mt-4">
        <div className="flex flex-col">
          <label htmlFor="fromDate" className="mb-1 text-gray-700">From Date</label>
          <input
            id="fromDate"
            type="date"
            value={fromDateFilter}
            onChange={(e) => setFromDateFilter(e.target.value)}
            className="border p-2"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="toDate" className="mb-1 text-gray-700">To Date</label>
          <input
            id="toDate"
            type="date"
            value={toDateFilter}
            onChange={(e) => setToDateFilter(e.target.value)}
            className="border p-2"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="companyName" className="mb-1 text-gray-700">Company Name</label>
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
    </div>
  );

  /**
   * Render grouped catalogs in a table with date breaks
   */
  const renderGroupedCatalogs = () => {
    const filteredCatalogs = filterData(catalogs, companyFilter);
    if (filteredCatalogs.length === 0) return <div className="text-gray-600">Nothing to display.</div>;
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
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((cat) => (
                      <tr key={cat._id}>
                        <td className="px-4 py-2 whitespace-nowrap underline cursor-pointer" onClick={() => handleVirtualLink(cat)}>
                          {cat.customerCompany || cat.catalogName}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">{cat.customerName}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{cat.customerEmail}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{cat.products?.length || 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap space-x-2">
                          <button onClick={() => openRemarksModal(cat, "catalog")} className="bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded text-xs text-white">
                            Remarks
                          </button>
                          <button onClick={() => handleExcelClick(cat)} className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs text-white">
                            Excel
                          </button>
                          <button onClick={() => handlePDFClick(cat)} className="bg-pink-600 hover:bg-pink-700 px-2 py-1 rounded text-xs text-white">
                            PDF
                          </button>
                          <button onClick={() => handleVirtualLink(cat)} className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs text-white">
                            Virtual
                          </button>
                          <button onClick={() => handleCopyLink(cat)} className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-xs text-white">
                            Copy Link
                          </button>
                          <button onClick={() => handleApproveCatalog(cat)} className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs text-white">
                            Approve
                          </button>
                          <button onClick={() => handleEditCatalog(cat)} className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs text-white">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteCatalog(cat)} className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs text-white">
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

  /**
   * Render grouped quotations in a table with date breaks
   */
  const renderGroupedQuotations = () => {
    const filteredQuotations = filterData(quotations, companyFilter);
    if (filteredQuotations.length === 0) return <div className="text-gray-600">Nothing to display.</div>;
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
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quotation No.</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((q) => (
                      <tr key={q._id}>
                        <td className="px-4 py-2 whitespace-nowrap">{q.quotationNumber}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{q.customerCompany || "N/A"}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{q.customerName}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{q.customerEmail}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{q.items?.length || 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap space-x-2">
                          <button onClick={() => navigate(`/admin-dashboard/quotations/${q._id}`)} className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
</svg>

                          </button>
                          <button onClick={() => handleDeleteQuotation(q)} className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
</svg>
                          </button>
                          {q.approveStatus ? (
                            <>
                              <button onClick={() => handleExcelClick(q)} className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs text-white">
                                Excel
                              </button>
                              <button onClick={() => handlePDFClick(q)} className="bg-pink-600 hover:bg-pink-700 px-2 py-1 rounded text-xs text-white">
                                PDF
                              </button>
                              <button onClick={() => {
                                const link = `${window.location.origin}/quotation/${q._id}`;
                                window.open(link, "_blank");
                              }} className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs text-white">
                                Virtual
                              </button>
                              <button onClick={() => {
                                const link = `${window.location.origin}/quotation/${q._id}`;
                                navigator.clipboard.writeText(link)
                                  .then(() => alert("Copied link!"))
                                  .catch((err) => {
                                    console.error("Error copying link:", err);
                                    alert("Failed to copy link");
                                  });
                              }} className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-xs text-white">
                                Copy Link
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleApproveQuotation(q)} className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs text-white">
                                Approve
                              </button>
                              <button onClick={() => openRemarksModal(q, "quotation")} className="bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded text-xs text-white">
                                Remarks
                              </button>
                            </>
                          )}
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

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  // Render the main view with a PDFTemplateModal pop-up when needed
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-6">
      {/** Instead of a static PDF template dropdown, we now let the user choose via modal when they click PDF */}
      {renderFilterButtons()}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {filterType === "catalogs" ? "Manage Catalogs" : "Manage Quotations"}
        </h1>
      </div>
      {filterType === "catalogs" ? renderGroupedCatalogs() : renderGroupedQuotations()}

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

      {fieldSelectionOpen && (
        // Optionally, if you need a modal to select extra fields for Excel export
        <FieldsSelectionModal
          onClose={() => setFieldSelectionOpen(false)}
          onConfirm={() => {
            setFieldSelectionOpen(false);
            if (exportMode === "excel" && exportItem) {
              handleExportExcel(exportItem, optionalFieldsSelected);
            }
          }}
          optionalFieldsSelected={optionalFieldsSelected}
          setOptionalFieldsSelected={setOptionalFieldsSelected}
          possibleOptionalFields={
            exportItem && Array.isArray(exportItem.fieldsToDisplay)
              ? exportItem.fieldsToDisplay.filter(
                  (f) => !MANDATORY_FIELDS.includes(f) && !NEVER_DISPLAY_FIELDS.includes(f)
                )
              : []
          }
        />
      )}
    </div>
  );
}

/**
 * (Optional) FieldsSelectionModal component – include if you need extra field selection for Excel.
 */
function FieldsSelectionModal({
  onClose,
  onConfirm,
  optionalFieldsSelected,
  setOptionalFieldsSelected,
  possibleOptionalFields,
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-4 rounded w-full max-w-sm relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-600 hover:text-gray-900">
          ✕
        </button>
        <h2 className="text-lg font-semibold mb-2 text-gray-700">Select Additional Fields</h2>
        <p className="text-sm text-gray-600 mb-4">(Image, Name, Price, and Product Details are always included.)</p>
        <div className="space-y-2 mb-4">
          {possibleOptionalFields.length === 0 ? (
            <p className="text-gray-500 text-sm">No extra fields available.</p>
          ) : (
            possibleOptionalFields.map((fld) => (
              <label key={fld} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-purple-600"
                  checked={optionalFieldsSelected.includes(fld)}
                  onChange={() => {
                    if (optionalFieldsSelected.includes(fld)) {
                      setOptionalFieldsSelected(optionalFieldsSelected.filter((k) => k !== fld));
                    } else {
                      setOptionalFieldsSelected([...optionalFieldsSelected, fld]);
                    }
                  }}
                />
                <span className="text-gray-800">{fld}</span>
              </label>
            ))
          )}
        </div>
        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-300 rounded hover:bg-gray-400">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
