"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";       // For Excel export
import PptxGenJS from "pptxgenjs"; // For PPT export
import { useNavigate } from "react-router-dom";

// Helper to convert image URLs to base64
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

// Our field mapping
// We do not include 'color' or 'weight' in the mapping
const fieldMapping = {
  name: "Name",
  price: "productCost",      // "price" => productCost w/ margin
  productDetails: "Product Details",
  images: "Images",
  brandName: "Brand Name",
  category: "Category",
  subCategory: "Sub Category",
  size: "Size",
  // intentionally omitting color, weight, etc.
};

// We never display 'color' or 'weight' as options
// because the user said "never display color and weight"
const NEVER_DISPLAY_FIELDS = ["color", "weight"];

// Mandatory fields always included in PPT/Excel
const MANDATORY_FIELDS = ["images", "name", "price", "productDetails"];

/** 
 * RemarksModal 
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
 * FieldsSelectionModal
 * We skip color and weight from any potential optional fields
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
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
        >
          ✕
        </button>
        <h2 className="text-lg font-semibold mb-2 text-gray-700">Select Additional Fields</h2>
        <p className="text-sm text-gray-600 mb-4">
          (Image, Name, Price, and Product Details are always included.)
        </p>
        <div className="space-y-2 mb-4">
          {possibleOptionalFields.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No extra fields are available for this catalog/quotation.
            </p>
          ) : (
            possibleOptionalFields.map((fld) => (
              <label key={fld} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-purple-600"
                  checked={optionalFieldsSelected.includes(fld)}
                  onChange={() => {
                    if (optionalFieldsSelected.includes(fld)) {
                      setOptionalFieldsSelected(
                        optionalFieldsSelected.filter((k) => k !== fld)
                      );
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
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewDashboard() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();

  const [catalogs, setCatalogs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter type
  const [filterType, setFilterType] = useState("catalogs");
  const [approvalFilter, setApprovalFilter] = useState("all");

  // Remarks
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [selectedItemForRemarks, setSelectedItemForRemarks] = useState(null);
  const [itemTypeForRemarks, setItemTypeForRemarks] = useState("");

  // Current user email
  const [userEmail, setUserEmail] = useState("");

  // Field selection
  const [fieldSelectionOpen, setFieldSelectionOpen] = useState(false);
  const [exportMode, setExportMode] = useState(null); // "excel" or "ppt"
  const [exportItem, setExportItem] = useState(null);
  const [optionalFieldsSelected, setOptionalFieldsSelected] = useState([]);

  useEffect(() => {
    fetchData();
    fetchUserEmail();
    // eslint-disable-next-line
  }, [filterType, approvalFilter]);

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
        const filteredCatalogs =
          approvalFilter === "all"
            ? res.data
            : res.data.filter((cat) =>
                approvalFilter === "approved" ? cat.approveStatus : !cat.approveStatus
              );
        setCatalogs(filteredCatalogs);
      } else {
        const res = await axios.get(`${BACKEND_URL}/api/admin/quotations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const filteredQuotations =
          approvalFilter === "all"
            ? res.data
            : res.data.filter((q) =>
                approvalFilter === "approved" ? q.approveStatus : !q.approveStatus
              );
        setQuotations(filteredQuotations);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Approve/Delete
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

  // Remarks
  const openRemarksModal = (item, type) => {
    setSelectedItemForRemarks(item);
    setItemTypeForRemarks(type);
    setRemarksModalOpen(true);
  };
  const handleSaveRemarks = async (remarks, type, id) => {
    try {
      const token = localStorage.getItem("token");
      let endpoint = "";
      if (type === "catalog") {
        endpoint = `${BACKEND_URL}/api/admin/catalogs/${id}/remarks`;
      } else {
        endpoint = `${BACKEND_URL}/api/admin/quotations/${id}/remarks`;
      }
      await axios.put(endpoint, { remarks }, { headers: { Authorization: `Bearer ${token}` } });
      alert("Remarks updated!");
      setRemarksModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving remarks:", error);
      alert("Failed to save remarks");
    }
  };

  // Field selection
  const handleExcelClick = (item) => {
    setExportItem(item);
    setExportMode("excel");
    setOptionalFieldsSelected([]);
    setFieldSelectionOpen(true);
  };
  const handlePPTClick = (item) => {
    setExportItem(item);
    setExportMode("ppt");
    setOptionalFieldsSelected([]);
    setFieldSelectionOpen(true);
  };

  const handleFieldSelectionConfirm = () => {
    setFieldSelectionOpen(false);
    if (!exportItem) return;
    if (exportMode === "excel") {
      handleExportExcel(exportItem, optionalFieldsSelected);
    } else {
      handleExportPPT(exportItem, optionalFieldsSelected);
    }
  };

  // Export Excel (with mandatory fields + optional user selection), skipping color/weight
  async function handleExportExcel(catalog, optionalFields) {
    try {
      // remove color/weight from optionalFields if present
      const safeOptionalFields = optionalFields.filter(
        (f) => !NEVER_DISPLAY_FIELDS.includes(f)
      );

      const forced = MANDATORY_FIELDS; // images, name, price, productDetails
      const allFields = [...forced, ...safeOptionalFields];

      const wb = XLSX.utils.book_new();
      const header = allFields.map((field) => fieldMapping[field] || field);
      const data = [header];

      catalog.products?.forEach((prodObj) => {
        const p = prodObj.productId || prodObj;
        const row = allFields.map((field) => {
          if (field === "images") {
            return (p.images || []).join(", ");
          }
          if (field === "price") {
            const effPrice = p.productCost * (1 + (catalog.margin || 0) / 100);
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

  // PPT with dynamic font scaling, skipping color/weight
  async function handleExportPPT(catalog, optionalFields) {
    try {
      // remove color/weight from optionalFields if present
      const safeOptionalFields = optionalFields.filter(
        (f) => !NEVER_DISPLAY_FIELDS.includes(f)
      );

      const pptx = new PptxGenJS();
      pptx.title = `Catalog - ${catalog.catalogName}`;

      // Slide 1
      const slide1 = pptx.addSlide();
      slide1.background = { path: "/templateSlide1.jpg" };

      // Slide 2
      const slide2 = pptx.addSlide();
      slide2.background = { path: "/templateSlide2.jpg" };

      // Slide 3
      const slide3 = pptx.addSlide();
      slide3.background = { path: "/templateSlide3.jpg" };
      slide3.addText("Gift Options", {
        x: 0.5,
        y: 2.6,
        w: 6.0,
        fontSize: 20,
        bold: true,
        color: "000000",
        align: "center",
      });

      // total fields = mandatory(4) + safeOptionalFields.length
      const totalFieldsCount = 4 + safeOptionalFields.length;

      // Dynamic font sizing
      let bigFont = 24;
      let smallFont = 12;
      let nameLineSpacing = 1.0;
      let normalLineSpacing = 0.8;

      if (totalFieldsCount > 6) {
        bigFont = 20;
        smallFont = 10;
        nameLineSpacing = 0.8;
        normalLineSpacing = 0.6;
      }
      if (totalFieldsCount > 10) {
        bigFont = 18;
        smallFont = 9;
        nameLineSpacing = 0.7;
        normalLineSpacing = 0.5;
      }

      const products = catalog.products || [];
      for (let i = 0; i < products.length; i++) {
        const prodObj = products[i];
        const p = prodObj.productId || prodObj;

        const slide = pptx.addSlide();
        slide.background = { path: "/templateSlide3.jpg" };

        // Left side image
        let mainImg = p.images && p.images[0] ? p.images[0] : "";
        if (mainImg.startsWith("http://")) {
          mainImg = mainImg.replace("http://", "https://");
        }
        let base64Img = "";
        if (mainImg) {
          try {
            base64Img = await getBase64ImageFromUrl(mainImg);
          } catch (err) {
            console.error("Failed to convert image to base64:", err);
          }
        }
        if (base64Img) {
          slide.addImage({ data: base64Img, x: 1.2, y: 1.2, w: 3.3, h: 3.3 });
        } else if (mainImg) {
          slide.addImage({ path: mainImg, x: 1.2, y: 1.2, w: 3.3, h: 3.3 });
        } else {
          // No image
          slide.addShape("rect", {
            x: 1.2,
            y: 1.2,
            w: 3.3,
            h: 3.3,
            line: { color: "CCCCCC", width: 1 },
            fill: { color: "EFEFEF" },
          });
          slide.addText("No Image", {
            x: 1.2,
            y: 2.5,
            w: 3.0,
            align: "center",
            fontSize: 12,
            color: "888888",
          });
        }

        // Right side
        let yPos = 1.0;
        const textX = 5.5;

        // 1) Product Name
        slide.addText(p.name || "", {
          x: textX,
          y: yPos,
          fontSize: bigFont,
          bold: true,
          color: "FF0000",
          w: 4.0,
          h: 1.0,
          valign: "middle",
          wrap: true,
        });
        yPos += nameLineSpacing;

        // 2) Price => productCost + margin
        if (p.productCost !== undefined) {
          const effPrice = p.productCost * (1 + (catalog.margin || 0) / 100);
          slide.addText(
            [
              { text: "Price: ", bold: true, fontSize: smallFont, color: "363636" },
              { text: effPrice.toFixed(2), bold: false, fontSize: smallFont, color: "363636" },
            ],
            {
              x: textX,
              y: yPos,
              w: 4.0,
              h: 0.5,
              valign: "middle",
              wrap: true,
            }
          );
          yPos += normalLineSpacing;
        }

        // 3) productDetails
        if (p.productDetails) {
          slide.addText(
            [
              { text: "Details: ", bold: true, fontSize: smallFont, color: "363636" },
              { text: p.productDetails, bold: false, fontSize: smallFont, color: "363636" },
            ],
            {
              x: textX,
              y: yPos,
              w: 4.5,
              h: 1.0,
              valign: "top",
              wrap: true,
            }
          );
          yPos += normalLineSpacing + 0.4;
        }

        // 4) Additional optional fields, skipping color/weight
        for (const fld of safeOptionalFields) {
          if (MANDATORY_FIELDS.includes(fld)) continue;
          const val = p[fld];
          if (!val) continue;
          slide.addText(
            [
              { text: `${fld}: `, bold: true, fontSize: smallFont, color: "363636" },
              { text: String(val), bold: false, fontSize: smallFont, color: "363636" },
            ],
            {
              x: textX,
              y: yPos,
              w: 4.5,
              h: 0.5,
              valign: "top",
              wrap: true,
            }
          );
          yPos += normalLineSpacing;
        }
      }

      // Last slide
      const lastSlide = pptx.addSlide();
      lastSlide.background = { path: "/templateSlideLast.jpg" };
      lastSlide.addText("Thank you!", {
        x: 1.0,
        y: 3.0,
        fontSize: 16,
        bold: true,
        color: "363636",
      });

      await pptx.writeFile({ fileName: `Catalog-${catalog.catalogName}.pptx` });
    } catch (error) {
      console.error("PPT export error:", error);
      alert("PPT export failed");
    }
  }

  // Virtual & copy link
  function handleVirtualLink(catalog) {
    const link = `${window.location.origin}/catalog/${catalog._id}`;
    window.open(link, "_blank");
  }
  function handleCopyLink(catalog) {
    const link = `${window.location.origin}/catalog/${catalog._id}`;
    navigator.clipboard
      .writeText(link)
      .then(() => alert("Virtual link copied!"))
      .catch((err) => {
        console.error("Error copying link:", err);
        alert("Failed to copy link");
      });
  }

  // Filter Buttons
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

  // Render Catalog Cards
  const renderCatalogs = () => {
    if (catalogs.length === 0) {
      return <div className="text-gray-600">Nothing to display.</div>;
    }
    return (
      <div className="grid grid-cols-3 gap-4">
        {catalogs.map((cat) => {
          const isApproved = cat.approveStatus;
          return (
            <div
              key={cat._id}
              className="relative bg-white border border-purple-200 p-4 rounded shadow flex flex-col"
            >
              <span
                className={`absolute top-0 right-0 text-white text-xs px-2 py-1 rounded-bl ${
                  isApproved ? "bg-green-500" : "bg-orange-500"
                }`}
              >
                {isApproved ? "Approved" : "Under Review"}
              </span>
              <h2 className="text-lg font-semibold mb-1 text-gray-900">
                {cat.catalogName}
              </h2>
              <p className="text-sm text-gray-600 mb-2">
                {cat.customerName} {cat.customerEmail ? `(${cat.customerEmail})` : ""}
              </p>
              <p className="text-xs text-gray-600 mb-2">Created by: {cat.createdBy}</p>
              <p className="text-xs text-gray-600 mb-4">
                Products: {cat.products?.length || 0}
              </p>

              <div className="flex flex-wrap gap-2 mt-auto">
                <button
                  onClick={() => openRemarksModal(cat, "catalog")}
                  className="bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded text-sm text-white"
                >
                  View Remarks
                </button>
                {/* Our "Excel" & "PPT" => triggers field selection */}
                <button
                  onClick={() => {
                    setExportItem(cat);
                    setExportMode("excel");
                    setOptionalFieldsSelected([]);
                    setFieldSelectionOpen(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-sm text-white"
                >
                  Excel
                </button>
                <button
                  onClick={() => {
                    setExportItem(cat);
                    setExportMode("ppt");
                    setOptionalFieldsSelected([]);
                    setFieldSelectionOpen(true);
                  }}
                  className="bg-pink-600 hover:bg-pink-700 px-2 py-1 rounded text-sm text-white"
                >
                  PPT
                </button>
                <button
                  onClick={() => handleVirtualLink(cat)}
                  className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-sm text-white"
                >
                  Virtual
                </button>
                <button
                  onClick={() => handleCopyLink(cat)}
                  className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-sm text-white"
                >
                  Copy Link
                </button>

                <button
                  onClick={() => handleApproveCatalog(cat)}
                  className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-sm text-white"
                >
                  Approve
                </button>
                <button
                  onClick={() => openRemarksModal(cat, "catalog")}
                  className="bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded text-sm text-white"
                >
                  Remarks
                </button>
                <button
                  onClick={() => handleEditCatalog(cat)}
                  className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-sm text-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteCatalog(cat)}
                  className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Quotation Cards
  const renderQuotations = () => {
    if (quotations.length === 0) {
      return <div className="text-gray-600">Nothing to display.</div>;
    }
    return (
      <div className="grid grid-cols-3 gap-4">
        {quotations.map((q) => {
          const isApproved = q.approveStatus;
          return (
            <div
              key={q._id}
              className="relative bg-white border border-purple-200 p-4 rounded shadow flex flex-col"
            >
              <span
                className={`absolute top-0 right-0 text-white text-xs px-2 py-1 rounded-bl ${
                  isApproved ? "bg-green-500" : "bg-orange-500"
                }`}
              >
                {isApproved ? "Approved" : "Under Review"}
              </span>
              <h2 className="text-lg font-semibold mb-1 text-gray-900">
                Quotation No.: {q.quotationNumber}
              </h2>
              <p className="text-sm text-gray-600 mb-2">
                {q.customerName} {q.customerEmail ? `(${q.customerEmail})` : ""}
              </p>
              <p className="text-xs text-gray-600 mb-2">Created by: {q.createdBy}</p>
              <p className="text-xs text-gray-600 mb-4">
                Items: {q.items?.length || 0}
              </p>
              <div className="flex flex-wrap gap-2 mt-auto">
                <button
                  onClick={() => navigate(`/admin-dashboard/quotations/${q._id}`)}
                  className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-sm text-white"
                >
                  View Quotation
                </button>
                <button
                  onClick={() => handleDeleteQuotation(q)}
                  className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm text-white"
                >
                  Delete
                </button>
                {isApproved ? (
                  <>
                    <button
                      onClick={() => {
                        setExportItem(q);
                        setExportMode("excel");
                        setOptionalFieldsSelected([]);
                        setFieldSelectionOpen(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-sm text-white"
                    >
                      Excel
                    </button>
                    <button
                      onClick={() => {
                        setExportItem(q);
                        setExportMode("ppt");
                        setOptionalFieldsSelected([]);
                        setFieldSelectionOpen(true);
                      }}
                      className="bg-pink-600 hover:bg-pink-700 px-2 py-1 rounded text-sm text-white"
                    >
                      PPT
                    </button>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/quotation/${q._id}`;
                        window.open(link, "_blank");
                      }}
                      className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-sm text-white"
                    >
                      Virtual
                    </button>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/quotation/${q._id}`;
                        navigator.clipboard
                          .writeText(link)
                          .then(() => alert("Copied link!"))
                          .catch((err) => {
                            console.error("Error copying link:", err);
                            alert("Failed to copy link");
                          });
                      }}
                      className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-sm text-white"
                    >
                      Copy Link
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleApproveQuotation(q)}
                      className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-sm text-white"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => openRemarksModal(q, "quotation")}
                      className="bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded text-sm text-white"
                    >
                      Remarks
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div className="p-6 text-gray-400">Loading...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-400">{error}</div>;
  }

  // If we are field selecting:
  let possibleOptionalFields = [];
  if (fieldSelectionOpen && exportItem && Array.isArray(exportItem.fieldsToDisplay)) {
    possibleOptionalFields = exportItem.fieldsToDisplay.filter(
      (f) => !MANDATORY_FIELDS.includes(f) && !NEVER_DISPLAY_FIELDS.includes(f)
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-6">
      {/* Filter Buttons */}
      <div className="mb-6">{renderFilterButtons()}</div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {filterType === "catalogs" ? "Manage Catalogs" : "Manage Quotations"}
        </h1>
      </div>

      {filterType === "catalogs" ? renderCatalogs() : renderQuotations()}

      {/* RemarksModal */}
      {remarksModalOpen && selectedItemForRemarks && (
        <RemarksModal
          item={selectedItemForRemarks}
          type={itemTypeForRemarks}
          onClose={() => setRemarksModalOpen(false)}
          onSave={handleSaveRemarks}
          userEmail={userEmail}
        />
      )}

      {/* FieldsSelectionModal */}
      {fieldSelectionOpen && (
        <FieldsSelectionModal
          onClose={() => setFieldSelectionOpen(false)}
          onConfirm={handleFieldSelectionConfirm}
          optionalFieldsSelected={optionalFieldsSelected}
          setOptionalFieldsSelected={setOptionalFieldsSelected}
          possibleOptionalFields={possibleOptionalFields}
        />
      )}
    </div>
  );
}
