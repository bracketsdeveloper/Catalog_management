"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import CompanyModal from "../components/CompanyModal";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import SuggestedPriceCalculator from "../components/SuggestedPriceCalculator";

/* ────────────────────────────────────────────────────────────
 *  Axios Instance
 * ────────────────────────────────────────────────────────────*/
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const limit = 100;
const axiosInstance = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 120000, // 2 min
});

/* ────────────────────────────────────────────────────────────
 *  Helpers & constants
 * ────────────────────────────────────────────────────────────*/
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
  const [customMargin, setCustomMargin] = useState("");

  const presetGstOptions = [18];
  const [selectedGst, setSelectedGst] = useState(presetGstOptions[0]);
  const [gstOption, setGstOption] = useState("preset");
  const [customGst, setCustomGst] = useState("");

  const [cartOpen, setCartOpen] = useState(false);

  /* ------------ Company / client ---------- */
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyData, setSelectedCompanyData] = useState(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  /* ------------ Branding Types & Segments ---------- */
  const [brandingTypesList, setBrandingTypesList] = useState([]);
  const [segmentsList, setSegmentsList] = useState([]);

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
      const { data } = await axiosInstance.get(
        `/admin/products/filters${extraQS}`,
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
    } catch {
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

  const fetchProducts = async (page) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = buildParams();
      params.append("page", page);
      params.append("limit", limit);
      const { data } = await axios.get(
        `${BACKEND_URL}/api/admin/products?${params.toString()}`,

      /* 1 — page of products */
      const prodParams = buildParams();
      prodParams.append("page", page);
      prodParams.append("limit", limit);
      const { data } = await axiosInstance.get(
        `/admin/products?${prodParams.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducts(data.products || []);
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 1);
      await fetchFilterOptions(`?${buildParams().toString()}`);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────
   *  Initial data loads
   * ─────────────────────────────────────────*/
  useEffect(() => {
    const token = localStorage.getItem("token");
    // Fetch opportunities
    axios
      .get(`${BACKEND_URL}/api/admin/opportunities`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setOpportunityCodes(Array.isArray(r.data) ? r.data : []))
      .catch(console.error);

    // Fetch branding types
    axios
      .get(`${BACKEND_URL}/api/admin/catalogs/branding-types`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => {
        console.log("Branding Types Fetched:", r.data);
        setBrandingTypesList(Array.isArray(r.data) ? r.data : []);
      })
      .catch(console.error);

    // Fetch segments
    axios
      .get(`${BACKEND_URL}/api/admin/segments`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => {
        console.log("Segments Fetched:", r.data);
        setSegmentsList(Array.isArray(r.data) ? r.data : []);
      })
      .catch(console.error);

    fetchFilterOptions();
    // opportunity list
    (async () => {
      try {
        const { data } = await axiosInstance.get(`/admin/opportunities`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setOpportunityCodes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error opp codes:", err);
      }
    })();
  }, []);

  // Fetch company details when opportunityNumber changes
  useEffect(() => {
    if (opportunityNumber) {
      const selectedOpp = opportunityCodes.find(
        (opp) => opp.opportunityCode === opportunityNumber
      );
      console.log("Selected Opportunity:", selectedOpp);
      if (selectedOpp && selectedOpp.account) {
        setCustomerCompany(selectedOpp.account);
        fetchCompanyDetails(selectedOpp.account);
      } else {
        setCustomerCompany("");
        setSelectedCompanyData(null);
        setCustomerAddress("");
        setClients([]);
        setCustomerName("");
        setCustomerEmail("");
      }
    }
  }, [opportunityNumber, opportunityCodes]);

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

  useEffect(() => {
    if (!isEditMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    axios
      .get(`${BACKEND_URL}/api/admin/catalogs/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(({ data }) => {
        setOpportunityNumber(data.opportunityNumber || "");
        setCatalogName(data.catalogName || "");
        setCustomerName(data.customerName || "");
        setCustomerEmail(data.customerEmail || "");
        setCustomerAddress(data.customerAddress || "");
        setCustomerCompany(data.customerCompany || "");
        setSelectedCompanyData(data.customerCompany ? { companyName: data.customerCompany } : null);
        setFieldsToDisplay(Array.isArray(data.fieldsToDisplay) ? data.fieldsToDisplay : []);
        setSalutation(data.salutation || "Mr.");
    }
  }, [id]);

  const fetchExistingCatalog = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axiosInstance.get(`/admin/catalogs/${id}`, {
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

        const existingMargin = data.margin ?? presetMarginOptions[0];
        if (presetMarginOptions.includes(existingMargin)) {
          setMarginOption("preset");
          setSelectedMargin(existingMargin);
        } else {
          setMarginOption("custom");
          setCustomMargin(String(existingMargin));
          setSelectedMargin(existingMargin);
        }

        const existingGst = data.gst ?? presetGstOptions[0];
        if (presetGstOptions.includes(existingGst)) {
          setGstOption("preset");
          setSelectedGst(existingGst);
        } else {
          setGstOption("custom");
          setCustomGst(String(existingGst));
          setSelectedGst(existingGst);
        }

        setSelectedProducts(
          Array.isArray(data.products)
            ? data.products.map((item) => ({
                _id: item._id,
                productId: item.productId?._id || item.productId,
                productName: item.productName || item.name,
                ProductDescription: item.ProductDescription || item.productDetails || "",
                ProductBrand: item.ProductBrand || item.brandName || "",
                color: item.color || "N/A",
                size: item.size || "N/A",
                quantity: item.quantity || 1,
                productCost: item.productCost || 0,
                productGST: item.productGST || 0,
                material: item.material || "",
                weight: item.weight || "",
                brandingTypes: Array.isArray(item.brandingTypes)
                  ? item.brandingTypes.map((bt) => bt._id || bt)
                  : [],
              }))
            : []
        );
      })
      .catch((err) => {
        console.error("Error fetching catalog:", err);
        setSelectedProducts([]);
      })
      .finally(() => setLoading(false));
  }, [id, isEditMode]);

  /* ─────────────────────────────────────────
   *  Helpers
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

  const isDuplicate = (prodId, color, size) =>
    selectedProducts.some(
      (sp) =>
        sp.productId === prodId &&
        (sp.color || "") === (color || "") &&
        (sp.size || "") === (size || "")
    );

  const handleAddSingle = (item) => {
    if (isDuplicate(item.productId, item.color, item.size)) {
      alert("This item with the same color & size is already added!");
      return;
    }
    setSelectedProducts((prev) => [
      ...prev,
      {
        ...item,
        productprice: item.productCost,
        productName: item.productName || item.name,
        brandingTypes: [],
      },
    ]);
  };

  const handleAddVariations = (variations) => {
    if (!variationModalProduct) return;
    const newItems = variations.map((v) => ({
      productId: variationModalProduct._id,
      productName: variationModalProduct.productName || variationModalProduct.name,
      productCost: variationModalProduct.productCost || 0,
      productGST: variationModalProduct.productGST || 0,
      color: v.color && v.color.trim() !== "" ? v.color : "N/A",
      size: v.size && v.size.trim() !== "" ? v.size : "N/A",
      quantity: v.quantity || 1,
      material: variationModalProduct.material || "",
      weight: variationModalProduct.weight || "",
      ProductDescription: variationModalProduct.productDetails || "",
      ProductBrand: variationModalProduct.brandName || "",
      brandingTypes: [],
    }));
    const filtered = newItems.filter((i) => !isDuplicate(i.productId, i.color, i.size));
    if (filtered.length < newItems.length) {
      alert("Some variations were duplicates and were not added.");
    }
    setSelectedProducts((prev) => [...prev, ...filtered]);
    closeVariationModal();
  };

  const handleEditItem = (idx) => {
    setEditIndex(idx);
    setEditModalOpen(true);
  };

  const handleUpdateItem = (upd) => {
    setSelectedProducts((prev) => {
      const arr = [...prev];
      const isDup = arr.some((sp, i) => {
        if (i === editIndex) return false;
        return (
          sp.productId === arr[editIndex].productId &&
          (sp.color || "") === (upd.color || "") &&
          (sp.size || "") === (upd.size || "")
        );
      });
      if (isDup) {
        alert("This update creates a duplicate. Not updating.");
        return arr;
      }
      arr[editIndex] = { ...arr[editIndex], ...upd };
      return arr;
    });
  };

  const toggleField = (field) => {
    if (fieldsToDisplay.includes(field)) {
      setFieldsToDisplay((prev) => prev.filter((f) => f !== field));
    } else {
      setFieldsToDisplay((prev) => [...prev, field]);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axiosInstance.get(`/admin/companies?all=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCompanies([]);
    }
  };

  const fetchCompanyDetails = async (companyName) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axiosInstance.get(`/admin/companies`, {
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
        console.log("Selected Company Data:", company);
      } else {
        setSelectedCompanyData(null);
        setCustomerAddress("");
        setClients([]);
        setCustomerName("");
        setCustomerEmail("");
      }
    } catch {
      setSelectedCompanyData(null);
      setCustomerAddress("");
      setClients([]);
      setCustomerName("");
      setCustomerEmail("");
    }
  };

  const handleClientSelect = (client) => {
    setCustomerName(client.name || "");
    setCustomerEmail(client.email || "");
    setClientDropdownOpen(false);
  };

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
      const res = await axiosInstance.post(
        `/products/advanced-search`,
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
    } catch {
      alert("Image search failed.");
    } finally {
      setAdvancedSearchLoading(false);
    }
  };

  const handleClearAdvancedSearch = () => {
    setAdvancedSearchActive(false);
    setAdvancedSearchResults([]);
  };

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
      await axiosInstance.put(
        `/admin/companies/${selectedCompanyData._id}`,
        updatedData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch {
      console.error("Error updating company info.");
    }
  };

  const handleSaveCatalog = async () => {
    if (!opportunityNumber || !catalogName || !selectedProducts.length) {
      alert("Please fill required fields and add at least one product");
      return;
    }
    const payload = {
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
        productName: p.productName,
        ProductDescription: p.ProductDescription,
        ProductBrand: p.ProductBrand,
        color: p.color,
        size: p.size,
        quantity: p.quantity,
        productCost: p.productCost,
        productGST: p.productGST,
        material: p.material,
        weight: p.weight,
        brandingTypes: p.brandingTypes,
      })),
      fieldsToDisplay,
    };

    try {
      const token = localStorage.getItem("token");
      const method = isEditMode ? "put" : "post";
      const url = isEditMode
        ? `${BACKEND_URL}/api/admin/catalogs/${id}`
        : `${BACKEND_URL}/api/admin/catalogs`;
      await axios[method](url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(isEditMode ? "Catalog updated!" : "Catalog created!");
      navigate("/admin-dashboard/manage-catalogs");
    } catch (e) {
      alert(e.response?.data?.message || "Error saving catalog");
      let response;
      if (isEditMode) {
        response = await axiosInstance.put(
          `/admin/catalogs/${id}`,
          catalogData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        alert("Catalog updated successfully!");
        navigate(`/admin-dashboard/manage-catalogs`);
      } else {
        response = await axiosInstance.post(`/admin/catalogs`, catalogData, {
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

  const handleCreateQuotation = async () => {
    if (!catalogName || !selectedProducts.length) {
      alert("Please enter Catalog Name and select at least one product");
      return;
    }

    const items = selectedProducts.map((p, index) => {
      const quantity = p.quantity || 1;
      const baseCost = p.productCost || 0;
      const itemGst = p.productGST !== undefined ? p.productGST : selectedGst;
      const rate = parseFloat(baseCost.toFixed(2));
      const amount = rate * quantity;
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
      await axiosInstance.post(`/admin/quotations`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Quotation created successfully!");
    } catch {
      alert("Error creating quotation.");
    }
  };

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

  const openVariationSelector = (product) => {
    setVariationModalProduct(product);
    setVariationModalOpen(true);
  };

  const closeVariationModal = () => {
    setVariationModalOpen(false);
    setVariationModalProduct(null);
  };

  const finalProducts = advancedSearchActive ? advancedSearchResults : products;

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

        {/* Customer Address */}
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
            "brandingTypes",
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
        <FilterDropdown
          label="Categories"
          open={categoryOpen}
          setOpen={setCategoryOpen}
          options={fullCategories}
          selected={selectedCategories}
          toggle={(v) => toggleFilter(v, selectedCategories, setSelectedCategories)}
          counts={filterCounts.categories}
        />
        <FilterDropdown
          label="SubCats"
          open={subCategoryOpen}
          setOpen={setSubCategoryOpen}
          options={fullSubCategories}
          selected={selectedSubCategories}
          toggle={(v) => toggleFilter(v, selectedSubCategories, setSelectedSubCategories)}
          counts={filterCounts.subCategories}
        />
        <FilterDropdown
          label="Brands"
          open={brandOpen}
          setOpen={setBrandOpen}
          options={fullBrands}
          selected={selectedBrands}
          toggle={(v) => toggleFilter(v, selectedBrands, setSelectedBrands)}
          counts={filterCounts.brands}
        />
        <FilterDropdown
          label="Price Range"
          open={priceRangeOpen}
          setOpen={setPriceRangeOpen}
          options={fullPriceRanges}
          selected={selectedPriceRanges}
          toggle={(v) => toggleFilter(v, selectedPriceRanges, setSelectedPriceRanges)}
          counts={filterCounts.priceRanges}
        />
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
        className="fixed bottom-4 right-4 bg-purple-600 text-white rounded-full p-3 cursor-pointer shadow-lg"
        style={{ width: 60, height: 60 }}
        onClick={() => setCartOpen(true)}
      >
        <BagIcon />
        {selectedProducts.length > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-center text-xs">
            {selectedProducts.length}
          </span>
        )}
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-end z-50">
          <div className="bg-white w-full sm:w-96 p-4 overflow-auto relative">
            <h2 className="font-bold mb-4">Selected Items</h2>
            <button
              onClick={() => setCartOpen(false)}
              className="absolute top-2 right-2 text-xl"
            >
              ×
            </button>
            <DragDropContext
              onDragEnd={(result) => {
                if (!result.destination) return;
                const arr = Array.from(selectedProducts);
                const [moved] = arr.splice(result.source.index, 1);
                arr.splice(result.destination.index, 0, moved);
                setSelectedProducts(arr);
              }}
            >
              <Droppable droppableId="cartItems">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    {selectedProducts.map((row, idx) => (
                      <Draggable
                        key={row._id || idx}
                        draggableId={String(row._id || idx)}
                        index={idx}
                      >
                        {(prov) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className="border mb-3 p-2 rounded"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1 pr-2">
                                <div className="font-semibold">{row.productName}</div>
                                {row.color && (
                                  <div className="text-xs">Color: {row.color}</div>
                                )}
                                {row.size && (
                                  <div className="text-xs">Size: {row.size}</div>
                                )}
                                <div className="text-xs">
                                  Base Cost: ₹{row.productCost.toFixed(2)}
                                </div>
                                <div className="text-xs">Qty: {row.quantity}</div>
                                <SuggestedPriceCalculator
                                  product={row}
                                  companySegment={selectedCompanyData?.segment}
                                  companyPincode={selectedCompanyData?.pincode || selectedCompanyData?.companyAddress?.pincode}
                                  brandingTypesList={brandingTypesList}
                                  segmentsList={segmentsList}
                                />
                                <div className="text-xs">GST: {row.productGST}%</div>
                                {row.brandingTypes && row.brandingTypes.length > 0 && (
                                  <div className="text-xs">
                                    Branding:{" "}
                                    {row.brandingTypes
                                      .map((id) => {
                                        const bt = brandingTypesList.find((b) => b._id === id);
                                        return bt ? bt.brandingName : "Unknown";
                                      })
                                      .join(", ")}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() =>
                                  setSelectedProducts((ps) => ps.filter((_, i) => i !== idx))
                                }
                                className="text-red-600"
                              >
                                Remove
                              </button>
                            </div>
                            <button
                              onClick={() => setEditIndex(idx) || setEditModalOpen(true)}
                              className="mt-2 bg-blue-500 text-white px-2 py-1 rounded text-xs"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
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
          brandingTypesList={brandingTypesList}
          segmentsList={segmentsList}
          segmentName={selectedCompanyData?.segment}
          companyPincode={selectedCompanyData?.pincode || selectedCompanyData?.companyAddress?.pincode}
          onClose={() => {
            setEditModalOpen(false);
            setEditIndex(null);
          }}
          onUpdate={(upd) => {
            handleUpdateItem(upd);
            setEditModalOpen(false);
            setEditIndex(null);
          }}
        />
      )}

      {/* Company Creation Modal */}
      {showCompanyModal && <CompanyModal onClose={handleCloseCompanyModal} />}
    </div>
  );
}

/* ─────────────────────────────────────────
 *  FilterDropdown Component
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
      brandingTypes: [],
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
  const [variations, setVariations] = useState([]);

  const handleAddLine = () => {
    setVariations((prev) => [
      ...prev,
      {
        color: pickedColor || "N/A",
        size: pickedSize || "N/A",
        quantity: parseInt(pickedQuantity) || 1,
      },
    ]);
  };

  const handleRemoveLine = (idx) => setVariations((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (variations.length === 0) {
      alert("Add at least one variation to save");
      return;
    }
    onSave(variations);
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
        weight: product.material || "",
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
                  placeholder="Type color"
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
                  placeholder="Type size"
                />
              )}
            </div>
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
                  {v.color || "N/A"} / {v.size || "N/A"} Qty: {v.quantity}
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
function VariationEditModal({
  item,
  brandingTypesList,
  segmentsList,
  segmentName,
  companyPincode,
  onClose,
  onUpdate,
}) {
  /* ---------- editable fields ---------- */
  const [name, setName] = useState(item.productName || "");
  const [editableCost, setEditableCost] = useState(item.productCost || 0);
  const [productGST, setProductGST] = useState(item.productGST || 0);
  const [color, setColor] = useState(item.color || "");
  const [size, setSize] = useState(item.size || "");
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [material, setMaterial] = useState(item.material || "");
  const [weight, setWeight] = useState(item.weight || "");
  const [productDescription, setProductDescription] = useState(item.ProductDescription || "");
  const [productBrand, setProductBrand] = useState(item.ProductBrand || "");
  const [brandingTypes, setBrandingTypes] = useState(item.brandingTypes || []);

  /* ---------- suggested price handling ---------- */
  const [suggestedPrice, setSuggestedPrice] = useState(item.productCost || 0);
  const [priceFrozen, setPriceFrozen] = useState(false);
  const initialCost = React.useRef(item.productCost); // Store initial product cost

  /* fetch missing description / brand once */
  useEffect(() => {
    if (!item.productId) return;
    axios
      .get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/products/${item.productId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      )
      .then(({ data }) => {
        if (!productDescription) setProductDescription(data.productDetails || "");
        if (!productBrand) setProductBrand(data.brandName || "");
      })
      .catch(() => {});
  }, [item.productId, productDescription, productBrand]);

  /* click: copy suggested → cost and freeze calculator */
  const handleSetPrice = () => {
    setEditableCost(suggestedPrice);
    setPriceFrozen(true); // Freeze further calculations
  };

  const toggleBrandingType = (id) =>
    setBrandingTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    if ((!productDescription || !productBrand) && item.productId) {
      axiosInstance
        .get(`/admin/products/${item.productId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then(({ data }) => {
          if (!productDescription) setProductDescription(data.productDetails || "");
          if (!productBrand) setProductBrand(data.brandName || "");
        })
        .catch((err) => console.error("Error fetching prod details:", err));
    }
  }, [item.productId]);

  const handleSave = () =>
    onUpdate({
      productName: name,
      productCost: editableCost,
      productprice: editableCost,
      productGST: parseFloat(productGST) || 0,
      color: color || "N/A",
      size: size || "N/A",
      quantity: parseInt(quantity) || 1,
      material,
      weight,
      ProductDescription: productDescription,
      ProductBrand: productBrand,
      brandingTypes,
    });

  /* ── JSX ───────────────────────── */
      material: material || "",
      weight: weight || "",
      ProductDescription: productDescription || "",
      ProductBrand: productBrand || "",
    };
    onUpdate(upd);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border shadow-lg">
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-600">
            ×
          </button>

          <h2 className="text-xl font-bold mb-4 text-purple-700">Edit Cart Item</h2>

          <div className="space-y-4">
            <Field label="Product Name" value={name} setValue={setName} />

            {/* Cost input + Set Price button */}
            <div className="flex items-end space-x-2">
              <Field
                label="Cost"
                type="number"
                value={editableCost}
                setValue={setEditableCost}
                className="flex-1"
              />
              {!priceFrozen && (
                <button
                  onClick={handleSetPrice}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Set Price
                </button>
              )}
            </div>

            {/* Suggested Price via component */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Suggested Price
              </label>
              <SuggestedPriceCalculator
                product={{
                  productCost: parseFloat(initialCost.current) || 0, // Always use initial cost
                  brandingTypes,
                  quantity: parseInt(quantity) || 1,
                  weight: parseFloat(weight) || 0,
                }}
                companySegment={segmentName}
                companyPincode={companyPincode || ""}
                brandingTypesList={brandingTypesList}
                segmentsList={segmentsList}
                onPrice={priceFrozen ? undefined : setSuggestedPrice} // Disable callback when frozen
              />
            </div>

            {/* the rest of the fields */}
            <Field label="GST (%)" type="number" value={productGST} setValue={setProductGST} />
            <Field label="Color" value={color} setValue={setColor} />
            <Field label="Size" value={size} setValue={setSize} />
            <Field label="Quantity" type="number" value={quantity} setValue={setQuantity} />
            <Field label="Material" value={material} setValue={setMaterial} />
            <Field label="Weight" value={weight} setValue={setWeight} />
            <Field
              label="Product Description"
              textarea
              value={productDescription}
              setValue={setProductDescription}
            />
            <Field label="Product Brand" value={productBrand} setValue={setProductBrand} />

            {/* Branding list */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Branding Types
              </label>
              <div className="border border-purple-300 p-2 rounded max-h-32 overflow-y-auto">
                {brandingTypesList.map((bt) => (
                  <label key={bt._id} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={brandingTypes.includes(bt._id)}
                      onChange={() => toggleBrandingType(bt._id)}
                    />
                    <span>{bt.brandingName}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* footer buttons */}
          <div className="mt-6 flex justify-end space-x-2">
            <button onClick={onClose} className="px-4 py-2 border rounded">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* helper Field */
function Field({ label, value, setValue, type = "text", textarea = false, className = "" }) {
  return textarea ? (
    <div>
      <label className="block text-sm font-medium text-purple-700 mb-1">{label}</label>
      <textarea
        className={`border border-purple-300 rounded p-2 w-full h-24 ${className}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  ) : (
    <div>
      <label className="block text-sm font-medium text-purple-700 mb-1">{label}</label>
      <input
        type={type}
        className={`border border-purple-300 rounded p-2 w-full ${className}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}


/**
 * SuggestedPriceCalculator
 *
 * Calculates a per‑unit “suggested selling price” by adding:
 *   • segment‑based margin
 *   • branding cost  (sum of selected brandingTypes)
 *   • per‑unit logistics cost (via backend /logistics/calculate)
 *
 * Props
 * ──────────────────────────────────────────────────────────────
 *  product: {
 *    productCost: number,   // base cost (required)
 *    quantity:    number,   // qty (>=1)
 *    weight:      number,   // single‑unit weight (kg)
 *    brandingTypes: string[] // array of brandingType _ids
 *  }
 *  companySegment:   string  // e.g. "Retail", "Corporate"   (required)
 *  companyPincode:   string  // 6‑digit destination pin      (required)
 *  brandingTypesList: array  // [{ _id, brandingName, cost }]
 *  segmentsList:      array  // [{ segmentName, priceQueries, quantityQueries }]
 *
 *  onPrice?: (number) => void  // optional callback – emits finalPrice whenever it changes
 */
