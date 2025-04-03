"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import CompanyModal from "../components/CompanyModal";

// Optional bag icon
const BagIcon = () => <span style={{ fontSize: "1.2rem" }}>🛍️</span>;

const limit = 100;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function CreateManualCatalog() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // ----------------------- States -----------------------
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter Options
  const [fullCategories, setFullCategories] = useState([]);
  const [fullSubCategories, setFullSubCategories] = useState([]);
  const [fullBrands, setFullBrands] = useState([]);
  const [fullPriceRanges, setFullPriceRanges] = useState([]);
  const [fullVariationHinges, setFullVariationHinges] = useState([]);

  // Selected Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState([]);
  const [selectedVariationHinges, setSelectedVariationHinges] = useState([]);

  // Dropdown toggles
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [priceRangeOpen, setPriceRangeOpen] = useState(false);
  const [variationHingeOpen, setVariationHingeOpen] = useState(false);

  // Variation modal
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [variationModalProduct, setVariationModalProduct] = useState(null);

  // Editing a single item in cart
  const [editIndex, setEditIndex] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Advanced Image Search
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState([]);
  const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false);
  const imageInputRef = useRef(null);

  // Catalog / Quotation fields
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [fieldsToDisplay, setFieldsToDisplay] = useState(["name", "productCost"]);
  const [catalogName, setCatalogName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");

  // Margin & GST
  const presetMarginOptions = [5, 10, 15, 20];
  const [selectedMargin, setSelectedMargin] = useState(presetMarginOptions[0]);
  const [marginOption, setMarginOption] = useState("preset");
  const [selectedPresetMargin, setSelectedPresetMargin] = useState(presetMarginOptions[0]);
  const [customMargin, setCustomMargin] = useState("");

  const presetGstOptions = [18];
  const [gstOption, setGstOption] = useState("preset");
  const [selectedPresetGst, setSelectedPresetGst] = useState(presetGstOptions[0]);
  const [customGst, setCustomGst] = useState("");
  const [selectedGst, setSelectedGst] = useState(presetGstOptions[0]);

  // Cart panel
  const [cartOpen, setCartOpen] = useState(false);

  // Company-related states
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedCompanyData, setSelectedCompanyData] = useState(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ----------------------- useEffects -----------------------
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchProducts(1);
    // eslint-disable-next-line
  }, [
    searchTerm,
    selectedCategories,
    selectedSubCategories,
    selectedBrands,
    selectedPriceRanges,
    selectedVariationHinges,
  ]);

  useEffect(() => {
    if (isEditMode) {
      fetchExistingCatalog();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  // ----------------------- Fetch Filter Options -----------------------
  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/products/filters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFullCategories(res.data.categories || []);
      setFullSubCategories(res.data.subCategories || []);
      setFullBrands(res.data.brands || []);
      setFullPriceRanges(res.data.priceRanges || []);
      setFullVariationHinges(res.data.variationHinges || []);
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  };

  // ----------------------- Fetch Products -----------------------
  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", limit);
      if (searchTerm) params.append("search", searchTerm);
      if (selectedCategories.length > 0)
        params.append("categories", selectedCategories.join(","));
      if (selectedSubCategories.length > 0)
        params.append("subCategories", selectedSubCategories.join(","));
      if (selectedBrands.length > 0)
        params.append("brands", selectedBrands.join(","));
      if (selectedPriceRanges.length > 0)
        params.append("priceRanges", selectedPriceRanges.join(","));
      if (selectedVariationHinges.length > 0)
        params.append("variationHinges", selectedVariationHinges.join(","));

      const res = await axios.get(`${BACKEND_URL}/api/admin/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProducts(res.data.products || []);
      setCurrentPage(res.data.currentPage || 1);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------- Fetch Existing Catalog (Edit Mode) -----------------------
  const fetchExistingCatalog = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${BACKEND_URL}/api/admin/catalogs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCatalogName(data.catalogName);
      setCustomerName(data.customerName);
      setCustomerEmail(data.customerEmail || "");
      setCustomerAddress(data.customerAddress || "");
      setCustomerCompany(data.customerCompany || "");
      // Set selectedCompany so the input field is populated.
      setSelectedCompany(data.customerCompany || "");
      setFieldsToDisplay(data.fieldsToDisplay || []);

      // Margin
      const existingMargin = data.margin || presetMarginOptions[0];
      if (presetMarginOptions.includes(existingMargin)) {
        setMarginOption("preset");
        setSelectedPresetMargin(existingMargin);
        setSelectedMargin(existingMargin);
      } else {
        setMarginOption("custom");
        setCustomMargin(String(existingMargin));
        setSelectedMargin(existingMargin);
      }

      // GST
      const existingGst = data.gst || presetGstOptions[0];
      if (presetGstOptions.includes(existingGst)) {
        setGstOption("preset");
        setSelectedPresetGst(existingGst);
        setSelectedGst(existingGst);
      } else {
        setGstOption("custom");
        setCustomGst(String(existingGst));
        setSelectedGst(existingGst);
      }

      // Map products to include productName
      const mappedRows = data.products.map((item) => ({
        _id: item._id, // preserve the subdocument _id
        productId: item.productId,
        productName: item.productName, // from catalog
        color: item.color || "N/A",
        size: item.size || "N/A",
        quantity: item.quantity || 1,
        productCost: item.productCost,
        productGST: item.productGST || 0,
      }));

      setSelectedProducts(mappedRows);
    } catch (error) {
      console.error("Error fetching catalog for edit:", error);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------- Advanced Image Search -----------------------
  const handleImageSearchClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageSearch = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAdvancedSearchLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", file);
      const res = await axios.post(`${BACKEND_URL}/api/products/advanced-search`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setAdvancedSearchResults(Array.isArray(res.data) ? res.data : []);
      setAdvancedSearchActive(true);
    } catch (error) {
      console.error("Error in advanced image search:", error);
      alert("Image search failed. Check console.");
    } finally {
      setAdvancedSearchLoading(false);
    }
  };

  const handleClearAdvancedSearch = () => {
    setAdvancedSearchActive(false);
    setAdvancedSearchResults([]);
  };

  // ----------------------- Filter Helpers -----------------------
  const toggleFilter = (value, list, setList) => {
    if (list.includes(value)) {
      setList(list.filter((x) => x !== value));
    } else {
      setList([...list, value]);
    }
  };

  // ----------------------- Variation Modal Handlers -----------------------
  const openVariationSelector = (product) => {
    setVariationModalProduct(product);
    setVariationModalOpen(true);
  };

  const closeVariationModal = () => {
    setVariationModalOpen(false);
    setVariationModalProduct(null);
  };

  // ----------------------- Add Items Without Duplicates -----------------------
  function isDuplicate(prodId, color, size) {
    return selectedProducts.some(
      (sp) =>
        sp.productId === prodId &&
        (sp.color || "") === (color || "") &&
        (sp.size || "") === (size || "")
    );
  }

  // Single color/size add handler
  const handleAddSingle = (item) => {
    if (isDuplicate(item.productId, item.color, item.size)) {
      alert("This item with the same color & size is already added!");
      return;
    }
    setSelectedProducts((prev) => [...prev, item]);
  };

  // Multi-add from VariationModal
  const handleAddVariations = (variations) => {
    if (!variationModalProduct) return;
    const newItems = variations.map((v) => {
      let effectiveCost = variationModalProduct.productCost || 0;
      if (selectedMargin > 0) {
        effectiveCost *= 1 + selectedMargin / 100;
        effectiveCost = parseFloat(effectiveCost.toFixed(2));
      }
      return {
        productId: variationModalProduct._id,
        name: variationModalProduct.name,
        productCost: effectiveCost,
        productGST: variationModalProduct.productGST || 0,
        color: v.color && v.color.trim() !== "" ? v.color : "N/A",
        size: v.size && v.size.trim() !== "" ? v.size : "N/A",
        quantity: v.quantity || 1,
        material: variationModalProduct.material || "",
        weight: variationModalProduct.weight || "",
      };
    });

    const filtered = newItems.filter(
      (item) => !isDuplicate(item.productId, item.color, item.size)
    );

    if (filtered.length < newItems.length) {
      alert("Some variations were duplicates and were not added.");
    }

    if (filtered.length > 0) {
      setSelectedProducts((prev) => [...prev, ...filtered]);
    }
    closeVariationModal();
  };

  // ----------------------- Edit Selected Row -----------------------
  const handleEditItem = (index) => {
    setEditIndex(index);
    setEditModalOpen(true);
  };

  const handleUpdateItem = (updatedItem) => {
    setSelectedProducts((prev) => {
      const newArr = [...prev];
      const isDup = newArr.some((sp, i) => {
        if (i === editIndex) return false;
        return (
          sp.productId === newArr[editIndex].productId &&
          (sp.color || "") === (updatedItem.color || "") &&
          (sp.size || "") === (updatedItem.size || "")
        );
      });
      if (isDup) {
        alert("This update creates a duplicate. Not updating.");
        return newArr;
      }
      newArr[editIndex] = { ...newArr[editIndex], ...updatedItem };
      return newArr;
    });
  };

  // ----------------------- Remove Selected Row -----------------------
  const handleRemoveSelectedRow = (index) => {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  // ----------------------- Fields to Display -----------------------
  const toggleField = (field) => {
    if (fieldsToDisplay.includes(field)) {
      setFieldsToDisplay((prev) => prev.filter((f) => f !== field));
    } else {
      setFieldsToDisplay((prev) => [...prev, field]);
    }
  };

  // ----------------------- Update Company Info -----------------------
  const updateCompanyInfo = async () => {
    if (!selectedCompanyData || !selectedCompanyData._id) return;
    try {
      const token = localStorage.getItem("token");
      const updatedData = {
        companyEmail: customerEmail,
        clients:
          selectedCompanyData.clients && selectedCompanyData.clients.length > 0
            ? [
                {
                  name: customerName,
                  contactNumber: selectedCompanyData.clients[0].contactNumber,
                },
                ...selectedCompanyData.clients.slice(1),
              ]
            : [{ name: customerName, contactNumber: "" }],
      };
      await axios.put(`${BACKEND_URL}/api/admin/companies/${selectedCompanyData._id}`, updatedData, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Error updating company info:", error);
    }
  };

  // ----------------------- Save / Update Catalog -----------------------
  const handleSaveCatalog = async () => {
    if (!catalogName) {
      alert("Please enter Catalog Name and Customer Name");
      return;
    }
    if (selectedProducts.length === 0) {
      alert("Please select at least one product");
      return;
    }

    const updatedCatalogData = {
      catalogName,
      customerName,
      customerEmail,
      customerAddress,
      customerCompany: selectedCompany,
      margin: selectedMargin,
      gst: selectedGst,
      products: selectedProducts.map((p) => ({
        _id: p._id, // Include this for existing items
        productId: p.productId,
        color: p.color || "",
        size: p.size || "",
        quantity: p.quantity,
        productCost: p.productCost,
        productGST: p.productGST,
      })),
    };

    console.log("Updated Catalog Data:", updatedCatalogData);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(`${BACKEND_URL}/api/admin/catalogs/${id}`, updatedCatalogData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Response from server:", response.data);
      await fetchExistingCatalog();
      alert("Catalog updated successfully!");
      navigate(`/admin-dashboard/manage-catalogs`);
    } catch (error) {
      console.error("Error updating catalog:", error);
      alert("Failed to update catalog. Check console.");
    }
  };

  // ----------------------- Create Quotation -----------------------
  const handleCreateQuotation = async () => {
    if (!catalogName) {
      alert("Please enter Catalog Name and Customer Name");
      return;
    }
    if (selectedProducts.length === 0) {
      alert("Please select at least one product for the quotation");
      return;
    }

    const items = selectedProducts.map((p, index) => {
      const quantity = p.quantity || 1;
      const baseRate = p.productCost || 0;
      const rate = parseFloat(baseRate.toFixed(2));
      const amount = rate * quantity;
      const itemGst = p.productGST !== undefined ? p.productGST : selectedGst;
      const gstVal = parseFloat((amount * (itemGst / 100)).toFixed(2));
      const total = parseFloat((amount + gstVal).toFixed(2));

      return {
        slNo: index + 1,
        productId: p.productId,
        product: p.name + (p.color ? `(${p.color})` : "") + (p.size ? `[${p.size}]` : ""),
        quantity,
        rate,
        amount,
        gst: gstVal,
        total,
      };
    });

    try {
      const token = localStorage.getItem("token");
      const body = {
        catalogName,
        customerName,
        customerEmail,
        customerAddress,
        margin: selectedMargin,
        gst: selectedGst,
        items,
      };
      await axios.post(`${BACKEND_URL}/api/admin/quotations`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Quotation created successfully!");
    } catch (error) {
      console.error("Error creating quotation:", error);
      alert("Error creating quotation. Check console.");
    }
  };

  // ----------------------- Pagination Controls -----------------------
  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchProducts(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchProducts(currentPage + 1);
    }
  };

  const finalProducts = advancedSearchActive ? advancedSearchResults : products;

  // ----------------------- Fetch Companies -----------------------
  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/companies?all=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(res.data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  // ----------------------- Company Handlers -----------------------
  const handleCompanySelect = (company) => {
    setSelectedCompany(company.companyName);
    setSelectedCompanyData(company);
    setCustomerName(company.clients[0]?.name || "");
    setCustomerEmail(company.companyEmail);
    setCustomerAddress(company.companyAddress);
    setDropdownOpen(false);
  };

  const handleOpenCompanyModal = () => {
    setShowCompanyModal(true);
  };

  const handleCloseCompanyModal = () => {
    setShowCompanyModal(false);
    fetchCompanies();
  };

  return (
    <div className="relative bg-white text-gray-800 min-h-screen p-6">
      {/* Top: Catalog name, Margin, GST & Quotation Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-purple-700">
          {isEditMode ? "Edit Catalog" : "Create Catalog (Manual)"}
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          {/* Margin Selection */}
          <div className="flex items-center space-x-2">
            <label>
              <b>Select Margin</b>
            </label>
            <select
              value={marginOption === "preset" ? selectedPresetMargin : "custom"}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "custom") {
                  setMarginOption("custom");
                } else {
                  setMarginOption("preset");
                  setSelectedPresetMargin(parseFloat(val));
                  setSelectedMargin(parseFloat(val));
                }
              }}
              className="px-3 py-2 bg-white border border-purple-300 rounded text-gray-900"
            >
              {presetMarginOptions.map((m) => (
                <option key={m} value={m}>
                  {m}%
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
            {marginOption === "custom" && (
              <input
                type="number"
                min="1"
                placeholder="Enter margin"
                value={customMargin}
                onChange={(e) => {
                  setCustomMargin(e.target.value);
                  const mv = parseFloat(e.target.value);
                  if (!isNaN(mv) && mv > 0) {
                    setSelectedMargin(mv);
                  }
                }}
                className="px-3 py-2 bg-white border border-purple-300 rounded text-gray-900"
                style={{ width: 100 }}
              />
            )}
          </div>
          {/* GST Selection */}
          <div className="flex items-center space-x-2">
            <label>
              <b>Select GST</b>
            </label>
            <select
              value={gstOption === "preset" ? selectedPresetGst : "custom"}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "custom") {
                  setGstOption("custom");
                } else {
                  setGstOption("preset");
                  setSelectedPresetGst(parseFloat(val));
                  setSelectedGst(parseFloat(val));
                }
              }}
              className="px-3 py-2 bg-white border border-purple-300 rounded text-gray-900"
            >
              {presetGstOptions.map((g) => (
                <option key={g} value={g}>
                  {g}%
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
            {gstOption === "custom" && (
              <input
                type="number"
                min="0"
                placeholder="Enter GST %"
                value={customGst}
                onChange={(e) => {
                  setCustomGst(e.target.value);
                  const gstVal = parseFloat(e.target.value);
                  if (!isNaN(gstVal)) {
                    setSelectedGst(gstVal);
                  }
                }}
                className="px-3 py-2 bg-white border border-purple-300 rounded text-gray-900"
                style={{ width: 100 }}
              />
            )}
          </div>
          {/* Create / Update Buttons */}
          <button
            onClick={handleSaveCatalog}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            {isEditMode ? "Update Catalog" : "Create Catalog"}
          </button>
          <button
            onClick={handleCreateQuotation}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Create Quotation
          </button>
        </div>
      </div>

      {/* Catalog Info Form */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block mb-1 font-medium text-purple-700">Catalog Name *</label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={catalogName}
            onChange={(e) => setCatalogName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">Customer Company *</label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={selectedCompany}
            onChange={(e) => {
              setSelectedCompany(e.target.value);
              setDropdownOpen(true);
            }}
            required
          />
          {/* Dropdown for company suggestions */}
          {dropdownOpen && selectedCompany && (
            <div className="absolute z-10 bg-white border border-gray-300 rounded shadow-lg mt-1 w-full">
              {companies
                .filter((company) =>
                  company.companyName.toLowerCase().includes(selectedCompany.toLowerCase())
                )
                .map((company) => (
                  <div
                    key={company._id}
                    className="p-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleCompanySelect(company)}
                  >
                    {company.companyName}
                  </div>
                ))}
              <div className="p-2 cursor-pointer hover:bg-gray-100" onClick={handleOpenCompanyModal}>
                + Create Company
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">Customer Name *</label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            onBlur={updateCompanyInfo}
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">Customer Email</label>
          <input
            type="email"
            className="border border-purple-300 rounded w-full p-2"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            onBlur={updateCompanyInfo}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">Customer Address</label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={customerAddress}
            readOnly
          />
        </div>
      </div>

      {/* Fields to Display */}
      <div className="mb-6">
        <label className="block mb-2 font-medium text-purple-700">Fields to Display</label>
        <div className="flex flex-wrap gap-3">
          {[
            "images",
            "name",
            "category",
            "subCategory",
            "brandName",
            "productCost",
            "size",
            "color",
            "material",
            "weight",
          ].map((field) => (
            <label key={field} className="flex items-center space-x-1 text-sm">
              <input
                type="checkbox"
                checked={fieldsToDisplay.includes(field)}
                onChange={() => toggleField(field)}
                className="form-checkbox h-4 w-4 text-purple-600"
              />
              <span className="text-gray-900">{field}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Search + Advanced Image Search + Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2 w-full md:w-1/2">
          <input
            type="text"
            placeholder="Search products..."
            className="flex-grow px-3 py-2 border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={handleImageSearchClick}
            className="px-3 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white rounded hover:opacity-90 flex items-center"
          >
            {advancedSearchLoading && (
              <div className="w-5 h-5 border-4 border-white border-t-transparent border-solid rounded-full animate-spin mr-1"></div>
            )}
            <span>Search by Image</span>
          </button>
          <input
            type="file"
            ref={imageInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleImageSearch}
          />
          {advancedSearchActive && (
            <button
              onClick={handleClearAdvancedSearch}
              className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Clear Image
            </button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Category Filter */}
        <div className="relative">
          <button
            onClick={() => setCategoryOpen(!categoryOpen)}
            className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
          >
            Categories ({selectedCategories.length})
          </button>
          {categoryOpen && (
            <div className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20" style={{ maxHeight: "150px", overflowY: "auto" }}>
              {fullCategories.map((cat) => (
                <label key={cat} className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-500"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleFilter(cat, selectedCategories, setSelectedCategories)}
                  />
                  <span className="truncate">{cat}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {/* SubCategory Filter */}
        <div className="relative">
          <button
            onClick={() => setSubCategoryOpen(!subCategoryOpen)}
            className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
          >
            SubCats ({selectedSubCategories.length})
          </button>
          {subCategoryOpen && (
            <div className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20" style={{ maxHeight: "150px", overflowY: "auto" }}>
              {fullSubCategories.map((subCat) => (
                <label key={subCat} className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-500"
                    checked={selectedSubCategories.includes(subCat)}
                    onChange={() => toggleFilter(subCat, selectedSubCategories, setSelectedSubCategories)}
                  />
                  <span className="truncate">{subCat}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {/* Brand Filter */}
        <div className="relative">
          <button
            onClick={() => setBrandOpen(!brandOpen)}
            className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
          >
            Brands ({selectedBrands.length})
          </button>
          {brandOpen && (
            <div className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20" style={{ maxHeight: "150px", overflowY: "auto" }}>
              {fullBrands.map((brand) => (
                <label key={brand} className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-500"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => toggleFilter(brand, selectedBrands, setSelectedBrands)}
                  />
                  <span className="truncate">{brand}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {/* Price Range Filter */}
        <div className="relative">
          <button
            onClick={() => setPriceRangeOpen(!priceRangeOpen)}
            className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
          >
            Price Range ({selectedPriceRanges.length})
          </button>
          {priceRangeOpen && (
            <div className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20" style={{ maxHeight: "150px", overflowY: "auto" }}>
              {fullPriceRanges.map((range) => (
                <label key={range} className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-500"
                    checked={selectedPriceRanges.includes(range)}
                    onChange={() => toggleFilter(range, selectedPriceRanges, setSelectedPriceRanges)}
                  />
                  <span className="truncate">{range}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {/* Variation Hinge Filter */}
        <div className="relative">
          <button
            onClick={() => setVariationHingeOpen(!variationHingeOpen)}
            className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
          >
            Variation Hinge ({selectedVariationHinges.length})
          </button>
          {variationHingeOpen && (
            <div className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20" style={{ maxHeight: "150px", overflowY: "auto" }}>
              {fullVariationHinges.map((hinge) => (
                <label key={hinge} className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-500"
                    checked={selectedVariationHinges.includes(hinge)}
                    onChange={() => toggleFilter(hinge, selectedVariationHinges, setSelectedVariationHinges)}
                  />
                  <span className="truncate">{hinge}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div>Loading products...</div>
      ) : (
        <>
          {advancedSearchActive && advancedSearchResults.length === 0 && (
            <div className="text-gray-600 mb-2 text-sm">No products found from image search.</div>
          )}
          {!advancedSearchActive && searchTerm && (
            <div className="text-gray-600 mb-2 text-sm">Searching for "{searchTerm}"...</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {finalProducts.map((prod) => (
              <ProductCard
                key={prod._id}
                product={prod}
                selectedMargin={selectedMargin}
                onAddSelected={handleAddSingle}
                openVariationSelector={openVariationSelector}
              />
            ))}
          </div>
          {!advancedSearchActive && (
            <div className="flex justify-center items-center mt-6 space-x-4">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Floating Bag Icon */}
      <div
        className="fixed bottom-4 right-4 bg-purple-600 text-white rounded-full p-3 cursor-pointer flex items-center justify-center shadow-lg"
        style={{ width: 60, height: 60 }}
        onClick={() => setCartOpen(true)}
      >
        <BagIcon />
        {selectedProducts.length > 0 && (
          <span className="absolute text-xs bg-red-500 w-5 h-5 rounded-full text-center -top-1 -right-1 text-white">
            {selectedProducts.length}
          </span>
        )}
      </div>

      {/* Cart Panel */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black bg-opacity-30">
          <div className="bg-white w-full sm:w-96 h-full shadow-md p-4 flex flex-col relative">
            <h2 className="text-lg font-bold text-purple-700 mb-4">
              Selected Items ({selectedProducts.length})
            </h2>
            <button
              onClick={() => setCartOpen(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
            >
              <span className="text-xl font-bold">&times;</span>
            </button>
            <div className="flex-grow overflow-auto">
              {selectedProducts.length === 0 && (
                <p className="text-gray-600">No products selected.</p>
              )}
              {selectedProducts.map((row, idx) => {
                console.log("Row data:", row);
                return (
                  <div key={idx} className="flex flex-col border border-purple-200 rounded p-2 mb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-sm text-purple-800">{row.productName || "No Product Name"}</div>
                        {row.color && <div className="text-xs">Color: {row.color}</div>}
                        {row.size && <div className="text-xs">Size: {row.size}</div>}
                        <div className="text-xs">Cost: ₹{row.productCost.toFixed(2)}</div>
                        <div className="text-xs">GST: {row.productGST}%</div>
                        <div className="text-xs">Qty: {row.quantity}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveSelectedRow(idx)}
                        className="bg-pink-600 hover:bg-pink-700 text-white px-2 py-1 rounded text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <button
                      onClick={() => handleEditItem(idx)}
                      className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs self-start"
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setCartOpen(false)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded self-end mt-2"
            >
              Save & Close
            </button>
          </div>
        </div>
      )}

      {/* Variation Modal (Multi-Add) */}
      {variationModalOpen && variationModalProduct && (
        <VariationModal
          product={variationModalProduct}
          onClose={closeVariationModal}
          onSave={handleAddVariations}
          selectedMargin={selectedMargin}
        />
      )}

      {/* Variation Edit Modal (Single Item) */}
      {editModalOpen && editIndex != null && (
        <VariationEditModal
          item={selectedProducts[editIndex]}
          onClose={() => {
            setEditIndex(null);
            setEditModalOpen(false);
          }}
          onUpdate={(updatedItem) => {
            handleUpdateItem(updatedItem);
            setEditIndex(null);
            setEditModalOpen(false);
          }}
        />
      )}

      {/* Company Modal for adding new company */}
      {showCompanyModal && <CompanyModal onClose={handleCloseCompanyModal} />}
    </div>
  );
}

// ----------------------- PRODUCT CARD -----------------------
function ProductCard({ product, selectedMargin, onAddSelected, openVariationSelector }) {
  const colorOptions = Array.isArray(product.color)
    ? product.color
    : typeof product.color === "string"
    ? product.color.split(",").map((c) => c.trim())
    : [];
  const sizeOptions = Array.isArray(product.size)
    ? product.size
    : typeof product.size === "string"
    ? product.size.split(",").map((s) => s.trim())
    : [];
  const singleColor = colorOptions.length === 1;
  const singleSize = sizeOptions.length === 1;

  const handleSingleSelect = () => {
    let cost = product.productCost || 0;
    if (selectedMargin > 0) {
      cost *= 1 + selectedMargin / 100;
      cost = parseFloat(cost.toFixed(2));
    }
    const newItem = {
      productId: product._id,
      name: product.name,
      productCost: cost,
      productGST: product.productGST || 0,
      color: singleColor ? (colorOptions[0].trim() !== "" ? colorOptions[0] : "N/A") : "",
      size: singleSize ? (sizeOptions[0].trim() !== "" ? sizeOptions[0] : "N/A") : "",
      quantity: 1,
      material: product.material || "",
      weight: product.weight || "",
    };
    onAddSelected(newItem);
  };

  return (
    <div className="bg-white border border-purple-200 rounded shadow-md p-4 relative">
      {product.stockInHand !== undefined && (
        <span
          className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded ${
            product.stockInHand > 0 ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {product.stockInHand > 0 ? "Available" : "Out of stock"}
        </span>
      )}
      <div className="h-40 flex items-center justify-center bg-gray-50 overflow-hidden mb-4">
        {product.images && product.images.length > 0 ? (
          <img src={product.images[0]} alt={product.name} className="object-contain h-full" />
        ) : (
          <span className="text-gray-400 text-sm">No Image</span>
        )}
      </div>
      <h2 className="font-semibold text-lg mb-1 truncate text-purple-700">{product.name}</h2>
      <h3 className="font-semibold text-md text-red-600 mb-1 truncate">₹{product.productCost}</h3>
      <p className="text-xs text-gray-600 mb-2">
        {product.category}
        {product.subCategory ? ` / ${product.subCategory}` : ""}
      </p>
      {singleColor && singleSize ? (
        <button
          onClick={handleSingleSelect}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Select
        </button>
      ) : (
        <button
          onClick={() => openVariationSelector(product)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Choose Variation
        </button>
      )}
    </div>
  );
}

// ----------------------- VARIATION MODAL (Multi-Add) -----------------------
function VariationModal({ product, onClose, onSave, selectedMargin }) {
  const [variations, setVariations] = useState([]);
  const colorOptions = Array.isArray(product.color)
    ? product.color
    : typeof product.color === "string"
    ? product.color.split(",").map((c) => c.trim())
    : [];
  const sizeOptions = Array.isArray(product.size)
    ? product.size
    : typeof product.size === "string"
    ? product.size.split(",").map((s) => s.trim())
    : [];
  const [pickedColor, setPickedColor] = useState(colorOptions[0] || "");
  const [pickedSize, setPickedSize] = useState(sizeOptions[0] || "");
  const [pickedQuantity, setPickedQuantity] = useState(1);

  const handleAddLine = () => {
    const line = {
      color: pickedColor || "",
      size: pickedSize || "",
      quantity: parseInt(pickedQuantity) || 1,
    };
    setVariations((prev) => [...prev, line]);
  };

  const handleRemoveLine = (index) => {
    setVariations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAndClose = () => {
    if (variations.length === 0) {
      alert("Add product to save");
      return;
    }
    const itemsWithProductData = variations.map((variation) => {
      let cost = product.productCost || 0;
      if (selectedMargin > 0) {
        cost *= 1 + selectedMargin / 100;
        cost = parseFloat(cost.toFixed(2));
      }
      return {
        productId: product._id,
        name: product.name,
        productCost: cost,
        productGST: product.productGST || 0,
        color: variation.color && variation.color.trim() !== "" ? variation.color : "N/A",
        size: variation.size && variation.size.trim() !== "" ? variation.size : "N/A",
        quantity: variation.quantity || 1,
        material: product.material || "",
        weight: product.weight || "",
      };
    });
    onSave(itemsWithProductData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border border-gray-200 shadow-lg">
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-600 hover:text-gray-900">
            <span className="text-xl font-bold">&times;</span>
          </button>
          <h2 className="text-xl font-bold mb-4 text-purple-700">Choose Variations for {product.name}</h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Color</label>
              {colorOptions.length ? (
                <select
                  className="border border-purple-300 rounded p-1 w-full"
                  value={pickedColor}
                  onChange={(e) => setPickedColor(e.target.value)}
                >
                  {colorOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="border border-purple-300 rounded p-1 w-full"
                  value={pickedColor}
                  onChange={(e) => setPickedColor(e.target.value)}
                  placeholder="No colors? Type custom"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Size</label>
              {sizeOptions.length ? (
                <select
                  className="border border-purple-300 rounded p-1 w-full"
                  value={pickedSize}
                  onChange={(e) => setPickedSize(e.target.value)}
                >
                  {sizeOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="border border-purple-300 rounded p-1 w-full"
                  value={pickedSize}
                  onChange={(e) => setPickedSize(e.target.value)}
                  placeholder="No sizes? Type custom"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Qty</label>
              <input
                type="number"
                min="1"
                className="border border-purple-300 rounded p-1 w-full"
                value={pickedQuantity}
                onChange={(e) => setPickedQuantity(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={handleAddLine}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            + Add
          </button>
          <div className="mt-4 space-y-2">
            {variations.length === 0 && (
              <p className="text-red-500 text-sm font-semibold">Add product to save</p>
            )}
            {variations.map((line, idx) => (
              <div key={idx} className="flex items-center justify-between border p-2 rounded">
                <div>
                  <span className="mr-2 font-semibold">{line.color}</span>
                  <span className="mr-2 font-semibold">{line.size}</span>
                  <span>Qty: {line.quantity}</span>
                </div>
                <button
                  onClick={() => handleRemoveLine(idx)}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-2 py-1 rounded text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100">
              Cancel
            </button>
            <button onClick={handleSaveAndClose} className={`px-4 py-2 rounded text-white ${variations.length > 0 ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 cursor-not-allowed"}`}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------- VARIATION EDIT MODAL (Cart Item Edit) -----------------------
function VariationEditModal({ item, onClose, onUpdate }) {
  const [name, setName] = useState(item.name || "");
  const [productCost, setProductCost] = useState(item.productCost || 0);
  const [productGST, setProductGST] = useState(item.productGST || 0);
  const [color, setColor] = useState(item.color || "");
  const [size, setSize] = useState(item.size || "");
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [material, setMaterial] = useState(item.material || "");
  const [weight, setWeight] = useState(item.weight || "");

  const handleSave = () => {
    const updatedItem = {
      name,
      productCost: parseFloat(productCost),
      productGST: parseFloat(productGST),
      color,
      size,
      quantity: parseInt(quantity) || 1,
      material,
      weight,
    };
    onUpdate(updatedItem);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border border-gray-200 shadow-lg">
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-600 hover:text-gray-900">
            <span className="text-xl font-bold">&times;</span>
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
