"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import CompanyModal from "../components/CompanyModal";

// Optional bag icon
const BagIcon = () => <span style={{ fontSize: "1.2rem" }}>🛍️</span>;

const limit = 100;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function EditQuotation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // -- General states
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fullCategories, setFullCategories] = useState([]);
  const [fullSubCategories, setFullSubCategories] = useState([]);
  const [fullBrands, setFullBrands] = useState([]);
  const [fullPriceRanges, setFullPriceRanges] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [priceRangeOpen, setPriceRangeOpen] = useState(false);
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [variationModalProduct, setVariationModalProduct] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState([]);
  const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false);
  const imageInputRef = useRef(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [catalogName, setCatalogName] = useState("");
  const [salutation, setSalutation] = useState("Mr.");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const presetMarginOptions = [0, 5, 10, 15, 20];
  const [selectedMargin, setSelectedMargin] = useState(presetMarginOptions[0]);
  const [marginOption, setMarginOption] = useState("preset");
  const [selectedPresetMargin, setSelectedPresetMargin] = useState(presetMarginOptions[0]);
  const [customMargin, setCustomMargin] = useState("");
  const presetGstOptions = [18];
  const [gstOption, setGstOption] = useState("preset");
  const [selectedPresetGst, setSelectedPresetGst] = useState(presetGstOptions[0]);
  const [customGst, setCustomGst] = useState("");
  const [selectedGst, setSelectedGst] = useState(presetGstOptions[0]);
  const [cartOpen, setCartOpen] = useState(false);
  const [displayTotals, setDisplayTotals] = useState(true);
  const [terms, setTerms] = useState([
    { heading: "Delivery", content: "10 – 12 Working days upon order confirmation\nSingle delivery to Hyderabad office included in the cost" },
    { heading: "Branding", content: "As mentioned above" },
    { heading: "Payment Terms", content: "Within 30 days upon delivery" },
    { heading: "Quote Validity", content: "The quote is valid only for 6 days from the date of quotation" },
  ]);

  // -- Company suggestions
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedCompanyData, setSelectedCompanyData] = useState(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch product filter options
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/products/filters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFullCategories(res.data.categories?.map((item) => item.name) || []);
      setFullSubCategories(res.data.subCategories?.map((item) => item.name) || []);
      setFullBrands(res.data.brands?.map((item) => item.name) || []);
      setFullPriceRanges(res.data.priceRanges?.map((item) => item.name) || []);
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  };

  // Fetch product list
  useEffect(() => {
    fetchProducts(1);
  }, [searchTerm, selectedCategories, selectedSubCategories, selectedBrands, selectedPriceRanges]);

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", limit);
      if (searchTerm) params.append("search", searchTerm);
      if (selectedCategories.length > 0) {
        params.append("categories", selectedCategories.join(","));
      }
      if (selectedSubCategories.length > 0) {
        params.append("subCategories", selectedSubCategories.join(","));
      }
      if (selectedBrands.length > 0) {
        params.append("brands", selectedBrands.join(","));
      }
      if (selectedPriceRanges.length > 0) {
        params.append("priceRanges", selectedPriceRanges.join(","));
      }

      const url = `${BACKEND_URL}/api/admin/products?${params.toString()}`;
      const res = await axios.get(url, {
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

  // Fetch existing quotation if in edit mode
  useEffect(() => {
    if (isEditMode) {
      fetchExistingQuotation();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchExistingQuotation = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${BACKEND_URL}/api/admin/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCatalogName(data.catalogName || "");
      setSalutation(data.salutation || "Mr.");
      setCustomerName(data.customerName || "");
      setCustomerEmail(data.customerEmail || "");
      setCustomerAddress(data.customerAddress || "");
      setCustomerCompany(data.customerCompany || "");
      setSelectedCompany(data.customerCompany || "");
      setDisplayTotals(data.displayTotals !== undefined ? data.displayTotals : true);
      setTerms(data.terms && data.terms.length > 0 ? data.terms : terms);

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

      const mappedItems = data.items.map((item) => ({
        productId: item.productId,
        productName: item.product,
        productCost: item.productprice || item.rate,
        productprice: item.productprice || item.rate,
        productGST: item.productGST || 0,
        quantity: item.quantity || 1,
        color: item.color || "N/A",
        size: item.size || "N/A",
        material: item.material || "",
        weight: item.weight || "",
        ProductDescription: item.ProductDescription || "",
        ProductBrand: item.ProductBrand || "",
      }));
      setSelectedProducts(mappedItems);
    } catch (error) {
      console.error("Error fetching quotation for edit:", error);
      alert("Failed to load quotation. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch companies for suggestion
  useEffect(() => {
    fetchCompanies();
  }, []);

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

  // Handlers for advanced image search
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

  // Handlers for product selection + variations
  const toggleFilter = (value, list, setList) => {
    if (list.includes(value)) {
      setList(list.filter((x) => x !== value));
    } else {
      setList([...list, value]);
    }
  };

  const openVariationSelector = (product) => {
    setVariationModalProduct(product);
    setVariationModalOpen(true);
  };

  const closeVariationModal = () => {
    setVariationModalOpen(false);
    setVariationModalProduct(null);
  };

  function isDuplicate(prodId, color, size) {
    return selectedProducts.some(
      (sp) =>
        sp.productId === prodId &&
        (sp.color || "") === (color || "") &&
        (sp.size || "") === (size || "")
    );
  }

  const handleAddSingle = (item) => {
    if (isDuplicate(item.productId, item.color, item.size)) {
      alert("This item with the same color & size is already added!");
      return;
    }
    const newItem = {
      ...item,
      productprice: item.productCost,
      productName: item.productName || item.name,
    };
    setSelectedProducts((prev) => [...prev, newItem]);
  };

  const handleAddVariations = (variations) => {
    if (!variationModalProduct) return;
    const newItems = variations.map((v) => {
      const effectiveCost = variationModalProduct.productCost || 0;
      return {
        productId: variationModalProduct._id,
        productName: variationModalProduct.productName || variationModalProduct.name,
        productCost: effectiveCost,
        productprice: effectiveCost,
        productGST: variationModalProduct.productGST || 0,
        color: v.color && v.color.trim() !== "" ? v.color : "N/A",
        size: v.size && v.size.trim() !== "" ? v.size : "N/A",
        quantity: v.quantity || 1,
        material: variationModalProduct.material || "",
        weight: variationModalProduct.weight || "",
        ProductDescription: variationModalProduct.productDetails || "",
        ProductBrand: variationModalProduct.brandName || "",
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

  const handleRemoveSelectedRow = (index) => {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  // Handlers for terms
  const handleAddTerm = () => {
    setTerms([...terms, { heading: "", content: "" }]);
  };

  const handleRemoveTerm = (index) => {
    setTerms(terms.filter((_, i) => i !== index));
  };

  const handleTermChange = (index, field, value) => {
    const newTerms = [...terms];
    newTerms[index][field] = value;
    setTerms(newTerms);
  };

  // Updating company info
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
      await axios.put(
        `${BACKEND_URL}/api/admin/companies/${selectedCompanyData._id}`,
        updatedData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      console.error("Error updating company info:", error);
    }
  };

  // Save Quotation
  const handleSaveQuotation = async () => {
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
      const baseCost = p.productCost || 0;
      const rate = parseFloat((baseCost * (1 + selectedMargin / 100)).toFixed(2));
      const amount = rate * quantity;
      const itemGst = p.productGST !== undefined ? p.productGST : selectedGst;
      const gstVal = parseFloat((amount * (itemGst / 100)).toFixed(2));
      const total = parseFloat((amount + gstVal).toFixed(2));

      return {
        slNo: index + 1,
        productId: typeof p.productId === "object" ? p.productId._id : p.productId,
        product:
          (p.productName || p.name) +
          (p.color ? `(${p.color})` : "") +
          (p.size ? `[${p.size}]` : ""),
        quantity,
        rate,
        productprice: baseCost,
        amount,
        productGST: itemGst,
        total,
      };
    });

    const quotationData = {
      catalogName,
      salutation,
      customerName,
      customerEmail,
      customerAddress,
      customerCompany,
      margin: selectedMargin,
      items,
      terms,
      displayTotals,
    };

    try {
      const token = localStorage.getItem("token");
      let response;
      if (isEditMode) {
        response = await axios.put(
          `${BACKEND_URL}/api/admin/quotations/${id}`,
          quotationData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        alert("Quotation updated successfully!");
      } else {
        response = await axios.post(
          `${BACKEND_URL}/api/admin/quotations`,
          quotationData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        alert("Quotation created successfully!");
      }
      navigate(`/admin-dashboard/manage-catalogs`);
    } catch (error) {
      console.error("Error saving quotation:", error);
      alert("Failed to save quotation. Check console.");
    }
  };

  // Pagination
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

  // Company selection
  const handleCompanySelect = (company) => {
    setCustomerCompany(company.companyName);
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

  // Render
  return (
    <div className="relative bg-white text-gray-800 min-h-screen p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-purple-700">
          {isEditMode ? "Edit Quotation" : "Create Quotation"}
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleSaveQuotation}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            {isEditMode ? "Update Quotation" : "Create Quotation"}
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Catalog Name */}
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Quotation Name *
          </label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={catalogName}
            onChange={(e) => setCatalogName(e.target.value)}
            required
          />
        </div>

        {/* Customer Company */}
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Customer Company *
          </label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={customerCompany}
            onChange={(e) => setCustomerCompany(e.target.value)}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            required
          />
          {dropdownOpen && customerCompany && (
            <div className="absolute z-10 bg-white border border-gray-300 rounded shadow-lg mt-1 w-full">
              {companies
                .filter((company) =>
                  company.companyName
                    .toLowerCase()
                    .includes(customerCompany.toLowerCase())
                )
                .map((company) => (
                  <div
                    key={company._id}
                    className="p-2 cursor-pointer hover:bg-gray-100"
                    onMouseDown={() => handleCompanySelect(company)}
                  >
                    {company.companyName}
                  </div>
                ))}
              <div
                className="p-2 cursor-pointer hover:bg-gray-100"
                onMouseDown={handleOpenCompanyModal}
              >
                + Create Company
              </div>
            </div>
          )}
        </div>

        {/* Customer Name + Salutation */}
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Customer Name *
          </label>
          <div className="flex items-center">
            <select
              className="border border-purple-300 rounded p-2 mr-2"
              value={salutation}
              onChange={(e) => setSalutation(e.target.value)}
            >
              <option value="Mr.">Mr.</option>
              <option value="Ms.">Ms.</option>
            </select>
            <input
              type="text"
              className="border border-purple-300 rounded w-full p-2"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              onBlur={updateCompanyInfo}
              required
            />
          </div>
        </div>

        {/* Customer Email */}
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

        {/* Customer Address */}
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Customer Address
          </label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
          />
        </div>
      </div>

      {/* Search & Image Search */}
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

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
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

          {/* Pagination */}
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

      {/* Floating Cart Icon */}
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

      {/* Cart Drawer */}
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
              <span className="text-xl font-bold">×</span>
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
                        {row.productName || row.name}
                      </div>
                      {extractColorFromName(row.productName || row.name) && (
                        <div className="text-xs">
                          Color: {extractColorFromName(row.productName || row.name)}
                        </div>
                      )}
                      {extractSizeFromName(row.productName || row.name) && (
                        <div className="text-xs">
                          Size: {extractSizeFromName(row.productName || row.name)}
                        </div>
                      )}
                      <div className="text-xs">
                        Cost: ₹{Number(row.productCost).toFixed(2)}
                      </div>
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

      {/* Variation Modal */}
      {variationModalOpen && variationModalProduct && (
        <VariationModal
          product={variationModalProduct}
          onClose={closeVariationModal}
          onSave={handleAddVariations}
          selectedMargin={selectedMargin}
        />
      )}

      {/* Edit Modal */}
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

      {/* Company Creation Modal */}
      {showCompanyModal && <CompanyModal onClose={handleCloseCompanyModal} />}
    </div>
  );
}

// Helper functions to extract color and size from product name
const extractColorFromName = (name) => {
  if (!name) return null;
  const match = name.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : null;
};

const extractSizeFromName = (name) => {
  if (!name) return null;
  const match = name.match(/\[(.*?)\]/);
  return match ? match[1].replace(/"/g, "").trim() : null;
};

/**
 * ProductCard Component
 */
function ProductCard({ product, selectedMargin, onAddSelected, openVariationSelector }) {
  // Extract color and size from product name
  const color = extractColorFromName(product.name || product.productName || "");
  const size = extractSizeFromName(product.name || product.productName || "");

  const colorOptions = Array.isArray(product.color)
    ? product.color
    : typeof product.color === "string"
    ? product.color.split(",").map((c) => c.trim()).filter(Boolean)
    : color ? [color] : [];
  const sizeOptions = Array.isArray(product.size)
    ? product.size
    : typeof product.size === "string"
    ? product.size.split(",").map((s) => s.trim()).filter(Boolean)
    : size ? [size] : [];

  const hasVariations = colorOptions.length > 1 || sizeOptions.length > 1;

  const handleSingleSelect = () => {
    const cost = product.productCost || 0;
    const newItem = {
      productId: product._id,
      productName: product.productName || product.name,
      productCost: cost,
      productprice: cost,
      productGST: product.productGST || 0,
      color: colorOptions.length > 0 && colorOptions[0].trim() !== "" ? colorOptions[0] : "N/A",
      size: sizeOptions.length > 0 && sizeOptions[0].trim() !== "" ? sizeOptions[0] : "N/A",
      quantity: 1,
      material: product.material || "",
      weight: product.weight || "",
      ProductDescription: product.productDetails || "",
      ProductBrand: product.brandName || "",
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
          <img
            src={product.images[0]}
            alt={product.productName || product.name}
            className="object-contain h-full"
          />
        ) : (
          <span className="text-gray-400 text-sm">No Image</span>
        )}
      </div>
      <h2 className="font-semibold text-lg mb-1 truncate text-purple-700">
        {product.productName || product.name}
      </h2>
      <h3 className="font-semibold text-md text-red-600 mb-1 truncate">
        ₹{product.productCost}
      </h3>
      <p className="text-xs text-gray-600 mb-2">
        {product.category}
        {product.subCategory ? ` / ${product.subCategory}` : ""}
      </p>
      {color && <div className="text-xs">Color: {color}</div>}
      {size && <div className="text-xs">Size: {size}</div>}
      {hasVariations ? (
        <button
          onClick={() => openVariationSelector(product)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Choose Variation
        </button>
      ) : (
        <button
          onClick={handleSingleSelect}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Select
        </button>
      )}
    </div>
  );
}

/**
 * VariationModal Component
 */
function VariationModal({ product, onClose, onSave, selectedMargin }) {
  const [variations, setVariations] = useState([]);
  const colorOptions = Array.isArray(product.color)
    ? product.color
    : typeof product.color === "string"
    ? product.color.split(",").map((c) => c.trim()).filter(Boolean)
    : [];
  const sizeOptions = Array.isArray(product.size)
    ? product.size
    : typeof product.size === "string"
    ? product.size.split(",").map((s) => s.trim()).filter(Boolean)
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
      const cost = product.productCost || 0;
      return {
        productId: product._id,
        productName: product.productName || product.name,
        productCost: cost,
        productprice: cost,
        productGST: product.productGST || 0,
        color: variation.color && variation.color.trim() !== "" ? variation.color : "N/A",
        size: variation.size && variation.size.trim() !== "" ? variation.size : "N/A",
        quantity: variation.quantity || 1,
        material: product.material || "",
        weight: product.weight || "",
        ProductDescription: product.productDetails || "",
        ProductBrand: product.brandName || "",
      };
    });
    onSave(itemsWithProductData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border border-gray-200 shadow-lg">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
          >
            <span className="text-xl font-bold">×</span>
          </button>
          <h2 className="text-xl font-bold mb-4 text-purple-700">
            Choose Variations for {product.productName || product.name}
          </h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Color
              </label>
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
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Size
              </label>
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
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Qty
              </label>
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
              <div
                key={idx}
                className="flex items-center justify-between border p-2 rounded"
              >
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
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndClose}
              className={`px-4 py-2 rounded text-white ${
                variations.length > 0
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * VariationEditModal Component
 */
function VariationEditModal({ item, onClose, onUpdate }) {
  const [name, setName] = useState(item.productName || item.name || "");
  const [productCost, setProductCost] = useState(item.productCost || 0);
  const [productGST, setProductGST] = useState(item.productGST || 0);
  const [color, setColor] = useState(item.color || extractColorFromName(item.productName || item.name) || "");
  const [size, setSize] = useState(item.size || extractSizeFromName(item.productName || item.name) || "");
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [material, setMaterial] = useState(item.material || "");
  const [weight, setWeight] = useState(item.weight || "");
  const [productDescription, setProductDescription] = useState(
    item.ProductDescription || ""
  );
  const [productBrand, setProductBrand] = useState(item.ProductBrand || "");

  useEffect(() => {
    if ((!productDescription || !productBrand) && item.productId) {
      axios
        .get(`${BACKEND_URL}/api/admin/products/${item.productId}`)
        .then((res) => {
          const prod = res.data;
          if (!productDescription) {
            setProductDescription(prod.productDetails || "");
          }
          if (!productBrand) {
            setProductBrand(prod.brandName || "");
          }
        })
        .catch((err) => console.error("Error fetching product details:", err));
    }
  }, [item.productId]);

  const handleSave = () => {
    const parsedCost = parseFloat(productCost);
    const finalCost = isNaN(parsedCost) ? item.productprice : parsedCost;

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
      ProductDescription: productDescription,
      ProductBrand: productBrand,
    };
    onUpdate(updatedItem);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border border-gray-200 shadow-lg">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
          >
            <span className="text-xl font-bold">×</span>
          </button>
          <h2 className="text-xl font-bold mb-4 text-purple-700">Edit Cart Item</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Cost
              </label>
              <input
                type="number"
                value={productCost}
                onChange={(e) => setProductCost(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                GST (%)
              </label>
              <input
                type="number"
                value={productGST}
                onChange={(e) => setProductGST(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Color
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Size
              </label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Material
              </label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Weight
              </label>
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Product Description
              </label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full h-40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Product Brand
              </label>
              <input
                type="text"
                value={productBrand}
                onChange={(e) => setProductBrand(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}