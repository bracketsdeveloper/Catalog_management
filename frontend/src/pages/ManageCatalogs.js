"use client"; // Remove if you're using Create React App

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

// Sub-components
import ProductCard from "../components/manualcatalog/ProductCard";
import VariationModal from "../components/manualcatalog/VariationModal";
import VariationEditModal from "../components/manualcatalog/VariationEditModal";
import BagIcon from "../components/manualcatalog/BagIcon";
import CompanyModal from "../components/CompanyModal";

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

  // Margin
  const presetMarginOptions = [5, 10, 15, 20];
  const [selectedMargin, setSelectedMargin] = useState(presetMarginOptions[0]);
  const [marginOption, setMarginOption] = useState("preset");
  const [selectedPresetMargin, setSelectedPresetMargin] = useState(presetMarginOptions[0]);
  const [customMargin, setCustomMargin] = useState("");

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
    selectedVariationHinges
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
        headers: { Authorization: `Bearer ${token}` }
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

      const res = await axios.get(
        `${BACKEND_URL}/api/admin/products?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

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
        headers: { Authorization: `Bearer ${token}` }
      });
  
      setCatalogName(data.catalogName);
      setCustomerName(data.customerName);
      setCustomerEmail(data.customerEmail || "");
      setCustomerAddress(data.customerAddress || "");
      setFieldsToDisplay(data.fieldsToDisplay || []);
  
      // Add this line to set the customer company:
      setSelectedCompany(data.customerCompany || "");
  
      // Margin logic remains the same...
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
  
      // Map the products
      const productArray = data.products || [];
      const mappedRows = productArray
        .map((item) => {
          const prodDoc = item.productId;
          if (!prodDoc) return null;
          return {
            productId: prodDoc._id,
            name: prodDoc.name,
            productCost: prodDoc.productCost,
            productGST: item.productGST || 0,
            color: item.color || prodDoc.color || "",
            size: item.size || prodDoc.size || "",
            quantity: item.quantity || 1,
            material: prodDoc.material || "",
            weight: prodDoc.weight || ""
          };
        })
        .filter(Boolean);
  
      setSelectedProducts(mappedRows);
    } catch (error) {
      console.error("Error fetching catalog for edit:", error);
    } finally {
      setLoading(false);
    }
  };
  

  // ----------------------- Advanced Image Search -----------------------
  const handleImageSearchClick = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  const handleImageSearch = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAdvancedSearchLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", file);
      const res = await axios.post(
        `${BACKEND_URL}/api/products/advanced-search`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );
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

  // Single color/size
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
    let baseProductCost = variationModalProduct.productCost || 0;
    let baseProductGST = variationModalProduct.productGST || 0;

    const newItems = variations.map((v) => {
      let effectiveCost = baseProductCost;
      if (selectedMargin > 0) {
        effectiveCost *= 1 + selectedMargin / 100;
        effectiveCost = parseFloat(effectiveCost.toFixed(2));
      }
      return {
        productId: variationModalProduct._id,
        name: variationModalProduct.name,
        productCost: effectiveCost,
        productGST: baseProductGST,
        color: v.color || "",
        size: v.size || "",
        quantity: v.quantity || 1,
        material: variationModalProduct.material || "",
        weight: variationModalProduct.weight || ""
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
        // example: update the first client
        clients:
          selectedCompanyData.clients && selectedCompanyData.clients.length > 0
            ? [
                {
                  name: customerName,
                  contactNumber: selectedCompanyData.clients[0].contactNumber
                },
                ...selectedCompanyData.clients.slice(1)
              ]
            : [{ name: customerName, contactNumber: "" }]
      };
      await axios.put(
        `${BACKEND_URL}/api/admin/companies/${selectedCompanyData._id}`,
        updatedData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
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

    const productDocs = selectedProducts.map((p) => ({
      productId: p.productId,
      color: p.color,
      size: p.size,
      quantity: p.quantity,
      productGST: p.productGST
    }));

    const body = {
      catalogName,
      customerName,
      customerEmail,
      customerAddress,
      customerCompany: selectedCompany, // <-- Add this line
      products: productDocs,
      fieldsToDisplay,
      margin: selectedMargin
    };

    try {
      const token = localStorage.getItem("token");
      if (isEditMode) {
        await axios.put(`${BACKEND_URL}/api/admin/catalogs/${id}`, body, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Catalog updated successfully!");
      } else {
        await axios.post(`${BACKEND_URL}/api/admin/catalogs`, body, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Catalog created successfully!");
      }
      navigate("/admin-dashboard/manage-catalogs");
    } catch (error) {
      console.error("Error saving catalog:", error);
      alert("Error saving catalog. Check console.");
    }
  };

  // ----------------------- Create Quotation -----------------------
  // If you were previously using a single 'catalog-level' GST, you'd remove it here.
  // Possibly you now just do item-level calculations if you want them.
  const handleCreateQuotation = async () => {
    // Validate required fields first
    if (!catalogName || !customerName) {
      alert("Please enter Catalog Name and Customer Name");
      return;
    }
    if (!selectedCompany) {
      alert("Please select a Customer Company");
      return;
    }
    if (selectedProducts.length === 0) {
      alert("Please select at least one product");
      return;
    }
  
    try {
      // Calculate line items with proper error handling
      const items = selectedProducts.map((p, index) => {
        try {
          const quantity = Number(p.quantity) || 1;
          const rate = parseFloat((p.productCost || 0).toFixed(2));
          const amount = rate * quantity;
          const productGST = parseFloat(p.productGST) || 0;
          const gstVal = parseFloat((amount * (productGST / 100)).toFixed(2));
          const total = parseFloat((amount + gstVal).toFixed(2));
  
          return {
            slNo: index + 1,
            productId: p.productId,
            product: `${p.name}${p.color ? ` (${p.color})` : ""}${p.size ? ` [${p.size}]` : ""}`,
            quantity,
            rate,
            amount,
            productGST,
            total
          };
        } catch (itemError) {
          console.error("Error processing item:", p, itemError);
          throw new Error(`Invalid product data for item ${index + 1}`);
        }
      });
  
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Authentication token missing");
        return;
      }
  
      const body = {
        catalogName: catalogName.trim(),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerAddress: customerAddress.trim(),
        customerCompany: selectedCompany.trim(), // Ensure trimmed value
        margin: Number(selectedMargin) || 0,
        items,
        createdAt: new Date() // Explicitly set creation date
      };
  
      const response = await axios.post(
        `${BACKEND_URL}/api/admin/quotations`,
        body,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          validateStatus: (status) => status < 500
        }
      );
  
      if (response.status === 201) {
        alert("Quotation created successfully!");
        // Optional: Reset form or redirect
      } else {
        throw new Error(response.data.message || "Failed to create quotation");
      }
    } catch (error) {
      console.error("Quotation creation error:", error);
      alert(error.response?.data?.message || error.message || "Error creating quotation");
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
        headers: { Authorization: `Bearer ${token}` }
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
      {/* Top: Catalog name, Margin, Quotation Buttons */}
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

          {/* Buttons */}
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
          <label className="block mb-1 font-medium text-purple-700">
            Catalog Name *
          </label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={catalogName}
            onChange={(e) => setCatalogName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Customer Company *
          </label>
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
                  company.companyName
                    .toLowerCase()
                    .includes(selectedCompany.toLowerCase())
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
              <div
                className="p-2 cursor-pointer hover:bg-gray-100"
                onClick={handleOpenCompanyModal}
              >
                + Create Company
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Customer Name *
          </label>
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
          <label className="block mb-1 font-medium text-purple-700">
            Customer Email
          </label>
          <input
            type="email"
            className="border border-purple-300 rounded w-full p-2"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            onBlur={updateCompanyInfo}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Customer Address
          </label>
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
        <label className="block mb-2 font-medium text-purple-700">
          Fields to Display
        </label>
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
            "weight"
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
            <div
              className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20"
              style={{ maxHeight: "150px", overflowY: "auto" }}
            >
              {fullCategories.map((cat) => (
                <label
                  key={cat}
                  className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-500"
                    checked={selectedCategories.includes(cat)}
                    onChange={() =>
                      toggleFilter(cat, selectedCategories, setSelectedCategories)
                    }
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
            <div
              className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20"
              style={{ maxHeight: "150px", overflowY: "auto" }}
            >
              {fullSubCategories.map((subCat) => (
                <label
                  key={subCat}
                  className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-500"
                    checked={selectedSubCategories.includes(subCat)}
                    onChange={() =>
                      toggleFilter(subCat, selectedSubCategories, setSelectedSubCategories)
                    }
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
            <div
              className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20"
              style={{ maxHeight: "150px", overflowY: "auto" }}
            >
              {fullBrands.map((brand) => (
                <label
                  key={brand}
                  className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-500"
                    checked={selectedBrands.includes(brand)}
                    onChange={() =>
                      toggleFilter(brand, selectedBrands, setSelectedBrands)
                    }
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
            <div
              className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20"
              style={{ maxHeight: "150px", overflowY: "auto" }}
            >
              {fullPriceRanges.map((range) => (
                <label
                  key={range}
                  className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-500"
                    checked={selectedPriceRanges.includes(range)}
                    onChange={() =>
                      toggleFilter(range, selectedPriceRanges, setSelectedPriceRanges)
                    }
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
            <div
              className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20"
              style={{ maxHeight: "150px", overflowY: "auto" }}
            >
              {fullVariationHinges.map((hinge) => (
                <label
                  key={hinge}
                  className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-500"
                    checked={selectedVariationHinges.includes(hinge)}
                    onChange={() =>
                      toggleFilter(
                        hinge,
                        selectedVariationHinges,
                        setSelectedVariationHinges
                      )
                    }
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
            <div className="text-gray-600 mb-2 text-sm">
              No products found from image search.
            </div>
          )}
          {!advancedSearchActive && searchTerm && (
            <div className="text-gray-600 mb-2 text-sm">
              Searching for "{searchTerm}"...
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(advancedSearchActive ? advancedSearchResults : products).map((prod) => (
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
              {selectedProducts.map((row, idx) => (
                <div
                  key={idx}
                  className="flex flex-col border border-purple-200 rounded p-2 mb-2"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-purple-800">
                        {row.name}
                      </div>
                      {row.color && (
                        <div className="text-xs">Color: {row.color}</div>
                      )}
                      {row.size && <div className="text-xs">Size: {row.size}</div>}
                      <div className="text-xs">Cost: ₹{row.productCost}</div>
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
              ))}
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
          margin={selectedMargin}
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
