"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";       // For Excel export
import PptxGenJS from "pptxgenjs";   // For PPT export
import { useNavigate } from "react-router-dom";

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

// Mapping for field names to display labels
const fieldMapping = {
  name: "Name",
  brandName: "Brand Name",
  category: "Category",
  subCategory: "Sub Category",
  price: "Price",
  productDetails: "Product Details",
  images: "Images",
};

// Simple modal component for remarks (chat-like)
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
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
      <div className="bg-white p-4 rounded w-96">
        <h2 className="text-lg font-bold mb-2">Remarks</h2>
        <div className="max-h-60 overflow-y-auto border p-2 mb-2">
          {remarksList.length > 0 ? (
            remarksList.map((r, idx) => (
              <div key={idx} className="mb-1">
                <span className="font-bold">{r.sender}: </span>
                <span>{r.message}</span>
                <br />
                <small className="text-gray-500">{new Date(r.timestamp).toLocaleString()}</small>
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

export default function ReviewDashboard() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();
  const [catalogs, setCatalogs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Filter type: "catalogs" or "quotations"
  const [filterType, setFilterType] = useState("catalogs");
  // Additional approval filter: "all", "approved", "notApproved"
  const [approvalFilter, setApprovalFilter] = useState("all");
  // Dropdown for creating new catalog (for catalogs)
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Combined state for remarks modal: holds the selected item and its type ("catalog" or "quotation")
  const [selectedItemForRemarks, setSelectedItemForRemarks] = useState(null);
  const [itemTypeForRemarks, setItemTypeForRemarks] = useState(""); // "catalog" or "quotation"
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  // Current user email fetched from backend
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    fetchData();
    fetchUserEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Delete catalog
  const handleDeleteCatalog = async (catalog) => {
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
  };

  // Delete quotation
  const handleDeleteQuotation = async (quotation) => {
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
  };

  // Edit catalog (always visible)
  const handleEditCatalog = (catalog) => {
    navigate(`/admin-dashboard/catalogs/manual/${catalog._id}`);
  };

  // Approve catalog
  const handleApproveCatalog = async (catalog) => {
    if (!window.confirm(`Approve catalog "${catalog.catalogName}"?`)) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BACKEND_URL}/api/admin/catalogs/${catalog._id}/approve`,
        { approveStatus: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Catalog approved!");
      fetchData();
    } catch (error) {
      console.error("Error approving catalog:", error);
      alert("Failed to approve catalog.");
    }
  };

  // Approve quotation
  const handleApproveQuotation = async (quotation) => {
    if (!window.confirm(`Approve Quotation ${quotation.quotationNumber}?`)) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BACKEND_URL}/api/admin/quotations/${quotation._id}/approve`,
        { approveStatus: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Quotation approved!");
      fetchData();
    } catch (error) {
      console.error("Error approving quotation:", error);
      alert("Failed to approve quotation.");
    }
  };

  // Open remarks modal for either catalog or quotation
  const openRemarksModal = (item, type) => {
    setSelectedItemForRemarks(item);
    setItemTypeForRemarks(type);
    setRemarksModalOpen(true);
  };

  // Save remarks; call appropriate endpoint based on type
  const handleSaveRemarks = async (remarks, type, id) => {
    try {
      const token = localStorage.getItem("token");
      let endpoint = "";
      if (type === "catalog") {
        endpoint = `${BACKEND_URL}/api/admin/catalogs/${id}/remarks`;
      } else if (type === "quotation") {
        endpoint = `${BACKEND_URL}/api/admin/quotations/${id}/remarks`;
      }
      await axios.put(
        endpoint,
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
  };

  // Export functions
  async function handleExportExcel(catalog) {
    try {
      const wb = XLSX.utils.book_new();
      const fields = catalog.fieldsToDisplay || [];
      const header = fields.map((field) => fieldMapping[field] || field);
      const data = [header];

      catalog.products?.forEach((prodObj) => {
        const p = prodObj.productId || prodObj;
        const row = fields.map((field) => {
          if (field === "images") {
            return (p.images || []).join(", ");
          }
          if (field === "price") {
            const effectivePrice = p.price * (1 + (catalog.margin || 0) / 100);
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
      link.setAttribute("download", `Catalog-${catalog.catalogName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Excel export failed");
    }
  }

  async function handleExportPPT(catalog) {
    try {
      const pptx = new PptxGenJS();
      pptx.title = `Catalog - ${catalog.catalogName}`;

      // Slide 1
      const slide1 = pptx.addSlide();
      slide1.background = { path: "/templateSlide1.jpg" };

      // Slide 2
      const slide2 = pptx.addSlide();
      slide2.background = { path: "/templateSlide2.jpg" };

      // Slide 3: Gift Options
      const slide3 = pptx.addSlide();
      slide3.background = { path: "/templateSlide3.jpg" };
      slide3.addText("Gift Options", {
        x: 0.5,
        y: 2.6,
        w: 6.0,
        fontSize: 40,
        bold: true,
        color: "000000",
        align: "center",
      });

      // For each product, create a slide
      const fields = catalog.fieldsToDisplay || [];
      for (let i = 0; i < (catalog.products?.length || 0); i++) {
        const prodObj = catalog.products[i];
        const p = prodObj.productId || prodObj;
        const slide = pptx.addSlide();
        slide.background = { path: "/templateSlide3.jpg" };

        if (fields.includes("images")) {
          let productImgURL = (p.images && p.images[0]) ? p.images[0] : "";
          if (productImgURL.startsWith("http://")) {
            productImgURL = productImgURL.replace("http://", "https://");
          }
          let base64Img = "";
          if (productImgURL) {
            try {
              base64Img = await getBase64ImageFromUrl(productImgURL);
            } catch (err) {
              console.error("Failed to convert image to base64:", err);
            }
          }
          if (base64Img) {
            slide.addImage({
              data: base64Img,
              x: 1.2,
              y: 1.2,
              w: 3.3,
              h: 3.3,
            });
          } else if (productImgURL) {
            slide.addImage({
              path: productImgURL,
              x: 1.2,
              y: 1.2,
              w: 3.3,
              h: 3.3,
            });
          } else {
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
        }

        let yPos = 1.0;
        const textX = fields.includes("images") ? 5.5 : 1.2;
        fields.forEach((field) => {
          if (field === "images") return;
          if (field === "name") {
            slide.addText(`${p.name || ""}`, {
              x: textX,
              y: yPos,
              fontSize: 25,
              bold: true,
              color: "FF0000",
              w: 4.0,
              h: 1.0,
              valign: "middle",
              wrap: true,
            });
            yPos += 1.2;
          } else if (field === "price") {
            const effectivePrice = p.price * (1 + (catalog.margin || 0) / 100);
            slide.addText(
              [
                { text: `${fieldMapping[field]}: `, bold: true, fontSize: 15, color: "363636" },
                { text: `${effectivePrice.toFixed(2)}`, bold: false, fontSize: 15, color: "363636" }
              ],
              { x: textX, y: yPos, w: 4.0, h: 0.5, valign: "middle", wrap: true }
            );
            yPos += 0.5;
          } else {
            const label = fieldMapping[field] || field;
            const value = p[field] !== undefined ? p[field] : "";
            slide.addText(
              [
                { text: `${label}: `, bold: true, fontSize: 15, color: "363636" },
                { text: `${value}`, bold: false, fontSize: 15, color: "363636" }
              ],
              { x: textX, y: yPos, w: 4.0, h: 0.5, valign: "middle", wrap: true }
            );
            yPos += 0.5;
          }
        });
      }

      const lastSlide = pptx.addSlide();
      lastSlide.background = { path: "/templateSlideLast.jpg" };

      await pptx.writeFile({ fileName: `Catalog-${catalog.catalogName}.pptx` });
    } catch (error) {
      console.error("PPT export error:", error);
      alert("PPT export failed");
    }
  }

  function handleVirtualLink(catalog) {
    const link = `${window.location.origin}/catalog/${catalog._id}`;
    window.open(link, "_blank");
  }

  function handleCopyLink(catalog) {
    const link = `${window.location.origin}/catalog/${catalog._id}`;
    navigator.clipboard
      .writeText(link)
      .then(() => alert("Virtual link copied to clipboard!"))
      .catch((err) => {
        console.error("Error copying link:", err);
        alert("Failed to copy link");
      });
  }

  // Render filter buttons (Catalogs vs. Quotations + Approval filters)
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

  // Render catalog cards
  const renderCatalogs = () => {
    if (catalogs.length === 0) {
      return <div className="text-gray-600">Nothing to display.</div>;
    }
    return (
      <div className="grid grid-cols-3 gap-4">
        {catalogs.map((cat) => {
          const isApproved = cat.approveStatus;
          return (
            <div key={cat._id} className="relative bg-white border border-purple-200 p-4 rounded shadow flex flex-col">
              <span
                className={`absolute top-0 right-0 text-white text-xs px-2 py-1 rounded-bl ${
                  isApproved ? "bg-green-500" : "bg-orange-500"
                }`}
              >
                {isApproved ? "Approved" : "Under Review"}
              </span>
              <h2 className="text-lg font-semibold mb-1 text-gray-900">{cat.catalogName}</h2>
              <p className="text-sm text-gray-600 mb-2">
                {cat.customerName} {cat.customerEmail ? `(${cat.customerEmail})` : ""}
              </p>
              <p className="text-xs text-gray-600 mb-2">Created by: {cat.createdBy}</p>
              <p className="text-xs text-gray-600 mb-4">Products: {cat.products?.length || 0}</p>
              <div className="flex flex-wrap gap-2 mt-auto">
                {isApproved ? (
                  <>
                    <button
                      onClick={() => openRemarksModal(cat, "catalog")}
                      className="bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded text-sm text-white"
                    >
                      View Remarks
                    </button>
                    <button
                      onClick={() => handleExportExcel(cat)}
                      className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-sm text-white"
                    >
                      Excel
                    </button>
                    <button
                      onClick={() => handleExportPPT(cat)}
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
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render quotation cards
  const renderQuotations = () => {
    if (quotations.length === 0) {
      return <div className="text-gray-600">Nothing to display.</div>;
    }
    return (
      <div className="grid grid-cols-3 gap-4">
        {quotations.map((q) => (
          <div key={q._id} className="relative bg-white border border-purple-200 p-4 rounded shadow flex flex-col">
            <span
              className={`absolute top-0 right-0 text-white text-xs px-2 py-1 rounded-bl ${
                q.approveStatus ? "bg-green-500" : "bg-orange-500"
              }`}
            >
              {q.approveStatus ? "Approved" : "Under Review"}
            </span>
            <h2 className="text-lg font-semibold mb-1 text-gray-900">
              Quotation No.: {q.quotationNumber}
            </h2>
            <p className="text-sm text-gray-600 mb-2">
              {q.customerName} {q.customerEmail ? `(${q.customerEmail})` : ""}
            </p>
            <p className="text-xs text-gray-600 mb-2">Created by: {q.createdBy}</p>
            <p className="text-xs text-gray-600 mb-4">Items: {q.items?.length || 0}</p>
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
              {q.approveStatus ? (
                <>
                  <button
                    onClick={() => handleExportExcel(q)}
                    className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-sm text-white"
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => handleExportPPT(q)}
                    className="bg-pink-600 hover:bg-pink-700 px-2 py-1 rounded text-sm text-white"
                  >
                    PPT
                  </button>
                  <button
                    onClick={() => handleVirtualLink(q)}
                    className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-sm text-white"
                  >
                    Virtual
                  </button>
                  <button
                    onClick={() => handleCopyLink(q)}
                    className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-sm text-white"
                  >
                    Copy Link
                  </button>
                </>) : (
                <div>
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
                </div>
              )}
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
    <div className="min-h-screen bg-gray-100 text-gray-800 p-6">
      {renderFilterButtons()}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {filterType === "catalogs" ? "Manage Catalogs" : "Manage Quotations"}
        </h1>
        {filterType === "catalogs" && (
          <div className="relative inline-block text-left">
            {/* Uncomment if you want to allow creating new catalogs here */}
            {/* <button
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
            )} */}
          </div>
        )}
      </div>
      {filterType === "catalogs" ? renderCatalogs() : renderQuotations()}
      {remarksModalOpen && selectedItemForRemarks && (
        <RemarksModal
          item={selectedItemForRemarks}
          type={itemTypeForRemarks}
          onClose={() => setRemarksModalOpen(false)}
          onSave={handleSaveRemarks}
          userEmail={userEmail}
        />
      )}
    </div>
  );
}
