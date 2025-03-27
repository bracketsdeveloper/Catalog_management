import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SlArrowDown } from "react-icons/sl";
import axios from "axios";
import * as XLSX from "xlsx"; // For Excel export
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  isToday as isTodayFn,
  isYesterday as isYesterdayFn,
  isThisWeek as isThisWeekFn,
  isThisMonth,
  isThisYear
} from 'date-fns';

// Helper: Convert an image URL to a Base64 data URL (requires proper CORS headers)
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

// Mapping for field names to display labels (used for Excel export)
const fieldMapping = {
  name: "Name",
  brandName: "Brand Name",
  category: "Category",
  subCategory: "Sub Category",
  price: "Price",
  productDetails: "Product Details",
  images: "Images",
};

// -------------------- PDF Template Modal --------------------
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
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------- Remarks Modal --------------------
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
      <div className="bg-white p-6 rounded w-96">
        <h2 className="text-lg font-bold mb-2 text-purple-700">Remarks</h2>
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
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-500 text-white rounded"
          >
            Close
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            Save Remark
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------- PDF Template Configuration --------------------
const templateConfig = {
  "1": {
    pdf1: "/templates/template1/pdf1.pdf",
    pdf2: "/templates/template1/pdf2.pdf",
    pdf3: "/templates/template1/pdf3.pdf",
  },
  
};

// -------------------- Text Wrapping Helper --------------------
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

// -------------------- Date Helpers for Grouping --------------------
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
    if (isTodayFn(d)) groups["Today"].push(item);
    else if (isYesterdayFn(d)) groups["Yesterday"].push(item);
    else if (isThisWeekFn(d)) groups["This Week"].push(item);
    else if (isLastWeek(d)) groups["Last Week"].push(item);
    else if (isLastMonth(d)) groups["Last Month"].push(item);
    else if (isLastYear(d)) groups["Last Year"].push(item);
    else groups["Earlier"].push(item);
  });
  return groups;
}

// Define the function at the top of your component or module
function closeVariationSelector() {
  // Logic to close the variation selector
  console.log("Variation selector closed");
}

// -------------------- Main Component --------------------
export default function CatalogManagement() {
  const { id } = useParams();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();

  // States for a single quotation (if editing) and collections
  const [quotation, setQuotation] = useState(null);
  const [editableQuotation, setEditableQuotation] = useState(null);
  const [catalogs, setCatalogs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & approval states
  const [filterType, setFilterType] = useState("catalogs"); // "catalogs" or "quotations"
  const [approvalFilter, setApprovalFilter] = useState("all");

  // New filter states
  const [fromDateFilter, setFromDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  // Dropdown for creating new catalog
  const [dropdownOpen, setDropdownOpen] = useState({});

  // Remarks modal state
  const [selectedItemForRemarks, setSelectedItemForRemarks] = useState(null);
  const [itemTypeForRemarks, setItemTypeForRemarks] = useState(""); // "catalog" or "quotation"
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);

  // PDF Template modal state
  const [pdfTemplateModalOpen, setPdfTemplateModalOpen] = useState(false);
  const [selectedItemForPDF, setSelectedItemForPDF] = useState(null);

  // Current user email
  const [userEmail, setUserEmail] = useState("");

  const [searchTerm, setSearchTerm] = useState(""); // State for the input field
  const [suggestions, setSuggestions] = useState([]); // State for company name suggestions

  // Extract unique company names from catalogs and quotations
  const getUniqueCompanyNames = () => {
    const companySet = new Set();
    catalogs.forEach((item) => {
      if (item.customerCompany) {
        companySet.add(item.customerCompany);
      }
    });
    quotations.forEach((item) => {
      if (item.customerCompany) {
        companySet.add(item.customerCompany);
      }
    });
    return Array.from(companySet);
  };

  const companyNames = getUniqueCompanyNames();

  // Function to filter company name suggestions
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

  // Function to handle search button click
  const handleSearch = () => {
    setCompanyFilter(searchTerm); // Update the filter state with the search term
    console.log("Searching for:", searchTerm);
    setSuggestions([]); // Clear suggestions after search
  };

  // ----------------------- Fetch Quotation if editing -----------------------
  useEffect(() => {
    if (id) {
      fetchQuotation();
    }
  }, [id]);

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

  // ----------------------- Fetch User Email -----------------------
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

  useEffect(() => {
    fetchData();
    fetchUserEmail();
  }, [filterType, approvalFilter, fromDateFilter, toDateFilter, companyFilter]);

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
        // Additional filters (if quotations have createdAt/company info)
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

  // ----------------------- Delete and Edit -----------------------
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

  // ----------------------- Remarks Modal -----------------------
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

  // ----------------------- Excel Export -----------------------
  async function handleExportExcel(item) {
    try {
      const wb = XLSX.utils.book_new();
      const fields = item.fieldsToDisplay || [];
      const header = fields.map((field) => fieldMapping[field] || field);
      const data = [header];

      item.products?.forEach((prodObj) => {
        const p = prodObj.productId || prodObj;
        const row = fields.map((field) => {
          if (field === "images") {
            return (p.images || []).join(", ");
          }
          if (field === "price") {
            const effectivePrice = p.price * (1 + (item.margin || 0) / 100);
            return effectivePrice.toFixed(2);
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
      link.setAttribute("download", `Catalog-${item.catalogName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Excel export failed");
    }
  }

  // ----------------------- PDF Export with Template Selection -----------------------
  async function handleExportCombinedPDF(item, templateId = "1") {
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
      // Copy header pages from pdf1
      const pdf1Pages = await newPdf.copyPages(pdf1Doc, pdf1Doc.getPageIndices());
      pdf1Pages.forEach((page) => newPdf.addPage(page));

      const normalFont = await newPdf.embedFont(StandardFonts.Helvetica);
      const boldFont = await newPdf.embedFont(StandardFonts.HelveticaBold);

      // For each product, use product template (pdf2) and overlay details
      for (let i = 0; i < (item.products || []).length; i++) {
        const prodObj = item.products[i];
        const p = prodObj.productId || prodObj;
        const [page] = await newPdf.copyPages(pdf2Doc, [0]);
        const { width, height } = page.getSize();

        // Product image
        const imageX = 250, imageY = height - 850, imageW = 600, imageH = 700;
        let productImgURL = (p.images && p.images[0]) ? p.images[0] : "";
        if (productImgURL && productImgURL.startsWith("http://")) {
          productImgURL = productImgURL.replace("http://", "https://");
        }
        let imageData = "";
        if (productImgURL) {
          try {
            imageData = await getBase64ImageFromUrl(productImgURL);
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
          page.drawImage(embeddedImage, { x: imageX, y: imageY, width: imageW, height: imageH });
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

        // Right side overlay for product details
        let xText = 1000, yText = height - 200;
        const lineHeight = 44;

        // Name
        page.drawText(p.name || "", { x: xText, y: yText, size: 44, font: boldFont, color: rgb(0, 0, 0) });
        yText -= lineHeight * 1.3;
        // Brand Name
        if (p.brandName) {
          page.drawText("Brand Name: ", { x: xText, y: yText, size: 30, font: boldFont, color: rgb(0, 0, 0) });
          page.drawText(p.brandName, { x: xText + 300, y: yText, size: 30, font: normalFont, color: rgb(0, 0, 0) });
          yText -= lineHeight;
        }
        // Description
        if (p.productDetails) {
          page.drawText("Description:", { x: xText, y: yText, size: 30, font: boldFont, color: rgb(0, 0, 0) });
          yText -= lineHeight;
          const wrapped = wrapText(p.productDetails, 300, normalFont, 12);
          wrapped.forEach((line) => {
            page.drawText(line, { x: xText, y: yText, size: 30, font: normalFont, color: rgb(0, 0, 0) });
            yText -= lineHeight;
          });
          yText -= lineHeight * 0.5;
        }
        // Quantity
        if (p.qty) {
          page.drawText("Qty: ", { x: xText, y: yText, size: 30, font: boldFont, color: rgb(0, 0, 0) });
          page.drawText(String(p.qty), { x: xText + 300, y: yText, size: 30, font: normalFont, color: rgb(0, 0, 0) });
          yText -= lineHeight;
        }
        // Rate in INR (per pc)
        if (p.productCost !== undefined) {
          const baseCost = p.productCost || 0;
          const effPrice = baseCost * (1 + (item.margin || 0) / 100);
          page.drawText("Rate in INR (per pc): ", { x: xText, y: yText, size: 30, font: boldFont, color: rgb(0, 0, 0) });
          page.drawText(`${effPrice.toFixed(2)}/-`, { x: xText + 300, y: yText, size: 30, font: normalFont, color: rgb(0, 0, 0) });
          yText -= lineHeight;
        }
        // GST
        if (p.gst) {
          page.drawText("GST: ", { x: xText, y: yText, size: 30, font: boldFont, color: rgb(0, 0, 0) });
          page.drawText(p.gst, { x: xText + 300, y: yText, size: 30, font: normalFont, color: rgb(0, 0, 0) });
          yText -= lineHeight;
        }

        newPdf.addPage(page);
      }

      // Append final static page(s) from pdf3
      const pdf3Pages = await newPdf.copyPages(pdf3Doc, pdf3Doc.getPageIndices());
      pdf3Pages.forEach((page) => newPdf.addPage(page));

      const finalPdfBytes = await newPdf.save();
      const blob = new Blob([finalPdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Catalog-${item.catalogName || item.quotationNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Combined PDF export error:", error);
      alert("Combined PDF export failed");
    }
  }

  function openPDFTemplateModal(item) {
    setSelectedItemForPDF(item);
    setPdfTemplateModalOpen(true);
  }

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

  // Function to filter catalogs or quotations based on the company name
  const filterData = (data) => {
    if (!companyFilter) return data;
    return data.filter((item) =>
      (item.customerCompany || item.catalogName || item.quotationNumber || "")
        .toLowerCase()
        .includes(companyFilter.toLowerCase())
    );
  };

  // ----------------------- Render Filter Buttons -----------------------
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

  // ----------------------- Render Additional Filter Controls -----------------------
  const renderFilterControls = () => (
    <div className="flex flex-wrap gap-4 items-center mb-4">
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
          <button
            onClick={handleSearch}
            className="ml-2 bg-blue-600 text-white p-2 rounded"
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
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Determine the time period for a given date
  const getTimePeriod = (date) => {
    const currentDate = new Date();
    if (isTodayFn(date)) return "Today";
    if (isYesterdayFn(date)) return "Yesterday";
    if (isThisWeekFn(date)) return "This Week";
    if (isThisMonth(date)) return "This Month";
    if (isThisYear(date)) return "This Year";
    return "Older";
  };

  // Group quotations by time period
  const groupQuotationsByTimePeriod = (quotations) => {
    const grouped = {};
    quotations.forEach((quotation) => {
      const period = getTimePeriod(new Date(quotation.createdAt));
      if (!grouped[period]) {
        grouped[period] = [];
      }
      grouped[period].push(quotation);
    });

    return Object.entries(grouped).map(([period, quotes]) => ({
      period,
      latest: quotes[0],
      all: quotes,
    }));
  };

  // ----------------------- Render Grouped Catalog List -----------------------
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
                        Company
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Customer Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
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
                        <td
                          className="px-4 py-2 whitespace-nowrap underline cursor-pointer"
                          onClick={() => handleVirtualLink(cat)}
                        >
                          {cat.customerCompany || cat.catalogName}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">{cat.customerName}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{cat.customerEmail}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{cat.products?.length || 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap space-x-2">
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
                          <button
                            onClick={() => openRemarksModal(cat, "catalog")}
                            className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                          >
                            Remarks
                          </button>
                          {!cat.approveStatus && (
                            <button
                              onClick={() => handleDeleteCatalog(cat)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            >
                              Delete
                            </button>
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

  // ----------------------- Render Grouped Quotation List -----------------------
  const renderQuotationList = () => {
    const groupedQuotations = groupQuotationsByTimePeriod(quotations);
    if (groupedQuotations.length === 0) {
      return <div className="text-gray-600">Nothing to display.</div>;
    }

    return (
      <div>
        {groupedQuotations.map(({ period, latest, all }) => (
          <div key={period} className="mb-6">
            <h3 className="text-lg font-bold mb-2">{period}</h3>
            <div
              className={`overflow-x-auto relative ${
                dropdownOpen[period] ? "min-h-[200px]" : ""
              }`}
            >
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
                  <tr key={latest._id}>
                    <td className="px-4 py-2 whitespace-nowrap">{latest.quotationNumber}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{latest.customerCompany || "N/A"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{latest.customerName}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{latest.customerEmail}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{latest.items?.length || 0}</td>
                    <td className="px-4 py-2 whitespace-nowrap space-x-2">
                      <button
                        onClick={() => navigate(`/admin-dashboard/quotations/${latest._id}`)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
</svg>

                      </button>
                      <button
                        onClick={() => handleDeleteQuotation(latest)}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
</svg>

                      </button>
                      <div className="relative inline-block text-left">
                        <button
                          className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                          onClick={() => setDropdownOpen((prev) => ({ ...prev, [period]: !prev[period] }))}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25" />
</svg>

                        </button>
                        {dropdownOpen[period] && (
                          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-md z-50 max-h-60 overflow-y-auto">
                            {all.map((q) => (
                              <div
                                key={q._id}
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                onClick={() => navigate(`/admin-dashboard/quotations/${q._id}`)}
                              >
                                {q.quotationNumber}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="p-6 text-gray-200">Loading...</div>;
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
                  onClick={() => {
                    setDropdownOpen(false);
                    handleCreateManually();
                  }}
                  className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm text-gray-900"
                >
                  Create Manually
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleCreateAI();
                  }}
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
