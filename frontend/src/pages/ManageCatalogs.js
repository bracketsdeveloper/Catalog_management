"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import CompanyModal from "../components/CompanyModal";

/* ────────────────────────────────────────────────────────────
 *  Helpers & constants
 * ────────────────────────────────────────────────────────────*/
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const limit = 100; // products per page
const BagIcon = () => <span style={{ fontSize: "1.2rem" }}>🛍️</span>;
const norm = (s) => (s ? s.toString().trim().toLowerCase() : "");
const obj = (arr) => Object.fromEntries(arr.map(({ name, count }) => [norm(name), count]));

/* ────────────────────────────────────────────────────────────
 *  Main Page Component
 * ────────────────────────────────────────────────────────────*/
export default function CreateManualCatalog() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  /* ------------ Opportunity -------------- */
  const [opportunityNumber, setOpportunityNumber] = useState("");
  const [opportunityCodes, setOpportunityCodes] = useState([]);
  const [opportunityDropdownOpen, setOpportunityDropdownOpen] = useState(false);

  /* ------------ Product & Filters -------- */
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [fullCategories, setFullCategories] = useState([]);
  const [fullSubCategories, setFullSubCategories] = useState([]);
  const [fullBrands, setFullBrands] = useState([]);
  const [fullPriceRanges, setFullPriceRanges] = useState([]);
  const [fullVariationHinges, setFullVariationHinges] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState([]);
  const [selectedVariationHinges, setSelectedVariationHinges] = useState([]);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [priceRangeOpen, setPriceRangeOpen] = useState(false);
  const [variationHingeOpen, setVariationHingeOpen] = useState(false);

  const [filterCounts, setFilterCounts] = useState({
    categories: {},
    subCategories: {},
    brands: {},
    priceRanges: {},
    variationHinges: {},
  });

  /* ------------ Cart / modal / misc state ------- */
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [variationModalProduct, setVariationModalProduct] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState([]);
  const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false);
  const imageInputRef = useRef(null);

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [fieldsToDisplay, setFieldsToDisplay] = useState(["name", "productCost"]);
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

  /* ------------ Company / client ---------- */
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyData, setSelectedCompanyData] = useState(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  /* ─────────────────────────────────────────
   *  Network helpers
   * ─────────────────────────────────────────*/
  const buildParams = () => {
    const p = new URLSearchParams();
    if (searchTerm) {
      const terms = searchTerm.toLowerCase().split(" ").filter(Boolean);
      p.append("search", terms.join(","));
    }
    if (selectedCategories.length) p.append("categories", selectedCategories.join(","));
    if (selectedSubCategories.length) p.append("subCategories", selectedSubCategories.join(","));
    if (selectedBrands.length) p.append("brands", selectedBrands.join(","));
    if (selectedPriceRanges.length) p.append("priceRanges", selectedPriceRanges.join(","));
    if (selectedVariationHinges.length) p.append("variationHinges", selectedVariationHinges.join(","));
    return p;
  };

  const fetchFilterOptions = async (extraQS = "") => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(
        `${BACKEND_URL}/api/admin/products/filters${extraQS}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFullCategories(data.categories.map((x) => x.name));
      setFullSubCategories(data.subCategories.map((x) => x.name));
      setFullBrands(data.brands.map((x) => x.name));
      setFullPriceRanges(data.priceRanges.map((x) => x.name));
      setFullVariationHinges(data.variationHinges.map((x) => x.name));

      setFilterCounts({
        categories: obj(data.categories),
        subCategories: obj(data.subCategories),
        brands: obj(data.brands),
        priceRanges: obj(data.priceRanges),
        variationHinges: obj(data.variationHinges),
      });
    } catch (err) {
      console.error("Error fetching filter options:", err);
      setFilterCounts({
        categories: {},
        subCategories: {},
        brands: {},
        priceRanges: {},
        variationHinges: {},
      });
      setFullCategories([]);
      setFullSubCategories([]);
      setFullBrands([]);
      setFullPriceRanges([]);
      setFullVariationHinges([]);
    }
  };

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      /* 1 — page of products */
      const prodParams = buildParams();
      prodParams.append("page", page);
      prodParams.append("limit", limit);
      const { data } = await axios.get(
        `${BACKEND_URL}/api/admin/products?${prodParams.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProducts(Array.isArray(data.products) ? data.products : []);
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 1);

      /* 2 — counts (same filters, no page/limit) */
      const countQS = `?${buildParams().toString()}`;
      await fetchFilterOptions(countQS);
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────
   *  Initial data loads
   * ─────────────────────────────────────────*/
  useEffect(() => {
    // opportunity list
    (async () => {
      try {
        const { data } = await axios.get(`${BACKEND_URL}/api/admin/opportunities`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setOpportunityCodes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error opp codes:", err);
      }
    })();
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, []); // static full list
  useEffect(() => {
    fetchProducts(1);
  }, [
    searchTerm,
    selectedCategories,
    selectedSubCategories,
    selectedBrands,
    selectedPriceRanges,
    selectedVariationHinges,
  ]);

  /* ─────────────────────────────────────────
   *  Simple local helpers
   * ─────────────────────────────────────────*/
  const toggleFilter = (val, list, setter) =>
    list.includes(val) ? setter(list.filter((v) => v !== val)) : setter([...list, val]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategories([]);
    setSelectedSubCategories([]);
    setSelectedBrands([]);
    setSelectedPriceRanges([]);
    setSelectedVariationHinges([]);
  };

  const filteredOppCodes = opportunityCodes.filter((o) =>
    o.opportunityCode?.toLowerCase().includes(opportunityNumber.toLowerCase())
  );

  const finalProducts = advancedSearchActive ? advancedSearchResults : products;

  /* ─────────────────────────────────────────
   *  Business Logic (unchanged from original)
   * ─────────────────────────────────────────*/
  // If editing an existing catalog, load it
  useEffect(() => {
    if (isEditMode) {
      fetchExistingCatalog();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchExistingCatalog = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${BACKEND_URL}/api/admin/catalogs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOpportunityNumber(data.opportunityNumber || "");
      setCatalogName(data.catalogName || "");
      setCustomerName(data.customerName || "");
      setCustomerEmail(data.customerEmail || "");
      setCustomerAddress(data.customerAddress || "");
      setCustomerCompany(data.customerCompany || "");
      setSelectedCompanyData(data.customerCompany || "");
      setFieldsToDisplay(Array.isArray(data.fieldsToDisplay) ? data.fieldsToDisplay : []);
      setSalutation(data.salutation || "Mr.");

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

      const mappedRows = Array.isArray(data.products)
        ? data.products.map((item) => ({
            _id: item._id,
            productId: item.productId,
            productName: item.productName,
            ProductDescription: item.ProductDescription || item.productDetails || "",
            ProductBrand: item.ProductBrand || item.brandName || "",
            color: item.color || "N/A",
            size: item.size || "N/A",
            quantity: item.quantity || 1,
            productCost: item.productCost || 0,
            productprice: item.productprice || item.productCost || 0,
            productGST: item.productGST || 0,
          }))
        : [];
      setSelectedProducts(mappedRows);
    } catch (error) {
      console.error("Error fetching catalog for edit:", error);
      setSelectedProducts([]);
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
      setCompanies(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error fetching companies:", error);
      setCompanies([]);
    }
  };

  // Fetch company and client details when opportunity is selected
  useEffect(() => {
    if (opportunityNumber) {
      const selectedOpp = opportunityCodes.find(
        (opp) => opp.opportunityCode === opportunityNumber
      );
      if (selectedOpp && selectedOpp.account) {
        setCustomerCompany(selectedOpp.account);
        fetchCompanyDetails(selectedOpp.account);
      }
    }
  }, [opportunityNumber, opportunityCodes]);

  const fetchCompanyDetails = async (companyName) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/companies`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { companyName },
      });
      const company = Array.isArray(res.data) ? res.data[0] : res.data;
      if (company) {
        setSelectedCompanyData(company);
        setCustomerAddress(company.companyAddress || "");
        setClients(company.clients || []);
        setCustomerName("");
        setCustomerEmail(company.companyEmail || "");
      } else {
        setSelectedCompanyData(null);
        setCustomerAddress("");
        setClients([]);
        setCustomerName("");
        setCustomerEmail("");
      }
    } catch (error) {
      console.error("Error fetching company details:", error);
      setSelectedCompanyData(null);
      setCustomerAddress("");
      setClients([]);
      setCustomerName("");
      setCustomerEmail("");
    }
  };

  // Handle client selection
  const handleClientSelect = (client) => {
    setCustomerName(client.name || "");
    setCustomerEmail(client.email || "");
    setClientDropdownOpen(false);
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
      const res = await axios.post(
        `${BACKEND_URL}/api/products/advanced-search`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setAdvancedSearchResults(Array.isArray(res.data.products) ? res.data.products : []);
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

  // Handlers for toggling fields
  const toggleField = (field) => {
    if (fieldsToDisplay.includes(field)) {
      setFieldsToDisplay((prev) => prev.filter((f) => f !== field));
    } else {
      setFieldsToDisplay((prev) => [...prev, field]);
    }
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
                  email: customerEmail,
                },
                ...selectedCompanyData.clients.slice(1),
              ]
            : [{ name: customerName, contactNumber: "", email: customerEmail }],
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

  // Save Catalog
  const handleSaveCatalog = async () => {
    if (!opportunityNumber) {
      alert("Please enter an opportunity number (or confirm it's valid).");
      return;
    }
    if (!catalogName) {
      alert("Please enter Catalog Name and Customer Name");
      return;
    }
    if (selectedProducts.length === 0) {
      alert("Please select at least one product");
      return;
    }

    const catalogData = {
      opportunityNumber,
      catalogName,
      salutation,
      customerName,
      customerEmail,
      customerAddress,
      customerCompany,
      margin: selectedMargin,
      gst: selectedGst,
      products: selectedProducts.map((p) => ({
        _id: p._id,
        productId: p.productId,
        productName: p.productName || p.name,
        ProductDescription: p.ProductDescription,
        ProductBrand: p.ProductBrand,
        color: p.color || "",
        size: p.size || "",
        quantity: p.quantity,
        productCost: p.productCost,
        productGST: p.productGST,
      })),
      fieldsToDisplay,
    };

    try {
      const token = localStorage.getItem("token");
      let response;
      if (isEditMode) {
        response = await axios.put(
          `${BACKEND_URL}/api/admin/catalogs/${id}`,
          catalogData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        alert("Catalog updated successfully!");
        navigate(`/admin-dashboard/manage-catalogs`);
      } else {
        response = await axios.post(`${BACKEND_URL}/api/admin/catalogs`, catalogData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Catalog created successfully!");
        navigate(`/admin-dashboard/manage-catalogs`);
      }
    } catch (error) {
      console.error("Error saving catalog:", error);
      if (error.response && error.response.status === 400) {
        alert(error.response.data.message || "Invalid opportunity number");
      } else {
        alert("Failed to save catalog. Check console.");
      }
    }
  };

  // Create Quotation from the selected items
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

    try {
      const token = localStorage.getItem("token");
      const body = {
        catalogName,
        salutation,
        customerName,
        customerEmail,
        customerAddress,
        customerCompany,
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

  // Company selection
  const handleCompanySelect = (company) => {
    setCustomerCompany(company.companyName || "");
    setSelectedCompanyData(company);
    setCustomerAddress(company.companyAddress || "");
    setClients(company.clients || []);
    setCustomerName("");
    setCustomerEmail(company.companyEmail || "");
    setClientDropdownOpen(false);
  };

  const handleOpenCompanyModal = () => {
    setShowCompanyModal(true);
  };

  const handleCloseCompanyModal = () => {
    setShowCompanyModal(false);
    fetchCompanies();
  };

  // Open variation selector
  const openVariationSelector = (product) => {
    setVariationModalProduct(product);
    setVariationModalOpen(true);
  };

  const closeVariationModal = () => {
    setVariationModalOpen(false);
    setVariationModalProduct(null);
  };

  /* ─────────────────────────────────────────
   *  JSX
   * ─────────────────────────────────────────*/
  return (
    <div className="relative bg-white text-gray-800 min-h-screen p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-purple-700">
          {isEditMode ? "Edit Catalog" : "Create Catalog (Manual)"}
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleSaveCatalog}
            className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white px-4 py-2 rounded"
          >
            {isEditMode ? "Update Catalog" : "Create Catalog"}
          </button>
          <button
            onClick={handleCreateQuotation}
            className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white px-4 py-2 rounded"
          >
            Create Quotation
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Opportunity Number */}
        <div className="relative">
          <label className="block mb-1 font-medium text-purple-700">
            Opportunity Number *
          </label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2 bg-white text-black font-bold"
            value={opportunityNumber}
            onChange={(e) => {
              setOpportunityNumber(e.target.value);
              setOpportunityDropdownOpen(true);
            }}
            onBlur={() => setTimeout(() => setOpportunityDropdownOpen(false), 200)}
            placeholder="e.g. 5001"
            required
          />
          {opportunityDropdownOpen && opportunityNumber && filteredOppCodes.length > 0 && (
            <div className="absolute z-10 bg-white border border-gray-300 rounded shadow-lg mt-1 w-full max-h-40 overflow-y-auto min-h-10">
              {filteredOppCodes.map((opp) => (
                <div
                  key={opp._id}
                  className="p-2 cursor-pointer hover:bg-gray-100"
                  onMouseDown={() => {
                    setOpportunityNumber(opp.opportunityCode || "");
                    setOpportunityDropdownOpen(false);
                  }}
                >
                  {opp.opportunityCode && opp.opportunityName
                    ? `${opp.opportunityCode} - ${opp.opportunityName}`
                    : opp.opportunityCode || "Unknown Opportunity"}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Catalog Name */}
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

        {/* Customer Company */}
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Customer Company *
          </label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={customerCompany}
            readOnly
            required
          />
        </div>

        {/* Customer Name + Salutation */}
        <div className="relative">
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
              onChange={(e) => {
                setCustomerName(e.target.value);
                setClientDropdownOpen(true);
              }}
              onFocus={() => setClientDropdownOpen(true)}
              onBlur={() => setTimeout(() => setClientDropdownOpen(false), 150)}
              required
            />
          </div>
          {clientDropdownOpen && clients.length > 0 && (
            <div className="absolute z-10 bg-white border border-gray-300 rounded shadow-lg mt-1 w-full max-h-40 overflow-y-auto">
              {clients
                .filter((client) =>
                  client.name?.toLowerCase().includes(customerName.toLowerCase())
                )
                .map((client) => (
                  <div
                    key={client._id || client.name}
                    className="p-2 cursor-pointer hover:bg-gray-100"
                    onMouseDown={() => handleClientSelect(client)}
                  >
                    {client.name || "Unknown Client"}
                  </div>
                ))}
            </div>
          )}
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

        {/* Customer Address (Read-Only) */}
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

      {/* Search & Image Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2 w-full md:w-1/2">
          <input
            type="text"
            placeholder="Search by any field..."
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

      {/* Clear Filters Button */}
      {(searchTerm ||
        selectedCategories.length > 0 ||
        selectedSubCategories.length > 0 ||
        selectedBrands.length > 0 ||
        selectedPriceRanges.length > 0 ||
        selectedVariationHinges.length > 0) && (
        <div className="mb-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-red-500 text-white text-xs rounded"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Search Results Feedback */}
      {searchTerm && (
        <div className="mb-4 text-sm text-gray-600">
          Found {finalProducts.length} products with "{searchTerm}"
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Category */}
        <FilterDropdown
          label="Categories"
          open={categoryOpen}
          setOpen={setCategoryOpen}
          options={fullCategories}
          selected={selectedCategories}
          toggle={(v) => toggleFilter(v, selectedCategories, setSelectedCategories)}
          counts={filterCounts.categories}
        />
        {/* Sub-category */}
        <FilterDropdown
          label="SubCats"
          open={subCategoryOpen}
          setOpen={setSubCategoryOpen}
          options={fullSubCategories}
          selected={selectedSubCategories}
          toggle={(v) => toggleFilter(v, selectedSubCategories, setSelectedSubCategories)}
          counts={filterCounts.subCategories}
        />
        {/* Brands */}
        <FilterDropdown
          label="Brands"
          open={brandOpen}
          setOpen={setBrandOpen}
          options={fullBrands}
          selected={selectedBrands}
          toggle={(v) => toggleFilter(v, selectedBrands, setSelectedBrands)}
          counts={filterCounts.brands}
        />
        {/* Price Range */}
        <FilterDropdown
          label="Price Range"
          open={priceRangeOpen}
          setOpen={setPriceRangeOpen}
          options={fullPriceRanges}
          selected={selectedPriceRanges}
          toggle={(v) => toggleFilter(v, selectedPriceRanges, setSelectedPriceRanges)}
          counts={filterCounts.priceRanges}
        />
        {/* Variation Hinge */}
        <FilterDropdown
          label="Variation Hinge"
          open={variationHingeOpen}
          setOpen={setVariationHingeOpen}
          options={fullVariationHinges}
          selected={selectedVariationHinges}
          toggle={(v) => toggleFilter(v, selectedVariationHinges, setSelectedVariationHinges)}
          counts={filterCounts.variationHinges}
        />
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
              Found {finalProducts.length} products with "{searchTerm}"
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
                        {row.productName || row.name || "Unknown Product"}
                      </div>
                      {row.color && row.color !== "N/A" && (
                        <div className="text-xs">Color: {row.color}</div>
                      )}
                      {row.size && row.size !== "N/A" && (
                        <div className="text-xs">Size: {row.size}</div>
                      )}
                      <div className="text-xs">
                        Cost: ₹{Number(row.productCost || 0).toFixed(2)}
                      </div>
                      <div className="text-xs">GST: {row.productGST || 0}%</div>
                      <div className="text-xs">Qty: {row.quantity || 1}</div>
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
              className="bg-green-500 hover:bg-green-700 text-white px-4 py-2 rounded self-end mt-2"
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
        />
      )}

      {/* Edit Modal */}
      {editModalOpen && editIndex !== null && (
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

/* ─────────────────────────────────────────
 *  FilterDropdown – small reusable dropdown
 * ─────────────────────────────────────────*/
function FilterDropdown({ label, open, setOpen, options, selected, toggle, counts }) {
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
      >
        {label} ({selected.length})
      </button>
      {open && (
        <div className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20 max-h-40 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center space-x-2 text-sm hover:bg-gray-100 p-1 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-purple-500"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
              />
              <span className="truncate">
                {opt} ({counts[norm(opt)] || 0})
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
 *  ProductCard Component
 * ─────────────────────────────────────────*/
function ProductCard({ product, selectedMargin, onAddSelected, openVariationSelector }) {
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

  const hasVariations = colorOptions.length > 1 || sizeOptions.length > 1;

  const handleSingleSelect = () => {
    const cost = product.productCost || 0;
    const newItem = {
      productId: product._id,
      productName: product.productName || product.name || "Unknown Product",
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
            alt={product.productName || product.name || "Product"}
            className="object-contain h-full"
          />
        ) : (
          <span className="text-gray-400 text-sm">No Image</span>
        )}
      </div>
      <h2 className="font-semibold text-lg mb-1 truncate text-purple-700">
        {product.productName || product.name || "Unknown Product"}
      </h2>
      <h3 className="font-semibold text-md text-red-600 mb-1 truncate">
        ₹{Number(product.productCost || 0).toFixed(2)}
      </h3>
      <p className="text-xs text-gray-600 mb-2">
        {product.category || "No Category"}
        {product.subCategory ? ` / ${product.subCategory}` : ""}
      </p>
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

/* ─────────────────────────────────────────
 *  VariationModal Component
 * ─────────────────────────────────────────*/
function VariationModal({ product, onClose, onSave }) {
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
    setVariations((prev) => [
      ...prev,
      {
        color: pickedColor || "",
        size: pickedSize || "",
        quantity: parseInt(pickedQuantity) || 1,
      },
    ]);
  };

  const handleRemoveLine = (idx) => setVariations((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (variations.length === 0) {
      alert("Add product to save");
      return;
    }
    const out = variations.map((v) => {
      const cost = product.productCost || 0;
      return {
        productId: product._id,
        productName: product.productName || product.name || "Unknown Product",
        productCost: cost,
        productprice: cost,
        productGST: product.productGST || 0,
        color: v.color && v.color.trim() !== "" ? v.color : "N/A",
        size: v.size && v.size.trim() !== "" ? v.size : "N/A",
        quantity: v.quantity || 1,
        material: product.material || "",
        weight: product.weight || "",
        ProductDescription: product.productDetails || "",
        ProductBrand: product.brandName || "",
      };
    });
    onSave(out);
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
            Choose Variations for {product.productName || product.name || "Unknown Product"}
          </h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {/* color */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Color</label>
              {colorOptions.length ? (
                <select
                  className="border border-purple-300 rounded p-1 w-full"
                  value={pickedColor}
                  onChange={(e) => setPickedColor(e.target.value)}
                >
                  {colorOptions.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="border border-purple-300 rounded p-1 w-full"
                  value={pickedColor}
                  onChange={(e) => setPickedColor(e.target.value)}
                  placeholder="Type color"
                />
              )}
            </div>
            {/* size */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Size</label>
              {sizeOptions.length ? (
                <select
                  className="border border-purple-300 rounded p-1 w-full"
                  value={pickedSize}
                  onChange={(e) => setPickedSize(e.target.value)}
                >
                  {sizeOptions.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="border border-purple-300 rounded p-1 w-full"
                  value={pickedSize}
                  onChange={(e) => setPickedSize(e.target.value)}
                  placeholder="Type size"
                />
              )}
            </div>
            {/* qty */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Qty</label>
              <input
                type="number"
                min={1}
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
            {variations.map((v, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border p-2 rounded"
              >
                <span>
                  {v.color || "N/A"} / {v.size || "N/A"}  Qty:{v.quantity}
                </span>
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
              onClick={handleSave}
              className={`px-4 py-2 rounded text-white ${
                variations.length ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 cursor-not-allowed"
              }`}
              disabled={variations.length === 0}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
 *  VariationEditModal Component
 * ─────────────────────────────────────────*/
function VariationEditModal({ item, onClose, onUpdate }) {
  const [name, setName] = useState(item.productName || item.name || "");
  const [productCost, setProductCost] = useState(item.productCost || 0);
  const [productGST, setProductGST] = useState(item.productGST || 0);
  const [color, setColor] = useState(item.color || "");
  const [size, setSize] = useState(item.size || "");
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [material, setMaterial] = useState(item.material || "");
  const [weight, setWeight] = useState(item.weight || "");
  const [productDescription, setProductDescription] = useState(item.ProductDescription || "");
  const [productBrand, setProductBrand] = useState(item.ProductBrand || "");

  /* (fetch product details only if missing) */
  useEffect(() => {
    if ((!productDescription || !productBrand) && item.productId) {
      axios
        .get(`${BACKEND_URL}/api/admin/products/${item.productId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then(({ data }) => {
          if (!productDescription) setProductDescription(data.productDetails || "");
          if (!productBrand) setProductBrand(data.brandName || "");
        })
        .catch((err) => console.error("Error fetching prod details:", err));
    }
  }, [item.productId]);

  const handleSave = () => {
    const upd = {
      productName: name || "Unknown Product",
      productCost: parseFloat(productCost) || 0,
      productprice: parseFloat(productCost) || 0,
      productGST: parseFloat(productGST) || 0,
      color: color || "N/A",
      size: size || "N/A",
      quantity: parseInt(quantity) || 1,
      material: material || "",
      weight: weight || "",
      ProductDescription: productDescription || "",
      ProductBrand: productBrand || "",
    }
      onUpdate(upd);
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
            {/* Name */}
            <Field label="Product Name" value={name} setValue={setName} />
            {/* Cost */}
            <Field label="Cost" type="number" value={productCost} setValue={setProductCost} />
            {/* GST */}
            <Field label="GST (%)" type="number" value={productGST} setValue={setProductGST} />
            {/* Color / Size / Qty */}
            <Field label="Color" value={color} setValue={setColor} />
            <Field label="Size" value={size} setValue={setSize} />
            <Field label="Quantity" type="number" value={quantity} setValue={setQuantity} />
            {/* Material / Weight */}
            <Field label="Material" value={material} setValue={setMaterial} />
            <Field label="Weight" value={weight} setValue={setWeight} />
            {/* Description / Brand */}
            <Field
              label="Product Description"
              textarea
              value={productDescription}
              setValue={setProductDescription}
            />
            <Field label="Product Brand" value={productBrand} setValue={setProductBrand} />
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

/* ─────────────────────────────────────────
 *  Field Component for VariationEditModal
 * ─────────────────────────────────────────*/
function Field({ label, value, setValue, type = "text", textarea = false }) {
  return (
    <div>
      <label className="block text-sm font-medium text-purple-700 mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="border border-purple-300 rounded p-2 w-full h-24"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="border border-purple-300 rounded p-2 w-full"
        />
      )}
    </div>
  );
}